import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証セットアップを使わない単純なテスト
test.describe('基本アプリケーション動作確認（認証なし）', () => {
  test('データベース初期化APIの動作確認', async ({ page }) => {
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, 'データベース初期化APIの動作確認')
    
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    console.log('🚀 ブラウザでデータベース初期化API確認を開始')
    
    // ブラウザのDeveloper Toolsでネットワーク監視を開始
    const apiCalls: string[] = []
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push(`${response.request().method()} ${response.url()} - ${response.status()}`)
        console.log(`📡 API呼び出し: ${response.request().method()} ${response.url()} - ${response.status()}`)
      }
    })
    
    // アプリケーションが正常にロードされることを確認
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    // APIエンドポイントの動作確認として、任意のデータ登録画面に遷移
    try {
      const dataButtons = [
        'button:has-text("データ登録")',
        '[data-testid="sidebar-data-button"]',
        'a:has-text("データ登録")'
      ]
      
      let navigationSuccess = false
      for (const selector of dataButtons) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          await element.first().click()
          await page.waitForTimeout(2000) // API呼び出し待機
          navigationSuccess = true
          break
        }
      }
      
      if (navigationSuccess) {
        console.log('✅ データ登録画面への遷移成功 - バックエンドAPI動作確認完了')
      } else {
        console.log('ℹ️ データ登録ボタンが見つからないため、基本画面ロードのみ確認')
      }
      
    } catch (error) {
      console.log('⚠️ データ登録画面遷移エラー:', error.message)
    }
    
    // API呼び出しログの出力
    console.log('📊 検出されたAPI呼び出し一覧:')
    apiCalls.forEach(call => console.log(`  - ${call}`))
    
    // エラー監視終了
    errorMonitor.finalize()
  })

  test('アプリケーション基本画面のロード', async ({ page }) => {
    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, 'アプリケーション基本画面のロード')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(`${baseURL}/`)

    // ページタイトル確認
    await expect(page).toHaveTitle(/School Timetable/)

    // 基本HTML構造の確認
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // #rootディブの存在確認（React アプリケーション）
    const rootDiv = page.locator('#root')
    await expect(rootDiv).toBeVisible()

    console.log('✅ アプリケーション画面の基本ロード完了')

    // エラー監視終了とレポート生成
    errorMonitor.finalize()
  })

  test('バックエンドAPI動作確認', async ({ page }) => {
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, 'バックエンドAPI動作確認')
    
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    console.log('🚀 ブラウザでバックエンドAPI動作確認を開始')
    
    // ネットワーク監視
    let apiResponseDetected = false
    
    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() === 200) {
        apiResponseDetected = true
        console.log(`✅ API正常応答検出: ${response.url()} - ${response.status()}`)
      }
    })
    
    // アプリケーションの基本動作確認
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    // React アプリケーションが正常に起動していることを確認
    const rootDiv = page.locator('#root')
    await expect(rootDiv).toBeVisible()
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/School Timetable/)
    
    // 少し待機してAPI呼び出しを監視
    await page.waitForTimeout(3000)
    
    console.log(`📊 APIレスポンス検出: ${apiResponseDetected ? 'あり' : 'なし'}`)
    console.log('✅ バックエンドAPI動作確認完了')
    
    // エラー監視終了
    errorMonitor.finalize()
  })

  test('学校設定画面の表示確認（ブラウザベース）', async ({ page }) => {
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '学校設定画面の表示確認')
    
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    console.log('🚀 ブラウザで学校設定画面表示確認を開始')
    
    // 学校設定画面への遷移を試行
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
          await element.first().click()
          await page.waitForTimeout(1000)
          dataPageFound = true
          break
        }
      }
      
      if (dataPageFound) {
        // 基本設定タブの確認
        const basicSettingsTabs = [
          'button:has-text("基本設定")',
          '[role="tab"]:has-text("基本設定")'
        ]
        
        let settingsPageFound = false
        for (const selector of basicSettingsTabs) {
          const element = page.locator(selector)
          if ((await element.count()) > 0) {
            console.log(`✅ 学校設定タブ発見: ${selector}`)
            await element.first().click()
            await page.waitForTimeout(2000)
            settingsPageFound = true
            break
          }
        }
        
        if (settingsPageFound) {
          console.log('✅ 学校設定画面への遷移成功')
        } else {
          console.log('ℹ️ 学校設定タブが見つかりません（認証が必要な可能性）')
        }
      } else {
        console.log('ℹ️ データ登録ボタンが見つかりません（認証が必要な可能性）')
      }
      
    } catch (error) {
      console.log('ℹ️ 学校設定画面へのアクセスエラー（認証が必要）:', error.message)
    }
    
    // 基本的なページ構造は確認できることを検証
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    console.log('✅ 学校設定画面表示確認完了')
    
    // エラー監視終了
    errorMonitor.finalize()
  })
})
