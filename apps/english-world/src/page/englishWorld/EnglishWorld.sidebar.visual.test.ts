import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/page/englishWorld/EnglishWorld.css"),
  "utf8",
);

describe("English World collapsible sidebar styles", () => {
  it("uses a 72px icon rail and expands the desktop content area", () => {
    expect(styles).toMatch(
      /\.english-world-header\s*\{[^}]*width:\s*228px;/s,
    );
    expect(styles).toMatch(
      /\.english-world-header-collapsed\s*\{[^}]*width:\s*72px;/s,
    );
    expect(styles).toMatch(
      /\.english-world-workspace\s*\{[^}]*margin-left:\s*228px;/s,
    );
    expect(styles).toMatch(
      /\.english-world-shell-collapsed \.english-world-workspace\s*\{[^}]*margin-left:\s*72px;/s,
    );
    expect(styles).toMatch(
      /\.english-world-header-collapsed \.english-world-brand-copy\s*\{[^}]*display:\s*none;/s,
    );
    expect(styles).toMatch(
      /\.english-world-header-collapsed \.english-world-nav-button\.ant-btn\s*\{[^}]*justify-content:\s*center;/s,
    );
  });

  it("hides the toggle in the existing mobile top navigation", () => {
    expect(styles).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.english-world-sidebar-toggle\s*\{[^}]*display:\s*none;/s,
    );
  });

  it("keeps the user menu visible at the top right on mobile", () => {
    expect(styles).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.english-world-context-bar\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0 10px auto auto;[^}]*z-index:\s*60;/s,
    );
    expect(styles).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.english-world-user-name\s*\{[^}]*display:\s*none;/s,
    );
  });

  it("disables the new width transitions for reduced motion", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.english-world-header,[\s\S]*?\.english-world-workspace\s*\{[^}]*transition:\s*none;/s,
    );
  });
});
