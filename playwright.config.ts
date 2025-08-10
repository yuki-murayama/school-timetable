import { defineConfig, devices } from '@playwright/test'

/**
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
  workers: process.env.CI ? 1 : 3, // Reduced from default 5 to 3 for better stability
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['json', { outputFile: 'test-results/test-results.json' }], ['list']],
  /* Global setup for authentication */
  globalSetup: './tests/e2e/global-setup.ts',
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

    /* Timeout settings */
    actionTimeout: 10000, // 10 seconds for individual actions
    navigationTimeout: 20000, // 20 seconds for page navigation
  },

  /* Global test timeout - Reduced for faster feedback */
  timeout: 60000, // 1 minute per test

  /* Default project configuration - Chrome only for fastest execution */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Default authenticated tests (Chrome only - primary development browser)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Unauthenticated tests (for API testing, etc.)
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*api.*\.spec\.ts/,
    },

    // ===== CROSS-BROWSER PROJECTS (For final verification only) =====
    // These are commented out by default to speed up development
    // Uncomment or use explicit --project flags for cross-browser testing
    /*
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    */
  ],

  /* Commented out local dev server for now - using deployed URL instead */
  // webServer: [
  //   {
  //     command: 'npm run dev:frontend',
  //     port: 5173,
  //     reuseExistingServer: !process.env.CI,
  //     env: {
  //       NODE_ENV: 'test'
  //     }
  //   },
  //   {
  //     command: 'npm run dev:backend',
  //     port: 8787,
  //     reuseExistingServer: !process.env.CI,
  //     env: {
  //       NODE_ENV: 'test'
  //     }
  //   }
  // ],
})
