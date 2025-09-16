import { defineConfig, devices } from '@playwright/test'
import { getBaseURL } from './config/ports'

/**
 * 本番環境用Playwright設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // 本番環境では1回リトライ
  /* Opt out of parallel tests on CI and for CRUD tests to avoid data conflicts */
  workers: 2, // 本番環境では並列度を下げて安定性を重視
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/production-test-results.json' }],
    ['list'],
  ],
  /* Global setup for authentication - disabled for production, using per-project setup */
  // globalSetup: './tests/e2e/global-setup.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://school-timetable-monorepo.grundhunter.workers.dev',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Timeout settings - 本番環境では長めに設定 */
    actionTimeout: 15000, // 15 seconds for individual actions
    navigationTimeout: 30000, // 30 seconds for page navigation
  },

  /* Global test timeout - 本番環境用に長めに設定 */
  timeout: 90000, // 1.5 minutes per test

  /* 本番環境用プロジェクト設定 */
  projects: [
    // Setup project for authentication
    {
      name: 'production-setup',
      testMatch: /.*production\.setup\.ts/,
    },

    // 本番環境認証済みテスト（Chrome）
    {
      name: 'production-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state for production
        storageState: 'tests/e2e/.auth/production-user.json',
      },
      dependencies: ['production-setup'],
    },

    // 本番環境未認証テスト（API testing用）
    {
      name: 'production-chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*api.*\.spec\.ts/,
    },

    // Firefox for cross-browser testing
    {
      name: 'production-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/production-user.json',
      },
      dependencies: ['production-setup'],
    },
  ],
})
