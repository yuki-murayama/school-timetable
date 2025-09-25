import { test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

test.describe('🔍 本番環境デバッグテスト', () => {
  test('本番環境の状態確認', async ({ page }) => {
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '本番環境の状態確認')

    console.log('🚀 本番環境デバッグテスト開始')

    // 本番環境にアクセス
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // ページタイトル確認
    const title = await page.title()
    console.log(`📄 ページタイトル: ${title}`)

    // URL確認
    const url = page.url()
    console.log(`🌐 現在URL: ${url}`)

    // ローカルストレージ確認
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    const authUser = await page.evaluate(() => localStorage.getItem('auth_user'))
    console.log(
      `🎫 認証トークン: ${authToken ? `存在（${authToken.substring(0, 20)}...)` : '無し'}`
    )
    console.log(`👤 ユーザー情報: ${authUser || '無し'}`)

    // ページ内容確認
    const bodyText = await page.textContent('body')
    console.log(`📝 ページ内容（最初の500文字）: ${bodyText?.substring(0, 500)}`)

    // ボタン要素確認
    const allButtons = await page.locator('button').count()
    console.log(`🔘 ボタン総数: ${allButtons}`)

    // 特定ボタンの検索
    const dataRegButton = page.locator('button:has-text("データ登録")')
    const dataRegCount = await dataRegButton.count()
    console.log(`📊 データ登録ボタン: ${dataRegCount}個`)

    const loginButton = page.locator('button:has-text("ログイン")')
    const loginCount = await loginButton.count()
    console.log(`🔐 ログインボタン: ${loginCount}個`)

    // すべてのボタンのテキスト取得
    const buttonTexts = await page.locator('button').allTextContents()
    console.log(`🔘 全ボタンテキスト: ${JSON.stringify(buttonTexts)}`)

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/production-debug-screenshot.png', fullPage: true })
    console.log('📸 スクリーンショットを保存しました')

    console.log('✅ デバッグテスト完了')

    // エラー監視終了
    errorMonitor.finalize()
  })
})
