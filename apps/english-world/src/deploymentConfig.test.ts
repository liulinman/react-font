import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(process.cwd(), "../..");
const nginxConfig = readFileSync(resolve(workspaceRoot, "nginx.conf"), "utf8");
const deployWorkflow = readFileSync(
  resolve(workspaceRoot, ".github/workflows/deploy.yml"),
  "utf8",
);

describe("production deployment configuration", () => {
  it("keeps API routes ahead of static asset extension matching", () => {
    expect(nginxConfig).toMatch(/location\s+\^~\s+\/api\//);
  });

  it("syncs the versioned Nginx configuration during deployment", () => {
    expect(deployWorkflow).toContain(
      'install -m 0644 "$TARGET/nginx.conf" "$COMPOSE_DIR/nginx.conf"',
    );
  });
});
