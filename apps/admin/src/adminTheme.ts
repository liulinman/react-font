import type { ThemeConfig } from "antd";

export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: "#2563eb", colorText: "#202938", colorTextSecondary: "#606c7c",
    colorBorder: "#e3e8ef", colorBgLayout: "#f6f7f9", borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14, lineHeight: 1.6, fontWeightStrong: 600, controlHeight: 36,
  },
  components: {
    Table: { headerBg: "#f8fafc", headerColor: "#606c7c", rowHoverBg: "#f8faff", borderColor: "#edf0f4" },
    Tabs: { titleFontSize: 14, horizontalItemGutter: 28 },
    Card: { headerFontSize: 14, headerHeight: 48 },
    Modal: { titleFontSize: 16 },
    Button: { primaryShadow: "none", defaultShadow: "none" },
  },
};
