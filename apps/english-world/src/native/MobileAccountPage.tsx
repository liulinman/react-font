import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobilePage } from '@/page/englishWorldMobile/components/MobilePage';

export function MobileAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true, state: { from: { pathname: '/mobile' } } });
    } catch {
      setError('退出失败，请检查网络后重试');
    } finally {
      setPending(false);
    }
  };

  return (
    <MobilePage title="我的" className="study-account">
      <section className="mobile-state-view">
        <div className="study-avatar">{user?.username?.slice(0,1).toUpperCase()}</div><h2>当前账号</h2>
        <p>{user?.username}</p>
        <Link to="/mobile/cockpit">学习记录 <span>↗</span></Link><Link to="/mobile/words">我的词库 <span>↗</span></Link><Link to="/mobile/me/app">应用信息 <span>↗</span></Link>
        {error && <p role="alert">{error}</p>}
        <button disabled={pending} onClick={() => void signOut()} type="button">
          {pending ? '正在退出…' : '退出登录'}
        </button>
      </section>
    </MobilePage>
  );
}
