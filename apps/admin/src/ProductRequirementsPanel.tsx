import { useState } from "react";
import { Alert, Button, Space, Tabs } from "antd";
import { ExportOutlined, ReloadOutlined } from "@ant-design/icons";
import { getApiBaseUrl } from "@font/api";

import { DeliveryPipelinePanel } from "./DeliveryPipelinePanel";

export function ProductRequirementsPanel() {
  return <Tabs defaultActiveKey="pipeline" items={[{key:"pipeline",label:"交付产线",children:<DeliveryPipelinePanel/>},{key:"reader",label:"需求全文",children:<RequirementsReader/>}]} />;
}

function RequirementsReader() {
  const [version, setVersion] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/admin/prd/`;
  return (
    <section className="admin-prd-panel">
      <div className="admin-prd-actions">
        <span>正式需求来源：docs/prd · 支持全文搜索与章节导航</span>
        <Space>
          <Button
            aria-label="重新加载"
            icon={<ReloadOutlined aria-hidden />}
            onClick={() => {
              setSessionExpired(false);
              setVersion((v) => v + 1);
            }}
          >
            重新加载
          </Button>
          <Button
            aria-label="独立阅读"
            icon={<ExportOutlined aria-hidden />}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            独立阅读
          </Button>
        </Space>
      </div>
      {sessionExpired ? (
        <Alert
          showIcon
          type="warning"
          message="管理员登录已失效，请重新登录后查看产品需求。"
          action={
            <Button onClick={() => window.location.reload()}>重新登录</Button>
          }
        />
      ) : (
        <iframe
          key={version}
          className="admin-prd-frame"
          title="产品需求阅读器"
          src={url}
          onLoad={(event) => {
            try {
              const doc = event.currentTarget.contentDocument;
              if (doc?.contentType === "application/json") {
                const result = JSON.parse(doc.body.textContent || "{}");
                if (result.code === 4001 || result.statusCode === 401)
                  setSessionExpired(true);
              }
            } catch {
              /* Cross-origin deployments retain the server's access denial. */
            }
          }}
        />
      )}
    </section>
  );
}
