import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type FullConfig } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global setup for authentication...')

  // 認証状態ファイルのパス
  const authFile = path.join(__dirname, '.auth', 'user.json')

  // 環境変数から認証情報を取得（.env.e2eファイルから）
  const testUserEmail = process.env.TEST_USER_EMAIL || 'test@school.local'
  const testUserPassword = process.env.TEST_USER_PASSWORD || 'password123'

  console.log(`Using test credentials: ${testUserEmail}`)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    console.log('🌐 Navigating to application...')
    // ローカル開発環境を使用（playwright.config.tsのbaseURLまたは環境変数）
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // 認証状態のクリア処理
    const isLoggedIn = (await page.locator('button:has-text("データ登録")').count()) > 0

    if (isLoggedIn) {
      console.log('📤 Clearing existing authentication state...')
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.reload()
      await page.waitForLoadState('networkidle')
      console.log('✅ Authentication state cleared')
    }

    // カスタム認証システムの認証フローを実行
    console.log('🔍 Looking for authentication elements...')

    // ログイン画面の要素を待機
    const authElement = page.locator('input[type="email"], input[name="email"], form')
    await authElement.first().waitFor({ timeout: 10000 })

    console.log('✅ Authentication elements found')

    // メールアドレス入力
    const emailInput = page.locator('input[name="email"], input[type="email"]').first()
    if ((await emailInput.count()) > 0) {
      await emailInput.fill(testUserEmail)
      console.log('✅ Email filled')
    }

    // パスワード入力
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first()
    if ((await passwordInput.count()) > 0) {
      await passwordInput.fill(testUserPassword)
      console.log('✅ Password filled')
    }

    // ログインボタンをクリック - カスタム認証システム用
    console.log('🔍 Looking for submit button...')

    // まずEnterキーでの送信を試行
    if ((await passwordInput.count()) > 0) {
      await passwordInput.press('Enter')
      console.log('✅ Login submitted via Enter key')
      await page.waitForTimeout(2000)
    }

    // 次にログインボタンを探す
    const submitSelectors = [
      'button[type="submit"]:visible',
      'button:has-text("ログイン")',
      'button:has-text("Login")',
      '.btn-primary:visible',
    ]

    let submitSuccess = false
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first()
      if ((await button.count()) > 0) {
        try {
          // ボタンが有効になるまで待機
          await page.waitForTimeout(1000)

          await button.click()
          console.log(`✅ Login submitted via: ${selector}`)
          submitSuccess = true
          break
        } catch (error) {
          console.log(`⚠️ Failed to click ${selector}: ${error}`)
        }
      }
    }

    if (submitSuccess) {
      // 認証完了を待機（ローディング完了後に実際のMainAppとSidebarの要素を確認）
      try {
        console.log('⏳ Waiting for authentication to complete...')

        // ローディングスピナーが消えるのを待つ
        try {
          await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 })
          console.log('✅ Loading spinner disappeared')
        } catch (_) {
          console.log('⚠️ Loading spinner timeout (may not have appeared)')
        }

        // 認証後の状態安定化を待つ
        await page.waitForTimeout(3000)

        // Sidebarとメインアプリ要素の確認
        const successSelectors = [
          'nav', // Sidebar内のnav要素（91行目）
          'button:has-text("データ登録")', // Sidebarの実際のボタン
          'span:has-text("時間割システム")', // Sidebarのタイトル
          '.flex.h-screen.bg-gray-50', // MainAppのコンテナ
        ]

        let authSuccess = false
        for (const selector of successSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 8000 })
            console.log(`✅ Main app element found: ${selector}`)
            authSuccess = true
            break
          } catch (_) {
            // 次のセレクタを試行
          }
        }

        if (authSuccess) {
          console.log('✅ Authentication successful - main app loaded')
          await page.context().storageState({ path: authFile })
          console.log(`💾 Authentication state saved to: ${authFile}`)
        } else {
          throw new Error('No main app elements found')
        }
      } catch (_error) {
        console.log('⚠️ Could not confirm successful authentication, but continuing...')
        // 認証状態を保存（部分的成功として扱う）
        await page.context().storageState({ path: authFile })
      }
    } else {
      console.log('⚠️ No submit button found, trying to save current state...')
      await page.context().storageState({ path: authFile })
    }
  } catch (error) {
    console.error(`❌ Authentication setup failed: ${error}`)

    // ページが閉じられていない場合のみデバッグ情報を取得
    try {
      if (!page.isClosed()) {
        const currentUrl = page.url()
        const pageTitle = await page.title()
        console.log(`Current URL: ${currentUrl}`)
        console.log(`Page title: ${pageTitle}`)

        // スクリーンショットを保存
        await page.screenshot({ path: path.join(__dirname, '.auth', 'setup-failed.png') })
      } else {
        console.log('Page is already closed, skipping debug info collection')
      }
    } catch (debugError) {
      console.log(`Debug info collection failed: ${debugError}`)
    }

    // エラーがあっても続行（テスト実行時に再試行）
    console.log('⚠️ Continuing with setup despite authentication error...')
  } finally {
    await browser.close()
  }

  console.log('✅ Global setup completed')
}

export default globalSetup
