import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { AUTH_FILE, AUTH_FILE_MOBILE } from './setup/auth-agentes';

export default defineConfig({
  testDir: 'specs/',
  testMatch: '**/agentes*.{spec,setup}.ts',
  outputDir: 'specs/.test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-agentes', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3090',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  expect: { timeout: 12000 },
  projects: [
    /* Phase 1: login for Desktop Chrome */
    {
      name: 'setup',
      testMatch: '**/agentes.setup.ts',
    },
    /* Phase 2: Desktop Chrome tests */
    {
      name: 'Desktop Chrome',
      testMatch: '**/agentes.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(process.cwd(), AUTH_FILE),
      },
      dependencies: ['setup'],
    },
    /* Phase 3: fresh login for Mobile Chrome (runs after Desktop Chrome finishes) */
    {
      name: 'setup-mobile',
      testMatch: '**/agentes.setup-mobile.ts',
      dependencies: ['Desktop Chrome'],
    },
    /* Phase 4: Mobile Chrome tests */
    {
      name: 'Mobile Chrome',
      testMatch: '**/agentes.spec.ts',
      use: {
        ...devices['Pixel 5'],
        storageState: path.resolve(process.cwd(), AUTH_FILE_MOBILE),
      },
      dependencies: ['setup-mobile'],
    },
  ],
  webServer: {
    command: 'echo "reusing existing dev server"',
    url: 'http://localhost:3090',
    reuseExistingServer: true,
    timeout: 5000,
  },
});
