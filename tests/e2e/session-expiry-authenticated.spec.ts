import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 既存の認証済み状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

test.describe('認証済みセッション切れテスト', () => {
  test('データ管理画面でのセッション切れ検証', async ({ page }) => {
    console.log('🔍 認証済みセッション切れテスト開始')

    const baseURL =
      process.env.E2E_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      'https://school-timetable-monorepo.grundhunter.workers.dev'
    const errorMonitor = createErrorMonitor(page, '認証済みセッション切れテスト')

    // Step 1: 認証済み状態でデータ管理画面に移動
    console.log('Step 1: データ管理画面に移動（認証済み状態）')
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")', { timeout: 10000 })
    console.log('✅ データ管理画面表示成功（認証状態確認済み）')

    // Step 2: 認証状態を削除してセッション切れをシミュレート
    console.log('Step 2: 認証状態削除（セッション切れシミュレーション）')
    await page.evaluate(() => {
      // 認証情報を削除
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
      console.log('🚨 localStorage認証情報削除完了')

      // セッションストレージもクリア
      sessionStorage.clear()
      console.log('🚨 sessionStorage情報削除完了')
    })

    // ページ遷移の監視設定
    let redirectedToLogin = false
    let redirectUrl = ''

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        console.log(`🔄 ページ遷移検出: ${url}`)
        if (url.includes('/login')) {
          redirectedToLogin = true
          redirectUrl = url
          console.log('✅ ログインページへのリダイレクト検出')
        }
      }
    })

    // API レスポンス監視
    let api401Detected = false
    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        api401Detected = true
        console.log('🚨 API 401エラー検出:', response.url())
      }
    })

    // Step 3: API呼び出しが発生する操作を実行（基本設定保存）
    console.log('Step 3: 基本設定保存ボタンクリック（セッション切れで401エラー発生予定）')

    try {
      // 基本設定タブをクリック（既にアクティブかもしれませんが念のため）
      await page.click('button:has-text("基本設定")', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // 設定保存ボタンをクリック
      await page.click('button:has-text("設定を保存")', { timeout: 5000 })
      console.log('✅ 設定保存ボタンクリック完了')
    } catch (e) {
      console.log('⚠️ ボタンクリック時エラー:', e)

      // ページリロードでも同じ効果があるはず
      console.log('📄 ページリロードで認証チェックを実行')
      await page.reload()
    }

    // Step 4: ログインページへのリダイレクト確認（最大15秒待機）
    console.log('Step 4: ログインページリダイレクト確認')

    try {
      await page.waitForURL(/.*\/login/, { timeout: 15000 })
      console.log('✅ ログインページへのリダイレクト成功')
    } catch (_e) {
      console.log('⚠️ リダイレクト待機タイムアウト、現在のURL:', page.url())

      // URLに/loginが含まれているかチェック
      if (page.url().includes('/login')) {
        console.log('✅ 手動確認: URLにloginが含まれている')
      } else {
        console.log('❌ 手動確認: URLにloginが含まれていない')
      }
    }

    // Step 5: 結果検証
    console.log('📊 テスト結果:')
    console.log(`- API 401エラー検出: ${api401Detected}`)
    console.log(`- ログインページリダイレクト: ${redirectedToLogin}`)
    console.log(`- 最終URL: ${page.url()}`)
    console.log(`- リダイレクト先URL: ${redirectUrl}`)

    // アサーション
    const currentUrl = page.url()
    const isOnLoginPage = currentUrl.includes('/login')

    if (isOnLoginPage) {
      console.log('✅ ログインページに正常にリダイレクトされました')

      // ログインフォームの要素が存在するか確認
      try {
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
          timeout: 5000,
        })
        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
          timeout: 5000,
        })
        console.log('✅ ログインフォーム要素確認完了')
      } catch (e) {
        console.log('⚠️ ログインフォーム要素確認失敗:', e)
      }
    } else {
      console.log('❌ ログインページへのリダイレクトが確認できませんでした')
    }

    // 必須条件確認
    expect(isOnLoginPage).toBe(true)

    console.log('🎉 認証済みセッション切れテスト完了')

    // エラーモニタリング結果
    await errorMonitor.checkForErrors()
  })

  test('セッション切れ時のコンソールメッセージ確認', async ({ page }) => {
    console.log('🔍 セッション切れコンソールメッセージ確認テスト')

    const baseURL =
      process.env.E2E_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      'https://school-timetable-monorepo.grundhunter.workers.dev'
    const errorMonitor = createErrorMonitor(page, 'セッション切れコンソールメッセージテスト')

    // コンソールメッセージ監視
    const consoleMessages: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleMessages.push(text)
      if (text.includes('セッション切れ') || text.includes('ログインページに移動')) {
        console.log('✅ セッション切れ関連コンソールメッセージ検出:', text)
      }
    })

    // データ管理画面に移動
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")')

    // 無効なトークンを設定してAPI呼び出しでエラーを発生
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'invalid_expired_token_for_testing')
      console.log('🚨 無効なトークンを設定完了')
    })

    // API呼び出しを発生
    try {
      await page.click('button:has-text("設定を保存")')
    } catch (e) {
      console.log('設定保存ボタンクリック時エラー:', e)
    }

    // リダイレクト確認
    await page.waitForURL(/.*\/login/, { timeout: 15000 })

    // コンソールメッセージの確認
    console.log('📝 コンソールメッセージ一覧:')
    const relevantMessages = consoleMessages.filter(
      msg =>
        msg.includes('セッション切れ') ||
        msg.includes('ログインページ') ||
        msg.includes('401エラー') ||
        msg.includes('認証状態をクリア')
    )

    relevantMessages.forEach(msg => console.log(`  - ${msg}`))

    // セッション切れ関連のメッセージが存在することを確認
    const hasSessionExpiredMessage = relevantMessages.length > 0
    expect(hasSessionExpiredMessage).toBe(true)

    console.log('🎉 セッション切れコンソールメッセージ確認テスト完了')

    await errorMonitor.checkForErrors()
  })
})
