import { defineConfig } from 'cypress';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default defineConfig({
  allowCypressEnv: false,
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: { reportDir: 'cypress/reports/integration/html', reportFilename: 'index',
    overwrite: true, embeddedScreenshots: true, inlineAssets: true, charts: true },
  screenshotsFolder: 'cypress/reports/integration/screenshots',
  video: false,
  e2e: {
    baseUrl: 'http://127.0.0.1:13318',
    specPattern: 'cypress/integration/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    testIsolation: true,
    viewportWidth: 1280, viewportHeight: 900,
    setupNodeEvents(on) {
      require('cypress-mochawesome-reporter/plugin')(on);
      on('task', {
        resetDatabase() {
          const backend = process.env.E2E_BACKEND_DIR || resolve(process.cwd(), '../../../..', 'nestjs');
          const output = execFileSync('pnpm', ['exec', 'ts-node', '-r', 'tsconfig-paths/register', 'test/integration/seed.ts'],
            // Cypress injects a tsx loader into NODE_OPTIONS; do not leak it into ts-node.
            { cwd: backend, encoding: 'utf8', timeout: 60000, env: { ...process.env, NODE_OPTIONS: '' } });
          return JSON.parse(output.trim().split('\n').at(-1)!);
        },
      });
    },
  },
});
