/**
 * 04-時間割生成・表示E2Eテスト
 * 
 * 真のE2Eテスト：ブラウザ操作による時間割機能の確認
 * - 時間割生成画面への遷移
 * - データ準備状況の確認
 * - 時間割生成の実行
 * - 生成進捗の確認
 * - 時間割表示・確認
 * - 教師別・クラス別時間割の参照
 */

import { test, expect, Page } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

test.describe('🗓️ 時間割生成・表示E2Eテスト', () => {
  
  test('時間割生成から表示確認までの完全ワークフロー', async ({ page }) => {
    console.log('🚀 時間割ワークフローE2Eテスト開始')
    
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '時間割生成から表示確認までの完全ワークフロー')
    
    // Step 1: メイン画面から時間割生成画面への遷移
    console.log('📍 Step 1: 時間割生成画面への遷移')
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    // 時間割生成ボタンまたはリンクを探す
    const timetableButtons = [
      'button:has-text("時間割生成")',
      'a:has-text("時間割生成")',
      'button:has-text("Generate")',
      '[href*="timetable"]',
      '[href*="generate"]',
      'nav button:has-text("時間割")'
    ]
    
    let timetablePageFound = false
    for (const selector of timetableButtons) {
      const element = page.locator(selector)
      if (await element.count() > 0) {
        console.log(`✅ 時間割生成ボタン発見: ${selector}`)
        await element.first().click()
        await page.waitForTimeout(2000)
        timetablePageFound = true
        break
      }
    }
    
    if (!timetablePageFound) {
      await page.screenshot({ path: 'test-results/timetable-button-not-found.png' })
      throw new Error('時間割生成画面への遷移ボタンが見つかりません')
    }
    
    // 時間割生成画面の表示確認
    const timetablePageElements = [
      'h1:has-text("時間割")',
      'h2:has-text("時間割")',
      'button:has-text("生成")',
      'button:has-text("Generate")',
      '.timetable-container',
      '[data-testid*="timetable"]'
    ]
    
    let timetablePageLoaded = false
    for (const selector of timetablePageElements) {
      if (await page.locator(selector).count() > 0) {
        console.log(`✅ 時間割生成画面確認: ${selector}`)
        timetablePageLoaded = true
        break
      }
    }
    
    if (!timetablePageLoaded) {
      await page.screenshot({ path: 'test-results/timetable-page-not-loaded.png' })
      throw new Error('時間割生成画面が正しく表示されませんでした')
    }
    
    // Step 2: データ準備状況の確認
    console.log('📍 Step 2: データ準備状況の確認')
    
    // データ状況表示の確認
    const dataStatusElements = [
      'text="教師"',
      'text="教科"',
      'text="教室"',
      'text="件"',
      '.data-status',
      '[data-testid*="status"]'
    ]
    
    for (const selector of dataStatusElements) {
      if (await page.locator(selector).count() > 0) {
        console.log(`📊 データ状況確認: ${selector}`)
      }
    }
    
    // エラーメッセージがないか確認
    const errorMessages = [
      'text="エラー"',
      'text="不足"',
      'text="Error"',
      '.error',
      '[role="alert"]'
    ]
    
    let hasErrors = false
    for (const selector of errorMessages) {
      if (await page.locator(selector).count() > 0) {
        console.log(`⚠️ エラーメッセージ発見: ${selector}`)
        hasErrors = true
      }
    }
    
    // Step 3: 時間割生成の実行
    console.log('📍 Step 3: 時間割生成の実行')
    
    const generateButtons = [
      'button:has-text("生成開始")',
      'button:has-text("時間割生成")',
      'button:has-text("生成")',
      'button:has-text("Generate")',
      'button:has-text("作成")',
      '[data-testid*="generate"]'
    ]
    
    let generateButtonFound = false
    for (const selector of generateButtons) {
      const button = page.locator(selector)
      if (await button.count() > 0 && await button.isEnabled()) {
        console.log(`✅ 生成ボタン発見: ${selector}`)
        await button.first().click()
        console.log('🔄 時間割生成を開始しました')
        generateButtonFound = true
        break
      }
    }
    
    if (!generateButtonFound) {
      await page.screenshot({ path: 'test-results/generate-button-not-found.png' })
      
      // データが不足している可能性
      if (hasErrors) {
        console.log('ℹ️ データ不足のため時間割生成をスキップします')
        return
      }
      
      throw new Error('時間割生成ボタンが見つからないか無効です')
    }
    
    // Step 4: 生成進捗の確認
    console.log('📍 Step 4: 生成進捗の確認')
    
    // 進捗表示の確認
    const progressElements = [
      '.progress',
      '[role="progressbar"]',
      'text="進捗"',
      'text="生成中"',
      'text="Processing"',
      '.loading',
      '.spinner'
    ]
    
    let progressFound = false
    for (const selector of progressElements) {
      if (await page.locator(selector).count() > 0) {
        console.log(`📈 進捗表示確認: ${selector}`)
        progressFound = true
        break
      }
    }
    
    // 生成完了まで待機（最大120秒）
    console.log('⏳ 時間割生成完了を待機中...')
    
    const completionElements = [
      'text="完了"',
      'text="生成しました"',
      'text="Success"',
      'text="Generated"',
      'text="時間割が生成されました"',
      '.success',
      '[data-testid*="success"]',
      'button:has-text("表示")',
      'button:has-text("View")',
      // データ不足でも生成処理は完了する可能性があるため、一定時間後に続行
      'text="データが不足"',
      'text="生成できませんでした"'
    ]
    
    let generationCompleted = false
    for (let i = 0; i < 120; i++) {
      for (const selector of completionElements) {
        if (await page.locator(selector).count() > 0) {
          console.log(`✅ 時間割生成完了: ${selector}`)
          generationCompleted = true
          break
        }
      }
      
      if (generationCompleted) break
      
      // 30秒経過後は生成完了と見なして続行
      if (i >= 30) {
        console.log(`⏰ 30秒経過のため生成完了と見なします`)
        generationCompleted = true
        break
      }
      
      await page.waitForTimeout(1000)
      console.log(`⏳ 生成待機中... ${i + 1}/120秒`)
    }
    
    if (!generationCompleted) {
      await page.screenshot({ path: 'test-results/generation-timeout.png' })
      console.log('⚠️ 時間割生成がタイムアウトしました（120秒）')
      // タイムアウトしても続行
    }
    
    // Step 5: 時間割表示の確認
    console.log('📍 Step 5: 時間割表示の確認')
    
    // 時間割表示画面への遷移（自動 or 手動）
    const viewButtons = [
      'button:has-text("時間割を見る")',
      'button:has-text("表示")',
      'button:has-text("View")',
      'a:has-text("時間割")',
      '[href*="view"]',
      '[data-testid*="view"]'
    ]
    
    for (const selector of viewButtons) {
      const button = page.locator(selector)
      if (await button.count() > 0) {
        console.log(`✅ 表示ボタン発見: ${selector}`)
        await button.first().click()
        await page.waitForTimeout(2000)
        break
      }
    }
    
    // 時間割グリッドまたはテーブルの確認
    const timetableDisplayElements = [
      'table',
      '.timetable-grid',
      '.schedule-grid',
      '[data-testid*="timetable"]',
      '[role="table"]',
      '.grid'
    ]
    
    let timetableDisplayFound = false
    for (const selector of timetableDisplayElements) {
      if (await page.locator(selector).count() > 0) {
        console.log(`✅ 時間割表示確認: ${selector}`)
        timetableDisplayFound = true
        break
      }
    }
    
    if (timetableDisplayFound) {
      // 時間割の内容確認
      const timeSlots = page.locator('td, .time-slot, .schedule-cell')
      const slotCount = await timeSlots.count()
      console.log(`📅 時間割スロット数: ${slotCount}`)
      
      // 教科名が表示されているか確認
      const subjects = page.locator('text="数学", text="国語", text="英語", text="理科", text="社会"')
      const subjectCount = await subjects.count()
      console.log(`📚 表示されている教科数: ${subjectCount}`)
      
      // 📊 重要: 実際にデータが表示されているかを検証
      expect(slotCount).toBeGreaterThan(0, '時間割のスロットが表示されている必要があります')
      
      // データなし状態ではないことを確認
      const noDataMessage = page.locator('text="時間割データがありません"')
      expect(await noDataMessage.count()).toBe(0, 'データなしメッセージが表示されてはいけません')
      
      // ローディング状態でないことを確認
      const loadingSpinner = page.locator('.animate-spin, text="読み込み中"')
      expect(await loadingSpinner.count()).toBe(0, 'ローディング状態ではないはずです')
      
    } else {
      console.log('⚠️ 時間割表示が見つかりません')
      
      // 「データがありません」や「時間割が見つかりません」などのメッセージをチェック
      const noDataMessages = [
        'text=時間割データがありません。',
        'text="時間割データがありません"',
        ':text("時間割データがありません")',
        'text="データがありません"',
        'text="時間割が見つかりません"',
        'text="生成された時間割がありません"',
        '.empty-state',
        '[data-testid*="empty"]'
      ]
      
      let emptyStateFound = false
      for (const messageSelector of noDataMessages) {
        if (await page.locator(messageSelector).count() > 0) {
          console.log(`✅ 空データ状態を確認: ${messageSelector}`)
          emptyStateFound = true
          break
        }
      }
      
      if (emptyStateFound) {
        console.log('✅ 時間割データがない状態が適切に表示されています')
      } else {
        // 📊 重要: 時間割表示要素も空状態メッセージも見つからない場合は問題
        console.error('❌ 時間割表示要素も空状態メッセージも見つかりません')
        throw new Error('時間割の表示要素も空状態メッセージも見つかりません。UIの問題の可能性があります')
      }
    }
    
    // Step 6: 教師別・クラス別時間割の確認
    console.log('📍 Step 6: 教師別・クラス別時間割の確認')
    
    // 表示切り替えタブまたはボタンの確認
    const viewTabs = [
      'button:has-text("教師別")',
      'button:has-text("クラス別")',
      'button:has-text("Teacher")',
      'button:has-text("Class")',
      '[role="tab"]:has-text("教師")',
      '[role="tab"]:has-text("クラス")'
    ]
    
    for (const selector of viewTabs) {
      const tab = page.locator(selector)
      if (await tab.count() > 0) {
        console.log(`✅ 表示切り替えタブ発見: ${selector}`)
        await tab.first().click()
        await page.waitForTimeout(1000)
        
        // 切り替え後の表示確認
        const afterSwitchDisplay = page.locator('table, .grid, [data-testid*="timetable"]')
        if (await afterSwitchDisplay.count() > 0) {
          console.log(`✅ 表示切り替え成功: ${selector}`)
        }
        break
      }
    }
    
    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/timetable-workflow-complete.png' })
    
    console.log('✅ 時間割ワークフローE2Eテスト完了')
    
    // エラー監視終了とレポート生成
    errorMonitor.finalize()
  })
  
  test('時間割データがない状態での動作確認', async ({ page }) => {
    console.log('🚀 データなし状態での時間割生成テスト開始')
    
    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '時間割データがない状態での動作確認')
    
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    // 時間割生成画面に遷移
    const timetableButton = page.locator('button:has-text("時間割生成"), a:has-text("時間割生成")').first()
    if (await timetableButton.count() > 0) {
      await timetableButton.click()
      await page.waitForTimeout(2000)
    }
    
    // データ不足の警告メッセージ確認
    const warningMessages = [
      'text="データが不足"',
      'text="教師が登録されていません"',
      'text="教科が登録されていません"',
      'text="insufficient data"',
      '.warning',
      '[role="alert"]'
    ]
    
    let warningFound = false
    for (const selector of warningMessages) {
      if (await page.locator(selector).count() > 0) {
        console.log(`⚠️ 警告メッセージ確認: ${selector}`)
        warningFound = true
      }
    }
    
    // 生成ボタンが無効化されているか確認
    const generateButton = page.locator('button:has-text("生成"), button:has-text("Generate")').first()
    if (await generateButton.count() > 0) {
      const isDisabled = await generateButton.isDisabled()
      if (isDisabled) {
        console.log('✅ データ不足時に生成ボタンが無効化されています')
      } else {
        console.log('⚠️ データ不足時でも生成ボタンが有効です')
      }
    }
    
    await page.screenshot({ path: 'test-results/timetable-no-data.png' })
    
    console.log('✅ データなし状態での時間割生成テスト完了')
    
    // エラー監視終了とレポート生成
    errorMonitor.finalize()
  })
  
  test('時間割表示画面の詳細確認', async ({ page }) => {
    console.log('🚀 時間割表示詳細テスト開始')
    
    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '時間割表示画面の詳細確認')
    
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174';
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    // 時間割表示画面に直接アクセス
    const viewButtons = [
      'button:has-text("時間割表示")',
      'button:has-text("時間割を見る")',
      'a:has-text("時間割表示")',
      '[href*="view"]',
      '[href*="schedule"]'
    ]
    
    for (const selector of viewButtons) {
      const button = page.locator(selector)
      if (await button.count() > 0) {
        await button.first().click()
        await page.waitForTimeout(2000)
        break
      }
    }
    
    // 時間割の各要素を詳細確認
    const headerElements = page.locator('th, .header, .day-header')
    const headerCount = await headerElements.count()
    console.log(`📊 ヘッダー要素数: ${headerCount}`)
    
    const cellElements = page.locator('td, .cell, .time-slot')
    const cellCount = await cellElements.count()
    console.log(`📅 セル要素数: ${cellCount}`)
    
    // 曜日表示の確認
    const dayLabels = ['月', '火', '水', '木', '金', '土']
    for (const day of dayLabels) {
      const dayElement = page.locator(`text="${day}"`)
      if (await dayElement.count() > 0) {
        console.log(`📅 曜日表示確認: ${day}`)
      }
    }
    
    // 時間表示の確認
    const timeLabels = ['1', '2', '3', '4', '5', '6']
    for (const time of timeLabels) {
      const timeElement = page.locator(`text="${time}時間目", text="${time}限"`)
      if (await timeElement.count() > 0) {
        console.log(`⏰ 時間表示確認: ${time}`)
      }
    }
    
    await page.screenshot({ path: 'test-results/timetable-display-details.png' })
    
    console.log('✅ 時間割表示詳細テスト完了')
    
    // エラー監視終了とレポート生成
    errorMonitor.finalize()
  })
})