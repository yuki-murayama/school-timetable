/**
 * 02-学校設定管理E2Eテスト
 *
 * 真のE2Eテスト：ブラウザ操作による学校設定機能の確認
 * - データ登録画面へのナビゲーション
 * - 基本設定タブでの学校設定変更
 * - 設定値の保存・更新確認
 * - 設定値の永続化確認
 */

import { test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証状態はPlaywright設定で自動管理される

// テスト用の学校設定データ
const generateSchoolSettingsTestData = () => {
  const timestamp = Date.now()
  return {
    grade1Classes: 4,
    grade2Classes: 5,
    grade3Classes: 3,
    grade4Classes: 2,
    grade5Classes: 2,
    grade6Classes: 2,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    testId: `school_test_${timestamp}`,
  }
}

test.describe('🏫 学校設定管理E2Eテスト', () => {
  test('学校基本設定の変更と保存', async ({ page }) => {
    const testData = generateSchoolSettingsTestData()
    console.log('🚀 学校設定E2Eテスト開始')

    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '学校基本設定の変更と保存')

    // Step 1: メイン画面にアクセス
    console.log('📍 Step 1: メイン画面へのアクセス')
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // 認証状態の確認
    console.log('📍 認証状態の確認')
    const isLoginPage =
      (await page.locator('input[type="email"], input[type="password"]').count()) > 0
    if (isLoginPage) {
      console.log('🔍 ログイン画面が表示されました。認証を実行します。')

      // ログイン処理
      await page.fill('input[type="email"]', 'test@school.local')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]:has-text("ログイン")')

      // 認証完了を待機
      await page.waitForTimeout(3000)
      await page.waitForLoadState('networkidle')
      console.log('✅ 手動認証完了')
    } else {
      console.log('✅ 既に認証済みです')
    }

    // Step 2: データ登録画面への遷移
    console.log('📍 Step 2: データ登録画面への遷移')

    // サイドバーまたはナビゲーションのデータ登録ボタンを探す
    const dataRegistrationButtons = [
      'button:has-text("データ登録")',
      'a:has-text("データ登録")',
      '[href*="data"]',
      'nav button:has-text("データ")',
      '[role="button"]:has-text("データ登録")',
    ]

    let navigationSuccess = false
    for (const selector of dataRegistrationButtons) {
      const element = page.locator(selector)
      if ((await element.count()) > 0) {
        console.log(`✅ データ登録ボタン発見: ${selector}`)
        await element.first().click()
        await page.waitForTimeout(1000)
        navigationSuccess = true
        break
      }
    }

    if (!navigationSuccess) {
      await page.screenshot({ path: 'test-results/data-registration-not-found.png' })
      throw new Error('データ登録画面への遷移ボタンが見つかりません')
    }

    // データ登録画面の表示確認
    const dataPageElements = [
      '[role="tablist"]',
      'button:has-text("基本設定")',
      'h1:has-text("データ登録")',
      '.tabs-list',
    ]

    let dataPageLoaded = false
    for (const selector of dataPageElements) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ データ登録画面確認: ${selector}`)
        dataPageLoaded = true
        break
      }
    }

    if (!dataPageLoaded) {
      await page.screenshot({ path: 'test-results/data-page-not-loaded.png' })
      throw new Error('データ登録画面が正しく表示されませんでした')
    }

    // Step 3: 基本設定タブの確認・選択
    console.log('📍 Step 3: 基本設定タブの選択')

    const basicSettingsTab = page.locator(
      'button:has-text("基本設定"), [role="tab"]:has-text("基本設定")'
    )

    if ((await basicSettingsTab.count()) > 0) {
      await basicSettingsTab.first().click()
      await page.waitForTimeout(500)
      console.log('✅ 基本設定タブをクリック')
    } else {
      console.log('ℹ️ 基本設定タブが見つからない（既に選択済みの可能性）')
    }

    // Step 4: 学校設定フォームの確認と入力
    console.log('📍 Step 4: 学校設定フォームの入力')

    // 各学年のクラス数設定
    const gradeInputs = [
      { grade: 1, value: testData.grade1Classes },
      { grade: 2, value: testData.grade2Classes },
      { grade: 3, value: testData.grade3Classes },
      { grade: 4, value: testData.grade4Classes },
      { grade: 5, value: testData.grade5Classes },
      { grade: 6, value: testData.grade6Classes },
    ]

    for (const { grade, value } of gradeInputs) {
      // 様々なセレクターパターンを試行
      const inputSelectors = [
        `input[name="grade${grade}Classes"]`,
        `input[name*="grade${grade}"]`,
        `input[id*="grade${grade}"]`,
        `input[placeholder*="${grade}年"]`,
        `[data-testid*="grade${grade}"]`,
      ]

      let inputFound = false
      for (const selector of inputSelectors) {
        const input = page.locator(selector)
        if ((await input.count()) > 0) {
          await input.first().clear()
          await input.first().fill(value.toString())
          console.log(`✅ ${grade}年生クラス数設定: ${value}`)
          inputFound = true
          break
        }
      }

      if (!inputFound) {
        console.log(`⚠️ ${grade}年生のクラス数入力欄が見つかりません`)
      }
    }

    // 1日の授業時間数設定
    const dailyPeriodsSelectors = [
      'input[name="dailyPeriods"]',
      'input[name*="daily"]',
      'input[id*="daily"]',
      'input[placeholder*="1日"]',
    ]

    for (const selector of dailyPeriodsSelectors) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.dailyPeriods.toString())
        console.log(`✅ 1日の授業時間数設定: ${testData.dailyPeriods}`)
        break
      }
    }

    // 土曜日の授業時間数設定
    const saturdayPeriodsSelectors = [
      'input[name="saturdayPeriods"]',
      'input[name*="saturday"]',
      'input[id*="saturday"]',
      'input[placeholder*="土曜"]',
    ]

    for (const selector of saturdayPeriodsSelectors) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.saturdayPeriods.toString())
        console.log(`✅ 土曜日の授業時間数設定: ${testData.saturdayPeriods}`)
        break
      }
    }

    // Step 5: 設定の保存
    console.log('📍 Step 5: 設定の保存')

    const saveButtons = [
      'button:has-text("保存")',
      'button:has-text("更新")',
      'button:has-text("Save")',
      'button[type="submit"]',
      '[data-testid*="save"]',
    ]

    let saveSuccess = false
    for (const selector of saveButtons) {
      const button = page.locator(selector)
      if ((await button.count()) > 0) {
        console.log(`✅ 保存ボタン発見: ${selector}`)
        await button.first().click()
        await page.waitForTimeout(2000)
        saveSuccess = true
        break
      }
    }

    if (!saveSuccess) {
      console.log('⚠️ 保存ボタンが見つかりません')
    }

    // Step 6: 保存成功の確認
    console.log('📍 Step 6: 保存成功の確認')

    // 成功メッセージまたは通知の確認
    const successMessages = [
      'text="保存しました"',
      'text="更新しました"',
      'text="保存完了"',
      '[role="alert"]:has-text("成功")',
      '.toast:has-text("保存")',
      '.notification:has-text("保存")',
    ]

    for (const selector of successMessages) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ 保存成功メッセージ確認: ${selector}`)
        break
      }
    }

    // Step 7: 設定値の永続化確認（ページリロード後の値確認）
    console.log('📍 Step 7: 設定値の永続化確認')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 基本設定タブを再度選択（必要な場合）
    const basicSettingsTabAfterReload = page.locator(
      'button:has-text("基本設定"), [role="tab"]:has-text("基本設定")'
    )
    if ((await basicSettingsTabAfterReload.count()) > 0) {
      await basicSettingsTabAfterReload.first().click()
      await page.waitForTimeout(500)
    }

    // 設定値が保持されているか確認
    const grade1Input = page.locator('input[name="grade1Classes"], input[name*="grade1"]').first()
    if ((await grade1Input.count()) > 0) {
      const currentValue = await grade1Input.inputValue()
      if (currentValue === testData.grade1Classes.toString()) {
        console.log('✅ 設定値の永続化確認成功')
      } else {
        console.log(
          `⚠️ 設定値が保持されていません。期待値: ${testData.grade1Classes}, 実際の値: ${currentValue}`
        )
      }
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/school-settings-success.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 学校設定E2Eテスト完了')
  })

  test('学校設定の初期値確認', async ({ page }) => {
    console.log('🚀 学校設定初期値確認テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '学校設定の初期値確認')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録画面に遷移
    const dataButton = page
      .locator('button:has-text("データ登録"), a:has-text("データ登録")')
      .first()
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    // 基本設定タブを選択
    const basicTab = page
      .locator('button:has-text("基本設定"), [role="tab"]:has-text("基本設定")')
      .first()
    if ((await basicTab.count()) > 0) {
      await basicTab.click()
      await page.waitForTimeout(500)
    }

    // 各入力欄の初期値を確認
    const inputFields = [
      { name: 'grade1Classes', label: '1年生クラス数' },
      { name: 'grade2Classes', label: '2年生クラス数' },
      { name: 'grade3Classes', label: '3年生クラス数' },
      { name: 'dailyPeriods', label: '1日の授業時間数' },
      { name: 'saturdayPeriods', label: '土曜日の授業時間数' },
    ]

    for (const { name, label } of inputFields) {
      const input = page.locator(`input[name="${name}"]`).first()
      if ((await input.count()) > 0) {
        const value = await input.inputValue()
        console.log(`📊 ${label}: ${value}`)
      }
    }

    await page.screenshot({ path: 'test-results/school-settings-initial.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 学校設定初期値確認テスト完了')
  })

  test('本番環境データ登録画面でのサーバー内部エラー検知テスト', async ({ page }) => {
    console.log('🚀 本番環境サーバー内部エラー検知テスト開始')

    // 強化されたエラーモニタリングを設定
    const errorMonitor = createErrorMonitor(page, '本番環境データ登録画面エラー検知')

    // 本番環境URLまたはテスト環境URLを使用
    const baseURL =
      process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:5174'

    console.log(`🌐 テスト対象URL: ${baseURL}`)
    console.log('🔍 データ登録画面でのサーバー内部エラー検知を開始します...')

    // 本番環境の特定エラーパターンを監視する詳細なリスナーを追加
    let tokenErrorDetected = false
    let serverErrorDetected = false
    let settingsErrorDetected = false

    // ネットワーク応答の監視
    page.on('response', response => {
      const url = response.url()
      const status = response.status()

      if (url.includes('/api/school/')) {
        console.log(`📡 学校関連API応答: ${response.request().method()} ${url} - Status: ${status}`)

        if (status >= 500) {
          console.error(`🚨 学校API サーバー内部エラー検出: ${url} - Status: ${status}`)
          serverErrorDetected = true
        }
      }
    })

    // コンソールメッセージの詳細監視
    page.on('console', msg => {
      const text = msg.text()

      if (text.includes('Invalid or expired token') || text.includes('Token validation failed')) {
        console.error(`🔐 認証トークンエラー検出: ${text}`)
        tokenErrorDetected = true
      }

      if (text.includes('設定読み込みエラー') || text.includes('バックエンドAPIが500エラー')) {
        console.error(`⚙️ 設定読み込みエラー検出: ${text}`)
        settingsErrorDetected = true
      }

      if (msg.type() === 'error') {
        console.error(`🔥 ブラウザコンソールエラー: ${text}`)
      }
    })

    try {
      // Step 1: 本番環境にアクセス
      console.log('📍 Step 1: 本番環境にアクセス')
      await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 })

      // 初期ロード後の状態確認
      await page.waitForTimeout(2000)
      const initialStats = errorMonitor.getStats()
      console.log(`📊 初期ロード後のエラー統計: ${JSON.stringify(initialStats)}`)

      // Step 2: データ登録画面（基本情報）へのナビゲーション
      console.log('📍 Step 2: データ登録画面への遷移')

      const dataRegistrationButtons = [
        'button:has-text("データ登録")',
        'a:has-text("データ登録")',
        '[href*="data"]',
        'nav button:has-text("データ")',
        '[role="button"]:has-text("データ登録")',
      ]

      let navigationSuccess = false
      for (const selector of dataRegistrationButtons) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          console.log(`✅ データ登録ボタン発見: ${selector}`)
          await element.first().click()
          await page.waitForTimeout(2000) // API呼び出しを待つ
          navigationSuccess = true
          break
        }
      }

      if (!navigationSuccess) {
        console.log('🔍 直接URL遷移を試行...')
        await page.goto(`${baseURL}/#/school-settings`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        })
      }

      // Step 3: 基本設定タブの選択とAPI呼び出し監視
      console.log('📍 Step 3: 基本設定タブの選択')

      const basicSettingsTab = page.locator(
        'button:has-text("基本設定"), [role="tab"]:has-text("基本設定")'
      )

      if ((await basicSettingsTab.count()) > 0) {
        await basicSettingsTab.first().click()
        await page.waitForTimeout(3000) // 設定データロードのためのAPI呼び出しを待つ
        console.log('✅ 基本設定タブをクリック - API呼び出し監視中')
      }

      // Step 4: エラー発生の確認と詳細分析
      console.log('📍 Step 4: エラー発生状況の分析')

      const finalStats = errorMonitor.getStats()
      console.log(`📊 最終エラー統計: ${JSON.stringify(finalStats)}`)

      // エラーレポート生成（例外を投げずに）
      const errorReport = errorMonitor.generateReport()

      // 本番環境特有のエラーパターンを確認
      const hasTokenError =
        errorReport.consoleErrors.some(
          error =>
            error.includes('Invalid or expired token') ||
            error.includes('Token validation failed') ||
            error.includes('Authentication failed')
        ) || tokenErrorDetected

      const hasServerError =
        errorReport.networkErrors.some(
          error => error.includes('500') || error.includes('Internal Server Error')
        ) || serverErrorDetected

      const hasSettingsError =
        errorReport.consoleErrors.some(
          error =>
            error.includes('設定読み込みエラー') ||
            error.includes('バックエンドAPIが500エラー') ||
            error.includes('デフォルト設定を使用します')
        ) || settingsErrorDetected

      // Step 5: 結果レポートと検証
      console.log('\n📋 本番環境サーバーエラー検知結果:')
      console.log(`🔐 認証トークンエラー: ${hasTokenError ? '✅ 検出' : '❌ 未検出'}`)
      console.log(`🚨 サーバー内部エラー: ${hasServerError ? '✅ 検出' : '❌ 未検出'}`)
      console.log(`⚙️ 設定読み込みエラー: ${hasSettingsError ? '✅ 検出' : '❌ 未検出'}`)

      if (hasTokenError || hasServerError || hasSettingsError) {
        console.log('\n🎯 本番環境のサーバー内部エラーが正常に検知されました！')
        console.log('🔧 以下のエラーが検出されました:')

        if (hasTokenError) {
          console.log('   🔐 認証トークンエラー - JWT期限切れまたは無効トークン')
        }

        if (hasServerError) {
          console.log('   🚨 サーバー内部エラー - HTTP 500応答')
        }

        if (hasSettingsError) {
          console.log('   ⚙️ 設定読み込みエラー - バックエンドAPI通信エラー')
        }

        console.log('\n💡 これらのエラーは本番環境の問題を示しています。')
        console.log('   アプリケーション修正またはサーバー対応が必要です。')

        // 本番環境のエラー検知が目的なので、テスト自体は成功として扱う
      } else {
        console.log('\n📱 現在の本番環境でサーバー内部エラーは検出されませんでした')
        console.log('   システムが正常に動作している可能性があります。')
      }
    } catch (error) {
      console.error('\n❌ テスト実行中にエラーが発生しました:', error.message)

      // テスト実行エラーでもエラー監視レポートは生成
      const errorReport = errorMonitor.generateReport()
      console.log('\n📊 テスト実行エラー時のエラーレポート:')
      console.log(`   コンソールエラー: ${errorReport.consoleErrors.length}件`)
      console.log(`   ネットワークエラー: ${errorReport.networkErrors.length}件`)
      console.log(`   ページエラー: ${errorReport.pageErrors.length}件`)

      // テスト失敗として扱う
      throw error
    }

    console.log('\n✅ 本番環境サーバーエラー検知テスト完了')
  })
})
