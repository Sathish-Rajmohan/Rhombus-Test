import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests',

  // Global timeouts per decision n7
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Retries per decision m9
  retries: isCI ? 2 : 0,

  // Never run tests fully parallel by default; each project sets its own
  fullyParallel: false,

  // Fixed viewport per decision n6
  use: {
    baseURL: process.env['RHOMBUS_BASE_URL'],
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,

    // Forensics per decision m10
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Reporters per decision n8
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'junit.xml' }],
  ],

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, 'storageState.json'),
      },
      // Serial UI execution per decision m7
      workers: 1,
    },
    {
      name: 'api',
      testDir: './tests/api',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, 'storageState.json'),
      },
      // At most 2 workers for API per decision m7
      workers: 2,
    },
  ],

  outputDir: 'test-results',
});
