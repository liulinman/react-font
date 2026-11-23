import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const rootPackage = JSON.parse(
  await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../dist/sw.js", import.meta.url), "utf8");
const scriptUrls = [...html.matchAll(/<script[^>]+src="\/([^"]+)"/g)].map((match) => match[1]);
const styleUrls = [...html.matchAll(/<link[^>]+href="\/([^"]+\.css)"/g)].map((match) => match[1]);

assert.equal(
  rootPackage.engines?.node,
  "^20.19.0 || >=22.12.0",
  "root Node engine must match the supported Vite, Workbox, Vitest, and jsdom runtime",
);

assert.equal(scriptUrls.length, 1, "index.html must load exactly one module entry");
const entryUrl = scriptUrls[0];
const entryStats = await stat(new URL(`../dist/${entryUrl}`, import.meta.url));
assert.ok(
  entryStats.size < 2 * 1024 * 1024,
  `mobile app-shell entry must stay below Workbox's default 2 MiB guard; got ${entryStats.size} bytes`,
);
assert.match(entryUrl, /^assets\/app-shell-[\w-]+\.js$/);

const viteManifest = JSON.parse(
  await readFile(new URL("../dist/.vite/manifest.json", import.meta.url), "utf8"),
);
const precacheEntries = [...serviceWorker.matchAll(/url:"([^"]+)"/g)].map(
  (match) => match[1],
);
const precacheUrls = new Set(precacheEntries);
assert.equal(
  precacheEntries.length,
  precacheUrls.size,
  "service worker precache must not contain duplicate URLs",
);
const entryRecord = Object.values(viteManifest).find((record) => record.isEntry);
assert.ok(entryRecord, "Vite manifest must identify the app-shell entry");

const shellUrls = new Set(["index.html", "manifest.webmanifest", entryRecord.file]);
const pendingImports = [...(entryRecord.imports ?? [])];
for (const css of entryRecord.css ?? []) shellUrls.add(css);
while (pendingImports.length > 0) {
  const key = pendingImports.pop();
  const imported = viteManifest[key];
  assert.ok(imported, `missing Vite manifest import ${key}`);
  shellUrls.add(imported.file);
  for (const css of imported.css ?? []) shellUrls.add(css);
  pendingImports.push(...(imported.imports ?? []));
}
for (const url of [...scriptUrls, ...styleUrls]) shellUrls.add(url);

for (const url of shellUrls) {
  assert.ok(precacheUrls.has(url), `bootstrap asset is not precached: ${url}`);
}

const dynamicAssets = Object.values(viteManifest)
  .filter(
    (record) =>
      record.isDynamicEntry &&
      !record.file.startsWith("assets/workbox-window"),
  )
  .flatMap((record) => [record.file, ...(record.css ?? [])]);
for (const url of dynamicAssets) {
  assert.ok(!precacheUrls.has(url), `lazy route asset must not be precached: ${url}`);
}

const assetNames = await readdir(new URL("../dist/assets/", import.meta.url));
const workboxWindowAssets = assetNames
  .filter((name) => name.startsWith("workbox-window") && name.endsWith(".js"))
  .map((name) => `assets/${name}`);
assert.ok(workboxWindowAssets.length > 0, "workbox-window registration asset missing");
for (const url of workboxWindowAssets) {
  assert.ok(precacheUrls.has(url), `registration asset is not precached: ${url}`);
}

const allowedPrecache = [
  /^index\.html$/,
  /^manifest\.webmanifest$/,
  /^icons\/[\w.-]+\.png$/,
  /^brand\/freewing-(?:symbol|favicon)\.png$/,
  /^assets\/app-shell-[\w-]+\.js$/,
  /^assets\/index-[\w-]+\.css$/,
  /^assets\/workbox-window[\w.-]*\.js$/,
];
for (const url of precacheUrls) {
  assert.ok(
    allowedPrecache.some((pattern) => pattern.test(url)),
    `non-shell asset is precached: ${url}`,
  );
}

// Execute the generated worker against a small Workbox API recorder. Test route
// behavior instead of banning the string /api, which also forbids exclusions.
const routes = [];
const workerContext = {
  define(_dependencies, factory) {
    factory({
      precacheAndRoute() {}, cleanupOutdatedCaches() {},
      createHandlerBoundToURL: url => url,
      NavigationRoute: class {
        constructor(handler, options) { this.handler = handler; this.options = options; }
      },
      registerRoute: route => routes.push(route),
    });
  },
  self: { addEventListener() {} },
};
workerContext.define.amd = true;
runInNewContext(serviceWorker, workerContext);
assert.equal(routes.length, 1, "only the application navigation fallback is registered");
const { denylist = [] } = routes[0].options;
for (const path of ["/api", "/api/admin/prd/", "/api/admin/prd/reading/prd.html", "/api/admin/prd/assets/app.js", "/admin/", "/docs/frontend/react-state.html", "/downloads", "/downloads/english-world-reading-extension-0.1.0.zip"]) {
  assert.ok(denylist.some(pattern => pattern.test(path)), `server-owned URL must bypass the learning shell: ${path}`);
}
for (const path of ["/login", "/mobile", "/englishWorld/reading-practices", "/apiary", "/downloads-lesson"]) {
  assert.ok(!denylist.some(pattern => pattern.test(path)), `learning navigation must retain its fallback: ${path}`);
}
assert.ok(![...precacheUrls].some(url => /^\/?api(?:\/|$)/.test(url)), "API responses must never be precached");
assert.doesNotMatch(serviceWorker, /mutation|POST|PUT|PATCH|DELETE/);

console.log(JSON.stringify({
  appRoot,
  distRoot,
  entryUrl,
  entryBytes: entryStats.size,
  shellAssets: [...shellUrls].sort(),
  excludedDynamicAssets: dynamicAssets.sort(),
  precacheUrls: [...precacheUrls].sort(),
}, null, 2));
