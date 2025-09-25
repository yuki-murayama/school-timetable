import { expect, test } from '@playwright/test'

test.describe('📚 タイミング改良版教科管理テスト', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test('タイミング改良版：教科の新規追加テスト', async ({ page }) => {
    console.log('🚀 タイミング改良版教科管理テスト開始')

    // テストデータ
    const uniqueTestName = `改良版テスト教科_${Date.now()}`

    // Step 1: 初期ページ読み込み（十分な待機時間）
    console.log('📍 Step 1: 初期ページ読み込み（改良版タイミング）')
    await page.goto('http://localhost:5174')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // DOM安定化待機

    // Step 2: データ登録画面への遷移（改良版タイミング）
    console.log('📍 Step 2: データ登録画面への遷移（改良版）')
    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await expect(dataManagementButton).toBeVisible({ timeout: 10000 })
    await dataManagementButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // ページ遷移完全待機

    // Step 3: 教科情報セクション選択（改良版タイミング）
    console.log('📍 Step 3: 教科情報セクション選択（改良版）')
    const subjectInfoButton = page.locator('button:has-text("教科情報")')
    await expect(subjectInfoButton).toBeVisible({ timeout: 10000 })
    await subjectInfoButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // API読み込み完了待機

    // Step 4: 教科追加ダイアログオープン（改良版タイミング）
    console.log('📍 Step 4: 教科追加ダイアログオープン（改良版）')
    const addButton = page.locator('button:has-text("教科を追加")')
    await expect(addButton).toBeVisible({ timeout: 10000 })
    await addButton.click()
    await page.waitForTimeout(2000) // ダイアログ描画待機

    // Step 5: フォーム入力（改良版タイミング）
    console.log('📍 Step 5: フォーム入力（改良版）')

    // 教科名入力
    await page.waitForSelector('#subject-name', { timeout: 10000 })
    await page.fill('#subject-name', uniqueTestName)
    await page.waitForTimeout(500) // 入力安定化

    // 学年選択
    await page.waitForSelector('#grade-2', { timeout: 10000 })
    const grade2Checkbox = page.locator('#grade-2')
    await grade2Checkbox.check()
    await page.waitForTimeout(500) // 選択安定化

    // 週授業数入力
    await page.waitForSelector('#weekly-lessons', { timeout: 10000 })
    await page.fill('#weekly-lessons', '3')
    await page.waitForTimeout(500) // 入力安定化

    console.log(`📝 入力完了 - 教科名: ${uniqueTestName}`)

    // Step 6: 保存実行（改良版タイミング）
    console.log('📍 Step 6: 保存実行（改良版）')
    const saveButton = page.locator('[role="dialog"] button:has-text("追加")').last()
    await expect(saveButton).toBeVisible({ timeout: 10000 })
    await saveButton.click()

    // API完了を確実に待機
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // API処理完了待機

    // Step 7: 成功メッセージ確認（改良版タイミング）
    console.log('📍 Step 7: 成功メッセージ確認（改良版）')
    const successMessage = page.locator('text=教科を追加しました')
    await expect(successMessage).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000) // メッセージ表示安定化
    console.log('✅ 成功メッセージ確認完了')

    // Step 8: UI状態安定化（改良版タイミング）
    console.log('📍 Step 8: UI状態安定化（改良版）')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // React状態更新完了待機

    // Step 9: 一覧表示確認（改良版タイミング）
    console.log('📍 Step 9: 一覧表示確認（改良版）')

    // まず一覧テーブルの存在確認
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000) // テーブル描画安定化

    // 作成した教科の検索
    const createdSubjectRow = page.locator(`tr:has-text("${uniqueTestName}")`)
    await expect(createdSubjectRow).toBeVisible({ timeout: 15000 })

    console.log(`✅ 教科「${uniqueTestName}」が一覧に表示されています`)

    // Step 10: 詳細情報確認（改良版タイミング）
    console.log('📍 Step 10: 詳細情報確認（改良版）')
    await page.waitForTimeout(1000) // セル内容安定化

    const gradeCell = createdSubjectRow.locator('td').nth(1)
    const gradeText = await gradeCell.textContent()
    console.log(`📊 対象学年: ${gradeText}`)

    const hoursCell = createdSubjectRow.locator('td').nth(3)
    const hoursText = await hoursCell.textContent()
    console.log(`📚 週授業数: ${hoursText}`)

    // Step 11: 最終スクリーンショット
    await page.screenshot({ path: `test-results/timing-improved-success-${Date.now()}.png` })

    console.log('✅ タイミング改良版教科管理テスト完了')
  })
})
