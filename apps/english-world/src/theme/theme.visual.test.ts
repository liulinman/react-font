import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/theme/theme.css"),
  "utf8",
);

describe("dark theme visual contracts", () => {
  it("defines reusable semantic surface, feedback, elevation, and radius tokens", () => {
    expect(styles).toContain("--ew-success:");
    expect(styles).toContain("--ew-warning:");
    expect(styles).toContain("--ew-danger:");
    expect(styles).toContain("--ew-shadow-soft:");
    expect(styles).toContain("--ew-shadow-lifted:");
    expect(styles).toContain("--ew-radius-sm: 8px");
    expect(styles).toContain("--ew-radius-md: 12px");
    expect(styles).toContain("--ew-radius-lg: 18px");
  });

  it("uses the real word-card selectors for readable text and dividers", () => {
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.word-card-copy \.word-link\s*\{[^}]*color:\s*var\(--ew-text\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.word-card-copy \.word-phonetic,[\s\S]*?\.word-card-classification,[\s\S]*?\.word-card-meta\s*\{[^}]*color:\s*var\(--ew-text-secondary\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.word-card-meta\s*\{[^}]*border-color:\s*var\(--ew-border\);/s,
    );
  });

  it("keeps every recite workspace surface dark when typography becomes light", () => {
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.recite-intro-panel,[\s\S]*?\.recite-question-panel,[\s\S]*?\.recite-result-panel\s*\{[^}]*border-color:\s*var\(--ew-border\);[^}]*background:\s*var\(--ew-surface\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.recite-studio-grid\s*\{[^}]*background:\s*var\(--ew-page-bg\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.recite-question-canvas,[\s\S]*?\.recite-prompt-card,[\s\S]*?\.recite-rail-card,[\s\S]*?\.recite-result-next,[\s\S]*?\.recite-result-item\s*\{[^}]*border-color:\s*var\(--ew-border\);[^}]*background:\s*var\(--ew-surface\);/s,
    );
  });

  it("removes leftover light cockpit surfaces and hard-coded dark text", () => {
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.learning-snapshot,[\s\S]*?\.learning-cockpit-card-primary,[\s\S]*?\.learning-cockpit-context-card,[\s\S]*?\.learning-cockpit-focus-row,[\s\S]*?\.learning-cockpit-task-item\s*\{[^}]*border-color:\s*var\(--ew-border\);[^}]*background:\s*var\(--ew-surface\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.learning-cockpit-hero h1\.ant-typography,[\s\S]*?\.learning-snapshot strong,[\s\S]*?\.learning-cockpit-task-copy strong\s*\{[^}]*color:\s*var\(--ew-text\);/s,
    );
  });

  it("keeps the context lab workspace uniformly light inside dark theme", () => {
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.english-world-workspace:has\(\.context-lab-page\)\s*\{[^}]*--ew-page-bg:\s*#f5f7fb;[^}]*--ew-surface:\s*#ffffff;[^}]*--ew-text:\s*#182235;[^}]*color-scheme:\s*light;/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.context-lab-page \.ant-input,[\s\S]*?\.context-lab-page \.ant-btn-default\s*\{[^}]*border-color:\s*#dbe4ef;[^}]*background:\s*#ffffff;[^}]*color:\s*#182235;/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.context-lab-page \.ant-input-group-addon\s*\{[^}]*border-color:\s*#dbe4ef;[^}]*background:\s*#ffffff;[^}]*color:\s*#182235;/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.context-lab-page \.context-lab-history-search \.ant-input,[\s\S]*?\.ant-input-search-button\.ant-btn\s*\{[^}]*border-color:\s*#dbe4ef !important;[^}]*background:\s*#ffffff !important;[^}]*color:\s*#182235 !important;[^}]*box-shadow:\s*none !important;/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.context-lab-page \.ant-segmented\s*\{[^}]*background:\s*#eef2f7;[^}]*color:\s*#64748b;/s,
    );
  });
});
