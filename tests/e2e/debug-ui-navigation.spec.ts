import { test } from '@playwright/test'

test.describe('🔍 UI Navigation Debug', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test('教科保存時の画面遷移を調査', async ({ page }) => {
    console.log('🔍 Navigation Debug Test 開始')

    // 初期URL記録
    await page.goto('http://localhost:5174')
    await page.waitForLoadState('networkidle')
    const initialUrl = page.url()
    console.log(`🔍 初期URL: ${initialUrl}`)

    // データ登録画面に移動
    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await dataManagementButton.click()
    await page.waitForTimeout(2000)
    const dataPageUrl = page.url()
    console.log(`🔍 データ登録画面URL: ${dataPageUrl}`)

    // 現在の画面をスクリーンショット
    await page.screenshot({ path: 'test-results/debug-data-management-page.png' })

    // 利用可能なボタンを調査
    const allButtons = page.locator('button')
    const buttonCount = await allButtons.count()
    console.log(`🔍 見つかったボタン数: ${buttonCount}`)

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const buttonText = await allButtons.nth(i).textContent()
      console.log(`🔍 ボタン ${i + 1}: "${buttonText}"`)
    }

    // まず教科情報セクションをクリック
    const subjectInfoButton = page.locator('button:has-text("教科情報")')
    if ((await subjectInfoButton.count()) > 0) {
      console.log('🔍 教科情報ボタンをクリック')
      await subjectInfoButton.click()
      await page.waitForTimeout(2000)

      // 教科情報画面でのスクリーンショット
      await page.screenshot({ path: 'test-results/debug-subject-info-page.png' })

      // 教科追加ボタンを探す
      const addSubjectButtons = [
        'button:has-text("教科を追加")',
        'button:has-text("追加")',
        '[data-testid="add-subject-button"]',
        'button:has-text("新規追加")',
      ]

      let addButtonFound = false
      let selectedButton: ReturnType<typeof page.locator> | null = null
      for (const selector of addSubjectButtons) {
        const button = page.locator(selector)
        if ((await button.count()) > 0) {
          console.log(`🔍 教科追加ボタン発見: ${selector}`)
          selectedButton = button
          addButtonFound = true
          break
        }
      }

      if (addButtonFound && selectedButton) {
        await selectedButton.click()
        await page.waitForTimeout(1000)
        const afterClickUrl = page.url()
        console.log(`🔍 教科追加ボタンクリック後URL: ${afterClickUrl}`)

        // フォームに入力
        await page.fill('input[name="name"]', 'テスト教科_Navigation')

        // 学年選択 (2年生)
        const grade2Checkbox = page.locator('input[type="checkbox"][value="2"]')
        await grade2Checkbox.check()

        // 週授業数入力
        await page.fill('input[name="weeklyHours"]', '4')

        const beforeSaveUrl = page.url()
        console.log(`🔍 保存前URL: ${beforeSaveUrl}`)

        // 保存ボタンクリック
        const saveButton = page.locator('button:has-text("追加")')
        await saveButton.click()

        // 短い間隔でURL変化を監視
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(500)
          const currentUrl = page.url()
          console.log(`🔍 保存後 ${i * 500}ms: ${currentUrl}`)

          if (currentUrl !== beforeSaveUrl) {
            console.log(`🚨 URL変化検出! ${beforeSaveUrl} → ${currentUrl}`)
            break
          }
        }

        // 最終URL確認
        const finalUrl = page.url()
        console.log(`🔍 最終URL: ${finalUrl}`)

        // 現在の画面内容を確認
        const pageTitle = await page.locator('h1').first().textContent()
        console.log(`🔍 現在の画面タイトル: ${pageTitle}`)

        // スクリーンショット保存
        await page.screenshot({ path: 'test-results/navigation-debug.png' })
      } else {
        console.log('⚠️ 教科追加ボタンが見つかりません')
      }
    } else {
      console.log('⚠️ 教科情報ボタンが見つかりません')
    }
  })
})
