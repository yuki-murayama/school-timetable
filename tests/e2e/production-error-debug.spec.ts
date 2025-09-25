import { test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

/**
 * 本番環境エラーデバッグテスト
 *
 * ユーザーが報告した「データ登録画面を表示すると同じエラーが出る」問題を
 * 詳細に調査するためのデバッグ特化テスト
 */

test.describe('本番環境エラーデバッグ', () => {
  test('本番環境データ登録画面エラーの詳細調査', async ({ page }) => {
    console.log('🔍 本番環境データ登録画面エラーの詳細調査を開始')

    // より詳細なエラー監視を設定
    const errorMonitor = createErrorMonitor(page, '本番環境エラー詳細調査')

    const baseURL = 'https://school-timetable-monorepo.grundhunter.workers.dev'
    console.log(`🌐 本番環境URL: ${baseURL}`)

    // 詳細なネットワーク監視
    const networkLogs: Array<{ method: string; url: string; status: number; response?: unknown }> =
      []

    page.on('response', async response => {
      const url = response.url()
      const status = response.status()
      const method = response.request().method()

      let responseData = null
      try {
        if (response.headers()['content-type']?.includes('application/json')) {
          responseData = await response.json()
        } else {
          responseData = await response.text()
        }
      } catch (_e) {
        responseData = '[レスポンス読み取り不可]'
      }

      networkLogs.push({ method, url, status, response: responseData })

      if (url.includes('/api/')) {
        console.log(`📡 API: ${method} ${url} - Status: ${status}`)
        if (status >= 400) {
          console.error(`🚨 APIエラー: ${method} ${url} - Status: ${status}`)
          console.error(`   レスポンス: ${JSON.stringify(responseData, null, 2)}`)
        }
      }
    })

    // コンソールログの詳細監視
    const consoleLogs: Array<{ type: string; text: string; timestamp: string }> = []

    page.on('console', msg => {
      const timestamp = new Date().toISOString()
      const type = msg.type()
      const text = msg.text()

      consoleLogs.push({ type, text, timestamp })

      if (type === 'error') {
        console.error(`🔥 [${timestamp}] コンソールエラー: ${text}`)
      } else if (text.includes('エラー') || text.includes('失敗') || text.includes('Error')) {
        console.warn(`⚠️  [${timestamp}] エラー関連メッセージ: ${text}`)
      } else {
        console.log(`💬 [${timestamp}] [${type}]: ${text}`)
      }
    })

    // ページエラーの監視
    page.on('pageerror', error => {
      console.error(`💥 ページエラー: ${error.message}`)
      console.error(`   スタック: ${error.stack}`)
    })

    try {
      console.log('\n📍 Step 1: 本番環境にアクセス')
      await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 })

      console.log('\n📍 Step 2: 初期状態の確認')
      await page.waitForTimeout(2000)

      // ページタイトルと基本情報を確認
      const pageTitle = await page.title()
      const pageUrl = page.url()
      console.log(`📄 ページタイトル: ${pageTitle}`)
      console.log(`🔗 現在のURL: ${pageUrl}`)

      console.log('\n📍 Step 3: データ登録画面への遷移')

      // データ登録ボタンを詳細に調査
      const dataButtons = await page
        .locator('button:has-text("データ登録"), a:has-text("データ登録")')
        .all()
      console.log(`🎯 データ登録ボタン数: ${dataButtons.length}`)

      if (dataButtons.length > 0) {
        console.log('✅ データ登録ボタン発見、クリック実行')
        await dataButtons[0].click()

        // クリック後の状態変化を詳細に監視
        await page.waitForTimeout(3000)

        const newUrl = page.url()
        console.log(`🔄 遷移後URL: ${newUrl}`)
      } else {
        console.log('⚠️ データ登録ボタンが見つからない、直接URL遷移を試行')
        await page.goto(`${baseURL}/#/school-settings`, { waitUntil: 'networkidle' })
      }

      console.log('\n📍 Step 4: 基本設定タブの操作')

      // タブ要素の詳細調査
      const tabs = await page
        .locator('[role="tab"], button:contains("基本設定"), button:contains("設定")')
        .all()
      console.log(`📑 発見されたタブ数: ${tabs.length}`)

      for (let i = 0; i < tabs.length; i++) {
        const tabText = await tabs[i].textContent()
        console.log(`   タブ ${i + 1}: "${tabText}"`)
      }

      // 基本設定タブをクリック
      const basicTab = page.locator(
        'button:has-text("基本設定"), [role="tab"]:has-text("基本設定")'
      )
      const basicTabCount = await basicTab.count()

      if (basicTabCount > 0) {
        console.log('✅ 基本設定タブをクリック')
        await basicTab.first().click()
        await page.waitForTimeout(4000) // 長めに待機してAPI応答を確認
      } else {
        console.log('⚠️ 基本設定タブが見つからない')
      }

      console.log('\n📍 Step 5: エラー状況の詳細分析')

      // エラー統計
      const errorStats = errorMonitor.getStats()
      console.log(`📊 エラー統計: ${JSON.stringify(errorStats, null, 2)}`)

      // ネットワークログの詳細分析
      console.log('\n🌐 ネットワークログ分析:')
      const errorNetworkLogs = networkLogs.filter(log => log.status >= 400)

      if (errorNetworkLogs.length > 0) {
        console.log(`🚨 ${errorNetworkLogs.length}件のネットワークエラーを検出:`)
        errorNetworkLogs.forEach((log, index) => {
          console.log(`   ${index + 1}. ${log.method} ${log.url} - Status: ${log.status}`)
          if (log.response) {
            console.log(`      レスポンス: ${JSON.stringify(log.response, null, 2)}`)
          }
        })
      } else {
        console.log('✅ ネットワークエラーは検出されませんでした')
      }

      // コンソールログの詳細分析
      console.log('\n💬 コンソールログ分析:')
      const errorConsoleLogs = consoleLogs.filter(
        log =>
          log.type === 'error' ||
          log.text.includes('エラー') ||
          log.text.includes('失敗') ||
          log.text.includes('Error')
      )

      if (errorConsoleLogs.length > 0) {
        console.log(`🔥 ${errorConsoleLogs.length}件のコンソールエラー/警告を検出:`)
        errorConsoleLogs.forEach((log, index) => {
          console.log(`   ${index + 1}. [${log.timestamp}] [${log.type}]: ${log.text}`)
        })
      } else {
        console.log('✅ コンソールエラーは検出されませんでした')
      }

      // 特定のエラーパターンの検出
      console.log('\n🎯 特定エラーパターンの検出結果:')

      const hasTokenError = consoleLogs.some(
        log =>
          log.text.includes('Invalid or expired token') ||
          log.text.includes('Token validation failed') ||
          log.text.includes('Authentication failed')
      )

      const hasServerError = networkLogs.some(
        log =>
          log.status >= 500 ||
          (log.response && JSON.stringify(log.response).includes('Internal Server Error'))
      )

      const hasSettingsError = consoleLogs.some(
        log =>
          log.text.includes('設定読み込みエラー') ||
          log.text.includes('バックエンドAPIが500エラー') ||
          log.text.includes('デフォルト設定を使用します')
      )

      console.log(`🔐 認証トークンエラー: ${hasTokenError ? '✅ 検出' : '❌ 未検出'}`)
      console.log(`🚨 サーバー内部エラー: ${hasServerError ? '✅ 検出' : '❌ 未検出'}`)
      console.log(`⚙️ 設定読み込みエラー: ${hasSettingsError ? '✅ 検出' : '❌ 未検出'}`)

      // 現在のページの状態を保存
      await page.screenshot({
        path: 'test-results/production-error-debug-final.png',
        fullPage: true,
      })

      console.log('\n📋 最終結果:')
      if (hasTokenError || hasServerError || hasSettingsError || errorStats.total > 0) {
        console.log('🎯 本番環境でエラーが検出されました！')
        console.log('📸 詳細なスクリーンショットとログが保存されました')
      } else {
        console.log('✅ 現在の本番環境では、ユーザーが報告したエラーは再現されませんでした')
        console.log('💡 エラーが一時的なものであった可能性、または認証状態による違いが考えられます')
      }
    } catch (error) {
      console.error(`❌ テスト実行エラー: ${error.message}`)

      // エラー発生時でも詳細情報を出力
      console.log('\n📊 エラー発生時の詳細情報:')
      console.log(`ネットワークログ件数: ${networkLogs.length}`)
      console.log(`コンソールログ件数: ${consoleLogs.length}`)

      throw error
    }

    console.log('\n✅ 本番環境エラーデバッグ調査完了')
  })
})
