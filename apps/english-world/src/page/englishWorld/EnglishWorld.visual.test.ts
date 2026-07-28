import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/page/englishWorld/EnglishWorld.css"),
  "utf8",
);

describe("word card visual hierarchy", () => {
  it("separates the card grid surface from interactive word cards", () => {
    expect(styles).toMatch(
      /\.english-world-card-view\s*\{[^}]*padding:\s*14px;[^}]*background:\s*#f6f8fc;/s,
    );
    expect(styles).toMatch(
      /\.word-card\s*\{[^}]*border:\s*1px solid #e1e7ef;[^}]*border-radius:\s*12px;[^}]*box-shadow:\s*0 1px 2px rgba\(15, 23, 42, 0\.025\);/s,
    );
    expect(styles).toMatch(
      /\.word-card:hover\s*\{[^}]*border-color:\s*#cbd5e1;[^}]*box-shadow:\s*0 6px 16px rgba\(15, 23, 42, 0\.065\);/s,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.word-card\s*\{[^}]*transition:\s*none;/,
    );
  });

  it("uses the Focus Studio desktop grid and restrained motion", () => {
    expect(styles).toMatch(
      /\.english-world-main\s*\{[^}]*max-width:\s*1560px;[^}]*margin:\s*0 auto;/s,
    );
    expect(styles).toMatch(
      /\.learning-cockpit-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(320px, 360px\);/s,
    );
    expect(styles).toMatch(/\.recite-loop\s*\{[^}]*max-width:\s*1120px;/s);
    expect(styles).toMatch(
      /\.system-settings-page\s*\{[^}]*max-width:\s*1080px;/s,
    );
    expect(styles).toMatch(
      /\.system-settings-form\s*\{[^}]*max-width:\s*860px;/s,
    );
    expect(styles).toMatch(
      /\.ielts-core-hero\s*\{[^}]*padding:\s*2px 0 0;[^}]*background:\s*transparent;/s,
    );
    expect(styles).toMatch(
      /\.learning-cockpit-hero\.ielts-core-hero h1\.ant-typography\s*\{[^}]*font-size:\s*24px;/s,
    );
    expect(styles).toContain("@keyframes english-world-enter");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none/s,
    );
  });

  it("gives the learning route and memory clues a refined card hierarchy", () => {
    expect(styles).toMatch(
      /\.learning-cockpit-task-list\s*\{[^}]*gap:\s*8px;[^}]*border-top:\s*0;/s,
    );
    expect(styles).toMatch(
      /\.learning-cockpit-task-item\s*\{[^}]*border:\s*1px solid var\(--ew-border\);[^}]*border-radius:\s*var\(--ew-radius-md\);/s,
    );
    expect(styles).toMatch(
      /\.learning-cockpit-task-item-primary\s*\{[^}]*border-color:\s*var\(--ew-border\);[^}]*background:\s*var\(--ew-surface\);/s,
    );
    expect(styles).toMatch(
      /\.learning-cockpit-task-item-primary \.learning-cockpit-task-index\s*\{[^}]*color:\s*#fff;[^}]*background:\s*var\(--ew-accent\);/s,
    );
    expect(styles).toMatch(
      /\.memory-map-mastery-zone\s*\{[^}]*padding:\s*12px 0 14px;[^}]*border-bottom:\s*1px solid var\(--ew-border\);/s,
    );
    expect(styles).toMatch(
      /\.memory-map-mistake-tag\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--ew-danger\) 7%, var\(--ew-surface\)\);/s,
    );
  });
});
