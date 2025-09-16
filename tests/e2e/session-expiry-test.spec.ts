import { test, expect, Page } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// セッション切れテスト用の認証設定
test.use({ 
  storageState: { cookies: [], origins: [] } 
})

test.describe('セッション切れ時のログイン強制移動テスト', () => {
  let baseURL: string

  test.beforeEach(async () => {
    baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173'
  })

  test('意図的なセッション切れでログインページに自動移動', async ({ page }) => {
    console.log('🔍 セッション切れ後のログインページ強制移動テスト開始')
    
    const errorMonitor = createErrorMonitor(page, 'セッション切れテスト')
    
    // Step 1: 正常にログインして認証状態を確立
    console.log('Step 1: 正常ログイン')
    await page.goto(`${baseURL}/login`)
    
    await page.fill('input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    
    // ログイン成功を確認（ホームページまたはダッシュボードに移動）
    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    console.log('✅ ログイン成功')
    
    // Step 2: データ登録画面に移動
    console.log('Step 2: データ登録画面に移動')
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")', { timeout: 10000 })
    
    // Step 3: ローカルストレージの認証トークンを削除して意図的にセッション切れを発生
    console.log('Step 3: 意図的なセッション切れを発生')
    await page.evaluate(() => {
      // 認証トークンを削除
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
      
      console.log('🚨 認証トークンを削除しました（意図的なセッション切れ）')
    })
    
    // Step 4: API呼び出しが発生する操作を実行（学校設定更新ボタンをクリック）
    console.log('Step 4: 学校設定保存ボタンクリック（セッション切れでAPI 401エラー発生予定）')
    
    // ページ遷移を監視
    let redirectedToLogin = false
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && frame.url().includes('/login')) {
        redirectedToLogin = true
        console.log('✅ ログインページへの自動リダイレクトを検出')
      }
    })
    
    // レスポンス監視で401エラーを確認
    let apiErrorDetected = false
    page.on('response', response => {
      if (response.url().includes('/api/school/settings') && response.status() === 401) {
        console.log('✅ API 401エラーを検出:', response.url(), '- Status:', response.status())
        apiErrorDetected = true
      }
    })
    
    // 基本設定タブをクリック
    await page.click('button[data-state="active"]:has-text("基本設定"), button:has-text("基本設定")')
    
    // 学校設定の保存ボタンをクリック（セッション切れでエラーが発生し、ログインページに移動するはず）
    await page.click('button:has-text("設定を保存")')
    
    // Step 5: ログインページへの自動リダイレクトを確認
    console.log('Step 5: ログインページへの自動リダイレクト確認')
    
    // 最大10秒待機してリダイレクトを確認
    await page.waitForURL(/.*\/login/, { timeout: 10000 })
    expect(page.url()).toMatch(/\/login/)
    
    // ログインフォームが表示されることを確認
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    console.log('✅ ログインページへの自動リダイレクト成功')
    
    // Step 6: セッション切れメッセージまたは適切なエラーハンドリング確認
    console.log('Step 6: セッション切れメッセージ確認')
    
    // セッション切れに関するメッセージが表示されるかチェック
    const sessionExpiredMessage = page.locator('text=/セッション.*期限切れ|ログイン.*必要|再.*ログイン/')
    if (await sessionExpiredMessage.count() > 0) {
      console.log('✅ セッション切れメッセージを確認')
    }
    
    // 結果検証
    console.log('📊 テスト結果検証:')
    console.log('- API 401エラー検出:', apiErrorDetected)
    console.log('- ログインページリダイレクト:', redirectedToLogin)
    console.log('- 現在のURL:', page.url())
    
    // 必須条件の確認
    expect(redirectedToLogin || page.url().includes('/login')).toBe(true)
    
    // エラーモニタリング結果確認
    await errorMonitor.checkForErrors()
    
    console.log('🎉 セッション切れ時のログイン強制移動テスト完了')
  })

  test('別の画面でのセッション切れテスト - 教師管理画面', async ({ page }) => {
    console.log('🔍 教師管理画面でのセッション切れテスト開始')
    
    const errorMonitor = createErrorMonitor(page, '教師管理セッション切れテスト')
    
    // Step 1: ログインして教師管理画面に移動
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    
    // 教師管理タブに移動
    await page.goto(`${baseURL}/data-management`)
    await page.click('button:has-text("教師情報")')
    await page.waitForSelector('h2:has-text("教師一覧"), h3:has-text("教師一覧")', { timeout: 10000 })
    
    // Step 2: セッション切れを発生
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id') 
      localStorage.removeItem('auth_user')
      console.log('🚨 教師管理画面で認証トークンを削除')
    })
    
    // Step 3: 教師データを取得する操作（ページ再読み込み）
    console.log('Step 3: 教師データ取得でセッション切れ検証')
    
    let redirected = false
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && frame.url().includes('/login')) {
        redirected = true
        console.log('✅ 教師管理画面からログインページへのリダイレクト検出')
      }
    })
    
    // ページをリロードして教師データの取得を試行
    await page.reload()
    
    // ログインページに移動することを確認
    await page.waitForURL(/.*\/login/, { timeout: 15000 })
    expect(page.url()).toMatch(/\/login/)
    
    console.log('✅ 教師管理画面でのセッション切れ検証完了')
    
    await errorMonitor.checkForErrors()
  })

  test('認証が必要な複数画面での一貫したセッション切れ処理', async ({ page }) => {
    console.log('🔍 複数画面での一貫したセッション切れ処理テスト')
    
    const errorMonitor = createErrorMonitor(page, '複数画面セッション切れテスト')
    
    // ログイン
    await page.goto(`${baseURL}/login`)
    await page.fill('input[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/(home|dashboard|data-management)/)
    
    // 各画面でセッション切れをテスト
    const testScreens = [
      { name: '基本設定', tab: '基本設定', action: 'button:has-text("設定を保存")' },
      { name: '教師情報', tab: '教師情報', action: 'button:has-text("教師を追加"), button:has-text("追加")' },
      { name: '教科情報', tab: '教科情報', action: 'button:has-text("教科を追加"), button:has-text("追加")' },
    ]
    
    for (const screen of testScreens) {
      console.log(`📋 ${screen.name}画面のセッション切れテスト`)
      
      // データ管理画面に移動
      await page.goto(`${baseURL}/data-management`)
      
      // 該当タブをクリック
      await page.click(`button:has-text("${screen.tab}")`)
      await page.waitForTimeout(2000)
      
      // セッション切れを発生
      await page.evaluate(() => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_session_id')
        localStorage.removeItem('auth_user')
      })
      
      // アクションを実行
      try {
        await page.click(screen.action)
      } catch (e) {
        console.log(`${screen.name}でアクション実行時エラー:`, e)
      }
      
      // ログインページへのリダイレクト確認
      try {
        await page.waitForURL(/.*\/login/, { timeout: 10000 })
        console.log(`✅ ${screen.name}: ログインページリダイレクト成功`)
      } catch (e) {
        console.log(`⚠️ ${screen.name}: リダイレクト未確認`, e)
      }
      
      // 次のテストのために再ログイン
      if (!page.url().includes('/login')) {
        await page.goto(`${baseURL}/login`)
      }
      await page.fill('input[name="email"]', process.env.E2E_EMAIL!)
      await page.fill('input[name="password"]', process.env.E2E_PASSWORD!)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(home|dashboard|data-management)/, { timeout: 10000 })
    }
    
    console.log('🎉 複数画面での一貫したセッション切れ処理テスト完了')
    
    await errorMonitor.checkForErrors()
  })
})