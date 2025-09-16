import { test, expect } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

test.describe('セッション切れ簡単テスト', () => {
  test('認証状態削除後のログインページリダイレクト', async ({ page }) => {
    console.log('🔍 セッション切れ簡単テスト開始')
    
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5175'
    const errorMonitor = createErrorMonitor(page, 'セッション切れ簡単テスト')
    
    // Step 1: ログイン画面に移動してログイン
    console.log('Step 1: ログイン実行')
    await page.goto(`${baseURL}/login`)
    
    await page.fill('input[name="email"]', process.env.E2E_EMAIL || 'admin@example.com')
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD || 'password123')
    await page.click('button[type="submit"]')
    
    // ログイン成功確認
    await page.waitForURL(/\/(home|dashboard|data-management)/, { timeout: 10000 })
    console.log('✅ ログイン成功')
    
    // Step 2: データ管理画面に移動
    console.log('Step 2: データ管理画面移動')
    await page.goto(`${baseURL}/data-management`)
    await page.waitForSelector('h1:has-text("データ登録")', { timeout: 10000 })
    console.log('✅ データ管理画面表示成功')
    
    // Step 3: 認証状態を削除（セッション切れをシミュレート）
    console.log('Step 3: 認証状態削除')
    await page.evaluate(() => {
      // 認証情報を削除してセッション切れをシミュレート
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
      console.log('🚨 認証情報削除完了')
    })
    
    // Step 4: ページをリロードして認証チェックを発生させる
    console.log('Step 4: ページリロードで認証チェック')
    await page.reload()
    
    // Step 5: ログインページへのリダイレクト確認
    console.log('Step 5: リダイレクト確認')
    try {
      await page.waitForURL(/.*\/login/, { timeout: 15000 })
      console.log('✅ ログインページへのリダイレクト成功')
    } catch (e) {
      console.log('⚠️ リダイレクト未確認、現在のURL:', page.url())
    }
    
    // 結果検証
    expect(page.url()).toMatch(/\/login/)
    
    // ログインフォームが表示されることを確認
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="password"]')).toBeVisible()
    
    console.log('🎉 セッション切れ簡単テスト完了')
    
    await errorMonitor.checkForErrors()
  })
})