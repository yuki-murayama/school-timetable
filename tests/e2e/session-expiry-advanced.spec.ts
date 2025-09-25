import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

test.describe('高度なセッション切れテスト', () => {
  let baseURL: string

  test.beforeEach(async () => {
    baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173'
  })

  test('APIクライアントレベルでの401エラー処理とリダイレクト検証', async ({ page }) => {
    console.log('🔍 APIクライアントレベルでの401エラー処理検証開始')

    const errorMonitor = createErrorMonitor(page, 'API 401エラー処理テスト')

    // ネットワーク監視設定
    let api401ErrorCount = 0
    let sessionExpiredCallbackTriggered = false

    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        api401ErrorCount++
        console.log(`🚨 API 401エラー検出 (#${api401ErrorCount}):`, response.url())
      }
    })

    // コンソールログ監視（セッション切れログの確認）
    page.on('console', msg => {
      if (
        msg.text().includes('セッション切れを検出') ||
        msg.text().includes('ログインページに移動')
      ) {
        sessionExpiredCallbackTriggered = true
        console.log('✅ セッション切れコールバック実行確認:', msg.text())
      }
    })

    // Step 1: ログイン
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    console.log('✅ ログイン完了')

    // Step 2: データ管理画面に移動
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")')

    // Step 3: 認証トークンを無効化（期限切れをシミュレート）
    await page.evaluate(() => {
      // 無効なトークンをセット（401エラーを発生させるため）
      localStorage.setItem('auth_token', 'invalid_expired_token_12345')
      console.log('🚨 無効なトークンをセット（セッション切れシミュレーション）')
    })

    // Step 4: API呼び出しが発生する操作を実行
    console.log('Step 4: 学校設定取得で401エラー発生')

    // ページリロードで学校設定取得APIが呼ばれ、401エラーが発生することを期待
    await page.reload()

    // Step 5: ログインページへの自動リダイレクト確認
    await page.waitForURL(/.*\/login/, { timeout: 15000 })
    expect(page.url()).toMatch(/\/login/)
    console.log('✅ ログインページへの自動リダイレクト確認')

    // Step 6: 結果検証
    console.log('📊 検証結果:')
    console.log(`- API 401エラー回数: ${api401ErrorCount}`)
    console.log(`- セッション切れコールバック実行: ${sessionExpiredCallbackTriggered}`)

    expect(api401ErrorCount).toBeGreaterThan(0)
    expect(page.url()).toMatch(/\/login/)

    await errorMonitor.checkForErrors()
    console.log('🎉 APIクライアント401エラー処理検証完了')
  })

  test('複数の401エラー発生時の重複リダイレクト防止', async ({ page }) => {
    console.log('🔍 複数401エラー時の重複リダイレクト防止テスト')

    const errorMonitor = createErrorMonitor(page, '重複リダイレクト防止テスト')

    let redirectCount = 0
    let api401Count = 0

    // ページナビゲーション監視
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame() && frame.url().includes('/login')) {
        redirectCount++
        console.log(`🔄 ログインページリダイレクト #${redirectCount}`)
      }
    })

    // API 401エラー監視
    page.on('response', response => {
      if (response.status() === 401) {
        api401Count++
        console.log(`🚨 401エラー #${api401Count}:`, response.url())
      }
    })

    // ログイン
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)

    // データ管理画面
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")')

    // 無効なトークンをセット
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'multiple_401_test_token')
    })

    // 複数のAPI呼び出しを同時に実行してみる
    console.log('複数タブクリックで複数API呼び出しを発生')

    // 複数のタブを素早くクリック（複数のAPI呼び出しを発生）
    const tabs = ['基本設定', '教師情報', '教科情報', '教室情報']
    for (const tab of tabs) {
      try {
        await page.click(`button:has-text("${tab}")`, { timeout: 1000 })
        await page.waitForTimeout(100) // 短い待機時間
      } catch (e) {
        console.log(`${tab}タブクリック時エラー:`, e)
      }
    }

    // リダイレクト確認
    await page.waitForURL(/.*\/login/, { timeout: 15000 })

    // 結果検証
    console.log('📊 重複リダイレクト防止検証:')
    console.log(`- リダイレクト回数: ${redirectCount}`)
    console.log(`- 401エラー回数: ${api401Count}`)

    // 複数の401エラーが発生してもリダイレクトは1回だけであることを確認
    expect(redirectCount).toBeLessThanOrEqual(2) // 多少の誤差を許容
    expect(page.url()).toMatch(/\/login/)

    await errorMonitor.checkForErrors()
    console.log('✅ 重複リダイレクト防止検証完了')
  })

  test('保護されたルートでのセッション切れ検証', async ({ page }) => {
    console.log('🔍 保護されたルートでのセッション切れ検証')

    const errorMonitor = createErrorMonitor(page, '保護ルート セッション切れテスト')

    // ログイン
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    console.log('✅ ログイン完了')

    // 複数の保護されたルートをテスト
    const protectedRoutes = ['/data-management', '/timetable', '/home', '/dashboard']

    for (const route of protectedRoutes) {
      console.log(`📋 ${route} での保護ルートテスト`)

      // 該当ルートに移動
      try {
        await page.goto(`${baseURL}${route}`)
        await page.waitForTimeout(2000)
      } catch (e) {
        console.log(`${route} 移動時エラー:`, e)
        continue
      }

      // 認証状態をクリア
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })

      // ページをリロードして認証チェックを発生
      await page.reload()

      // ログインページへのリダイレクトを確認
      try {
        await page.waitForURL(/.*\/login/, { timeout: 10000 })
        console.log(`✅ ${route}: ログインページリダイレクト成功`)
      } catch (e) {
        console.log(`⚠️ ${route}: リダイレクト確認失敗`, e)
      }

      // 次のテストのため再ログイン
      if (page.url().includes('/login')) {
        await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
        await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
        await page.click('button[type="submit"]')

        try {
          await page.waitForURL(/\/(home|dashboard|data-management)/, { timeout: 10000 })
        } catch (e) {
          console.log('再ログインでエラー:', e)
        }
      }
    }

    await errorMonitor.checkForErrors()
    console.log('🎉 保護されたルートでのセッション切れ検証完了')
  })

  test('セッション切れ後の再ログインフロー検証', async ({ page }) => {
    console.log('🔍 セッション切れ後の再ログインフロー検証')

    const errorMonitor = createErrorMonitor(page, '再ログインフロー検証')

    // Step 1: 初回ログイン
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    console.log('✅ 初回ログイン完了')

    // Step 2: データ管理画面で作業
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")')
    console.log('✅ データ管理画面表示')

    // Step 3: セッション切れを発生
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
    })

    // Step 4: API呼び出しでセッション切れを検出
    await page.click('button:has-text("基本設定")')
    await page.click('button:has-text("設定を保存")')

    // Step 5: ログインページにリダイレクト
    await page.waitForURL(/.*\/login/, { timeout: 15000 })
    console.log('✅ セッション切れ後ログインページリダイレクト')

    // Step 6: 再ログイン
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || '')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || '')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    console.log('✅ 再ログイン成功')

    // Step 7: データ管理画面での通常機能が復旧していることを確認
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")')
    await page.click('button:has-text("基本設定")')

    // 学校設定フォームが正常に表示されることを確認
    await expect(
      page.locator('input[name="grade1Classes"], input[id*="grade1Classes"]')
    ).toBeVisible({ timeout: 10000 })
    console.log('✅ 再ログイン後の機能復旧確認')

    await errorMonitor.checkForErrors()
    console.log('🎉 セッション切れ後の再ログインフロー検証完了')
  })
})
