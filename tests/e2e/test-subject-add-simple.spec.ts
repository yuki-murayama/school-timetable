import { test, expect } from '@playwright/test'

test.describe('📚 シンプル教科追加テスト', () => {
  test.use({ storageState: 'tests/e2e/.auth/production-user.json' })

  test('本番環境でのシンプル教科追加テスト', async ({ page }) => {
    console.log('🚀 シンプル教科追加テスト開始')

    // 本番環境にアクセス
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev')
    await page.waitForLoadState('networkidle')

    // データ登録画面に移動
    console.log('📍 Step 1: データ登録画面への遷移')
    const dataManagementButton = page.locator('button:has-text("データ登録")')
    await dataManagementButton.click()
    await page.waitForTimeout(1000)

    // 教科情報セクションをクリック
    console.log('📍 Step 2: 教科情報セクションの選択')
    const subjectInfoButton = page.locator('button:has-text("教科情報")')
    await subjectInfoButton.click()
    await page.waitForTimeout(2000)

    // 教科追加ボタンをクリック
    console.log('📍 Step 3: 教科追加ダイアログの開始')
    const addButton = page.locator('button:has-text("教科を追加")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // 一意なテストデータを作成
    const uniqueTestName = `シンプルテスト教科_${Date.now()}`
    console.log(`📝 作成する教科名: ${uniqueTestName}`)

    // フォーム入力
    console.log('📍 Step 4: フォーム入力')
    await page.fill('#subject-name', uniqueTestName)
    
    const grade2Checkbox = page.locator('#grade-2')
    await grade2Checkbox.check()
    
    await page.fill('#weekly-lessons', '2')

    // 保存
    console.log('📍 Step 5: 教科の保存')
    const saveButton = page.locator('[role="dialog"] button:has-text("追加")').last()
    await saveButton.click()
    await page.waitForTimeout(2000)

    // 成功メッセージの確認
    console.log('📍 Step 6: 成功メッセージの確認')
    const successMessage = page.locator('text=教科を追加しました')
    await expect(successMessage).toBeVisible({ timeout: 5000 })
    console.log('✅ 成功メッセージ確認完了')

    // 一覧での確認
    console.log('📍 Step 7: 一覧での教科確認')
    await page.waitForTimeout(1000)
    
    const createdSubjectRow = page.locator(`tr:has-text("${uniqueTestName}")`)
    await expect(createdSubjectRow).toBeVisible({ timeout: 5000 })
    console.log(`✅ 教科「${uniqueTestName}」が一覧に表示されています`)

    // 詳細情報の確認
    const gradeCell = createdSubjectRow.locator('td').nth(1)
    const gradeText = await gradeCell.textContent()
    console.log(`📊 対象学年: ${gradeText}`)
    
    const hoursCell = createdSubjectRow.locator('td').nth(3) 
    const hoursText = await hoursCell.textContent()
    console.log(`📚 週授業数: ${hoursText}`)

    console.log('✅ シンプル教科追加テスト完了')
  })
})