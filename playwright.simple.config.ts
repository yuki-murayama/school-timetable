import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // 認証セットアップを無効化
  // globalSetup: './tests/e2e/global-setup.ts',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 認証状態ファイルを使用しない
        // storageState: 'tests/e2e/.auth/user.json',
      },
    },
  ],

  webServer: {
    command: 'npm run dev:frontend',
    port: 5174,
    reuseExistingServer: !process.env.CI,
  },
})
