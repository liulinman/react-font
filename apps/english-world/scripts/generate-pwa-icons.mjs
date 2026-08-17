import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../src/assets/pwa-icon.svg", import.meta.url);
const output = new URL("../public/icons/", import.meta.url);
const icons = [
  ["apple-touch-icon-180x180.png", 180],
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["pwa-512x512-maskable.png", 512],
];

await mkdir(output, { recursive: true });

for (const [name, size] of icons) {
  await sharp(fileURLToPath(source))
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(name, output)));
}
