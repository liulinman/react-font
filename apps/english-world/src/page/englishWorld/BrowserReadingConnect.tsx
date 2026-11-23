import { useState } from 'react';
import { Button, Card, Typography } from 'antd';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import request from '@font/api';
import { useAuth } from '@/contexts/AuthContext';

const opaque = /^[A-Za-z0-9_-]{43}$/;
const extensionCallback = 'https://ibpanaiimdbfnndkcfepjfdaopgfcdnn.chromiumapp.org/english-world';

export function BrowserReadingConnect() {
  const auth = useAuth();
  const location = useLocation();
  const [query] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const redirect = query.get('redirect') ?? '';
  const challenge = query.get('challenge') ?? '';
  const state = query.get('state') ?? '';
  const valid = redirect === extensionCallback && opaque.test(challenge) && opaque.test(state);

  if (valid && !auth.loading && !auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  async function authorize() {
    setError('');
    setBusy(true);
    try {
      const result = await request<{ redirect: string }>({
        url: '/browser-reading/authorize',
        method: 'POST',
        data: { redirect, challenge, state },
        config: { suppressErrorMessage: true },
      });
      const target = new URL(result.redirect);
      if (target.origin + target.pathname !== extensionCallback ||
          target.searchParams.get('state') !== state || !opaque.test(target.searchParams.get('code') ?? '')) {
        throw new Error('授权响应无效');
      }
      window.location.replace(target.href);
    } catch {
      setError('授权失败，请重试。');
      setBusy(false);
    }
  }

  return <main style={{ maxWidth: 520, margin: '12vh auto', padding: '0 16px' }}>
    <Card>
      <Typography.Title level={2}>连接阅读扩展</Typography.Title>
      {valid ? <>
        <Typography.Paragraph>扩展只在你主动查词时发送选中的单词、原句和网页来源。点击保存后，引用才会写入你的个人词库。</Typography.Paragraph>
        <Button type="primary" loading={busy || auth.loading} disabled={!auth.isAuthenticated} onClick={() => void authorize()}>
          允许查词和收词
        </Button>
        {error && <p role="alert">{error}</p>}
      </> : <p role="alert">扩展授权地址无效，请从 Chrome 扩展重新连接。</p>}
    </Card>
  </main>;
}
