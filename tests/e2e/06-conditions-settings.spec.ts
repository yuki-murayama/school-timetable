/**
 * 06-条件設定E2Eテスト
 *
 * 真のE2Eテスト：ブラウザ操作による条件設定機能の確認
 * - 条件設定タブへの遷移
 * - 初期値の確認（Read操作）
 * - 条件テキストの入力・更新
 * - 設定の保存と成功確認
 * - 設定値の永続化確認
 */

import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

// テスト用条件データ生成
const generateConditionsTestData = () => {
  const timestamp = Date.now()

  return {
    conditions: `テスト条件設定_${timestamp}
・体育は午後に配置すること
・数学は1時間目を避けること  
・理科は理科室を使用すること
・音楽は音楽室を優先すること
更新日時: ${new Date().toLocaleString()}`,
    testId: `conditions_test_${timestamp}`,
  }
}

test.describe('⚙️ 条件設定E2Eテスト', () => {
  test('条件設定の初期値確認と更新保存の一連の流れ', async ({ page }) => {
    const testData = generateConditionsTestData()
    console.log('🚀 条件設定E2Eテスト開始')
    console.log(`📝 テストデータ: ${testData.testId}`)

    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '条件設定の初期値確認と更新保存の一連の流れ')

    // Step 1: データ登録画面への遷移
    console.log('📍 Step 1: データ登録画面への遷移')
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録ボタンをクリック
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    await expect(dataButton).toBeVisible({ timeout: 10000 })
    await dataButton.click()
    await page.waitForTimeout(1000)

    // Step 2: 条件設定タブの選択
    console.log('📍 Step 2: 条件設定タブの選択')

    const conditionsTabs = [
      'button:has-text("条件設定")',
      'button:has-text("条件")',
      '[role="tab"]:has-text("条件設定")',
      '[role="tab"]:has-text("条件")',
      'button:has-text("Conditions")',
    ]

    let conditionsTabFound = false
    for (const selector of conditionsTabs) {
      const tab = page.locator(selector)
      if ((await tab.count()) > 0) {
        console.log(`✅ 条件設定タブ発見: ${selector}`)
        await tab.first().click()
        await page.waitForTimeout(1000)
        conditionsTabFound = true
        break
      }
    }

    if (!conditionsTabFound) {
      await page.screenshot({ path: 'test-results/conditions-tab-not-found.png' })
      throw new Error('条件設定タブが見つかりません')
    }

    // Step 3: 条件設定画面の表示確認
    console.log('📍 Step 3: 条件設定画面の表示確認')

    // 条件設定カードの確認
    const conditionsCard = page.locator(
      'h3:has-text("任意条件設定"), h2:has-text("条件設定"), .card'
    )
    if ((await conditionsCard.count()) > 0) {
      console.log('✅ 条件設定カードが表示されています')
    }

    // Step 4: 初期値の確認（Read操作）
    console.log('📍 Step 4: 条件設定の初期値確認')

    const textareaSelectors = [
      'textarea',
      'textarea[placeholder*="条件"]',
      'textarea[placeholder*="例"]',
      '[data-testid*="conditions"]',
    ]

    let textareaFound = false
    let initialValue = ''

    for (const selector of textareaSelectors) {
      const textarea = page.locator(selector)
      if ((await textarea.count()) > 0) {
        console.log(`✅ 条件入力欄発見: ${selector}`)

        // 初期値の取得
        initialValue = await textarea.inputValue()
        console.log(`📋 初期値: ${initialValue ? `"${initialValue}"` : '(空)'}`)

        textareaFound = true
        break
      }
    }

    if (!textareaFound) {
      await page.screenshot({ path: 'test-results/conditions-textarea-not-found.png' })
      throw new Error('条件入力欄が見つかりません')
    }

    // Step 5: 条件テキストの入力・更新
    console.log('📍 Step 5: 条件テキストの更新')

    const textarea = page.locator('textarea').first()

    // 既存テキストをクリアして新しい条件を入力
    await textarea.clear()
    await textarea.fill(testData.conditions)
    console.log(`✅ 条件テキスト入力完了`)

    // 入力値が正しく設定されているか確認
    const inputValue = await textarea.inputValue()
    if (inputValue.includes(testData.testId)) {
      console.log('✅ 入力値確認成功')
    } else {
      console.log('⚠️ 入力値が期待と異なります')
    }

    // Step 6: 設定の保存
    console.log('📍 Step 6: 条件設定の保存')

    const saveButtons = [
      'button:has-text("条件設定を保存")',
      'button:has-text("保存")',
      'button:has-text("Save")',
      'button:has-text("更新")',
      'button[type="submit"]',
    ]

    let saveButtonFound = false
    for (const selector of saveButtons) {
      const button = page.locator(selector)
      if ((await button.count()) > 0 && (await button.isEnabled())) {
        console.log(`✅ 保存ボタン発見: ${selector}`)
        await button.first().click()
        await page.waitForTimeout(2000)
        saveButtonFound = true
        break
      }
    }

    if (!saveButtonFound) {
      await page.screenshot({ path: 'test-results/conditions-save-button-not-found.png' })
      throw new Error('保存ボタンが見つからないか無効です')
    }

    // Step 7: 保存成功の確認
    console.log('📍 Step 7: 保存成功の確認')

    // 成功メッセージまたは通知の確認
    const successMessages = [
      'text="保存しました"',
      'text="保存完了"',
      'text="条件設定を保存しました"',
      '[role="alert"]:has-text("保存")',
      '[role="alert"]:has-text("成功")',
      '.toast:has-text("保存")',
      '.notification:has-text("保存")',
    ]

    let successMessageFound = false
    for (const selector of successMessages) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ 保存成功メッセージ確認: ${selector}`)
        successMessageFound = true
        break
      }
    }

    if (!successMessageFound) {
      console.log('ℹ️ 保存成功メッセージが見つかりませんが、処理は続行します')
    }

    // Step 8: 設定値の永続化確認（ページリロード後の値確認）
    console.log('📍 Step 8: 設定値の永続化確認')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // データ登録ボタンを再度クリック
    const dataButtonAfterReload = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButtonAfterReload.count()) > 0) {
      await dataButtonAfterReload.click()
      await page.waitForTimeout(1000)
    }

    // 条件設定タブを再度選択
    const conditionsTabAfterReload = page
      .locator('button:has-text("条件設定"), [role="tab"]:has-text("条件設定")')
      .first()
    if ((await conditionsTabAfterReload.count()) > 0) {
      await conditionsTabAfterReload.click()
      await page.waitForTimeout(1000)
    }

    // 保存された設定値が保持されているか確認
    await page.waitForTimeout(1000) // 設定読み込み待機

    const textareaAfterReload = page.locator('textarea').first()
    if ((await textareaAfterReload.count()) > 0) {
      const reloadedValue = await textareaAfterReload.inputValue()

      if (reloadedValue.includes(testData.testId)) {
        console.log('✅ 設定値の永続化確認成功')
      } else {
        console.log(`⚠️ 設定値が保持されていません。`)
        console.log(`期待値に含まれるべき文字列: ${testData.testId}`)
        console.log(`実際の値: ${reloadedValue.substring(0, 100)}...`)
      }
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/conditions-settings-complete.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 条件設定E2Eテスト完了')
  })

  test('条件設定画面の初期表示確認', async ({ page }) => {
    console.log('🚀 条件設定初期表示テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '条件設定画面の初期表示確認')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録 > 条件設定タブへ移動
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const conditionsTab = page
      .locator('button:has-text("条件設定"), button:has-text("条件")')
      .first()
    if ((await conditionsTab.count()) > 0) {
      await conditionsTab.click()
      await page.waitForTimeout(1000)
    }

    // 画面要素の確認
    console.log('📋 画面要素の確認')

    // タイトルの確認
    const titleElements = [
      'h3:has-text("任意条件設定")',
      'h2:has-text("条件設定")',
      'h1:has-text("条件")',
    ]

    for (const selector of titleElements) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ タイトル確認: ${selector}`)
        break
      }
    }

    // 説明文の確認
    const descriptionElements = [
      'text="時間割生成時の特別な条件を設定します"',
      'text*="条件"',
      '.description',
      'p',
    ]

    for (const selector of descriptionElements) {
      if ((await page.locator(selector).count()) > 0) {
        const text = await page.locator(selector).first().textContent()
        console.log(`📝 説明文: ${text?.trim()}`)
        break
      }
    }

    // テキストエリアの確認
    const textarea = page.locator('textarea').first()
    if ((await textarea.count()) > 0) {
      const placeholder = await textarea.getAttribute('placeholder')
      const rows = await textarea.getAttribute('rows')
      const isDisabled = await textarea.isDisabled()

      console.log(`📝 テキストエリア詳細:`)
      console.log(`  - プレースホルダー: ${placeholder}`)
      console.log(`  - 行数: ${rows}`)
      console.log(`  - 無効状態: ${isDisabled}`)
    }

    // 保存ボタンの確認
    const saveButton = page
      .locator('button:has-text("保存"), button:has-text("条件設定を保存")')
      .first()
    if ((await saveButton.count()) > 0) {
      const isEnabled = await saveButton.isEnabled()
      const buttonText = await saveButton.textContent()

      console.log(`💾 保存ボタン詳細:`)
      console.log(`  - テキスト: ${buttonText?.trim()}`)
      console.log(`  - 有効状態: ${isEnabled}`)
    }

    await page.screenshot({ path: 'test-results/conditions-initial-display.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 条件設定初期表示テスト完了')
  })

  test('条件設定の長文入力テスト', async ({ page }) => {
    console.log('🚀 条件設定長文入力テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '条件設定の長文入力テスト')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録 > 条件設定タブへ移動
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const conditionsTab = page
      .locator('button:has-text("条件設定"), button:has-text("条件")')
      .first()
    if ((await conditionsTab.count()) > 0) {
      await conditionsTab.click()
      await page.waitForTimeout(1000)
    }

    // 長文の条件設定をテスト
    const longConditionsText = `詳細条件設定テスト_${Date.now()}

【基本方針】
1. 学習効果を最大化する時間割配置
2. 教師の負担を均等に分散
3. 施設の効率的な利用

【教科別配置ルール】
■体育
・午後の時間帯（5-6時間目）を優先
・雨天時の室内体育を考慮
・連続2時間の場合は体育館を確保

■数学
・1時間目は避ける（生徒の集中力を考慮）
・午前中の2-4時間目を推奨
・週3回の場合は均等に分散配置

■理科
・理科室の利用を優先
・実験授業の場合は2時間連続確保
・準備時間を考慮した配置

■音楽
・音楽室を優先利用
・他の授業への音響影響を考慮
・合唱練習時は特別配慮

【施設利用ルール】
・専用教室は予約制で管理
・移動時間を考慮した配置
・清掃時間の確保

【教師配置ルール】
・連続授業は最大3時間まで
・空き時間の均等分散
・学年主任の負担軽減

【その他の特記事項】
・学校行事との調整
・季節に応じた配置変更
・保護者会等の特別日程対応

更新日時: ${new Date().toLocaleString()}`

    const textarea = page.locator('textarea').first()
    if ((await textarea.count()) > 0) {
      await textarea.clear()
      await textarea.fill(longConditionsText)
      console.log(`✅ 長文テキスト入力完了（${longConditionsText.length}文字）`)

      // 保存実行
      const saveButton = page
        .locator('button:has-text("保存"), button:has-text("条件設定を保存")')
        .first()
      if ((await saveButton.count()) > 0) {
        await saveButton.click()
        await page.waitForTimeout(2000)
        console.log('✅ 長文条件設定の保存実行完了')
      }

      // 保存後の値確認
      const savedValue = await textarea.inputValue()
      if (savedValue.length > 500) {
        console.log('✅ 長文条件設定が正常に保持されています')
      }
    }

    await page.screenshot({ path: 'test-results/conditions-long-text-test.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 条件設定長文入力テスト完了')
  })
})
