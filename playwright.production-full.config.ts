import { defineConfig, devices } from '@playwright/test'

/**
 * 本番環境全量テスト用Playwright設定
 *
 * 🚨 注意：この設定は以下の場合にのみ使用してください：
 * - サービスイン前の開発・検証段階
 * - メンテナンス時の全量動作確認
 * - 本番データベースに影響しない統一テストデータ管理システムを使用
 *
 * 使用方法：
 * npm run test:e2e:production-full
 * または
 * npx playwright test --config=playwright.production-full.config.ts
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 2, // 本番環境では多めにリトライ
  /* Opt out of parallel tests on CI and for CRUD tests to avoid data conflicts */
  workers: 3, // フルテストでは並列度を上げる
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report-production-full' }],
    ['json', { outputFile: 'test-results/production-full-test-results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/production-full-results.xml' }],
  ],
  /* Global setup for authentication */
  globalSetup: './tests/e2e/global-setup.ts',
  /* Global cleanup */
  globalTeardown: './tests/e2e/global-cleanup.ts',
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

    /* Timeout settings - 高速実行用（1分/テスト想定） */
    actionTimeout: 10000, // 10 seconds for individual actions
    navigationTimeout: 15000, // 15 seconds for page navigation

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Mode': 'production-full',
    },
  },

  /* Global test timeout - 高速実行用（1分/テスト想定） */
  timeout: 60000, // 1 minute per test

  /* 本番環境フルテスト用プロジェクト設定 */
  projects: [
    // Setup project for authentication
    {
      name: 'production-full-setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // 本番環境認証済み全量テスト（Chrome）
    {
      name: 'production-full-chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['production-full-setup'],
      // 認証が必要なテスト（全てのspec.tsファイル）
      testIgnore: [
        /.*\.setup\.ts/,
        /.*api.*\.spec\.ts/, // APIテストは未認証プロジェクトで実行
      ],
    },

    // 本番環境未認証全量テスト（API testing用）
    {
      name: 'production-full-chromium-unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Test-Mode': 'production-full-api',
        },
      },
      // APIテストと基本テストのみ
      testMatch: [/.*api.*\.spec\.ts/, /.*simple-app.*\.spec\.ts/],
    },

    // Firefox クロスブラウザテスト（重要なテストのみ）
    {
      name: 'production-full-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['production-full-setup'],
      // 主要なテストのみFirefoxで実行
      testMatch: [
        /.*01-authentication\.spec\.ts/,
        /.*02-school-settings\.spec\.ts/,
        /.*05-complete-integration\.spec\.ts/,
      ],
    },

    // Edge クロスブラウザテスト（最小限）
    {
      name: 'production-full-edge',
      use: {
        ...devices['Desktop Edge'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['production-full-setup'],
      // 認証と基本機能のみ
      testMatch: [/.*01-authentication\.spec\.ts/, /.*simple-app.*\.spec\.ts/],
    },

    // Mobile Chrome（レスポンシブテスト）
    {
      name: 'production-full-mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['production-full-setup'],
      // モバイル対応確認用（基本機能のみ）
      testMatch: [
        /.*01-authentication\.spec\.ts/,
        /.*simple-app.*\.spec\.ts/,
        /.*02-school-settings\.spec\.ts/,
      ],
    },

    // Mobile Safari（iOS対応確認）
    {
      name: 'production-full-mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['production-full-setup'],
      // iOS Safari対応確認（最小限）
      testMatch: [/.*01-authentication\.spec\.ts/, /.*simple-app.*\.spec\.ts/],
    },
  ],

  /* Test output directory */
  outputDir: 'test-results-production-full/',
})
