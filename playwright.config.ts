import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: '.',

  // The Rhombus AI pipeline can take 30-60s end-to-end; generous per-test
  // ceiling with a short per-assertion timeout keeps feedback tight.
  timeout: 120_000,
  expect: { timeout: 10_000 },

  // Retries absorb transient blips in CI; locally devs get fast feedback.
  retries: isCI ? 2 : 0,

  fullyParallel: false,

  // Serial execution: the Rhombus free account is shared, so parallel
  // workers trade flakiness risk (rate limits, cross-test pollution) for
  // negligible speedup on such a small suite.
  workers: 1,

  use: {
    baseURL: process.env['RHOMBUS_BASE_URL'],
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,

    // Heavy forensic artefacts only in CI; locally they fill the disk.
    trace: isCI ? 'on-first-retry' : 'off',
    video: isCI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'junit.xml' }],
  ],

  projects: [
    {
      name: 'setup',
      testDir: './ui-tests',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui',
      testDir: './ui-tests',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, 'storageState.json'),
      },
    },
    {
      name: 'api',
      testDir: './api-tests',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, 'storageState.json'),
      },
    },
  ],

  outputDir: 'test-results',
});
