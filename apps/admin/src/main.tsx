import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import "./styles.css";
import { adminTheme } from "./adminTheme";
import { AdminApp } from "./AdminApp";

ConfigProvider.config({ holderRender: children => <ConfigProvider locale={zhCN} theme={adminTheme}>{children}</ConfigProvider> });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <AdminApp />
    </ConfigProvider>
  </StrictMode>,
);
