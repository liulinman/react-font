import { defineConfig } from "cypress";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default defineConfig({
  allowCypressEnv: false,
  reporter: "cypress-mochawesome-reporter",
  reporterOptions: {
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    overwrite: false,
    reportDir: "cypress/reports/html",
  },
  e2e: {
    baseUrl: "http://127.0.0.1:5175",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    setupNodeEvents(on, config) {
      if (config.reporter === "cypress-mochawesome-reporter") {
        require("cypress-mochawesome-reporter/plugin")(on);
      }

      return config;
    },
  },
});
