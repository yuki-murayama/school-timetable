import { expect, test } from '@playwright/test'
import { getBaseURL } from '../../config/ports'

test.describe('👨‍🏫 教師編集バリデーションテスト', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test('担当学年編集時のバリデーションエラー検証', async ({ page }) => {
    console.log('🚀 教師編集バリデーションテスト開始')

    const testData = {
      name: `編集テスト教師_${Date.now()}`,
      originalGrades: [1, 2],
      newGrades: [2, 3],
    }

    // Step 1: データ登録画面へ移動
    console.log('📍 Step 1: データ登録画面への移動')
    await page.goto(getBaseURL('local'))
    await page.waitForLoadState('networkidle')

    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await expect(dataManagementButton).toBeVisible({ timeout: 15000 })
    await dataManagementButton.click()
    await page.waitForLoadState('networkidle')

    // Step 2: 教師情報タブ選択
    console.log('📍 Step 2: 教師情報タブの選択')
    const teacherTabs = [
      'button:has-text("教師情報")',
      'button:has-text("教師")',
      '[role="tab"]:has-text("教師情報")',
      '[role="tab"]:has-text("教師")',
      'button:has-text("Teachers")',
    ]

    let teacherTabFound = false
    for (const selector of teacherTabs) {
      const tab = page.locator(selector)
      if ((await tab.count()) > 0) {
        console.log(`✅ 教師タブ発見: ${selector}`)
        await tab.first().click()
        await page.waitForTimeout(1000)
        teacherTabFound = true
        break
      }
    }

    if (!teacherTabFound) {
      console.error('❌ 教師情報タブが見つかりません')
      await page.screenshot({ path: 'test-results/teacher-tab-not-found.png' })
      throw new Error('教師情報タブが見つかりません')
    }

    await page.waitForTimeout(2000)

    // Step 3: 新規教師作成（編集テスト用）
    console.log('📍 Step 3: 新規教師作成（編集テスト用）')
    const addButtons = [
      'button:has-text("教師を追加")',
      'button:has-text("新規追加")',
      'button:has-text("Add Teacher")',
      '[data-testid*="add-teacher"]',
      'button[aria-label*="追加"]',
    ]

    let addButtonFound = false
    for (const selector of addButtons) {
      const button = page.locator(selector)
      if ((await button.count()) > 0) {
        console.log(`✅ 追加ボタン発見: ${selector}`)
        await button.first().click()
        await page.waitForTimeout(1000)
        addButtonFound = true
        break
      }
    }

    if (!addButtonFound) {
      await page.screenshot({ path: 'test-results/add-teacher-button-not-found.png' })
      console.error('❌ 教師追加ボタンが見つかりません')
      throw new Error('教師追加ボタンが見つかりません')
    }

    await page.waitForTimeout(2000)

    // 教師名入力
    await page.fill('#teacher-name', testData.name)
    console.log(`✅ 教師名入力: ${testData.name}`)

    // 初期担当学年選択
    for (const grade of testData.originalGrades) {
      const gradeCheckbox = page.locator(`#grade-${grade}`)
      await gradeCheckbox.check()
      console.log(`✅ 初期担当学年選択: ${grade}年`)
    }

    // 保存
    const saveButton = page.locator('[role="dialog"] button:has-text("保存")')
    await expect(saveButton).toBeVisible({ timeout: 15000 })
    await saveButton.click()
    await page.waitForTimeout(3000)
    console.log('✅ 新規教師作成完了')

    // Step 4: 作成した教師の編集開始
    console.log('📍 Step 4: 作成した教師の編集開始')
    const editButton = page.locator(`tr:has-text("${testData.name}") [data-testid*="edit-teacher"]`)
    await expect(editButton).toBeVisible({ timeout: 15000 })
    await editButton.click()
    await page.waitForTimeout(3000)
    console.log('✅ 編集ダイアログ開いた')

    // Step 5: 担当学年の変更テスト
    console.log('📍 Step 5: 担当学年の変更テスト')

    // 現在の担当学年状態をコンソールに出力
    console.log('🔍 現在の担当学年チェックボックス状態確認...')
    for (let grade = 1; grade <= 3; grade++) {
      const checkbox = page.locator(`#grade-${grade}`)
      const isChecked = await checkbox.isChecked()
      console.log(
        `📊 ${grade}年生チェックボックス: ${isChecked ? '☑️ チェック済み' : '☐ 未チェック'}`
      )
    }

    // 既存の学年を解除（1年生のチェックを外す）
    console.log('🔄 既存学年の解除テスト（1年生を外す）')
    const grade1Checkbox = page.locator('#grade-1')
    if (await grade1Checkbox.isChecked()) {
      await grade1Checkbox.uncheck()
      console.log('✅ 1年生のチェックを外しました')
    }

    // 新しい学年を追加（3年生を追加）
    console.log('➕ 新しい学年の追加テスト（3年生を追加）')
    const grade3Checkbox = page.locator('#grade-3')
    if (!(await grade3Checkbox.isChecked())) {
      await grade3Checkbox.check()
      console.log('✅ 3年生にチェックを入れました')
    }

    // チェックボックス変更後の状態確認
    console.log('🔍 変更後の担当学年チェックボックス状態確認...')
    for (let grade = 1; grade <= 3; grade++) {
      const checkbox = page.locator(`#grade-${grade}`)
      const isChecked = await checkbox.isChecked()
      console.log(
        `📊 ${grade}年生チェックボックス: ${isChecked ? '☑️ チェック済み' : '☐ 未チェック'}`
      )
    }

    // Step 6: 保存実行とエラー検証
    console.log('📍 Step 6: 保存実行とバリデーションエラー検証')

    // コンソールエラー監視開始
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
        console.log('🔍 [CONSOLE ERROR]:', msg.text())
      }
      if (
        msg.text().includes('Validation errors') ||
        msg.text().includes('Expected string, received number')
      ) {
        console.log('🚨 [VALIDATION ERROR DETECTED]:', msg.text())
      }
    })

    // 保存ボタンクリック
    const updateSaveButton = page.locator('[role="dialog"] button:has-text("保存")')
    await expect(updateSaveButton).toBeVisible({ timeout: 15000 })
    await updateSaveButton.click()

    // 保存処理の完了を待機
    await page.waitForTimeout(5000)
    console.log('⏰ 保存処理完了待機')

    // Step 7: エラー検出結果の確認
    console.log('📍 Step 7: バリデーションエラー検出結果の確認')

    if (consoleErrors.some(error => error.includes('Expected string, received number'))) {
      console.log('✅ バリデーションエラーを正常に検出しました！')
      console.log(
        '🔍 検出されたエラー:',
        consoleErrors.filter(error => error.includes('Expected string, received number'))
      )
    } else {
      console.log('⚠️ バリデーションエラーが検出されませんでした')
      console.log('🔍 全コンソールエラー:', consoleErrors)
    }

    // ダイアログが開いたままかどうか確認（エラー時は閉じない）
    const isDialogStillOpen = await page.locator('[role="dialog"]').isVisible()
    if (isDialogStillOpen) {
      console.log('⚠️ ダイアログが開いたまま = 保存が失敗した可能性')
    } else {
      console.log('✅ ダイアログが閉じた = 保存が成功した可能性')
    }

    // Step 8: テストデータクリーンアップ
    console.log('📍 Step 8: テストデータクリーンアップ')
    if (!isDialogStillOpen) {
      // ダイアログが閉じている場合のみ削除実行
      const deleteButton = page.locator(
        `tr:has-text("${testData.name}") [data-testid*="delete-teacher"]`
      )
      if ((await deleteButton.count()) > 0) {
        await deleteButton.click()
        await page.waitForTimeout(1000)
        console.log('✅ テストデータを削除しました')
      }
    } else {
      // ダイアログが開いている場合はキャンセルしてから削除
      const cancelButton = page.locator('[role="dialog"] button:has-text("キャンセル")')
      if ((await cancelButton.count()) > 0) {
        await cancelButton.click()
        await page.waitForTimeout(1000)

        const deleteButton = page.locator(
          `tr:has-text("${testData.name}") [data-testid*="delete-teacher"]`
        )
        if ((await deleteButton.count()) > 0) {
          await deleteButton.click()
          await page.waitForTimeout(1000)
          console.log('✅ テストデータを削除しました')
        }
      }
    }

    console.log('✅ 教師編集バリデーションテスト完了')
  })
})
