import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/theme/theme.css"),
  "utf8",
);

describe("dark theme visual contracts", () => {
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
      /html\[data-theme="dark"\] \.learning-cockpit-status-strip,[\s\S]*?\.learning-cockpit-status-strip > div,[\s\S]*?\.learning-cockpit-card-primary,[\s\S]*?\.learning-cockpit-context-card,[\s\S]*?\.learning-cockpit-focus-row,[\s\S]*?\.learning-cockpit-task-item\s*\{[^}]*border-color:\s*var\(--ew-border\);[^}]*background:\s*var\(--ew-surface\);/s,
    );
    expect(styles).toMatch(
      /html\[data-theme="dark"\] \.learning-cockpit-hero h1\.ant-typography,[\s\S]*?\.learning-cockpit-status-strip strong,[\s\S]*?\.learning-cockpit-task-copy strong\s*\{[^}]*color:\s*var\(--ew-text\);/s,
    );
  });
});
