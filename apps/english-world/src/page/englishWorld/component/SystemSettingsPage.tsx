import React from "react";
import "./SystemSettingsPage.css";
import { ApplicationUpdateCard } from "./ApplicationUpdateCard";
import { AccountSecurityCard } from "./AccountSecurityCard";
import { EnglishWorldLayout } from "../layout/EnglishWorldLayout";
import { EnglishWorldPageHeader } from "./EnglishWorldPageHeader";
import { McpAccessCard } from "./McpAccessCard";

export const SystemSettingsPage: React.FC = () => (
  <EnglishWorldLayout activeKey="setting">
    <div className="system-settings-page">
      <EnglishWorldPageHeader compact title="系统设置" />
      <div className="settings-cards">
        <AccountSecurityCard />
        <ApplicationUpdateCard />
        <McpAccessCard />
      </div>
    </div>
  </EnglishWorldLayout>
);
