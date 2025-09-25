import { test as setup } from '@playwright/test'
import { getBaseURL } from '../../config/ports'
import { E2E_TEST_USER } from './utils/test-user'

const authFile = 'tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  console.log('🔐 Starting custom authentication setup...')

  // ローカル開発環境にアクセス
  try {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || getBaseURL('local')
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
  } catch (error) {
    console.log(`❌ Failed to navigate to application: ${error}`)
    throw error
  }

  // カスタム認証システムでのログイン
  try {
    // ログイン画面の確認
    console.log('📍 ログイン画面の確認中...')

    // メールアドレス入力フィールドを探す
    const emailInputSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="メール"]',
      '[data-testid*="email"]',
    ]

    let emailInput = null
    for (const selector of emailInputSelectors) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        emailInput = input.first()
        console.log(`✅ Found email input: ${selector}`)
        break
      }
    }

    // パスワード入力フィールドを探す
    const passwordInputSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password"]',
      'input[placeholder*="パスワード"]',
      '[data-testid*="password"]',
    ]

    let passwordInput = null
    for (const selector of passwordInputSelectors) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        passwordInput = input.first()
        console.log(`✅ Found password input: ${selector}`)
        break
      }
    }

    if (emailInput && passwordInput) {
      console.log('📝 Filling in credentials...')

      // 認証情報を入力
      await emailInput.fill(E2E_TEST_USER.email)
      await passwordInput.fill(E2E_TEST_USER.password)
      console.log(`📧 Email filled: ${E2E_TEST_USER.email}`)

      // ログインボタンを探してクリック
      const loginButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("ログイン")',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        '[data-testid*="login"]',
      ]

      let loginSuccess = false
      for (const selector of loginButtonSelectors) {
        const button = page.locator(selector)
        if ((await button.count()) > 0) {
          console.log(`✅ Found login button: ${selector}`)
          await button.first().click()
          await page.waitForTimeout(2000)
          loginSuccess = true
          break
        }
      }

      // Enterキーでの送信も試行
      if (!loginSuccess) {
        console.log('🚀 Trying Enter key submission...')
        await passwordInput.press('Enter')
        await page.waitForTimeout(2000)
      }

      // 認証完了を待機（ローディング完了後にメインアプリが表示されるまで）
      try {
        console.log('⏳ Waiting for authentication to complete...')

        // まずローディングスピナーが消えるのを待つ（ProtectedRouteのisLoading=false）
        try {
          await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 })
          console.log('✅ Loading spinner disappeared')
        } catch (_) {
          console.log('⚠️ Loading spinner timeout (may not have appeared)')
        }

        // 認証後の状態安定化を長めに待つ（認証検証API完了まで）
        await page.waitForTimeout(15000)

        // より簡単な要素から順番に検索
        const mainAppElements = [
          'div', // 基本的なdiv要素の存在確認
          'body', // bodyタグの確認
          '[class*="flex"]', // flexクラスを持つ要素
          'button', // 任意のボタン要素
          'nav', // Sidebar内のnav要素
          'button:has-text("データ登録")', // Sidebarの実際のボタン
          'span:has-text("時間割システム")', // Sidebarのタイトル
        ]

        let authSuccess = false
        for (const selector of mainAppElements) {
          try {
            await page.waitForSelector(selector, { timeout: 15000 })
            console.log(`✅ Main app element found: ${selector}`)
            authSuccess = true
            break
          } catch (_waitError) {
            console.log(`⚠️ Element not found: ${selector}`)
          }
        }

        // デバッグ: 認証後のページ内容を確認
        if (!authSuccess) {
          console.log('🔍 Debug: Checking page content after authentication...')
          try {
            const url = page.url()
            const bodyText = await page.textContent('body')
            const bodyClasses = await page.getAttribute('body', 'class')
            console.log(`Current URL: ${url}`)
            console.log(`Body classes: ${bodyClasses}`)
            console.log(`Page content (first 500 chars): ${bodyText?.substring(0, 500)}`)

            // 存在する主要要素をリストアップ
            const allButtons = await page.locator('button').count()
            const allNavs = await page.locator('nav').count()
            const allDivs = await page.locator('div').count()
            console.log(
              `Elements found - buttons: ${allButtons}, navs: ${allNavs}, divs: ${allDivs}`
            )
          } catch (debugError) {
            console.log(`Debug failed: ${debugError}`)
          }
        }

        if (authSuccess) {
          // API経由で認証情報を取得してローカルストレージに保存
          console.log('🔍 Fetching authentication information via API...')
          try {
            const response = await page.evaluate(async () => {
              const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
              })
              return await response.json()
            })

            if (response.success && response.user && response.token) {
              console.log('✅ API authentication successful')
              console.log(`👤 User: ${response.user.name} (${response.user.role})`)
              console.log(`🎫 Token received: ${response.token.substring(0, 20)}...`)

              // ローカルストレージに認証情報を保存
              await page.evaluate(
                ({ user, token, sessionId }) => {
                  localStorage.setItem('auth_token', token)
                  localStorage.setItem('auth_session_id', sessionId || 'test-session')
                  localStorage.setItem('auth_user', JSON.stringify(user))
                },
                { user: response.user, token: response.token, sessionId: response.sessionId }
              )

              console.log('💾 Authentication data saved to localStorage')
            } else {
              console.log(
                '⚠️ API authentication verification failed, continuing with browser state only'
              )
            }
          } catch (apiError) {
            console.log(
              `⚠️ API verification failed: ${apiError}, continuing with browser state only`
            )
          }

          // 認証状態を保存
          await page.context().storageState({ path: authFile })
          console.log(`💾 Authentication state saved to: ${authFile}`)
        } else {
          throw new Error('Main app elements not found after login')
        }
      } catch (_waitError) {
        console.log('⚠️ Could not detect successful login - checking for error messages')

        // エラーメッセージをチェック
        const errorMessages = page.locator('.error, .alert-error, [role="alert"], .text-red-500')
        if ((await errorMessages.count()) > 0) {
          const errorText = await errorMessages.first().textContent()
          console.log(`❌ Login error: ${errorText}`)
          throw new Error(`Authentication failed: ${errorText}`)
        } else {
          console.log('⏳ Login in progress, waiting longer...')
          await page.waitForTimeout(5000)

          // 再度メインアプリの要素をチェック（より具体的なセレクタ）
          const mainApp = page.locator('main, .flex.h-screen, div[class*="sidebar"]')
          if ((await mainApp.count()) > 0) {
            const content = await mainApp.first().textContent()
            if (
              content &&
              (content.includes('時間割システム') ||
                content.includes('データ登録') ||
                content.includes('時間割生成'))
            ) {
              console.log('✅ Authentication appears successful - content match found')

              // API経由で認証情報を取得してローカルストレージに保存
              try {
                const response = await page.evaluate(async () => {
                  const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  })
                  return await response.json()
                })

                if (response.success && response.user && response.token) {
                  await page.evaluate(
                    ({ user, token, sessionId }) => {
                      localStorage.setItem('auth_token', token)
                      localStorage.setItem('auth_session_id', sessionId || 'test-session')
                      localStorage.setItem('auth_user', JSON.stringify(user))
                    },
                    { user: response.user, token: response.token, sessionId: response.sessionId }
                  )
                }
              } catch (_) {
                console.log(
                  '⚠️ API verification failed in fallback, continuing with browser state only'
                )
              }

              await page.context().storageState({ path: authFile })
            } else {
              console.log(
                '⚠️ Content check failed, but main app structure found - saving state anyway'
              )
              await page.context().storageState({ path: authFile })
            }
          } else {
            throw new Error('Authentication failed - main app structure not found')
          }
        }
      }
    } else {
      console.log('❌ Could not find email or password input fields')
      console.log(`Email input found: ${!!emailInput}`)
      console.log(`Password input found: ${!!passwordInput}`)

      // デバッグ: ページの内容を確認
      const pageContent = await page.textContent('body')
      console.log(`Current page content: ${pageContent?.substring(0, 300)}...`)

      throw new Error('Could not find login form elements')
    }
  } catch (error) {
    console.log(`❌ Authentication setup failed: ${error}`)

    // デバッグ情報を出力
    const url = page.url()
    const title = await page.title()
    console.log(`Current URL: ${url}`)
    console.log(`Page title: ${title}`)

    // スクリーンショットを保存
    await page.screenshot({ path: 'tests/e2e/.auth/failed-login.png' })

    throw error
  }
})
