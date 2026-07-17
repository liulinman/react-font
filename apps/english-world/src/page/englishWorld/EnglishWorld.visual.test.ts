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
});
