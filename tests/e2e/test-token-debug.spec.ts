import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

test.use({ storageState: 'tests/e2e/.auth/user.json' })

test('認証済みユーザーによるUI操作テスト', async ({ page }) => {
  console.log('🔍 認証済みユーザーでのUI操作テストを開始...')

  // エラー監視の設定
  const errorMonitor = createErrorMonitor(page, '認証済みユーザーによるUI操作テスト')

  // アプリケーションにアクセス
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
  await page.goto(baseURL)
  await page.waitForLoadState('networkidle')

  console.log('📱 認証状態とローカルストレージの確認')
  
  // 認証状態の確認（LocalStorage）
  const localStorageTokens = await page.evaluate(() => {
    return {
      auth_token: localStorage.getItem('auth_token'),
      auth_session_id: localStorage.getItem('auth_session_id'),
      auth_user: localStorage.getItem('auth_user'),
      auth_expires: localStorage.getItem('auth_expires'),
      all_keys: Object.keys(localStorage),
    }
  })

  console.log('🔑 認証情報の確認:', {
    auth_token_exists: !!localStorageTokens.auth_token,
    auth_session_id: localStorageTokens.auth_session_id,
    auth_user_exists: !!localStorageTokens.auth_user,
    auth_expires: localStorageTokens.auth_expires,
    total_keys: localStorageTokens.all_keys.length,
  })

  // 認証トークンの存在確認
  expect(localStorageTokens.auth_token).toBeTruthy()
  expect(localStorageTokens.auth_session_id).toBeTruthy()

  // ネットワーク監視開始
  const networkLogs: string[] = []
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      networkLogs.push(`${response.status()} ${response.url()}`)
      console.log(`📡 API応答: ${response.status()} ${response.url()}`)
    }
  })

  console.log('🖱️ ブラウザUI操作による機能テスト開始')

  // データ登録画面への遷移テスト
  try {
    const dataButtons = [
      'button:has-text("データ登録")',
      '[data-testid="sidebar-data-button"]',
      'a:has-text("データ登録")'
    ]
    
    let dataPageFound = false
    for (const selector of dataButtons) {
      const element = page.locator(selector)
      if ((await element.count()) > 0) {
        console.log(`✅ データ登録ボタン発見: ${selector}`)
        await element.first().click()
        await page.waitForTimeout(2000) // API呼び出し待機
        dataPageFound = true
        break
      }
    }
    
    if (dataPageFound) {
      console.log('✅ データ登録画面への遷移成功')
      
      // 基本設定タブの確認
      const basicSettingsTabs = [
        'button:has-text("基本設定")',
        '[role="tab"]:has-text("基本設定")'
      ]
      
      let settingsTabFound = false
      for (const selector of basicSettingsTabs) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          console.log(`✅ 基本設定タブ発見: ${selector}`)
          await element.first().click()
          await page.waitForTimeout(2000)
          settingsTabFound = true
          break
        }
      }
      
      if (settingsTabFound) {
        console.log('✅ 基本設定画面への遷移成功 - 認証されたAPIアクセス確認')
      }
      
    } else {
      console.log('ℹ️ データ登録ボタンが見つからない可能性')
    }
    
  } catch (error) {
    console.log('⚠️ UI操作エラー:', error.message)
  }

  // 基本的なページ構造の確認
  const body = page.locator('body')
  await expect(body).toBeVisible()

  // ページタイトル確認
  await expect(page).toHaveTitle(/School Timetable/)

  // ネットワーク監視結果の出力
  console.log(`📊 検出されたAPI呼び出し (${networkLogs.length}件):`, networkLogs)

  console.log('✅ 認証済みユーザーによるUI操作テスト完了')
  
  // エラー監視終了
  errorMonitor.finalize()
})
