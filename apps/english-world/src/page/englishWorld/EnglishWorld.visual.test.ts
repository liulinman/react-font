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
      /\.word-card\s*\{[^}]*border:\s*1px solid #d8e1ee;[^}]*border-radius:\s*10px;[^}]*box-shadow:\s*0 3px 10px rgba\(15, 23, 42, 0\.055\);/s,
    );
    expect(styles).toMatch(
      /\.word-card:hover\s*\{[^}]*transform:\s*translateY\(-1px\);/s,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.word-card:hover,[\s\S]*?transform:\s*none;/,
    );
  });
});
