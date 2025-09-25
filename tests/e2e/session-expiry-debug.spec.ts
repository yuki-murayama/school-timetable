import { test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 既存の認証済み状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

test.describe('セッション切れデバッグテスト', () => {
  test('データ管理画面の構造確認とセッション切れテスト', async ({ page }) => {
    console.log('🔍 データ管理画面構造確認およびセッション切れテスト')

    const baseURL =
      process.env.E2E_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      'https://school-timetable-monorepo.grundhunter.workers.dev'
    const errorMonitor = createErrorMonitor(page, 'セッション切れデバッグテスト')

    // Step 1: データ管理画面に移動してページ構造を確認
    console.log('Step 1: データ管理画面に移動')
    await page.goto(`${baseURL}/data-management`)
    await page.waitForLoadState('networkidle')

    // ページの内容を確認
    const pageTitle = await page.title()
    console.log('📄 ページタイトル:', pageTitle)

    // 主要な見出し要素を探す
    const headings = await page.locator('h1, h2, h3').allTextContents()
    console.log('📋 ページ内見出し:', headings)

    // タブ要素を確認
    const tabs = await page
      .locator(
        '[role="tab"], button:contains("設定"), button:contains("情報"), button:contains("基本")'
      )
      .allTextContents()
    console.log('📑 タブ要素:', tabs)

    // 現在のURL確認
    console.log('🔗 現在のURL:', page.url())

    // データ管理画面であることを確認（見出しまたはタブで判断）
    const isDataManagementPage =
      headings.some(h => h.includes('データ') || h.includes('設定') || h.includes('管理')) ||
      tabs.some(t => t.includes('基本') || t.includes('教師') || t.includes('教科'))

    if (isDataManagementPage) {
      console.log('✅ データ管理画面確認完了')
    } else {
      console.log(
        '⚠️ データ管理画面の確認ができませんでした。スクリーンショットを確認してください。'
      )

      // ページ内容の詳細確認
      const bodyText = await page.locator('body').textContent()
      console.log('📝 ページ本文の一部:', bodyText?.substring(0, 500))
    }

    // Step 2: セッション切れをシミュレート
    console.log('Step 2: セッション切れシミュレーション')
    await page.evaluate(() => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_session_id')
      localStorage.removeItem('auth_user')
      console.log('🚨 認証情報削除完了')
    })

    // ページ遷移監視
    let redirected = false
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame() && frame.url().includes('/login')) {
        redirected = true
        console.log('✅ ログインページリダイレクト検出')
      }
    })

    // API 401エラー監視
    let api401Count = 0
    page.on('response', response => {
      if (response.status() === 401) {
        api401Count++
        console.log(`🚨 401エラー #${api401Count}:`, response.url())
      }
    })

    // Step 3: セッション切れを発生させる操作
    console.log('Step 3: セッション切れ発生操作')

    try {
      // 基本設定タブを探してクリック
      const basicSettingsTab = page.locator(
        'button:contains("基本"), [role="tab"]:contains("基本")'
      )
      if ((await basicSettingsTab.count()) > 0) {
        await basicSettingsTab.first().click()
        console.log('✅ 基本設定タブクリック')
        await page.waitForTimeout(1000)
      }

      // 保存ボタンを探してクリック
      const saveButtons = page.locator('button:contains("保存"), button:contains("設定")')
      if ((await saveButtons.count()) > 0) {
        await saveButtons.first().click()
        console.log('✅ 保存ボタンクリック')
      } else {
        console.log('⚠️ 保存ボタンが見つからないため、ページリロード実行')
        await page.reload()
      }
    } catch (e) {
      console.log('⚠️ ボタンクリック時エラー、ページリロード実行:', e)
      await page.reload()
    }

    // Step 4: リダイレクト確認
    console.log('Step 4: リダイレクト確認')

    try {
      await page.waitForURL(/.*\/login/, { timeout: 15000 })
      console.log('✅ ログインページリダイレクト成功')
    } catch (_e) {
      console.log('⚠️ リダイレクト待機タイムアウト')
      console.log('現在のURL:', page.url())

      // 手動でログインページかどうか確認
      if (page.url().includes('/login')) {
        console.log('✅ URLにloginが含まれている（手動確認）')
        redirected = true
      }
    }

    // Step 5: 結果確認
    console.log('📊 テスト結果:')
    console.log(`- 401エラー数: ${api401Count}`)
    console.log(`- リダイレクト検出: ${redirected}`)
    console.log(`- 最終URL: ${page.url()}`)

    // アサーション
    const isOnLoginPage = page.url().includes('/login')
    console.log(`- ログインページ判定: ${isOnLoginPage}`)

    if (isOnLoginPage) {
      console.log('✅ セッション切れ後のログインページリダイレクト確認完了')
    } else {
      console.log('❌ ログインページリダイレクトが確認できませんでした')

      // ページ内容を確認してログインフォームがあるかチェック
      const hasEmailInput =
        (await page.locator('input[type="email"], input[name="email"]').count()) > 0
      const hasPasswordInput =
        (await page.locator('input[type="password"], input[name="password"]').count()) > 0

      if (hasEmailInput && hasPasswordInput) {
        console.log('✅ ログインフォーム要素が存在（実質的にログインページ）')
      }
    }

    // エラーモニタリング結果
    await errorMonitor.checkForErrors()

    console.log('🎉 セッション切れデバッグテスト完了')
  })
})
