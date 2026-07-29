import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(process.cwd(), "../..");
const dockerfile = readFileSync(resolve(workspaceRoot, "Dockerfile"), "utf8");
const nginxConfig = readFileSync(resolve(workspaceRoot, "nginx.conf"), "utf8");
const deployWorkflow = readFileSync(
  resolve(workspaceRoot, ".github/workflows/deploy.yml"),
  "utf8",
);

describe("standalone admin deployment configuration", () => {
  it("builds and serves the admin app separately under /admin", () => {
    expect(dockerfile).toContain("COPY apps/admin/package.json ./apps/admin/");
    expect(dockerfile).toContain("pnpm --filter @font/admin build");
    expect(dockerfile).toContain(
      "COPY --from=build /app/apps/admin/dist /usr/share/nginx/html/admin",
    );
    expect(nginxConfig).toContain("location = /englishWorld/admin");
    expect(nginxConfig).toContain("location = /admin");
    expect(nginxConfig).toContain("location ^~ /admin/");
  });

  it("verifies the admin app in frontend CI", () => {
    expect(deployWorkflow).toContain("Run Admin tests");
    expect(deployWorkflow).toContain("Build Admin");
  });
});
