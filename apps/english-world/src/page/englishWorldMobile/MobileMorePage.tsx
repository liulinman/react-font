import type { ReactNode } from "react";
import { useState } from "react";
import { Dialog, Toast } from "antd-mobile";
import {
  AppOutline,
  ClockCircleOutline,
  CollectMoneyOutline,
  FileOutline,
  HistogramOutline,
  RightOutline,
  SetOutline,
  UnorderedListOutline,
  UserOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSettingsModal } from "@/theme/ThemeSettingsModal";

type MobileMorePageProps = {
  onOpenAi: () => void;
};

type FeatureItem = {
  title: string;
  description: string;
  icon: ReactNode;
  path?: string;
  action?: "ai" | "theme";
  tone: "blue" | "green" | "amber" | "violet" | "slate";
};

const featureGroups: Array<{ title: string; items: FeatureItem[] }> = [
  {
    title: "学习",
    items: [
      {
        title: "学习驾驶舱",
        description: "今日建议、薄弱词与学习概览",
        icon: <AppOutline />,
        path: "/englishWorld?source=mobile",
        tone: "blue",
      },
      {
        title: "今日复习",
        description: "按计划完成回忆与听写",
        icon: <ClockCircleOutline />,
        path: "/englishWorld/recite?source=mobile",
        tone: "green",
      },
      {
        title: "完整语境实验室",
        description: "生成文章、答题并回看练习记录",
        icon: <FileOutline />,
        path: "/englishWorld/context-lab?source=mobile",
        tone: "violet",
      },
      {
        title: "雅思核心复习",
        description: "筛选核心词并生成专项练习",
        icon: <CollectMoneyOutline />,
        path: "/englishWorld/ielts-core?source=mobile",
        tone: "amber",
      },
      {
        title: "记忆地图",
        description: "查看薄弱词、错词与掌握路径",
        icon: <HistogramOutline />,
        path: "/englishWorld/memory-map?source=mobile",
        tone: "slate",
      },
    ],
  },
  {
    title: "词库管理",
    items: [
      {
        title: "AI 单词查询",
        description: "查询释义并快速加入词库",
        icon: <AppOutline />,
        action: "ai",
        tone: "blue",
      },
      {
        title: "批量导入",
        description: "批量预览、查重并导入词条",
        icon: <UnorderedListOutline />,
        path: "/englishWorld/bulk-import?source=mobile",
        tone: "green",
      },
      {
        title: "覆盖统计",
        description: "查看重复覆盖与词条维护情况",
        icon: <HistogramOutline />,
        path: "/englishWorld/overwrite-stats?source=mobile",
        tone: "amber",
      },
    ],
  },
  {
    title: "设置",
    items: [
      {
        title: "系统设置",
        description: "配置默写、听写数量与范围",
        icon: <SetOutline />,
        path: "/englishWorld/settings?source=mobile",
        tone: "slate",
      },
      {
        title: "主题设置",
        description: "切换明暗外观与主题色",
        icon: <AppOutline />,
        action: "theme",
        tone: "violet",
      },
      {
        title: "Web 版首页",
        description: "进入完整桌面工作区",
        icon: <UnorderedListOutline />,
        path: "/englishWorld?source=mobile",
        tone: "blue",
      },
    ],
  },
];

export function MobileMorePage({ onOpenAi }: MobileMorePageProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const username = user?.username || "管理员";

  const openFeature = (item: FeatureItem) => {
    if (item.action === "ai") {
      onOpenAi();
      return;
    }

    if (item.action === "theme") {
      setThemeSettingsOpen(true);
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  const handleLogout = () => {
    Dialog.confirm({
      content: "确定要退出当前账号吗？",
      confirmText: "退出",
      cancelText: "取消",
      onConfirm: async () => {
        try {
          await logout();
          navigate("/login", { replace: true });
        } catch {
          Toast.show({ icon: "fail", content: "退出失败，请重试" });
        }
      },
    });
  };

  return (
    <div className="mobile-more-page">
      <section className="mobile-more-profile" aria-label="当前账号">
        <span className="mobile-more-avatar" aria-hidden="true">
          <UserOutline />
        </span>
        <div className="mobile-more-profile-copy">
          <strong>{username}</strong>
          <span>English World</span>
        </div>
      </section>

      {featureGroups.map((group) => (
        <section className="mobile-more-section" key={group.title}>
          <h2>{group.title}</h2>
          <div className="mobile-more-list">
            {group.items.map((item) => (
              <button
                className="mobile-more-item"
                key={item.title}
                type="button"
                onClick={() => openFeature(item)}
              >
                <span
                  className={`mobile-more-item-icon mobile-more-item-icon-${item.tone}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="mobile-more-item-copy">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <RightOutline
                  className="mobile-more-item-chevron"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      ))}

      <button
        className="mobile-more-logout"
        type="button"
        onClick={handleLogout}
      >
        退出登录
      </button>

      {themeSettingsOpen ? (
        <ThemeSettingsModal
          open
          onClose={() => setThemeSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
