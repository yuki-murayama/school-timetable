import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 既存の認証済み状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

test.describe('セッション切れ動作確認テスト', () => {
  test('セッション切れ後のログイン強制移動確認', async ({ page }) => {
    console.log('🔍 セッション切れ動作確認テスト開始')

    const baseURL =
      process.env.E2E_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      'https://school-timetable-monorepo.grundhunter.workers.dev'
    const errorMonitor = createErrorMonitor(page, 'セッション切れ動作確認')

    // Step 1: データ管理画面に移動
    console.log('Step 1: データ管理画面に移動')
    await page.goto(`${baseURL}/data-management`)
    await page.waitForLoadState('networkidle')

    // 現在のページを確認
    const currentUrl = page.url()
    console.log('📍 現在のURL:', currentUrl)

    // 時間割生成またはデータ管理関連の要素があることを確認
    const hasTimeTableHeading =
      (await page
        .locator('h1:has-text("時間割生成"), h2:has-text("時間割生成"), h3:has-text("時間割生成")')
        .count()) > 0
    const hasDataElements = (await page.locator('button, div, span').count()) > 0

    if (hasTimeTableHeading || hasDataElements) {
      console.log('✅ データ管理画面確認完了')
    } else {
      console.log('⚠️ ページ内容確認中...')
      const pageContent = await page.content()
      console.log('ページ内容の一部:', pageContent.substring(0, 300))
    }

    // Step 2: セッション切れシミュレーション
    console.log('Step 2: 認証状態削除（セッション切れシミュレーション）')

    // ページ遷移監視開始
    let redirectCount = 0
    let _finalUrl = ''

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        console.log(`🔄 ページ遷移: ${url}`)
        if (url.includes('/login')) {
          redirectCount++
          _finalUrl = url
          console.log(`✅ ログインページリダイレクト #${redirectCount}`)
        }
      }
    })

    // API 401エラー監視
    let api401Count = 0
    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        api401Count++
        console.log(`🚨 API 401エラー #${api401Count}: ${response.url()}`)
      }
    })

    // 認証状態を削除
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
      console.log('🚨 認証情報削除完了')
    })

    // Step 3: セッション切れを発生させる操作
    console.log('Step 3: セッション切れ発生操作（ページリロード）')

    // ページリロードで認証が必要なAPI呼び出しを発生させる
    await page.reload()

    // Step 4: リダイレクト確認
    console.log('Step 4: ログインページリダイレクト確認')

    // 最大20秒待機
    try {
      await page.waitForURL(/.*\/login/, { timeout: 20000 })
      console.log('✅ ログインページへの自動リダイレクト成功')
    } catch (_e) {
      console.log('⚠️ URL待機タイムアウト、手動確認実行')

      // 追加の待機時間
      await page.waitForTimeout(3000)

      const currentPageUrl = page.url()
      console.log('現在のURL:', currentPageUrl)

      if (currentPageUrl.includes('/login')) {
        console.log('✅ 手動確認: ログインページにいます')
      }
    }

    // Step 5: ログインフォーム確認
    console.log('Step 5: ログインフォーム要素確認')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン")')

    const hasEmailInput = (await emailInput.count()) > 0
    const hasPasswordInput = (await passwordInput.count()) > 0
    const hasSubmitButton = (await submitButton.count()) > 0

    console.log('📋 ログインフォーム要素確認:')
    console.log(`  - Email入力: ${hasEmailInput}`)
    console.log(`  - Password入力: ${hasPasswordInput}`)
    console.log(`  - 送信ボタン: ${hasSubmitButton}`)

    if (hasEmailInput && hasPasswordInput) {
      console.log('✅ ログインフォーム要素確認完了')
    }

    // Step 6: テスト結果検証
    console.log('📊 セッション切れテスト結果:')
    console.log(`  - API 401エラー数: ${api401Count}`)
    console.log(`  - リダイレクト回数: ${redirectCount}`)
    console.log(`  - 最終URL: ${page.url()}`)
    console.log(`  - ログインページ判定: ${page.url().includes('/login')}`)
    console.log(`  - ログインフォーム存在: ${hasEmailInput && hasPasswordInput}`)

    // アサーション
    const isOnLoginPage = page.url().includes('/login')
    const hasLoginForm = hasEmailInput && hasPasswordInput

    // セッション切れ後にログインページに移動していることを確認
    expect(isOnLoginPage || hasLoginForm).toBe(true)

    if (isOnLoginPage) {
      console.log('🎉 セッション切れ後のログインページ自動移動機能が正常に動作しています！')
    } else if (hasLoginForm) {
      console.log('🎉 ログインフォームが表示されており、セッション切れ処理が動作しています！')
    } else {
      console.log('❌ セッション切れ処理が期待通りに動作していません')
    }

    // エラーモニタリング結果
    errorMonitor.finalize()

    console.log('🎉 セッション切れ動作確認テスト完了')
  })

  test('実際のAPIエラー発生によるセッション切れテスト', async ({ page }) => {
    console.log('🔍 実際のAPIエラー発生によるセッション切れテスト')

    const baseURL =
      process.env.E2E_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      'https://school-timetable-monorepo.grundhunter.workers.dev'
    const errorMonitor = createErrorMonitor(page, '実際のAPIエラーセッション切れテスト')

    // データ管理画面に移動
    await page.goto(`${baseURL}/data-management`)
    await page.waitForLoadState('networkidle')
    console.log('✅ データ管理画面表示')

    // 無効なトークンを設定
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'invalid_token_will_cause_401_error')
      localStorage.setItem('auth_session_id', 'invalid_session')
      console.log('🚨 無効な認証トークンを設定')
    })

    // API エラー監視
    let apiError = false
    let redirected = false

    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        apiError = true
        console.log('🚨 実際の401 APIエラー検出:', response.url())
      }
    })

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame() && frame.url().includes('/login')) {
        redirected = true
        console.log('✅ 401エラー後のログインページリダイレクト検出')
      }
    })

    // ページリロードでAPI呼び出しを発生
    console.log('📄 ページリロードで無効トークンによるAPI 401エラーを発生')
    await page.reload()

    // リダイレクト待機
    try {
      await page.waitForURL(/.*\/login/, { timeout: 15000 })
      console.log('✅ API 401エラー後のログインページリダイレクト成功')
    } catch (_e) {
      console.log('⚠️ リダイレクト待機タイムアウト')
    }

    // 結果確認
    console.log('📊 API エラーセッション切れテスト結果:')
    console.log(`  - API 401エラー発生: ${apiError}`)
    console.log(`  - ログインページリダイレクト: ${redirected}`)
    console.log(`  - 現在URL: ${page.url()}`)

    // アサーション
    expect(page.url().includes('/login')).toBe(true)

    console.log('🎉 実際のAPIエラー発生によるセッション切れテスト完了')

    errorMonitor.finalize()
  })
})
