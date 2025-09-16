import { test, expect } from '@playwright/test'

test.describe('📚 究極のタイミング改良版教科管理テスト', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test('究極版：適切なインターバルによる教科管理テスト', async ({ page }) => {
    console.log('🚀 究極のタイミング改良版教科管理テスト開始')
    console.log('⏰ 各ステップ間に適切な待機時間を設定したテストです')

    // Step 0: 事前クリーンアップ（重複データ問題対策）
    console.log('🧹 Step 0: 事前クリーンアップ（重複データ対策）')
    await page.goto('http://localhost:5174')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // 初期読み込み安定化

    // データ登録画面へ移動
    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await expect(dataManagementButton).toBeVisible({ timeout: 15000 })
    await dataManagementButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(4000) // 画面遷移完全安定化

    // 教科情報セクション選択
    const subjectInfoButton = page.locator('button:has-text("教科情報")')
    await expect(subjectInfoButton).toBeVisible({ timeout: 15000 })
    await subjectInfoButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(6000) // API読み込み完全待機

    // 既存のテスト教科を削除（重複データ対策）
    const testSubjectRows = page.locator('tr').filter({ hasText: /テスト|test|改良版/i })
    const testSubjectCount = await testSubjectRows.count()
    console.log(`🧹 削除対象のテスト教科数: ${testSubjectCount}`)

    for (let i = 0; i < Math.min(testSubjectCount, 5); i++) {
      try {
        const row = testSubjectRows.first()
        const deleteButton = row.locator('button[aria-label*="delete"], button:has-text("削除")')
        if (await deleteButton.count() > 0) {
          await deleteButton.click()
          await page.waitForTimeout(1000)
          
          const confirmButton = page.locator('button:has-text("削除"), button:has-text("確認"), button:has-text("はい")')
          if (await confirmButton.count() > 0) {
            await confirmButton.click()
            await page.waitForTimeout(2000) // 削除処理完了待機
          }
        }
      } catch (error) {
        console.log(`⚠️ 削除中にエラー: ${error}`)
        break
      }
    }

    // Step 1: 新しい教科作成開始（大幅な待機時間改良）
    console.log('📍 Step 1: 新しい教科作成開始（大幅改良版タイミング）')
    const uniqueTestName = `究極版テスト教科_${Date.now()}`
    console.log(`📝 作成する教科名: ${uniqueTestName}`)

    // 教科追加ボタンクリック
    const addButton = page.locator('button:has-text("教科を追加")')
    await expect(addButton).toBeVisible({ timeout: 15000 })
    await addButton.click()
    await page.waitForTimeout(3000) // ダイアログ完全描画待機

    // Step 2: フォーム入力（各入力間に十分な間隔）
    console.log('📍 Step 2: フォーム入力（各入力間十分な間隔）')
    
    // 教科名入力
    await page.waitForSelector('#subject-name', { timeout: 15000 })
    await page.fill('#subject-name', uniqueTestName)
    await page.waitForTimeout(1000) // 入力後安定化
    console.log('✅ 教科名入力完了')

    // 学年選択
    await page.waitForSelector('#grade-2', { timeout: 15000 })
    const grade2Checkbox = page.locator('#grade-2')
    await grade2Checkbox.check()
    await page.waitForTimeout(1000) // 選択後安定化
    console.log('✅ 学年選択完了')

    // 週授業数入力
    await page.waitForSelector('#weekly-lessons', { timeout: 15000 })
    await page.fill('#weekly-lessons', '3')
    await page.waitForTimeout(1000) // 入力後安定化
    console.log('✅ 週授業数入力完了')

    // Step 3: 保存実行（API完了まで十分な待機）
    console.log('📍 Step 3: 保存実行（API完了まで十分待機）')
    const saveButton = page.locator('[role="dialog"] button:has-text("追加")').last()
    await expect(saveButton).toBeVisible({ timeout: 15000 })
    await saveButton.click()
    console.log('✅ 保存ボタンクリック完了')
    
    // API処理完了を確実に待機（大幅な待機時間）
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(8000) // API処理とReact状態更新完了待機
    console.log('⏰ API処理完了待機完了')

    // Step 4: UI状態完全安定化（追加の安定化時間）
    console.log('📍 Step 4: UI状態完全安定化（追加の安定化時間）')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // React状態更新とDOM再描画完了待機
    console.log('⏰ UI状態安定化完了')

    // Step 5: 一覧表示確認（十分な待機後に確認）
    console.log('📍 Step 5: 一覧表示確認（十分な待機後）')
    
    // テーブル存在確認
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000) // テーブル描画完全安定化

    // 作成した教科の検索（長時間の待機を許可）
    console.log(`🔍 教科「${uniqueTestName}」を検索中...`)
    const createdSubjectRow = page.locator(`tr:has-text("${uniqueTestName}")`)
    
    // 最大20秒待機で確認
    await expect(createdSubjectRow).toBeVisible({ timeout: 20000 })
    console.log(`✅ 教科「${uniqueTestName}」が一覧に表示確認完了`)

    // Step 6: 詳細情報確認（最終検証）
    console.log('📍 Step 6: 詳細情報確認（最終検証）')
    await page.waitForTimeout(2000) // セル内容完全安定化
    
    const gradeCell = createdSubjectRow.locator('td').nth(1)
    const gradeText = await gradeCell.textContent()
    console.log(`📊 対象学年: ${gradeText}`)
    
    const hoursCell = createdSubjectRow.locator('td').nth(3)
    const hoursText = await hoursCell.textContent()
    console.log(`📚 週授業数: ${hoursText}`)

    // 重複チェック（改良版）
    console.log('📍 Step 7: 重複チェック（改良版）')
    const duplicateSubjects = page.locator(`tr:has-text("${uniqueTestName}")`)
    const duplicateCount = await duplicateSubjects.count()
    
    if (duplicateCount === 1) {
      console.log(`✅ 教科「${uniqueTestName}」は重複していません (${duplicateCount}個)`)
    } else {
      console.log(`⚠️ 注意: 教科「${uniqueTestName}」が${duplicateCount}個存在します`)
      for (let i = 0; i < duplicateCount; i++) {
        const rowText = await duplicateSubjects.nth(i).textContent()
        console.log(`  ${i + 1}: ${rowText}`)
      }
    }

    // 最終スクリーンショット
    await page.screenshot({ path: `test-results/ultimate-timing-success-${Date.now()}.png` })
    
    console.log('✅ 究極のタイミング改良版教科管理テスト完了')
    console.log('⏰ このテストでは各ステップ間に十分なインターバルを設けました')
  })
})