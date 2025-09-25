import { test } from '@playwright/test'

test.describe('🧹 本番E2Eテスト: データクリーンアップと検証改良', () => {
  test.use({ storageState: 'tests/e2e/.auth/production-user.json' })

  test('本番環境での教科追加テスト検証改良', async ({ page }) => {
    console.log('🧹 本番環境テストデータクリーンアップと検証改良テスト開始')

    // 初期URL記録
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev')
    await page.waitForLoadState('networkidle')

    // データ登録画面に移動
    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await dataManagementButton.click()
    await page.waitForTimeout(1000)

    // 教科情報セクションをクリック
    const subjectInfoButton = page.locator('button:has-text("教科情報")')
    await subjectInfoButton.click()
    await page.waitForTimeout(2000)

    // STEP 1: 既存のテスト教科をクリーンアップ（本番環境では最大5個まで）
    console.log('🧹 STEP 1: 既存テスト教科のクリーンアップ（本番環境制限版）')

    // テスト用教科を検索（名前に"テスト"または"厳密テスト"を含むもの）
    const testSubjectRows = page.locator('tr').filter({ hasText: /テスト|test|厳密テスト/i })
    const testSubjectCount = await testSubjectRows.count()
    console.log(`🧹 削除対象のテスト教科数: ${testSubjectCount}`)

    // 本番環境では最大5個のテスト教科を削除（安全のため制限）
    for (let i = 0; i < Math.min(testSubjectCount, 5); i++) {
      const row = testSubjectRows.first()
      const subjectName = await row.locator('td').first().textContent()
      console.log(`🗑️ 削除中: ${subjectName}`)

      // 削除ボタンをクリック
      const deleteButton = row.locator('button[aria-label*="delete"], button:has-text("削除")')
      if ((await deleteButton.count()) > 0) {
        await deleteButton.click()
        await page.waitForTimeout(500)

        // 確認ダイアログがあれば確認
        const confirmButton = page.locator(
          'button:has-text("削除"), button:has-text("確認"), button:has-text("はい")'
        )
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click()
          await page.waitForTimeout(1000)
        }
      }
    }

    // STEP 2: 新しいテスト教科を作成
    console.log('➕ STEP 2: 新しい本番テスト教科の作成')
    const uniqueTestName = `本番検証用教科_${Date.now()}`

    const addButton = page.locator('button:has-text("教科を追加")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // フォーム入力
    await page.fill('#subject-name', uniqueTestName)
    const grade2Checkbox = page.locator('#grade-2')
    await grade2Checkbox.check()
    await page.fill('#weekly-lessons', '3')

    // 保存（ダイアログ内の追加ボタンを使用）
    const saveButton = page.locator('[role="dialog"] button:has-text("追加")').last()
    await saveButton.click()
    await page.waitForTimeout(3000)

    // STEP 3: 改良された検証
    console.log('✅ STEP 3: 本番環境での改良された検証')

    // 検証方法1: 特定の教科名で検索
    const createdSubjectRow = page.locator(`tr:has-text("${uniqueTestName}")`)
    const isVisible = (await createdSubjectRow.count()) > 0

    if (isVisible) {
      console.log(`✅ 成功: 本番環境で教科「${uniqueTestName}」が一覧に表示されています`)

      // 詳細情報も確認
      const gradeCell = createdSubjectRow.locator('td').nth(1)
      const gradeText = await gradeCell.textContent()
      console.log(`📊 対象学年: ${gradeText}`)

      const hoursCell = createdSubjectRow.locator('td').nth(3)
      const hoursText = await hoursCell.textContent()
      console.log(`📚 週授業数: ${hoursText}`)
    } else {
      console.log(`❌ 失敗: 本番環境で教科「${uniqueTestName}」が一覧に見つかりません`)

      // デバッグ: 現在の一覧をダンプ
      const allRows = page.locator('tbody tr')
      const rowCount = await allRows.count()
      console.log(`🔍 現在の教科数: ${rowCount}`)

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const rowText = await allRows.nth(i).textContent()
        console.log(`  ${i + 1}: ${rowText}`)
      }

      await page.screenshot({ path: 'test-results/production-verification-failed.png' })
      throw new Error(`本番環境で教科「${uniqueTestName}」の作成検証に失敗しました`)
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/production-cleanup-and-verification-success.png' })
    console.log('✅ 本番環境テストデータクリーンアップと検証改良テスト完了')
  })
})
