import { defineConfig } from 'cypress';
import { createRequire } from 'node:module';
import { registerDatabaseTasks, resetTestDatabase } from './cypress.integration.config';
const require = createRequire(import.meta.url);

// PRD reports come from the Module API, independent of Mochawesome's after:run hook.
export default defineConfig({
  projectId: process.env.CYPRESS_PROJECT_ID || require('./cypress.cloud.json').projectId,
  allowCypressEnv: false,
  reporter: 'spec',
  video: false,
  e2e: {
    baseUrl: 'http://127.0.0.1:13318',
    specPattern: ['cypress/e2e/**/*.cy.ts', 'cypress/integration/**/*.cy.ts'],
    supportFile: false,
    testIsolation: true,
    viewportWidth: 1280, viewportHeight: 900,
    setupNodeEvents(on, config) {
      registerDatabaseTasks(on);
      on('before:spec', () => { resetTestDatabase(); });
      return config;
    },
  },
});
