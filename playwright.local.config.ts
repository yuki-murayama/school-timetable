import { defineConfig, devices } from '@playwright/test'
import { URLS } from './config/ports'

/**
 * ローカル開発用Playwright設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI and for CRUD tests to avoid data conflicts */
  workers: process.env.CI ? 1 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['json', { outputFile: 'test-results/test-results.json' }], ['list']],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: URLS.E2E_LOCAL,

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Timeout settings */
    actionTimeout: 10000, // 10 seconds for individual actions
    navigationTimeout: 20000, // 20 seconds for page navigation
  },

  /* Global test timeout */
  timeout: 60000, // 1 minute per test

  /* ローカル開発用プロジェクト設定 */
  projects: [
    // Setup project for authentication (ローカルのみ)
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
    },

    // Default authenticated tests (Chrome only)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Unauthenticated tests
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*api.*\.spec\.ts/,
    },
  ],
})