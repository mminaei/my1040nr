const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  webServer: {
    command: 'node tests/support/static-server.js',
    url: 'http://127.0.0.1:4173/prepare.html',
    reuseExistingServer: !process.env.CI
  }
});
