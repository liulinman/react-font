import { defineConfig } from 'cypress';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

export function resetTestDatabase() {
  const backend = process.env.E2E_BACKEND_DIR || fileURLToPath(new URL('../../../nestjs/', import.meta.url));
  const output = execFileSync('pnpm', ['exec', 'ts-node', '-r', 'tsconfig-paths/register', 'test/integration/seed.ts'],
    { cwd: backend, encoding: 'utf8', timeout: 60000, env: { ...process.env, NODE_OPTIONS: '' } });
  return JSON.parse(output.trim().split('\n').at(-1)!);
}
export function registerDatabaseTasks(on: Cypress.PluginEvents) {
  on('task', { resetDatabase: resetTestDatabase });
}

export default defineConfig({
  projectId: process.env.CYPRESS_PROJECT_ID || require('./cypress.cloud.json').projectId,
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
    setupNodeEvents(on, config) {
      if (config.reporter === 'cypress-mochawesome-reporter') {
        require('cypress-mochawesome-reporter/plugin')(on);
      }
      registerDatabaseTasks(on);
      return config;
    },
  },
});
