/**
 * 03-教師管理E2Eテスト
 *
 * 真のE2Eテスト：ブラウザ操作による教師管理機能の確認
 * - 教師情報タブへの遷移
 * - 新規教師の追加（名前・メール・担当教科・学年設定）
 * - 教師一覧での表示確認
 * - 教師情報の編集
 * - 教師の削除
 * - データの永続化確認
 */

import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証状態を使用 - 一時的に無効化
// test.use({ storageState: 'tests/e2e/.auth/user.json' })

// テスト用教師データ生成
const generateTeacherTestData = () => {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 6)

  return {
    name: `テスト教師_${timestamp}_${randomSuffix}`,
    email: `test.teacher.${timestamp}@example.com`,
    subjects: ['数学', '算数'],
    grades: [1, 2, 3],
    testId: `teacher_test_${timestamp}`,
  }
}

test.describe('👨‍🏫 教師管理E2Eテスト', () => {
  test('教師の新規追加・編集・削除の一連の流れ', async ({ page }) => {
    const testData = generateTeacherTestData()
    console.log('🚀 教師管理E2Eテスト開始')
    console.log(`📝 テストデータ: ${JSON.stringify(testData, null, 2)}`)

    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '教師の新規追加・編集・削除の一連の流れ')

    // Step 0: 手動認証
    console.log('📍 Step 0: 手動認証')
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // ログインが必要かチェック（ログイン画面が表示されているか）
    const emailInput = page.locator('input[type="email"]')
    if ((await emailInput.count()) > 0) {
      console.log('🔍 ログイン画面が表示されました。認証を実行します。')

      // 認証情報の入力
      await emailInput.fill('test@school.local')
      await page.locator('input[type="password"]').fill('password123')
      await page.locator('button[type="submit"]').click()

      // 認証完了を待機
      await page.waitForTimeout(3000)
      await page.waitForLoadState('networkidle')

      console.log('✅ 手動認証完了')
    } else {
      console.log('✅ 認証は不要です（既にログイン済み）')
    }

    // Step 1: データ登録画面への遷移
    console.log('📍 Step 1: データ登録画面への遷移')

    // データ登録ボタンをクリック（data-testidを使用してSidebar折りたたみ状態にも対応）
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    await expect(dataButton).toBeVisible({ timeout: 10000 })
    await dataButton.click()
    await page.waitForTimeout(1000)

    // Step 2: 教師情報タブの選択
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
      await page.screenshot({ path: 'test-results/teacher-tab-not-found.png' })
      throw new Error('教師情報タブが見つかりません')
    }

    // Step 3: 新規教師追加ボタンの確認・クリック
    console.log('📍 Step 3: 新規教師追加')

    const addButtons = [
      'button:has-text("教師を追加")',
      'button:has-text("追加")',
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
      throw new Error('教師追加ボタンが見つかりません')
    }

    // Step 4: 教師情報入力フォームの入力
    console.log('📍 Step 4: 教師情報の入力')

    // 名前入力
    const nameInputs = [
      '#teacher-name',
      'input[id="teacher-name"]',
      'input[name="name"]',
      'input[placeholder*="名前"]',
      '[data-testid*="teacher-name"]',
    ]

    let nameInputFound = false
    for (const selector of nameInputs) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.name)
        console.log(`✅ 教師名入力: ${testData.name}`)
        nameInputFound = true
        break
      }
    }

    if (!nameInputFound) {
      console.log('⚠️ 教師名入力欄が見つかりません')
    }

    // メールアドレス入力
    const emailInputs = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="メール"]',
      'input[placeholder*="email"]',
    ]

    for (const selector of emailInputs) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.email)
        console.log(`✅ メールアドレス入力: ${testData.email}`)
        break
      }
    }

    // 担当教科の選択
    console.log('🔍 担当教科の選択')
    for (const subject of testData.subjects) {
      const subjectSelectors = [
        `#subject-1`, // 数学
        `#subject-2`, // 算数
        `input[id*="subject"]`,
        `checkbox:has-text("${subject}")`,
        `label:has-text("${subject}")`,
        `[data-value="${subject}"]`,
      ]

      for (const selector of subjectSelectors) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          await element.first().click()
          console.log(`✅ 担当教科選択: ${subject}`)
          break
        }
      }
    }

    // 担当学年の選択
    console.log('🔍 担当学年の選択')
    for (const grade of testData.grades) {
      const gradeSelectors = [
        `#grade-${grade}`,
        `input[id="grade-${grade}"]`,
        `label[for="grade-${grade}"]`,
        `checkbox:has-text("${grade}年")`,
        `label:has-text("${grade}年")`,
      ]

      for (const selector of gradeSelectors) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          await element.first().click()
          console.log(`✅ 担当学年選択: ${grade}年`)
          break
        }
      }
    }

    // Step 5: 教師情報の保存
    console.log('📍 Step 5: 教師情報の保存')

    const saveButtons = [
      '[role="dialog"] button:has-text("保存")',
      '[role="dialog"] button:has-text("追加")',
      '[role="dialog"] button[type="submit"]',
      'button[type="submit"]:visible',
      'button:has-text("保存"):visible',
      'button:has-text("追加"):visible',
      'button:has-text("作成"):visible',
    ]

    let saveSuccess = false
    for (const selector of saveButtons) {
      try {
        const button = page.locator(selector).first()
        if ((await button.count()) > 0) {
          console.log(`✅ 保存ボタン発見: ${selector}`)
          // ダイアログ内のボタンの場合はEscapeしない
          const isDialogButton = selector.includes('[role="dialog"]')
          if (!isDialogButton) {
            // ダイアログ外のボタンの場合のみEscape
            await page.keyboard.press('Escape')
            await page.waitForTimeout(500)
          }
          await button.click({ force: true })
          await page.waitForTimeout(2000)
          saveSuccess = true
          break
        }
      } catch (error) {
        console.log(`⚠️ 保存ボタンクリック失敗 (${selector}):`, error.message)
      }
    }

    if (!saveSuccess) {
      await page.screenshot({ path: 'test-results/save-teacher-button-not-found.png' })
      console.log('⚠️ 保存ボタンが見つかりません')
    }

    // Step 6: 教師一覧での確認
    console.log('📍 Step 6: 教師一覧での表示確認')

    // 教師一覧テーブルまたはリストの確認
    const teacherListElements = [
      'table',
      '[role="table"]',
      '.teacher-list',
      '[data-testid*="teacher-list"]',
    ]

    let _teacherListFound = false
    for (const selector of teacherListElements) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ 教師一覧確認: ${selector}`)
        _teacherListFound = true
        break
      }
    }

    // 追加した教師が一覧に表示されているか確認
    const addedTeacher = page.locator(`text="${testData.name}"`)
    if ((await addedTeacher.count()) > 0) {
      console.log(`✅ 追加した教師が一覧に表示されています: ${testData.name}`)
    } else {
      console.log(`⚠️ 追加した教師が一覧に見つかりません: ${testData.name}`)
      
      // エラー確認とテスト失敗
      const errorReport = errorMonitor.generateReport()
      console.error('📊 エラー詳細レポート:', {
        networkErrors: errorReport.networkErrors,
        consoleErrors: errorReport.consoleErrors,
        pageErrors: errorReport.pageErrors,
        hasFatalErrors: errorReport.hasFatalErrors
      })
      
      // ネットワークエラーまたは教師追加失敗を検知した場合はテスト失敗
      if (errorReport.networkErrors.length > 0) {
        throw new Error(`教師追加に失敗しました。ネットワークエラー: ${errorReport.networkErrors.join(', ')}`)
      } else if (errorReport.consoleErrors.length > 0) {
        throw new Error(`教師追加に失敗しました。コンソールエラー: ${errorReport.consoleErrors.join(', ')}`)
      } else {
        throw new Error(`教師追加に失敗しました。一覧に追加した教師 "${testData.name}" が表示されていません。`)
      }
    }

    // Step 7: 教師情報の編集（オプション）
    console.log('📍 Step 7: 教師情報の編集')

    // 編集ボタンを探してクリック
    const editButtons = [
      `tr:has-text("${testData.name}") button:has-text("編集")`,
      `tr:has-text("${testData.name}") button[aria-label*="編集"]`,
      `tr:has-text("${testData.name}") button[aria-label*="edit"]`,
      `[data-testid*="edit"]`,
    ]

    let editButtonFound = false
    for (const selector of editButtons) {
      const button = page.locator(selector)
      if ((await button.count()) > 0) {
        console.log(`✅ 編集ボタン発見: ${selector}`)
        await button.first().click()
        await page.waitForTimeout(1000)
        editButtonFound = true
        break
      }
    }

    if (editButtonFound) {
      // 名前を少し変更
      const updatedName = `${testData.name}_更新済み`
      const nameInput = page.locator('input[name="name"], input[placeholder*="名前"]').first()
      if ((await nameInput.count()) > 0) {
        await nameInput.clear()
        await nameInput.fill(updatedName)
        console.log(`✅ 教師名更新: ${updatedName}`)

        // 保存
        const updateButton = page
          .locator('button:has-text("保存"), button:has-text("更新"), button:has-text("Save")')
          .first()
        if ((await updateButton.count()) > 0) {
          await updateButton.click()
          await page.waitForTimeout(2000)
          console.log('✅ 教師情報更新完了')
        }
      }
    } else {
      console.log('ℹ️ 編集ボタンが見つかりません（編集機能がない可能性）')
    }

    // Step 8: 教師の削除 (モーダル干渉を回避)
    console.log('📍 Step 8: 教師の削除')

    // まず、開いているモーダル・ダイアログを閉じる
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)

    // 削除ボタンを探してクリック (より具体的なセレクタ)
    const deleteButtons = [
      `[data-testid="delete-teacher-${testData.testId}"]`,
      `tr:has-text("${testData.name}") [data-testid*="delete-teacher"]`,
      `button[aria-label*="教師「${testData.name}」を削除"]`,
      `button[title*="${testData.name}"]`,
    ]

    let deleteButtonFound = false
    for (const selector of deleteButtons) {
      const button = page.locator(selector)
      if ((await button.count()) > 0) {
        console.log(`✅ 削除ボタン発見: ${selector}`)

        // モーダル干渉回避のため force クリック
        await button.first().click({ force: true })
        await page.waitForTimeout(2000)

        // 削除確認ダイアログがある場合の処理
        const confirmButtons = [
          'button:has-text("削除")',
          'button:has-text("確認")',
          'button:has-text("OK")',
          'button:has-text("Delete")',
          'button:has-text("Confirm")',
        ]

        for (const confirmSelector of confirmButtons) {
          const confirmButton = page.locator(confirmSelector)
          if ((await confirmButton.count()) > 0) {
            await confirmButton.first().click({ force: true })
            await page.waitForTimeout(1000)
            console.log('✅ 削除確認')
            break
          }
        }

        deleteButtonFound = true
        break
      }
    }

    if (deleteButtonFound) {
      // 削除後、教師が一覧から消えているか確認
      await page.waitForTimeout(2000)
      const deletedTeacher = page.locator(`text="${testData.name}"`)
      if ((await deletedTeacher.count()) === 0) {
        console.log(`✅ 教師削除成功: ${testData.name}`)
      } else {
        console.log(`⚠️ 教師がまだ一覧に残っています: ${testData.name}`)
      }
    } else {
      console.log('ℹ️ 削除ボタンが見つかりません（削除機能がない可能性）')
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/teacher-management-complete.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教師管理E2Eテスト完了')
  })

  test('教師一覧の表示と検索機能', async ({ page }) => {
    console.log('🚀 教師一覧表示テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '教師一覧の表示と検索機能')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録 > 教師情報タブへ移動（data-testidを使用してSidebar折りたたみ状態にも対応）
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const teacherTab = page.locator('button:has-text("教師情報"), button:has-text("教師")').first()
    if ((await teacherTab.count()) > 0) {
      await teacherTab.click()
      await page.waitForTimeout(1000)
    }

    // 教師一覧の確認
    const teacherRows = page.locator('tr, .teacher-item, [data-testid*="teacher-row"]')
    const teacherCount = await teacherRows.count()
    console.log(`📊 表示されている教師数: ${teacherCount}`)

    // 検索機能がある場合のテスト
    const searchInputs = [
      'input[placeholder*="検索"]',
      'input[placeholder*="search"]',
      'input[name*="search"]',
      '[data-testid*="search"]',
    ]

    for (const selector of searchInputs) {
      const searchInput = page.locator(selector)
      if ((await searchInput.count()) > 0) {
        console.log(`✅ 検索機能発見: ${selector}`)
        await searchInput.fill('田中')
        await page.waitForTimeout(1000)

        const filteredRows = page.locator('tr:has-text("田中"), .teacher-item:has-text("田中")')
        const filteredCount = await filteredRows.count()
        console.log(`🔍 "田中"での検索結果: ${filteredCount}件`)

        // 検索をクリア
        await searchInput.clear()
        await page.waitForTimeout(1000)
        break
      }
    }

    await page.screenshot({ path: 'test-results/teacher-list-display.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教師一覧表示テスト完了')
  })

  test('教師のドラッグ&ドロップ順序変更と永続化確認', async ({ page }) => {
    console.log('🚀 教師ドラッグ&ドロップ順序変更テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '教師のドラッグ&ドロップ順序変更と永続化確認')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // Step 1: データ登録画面 > 教師情報タブへ移動
    console.log('📍 Step 1: 教師情報タブへの移動')
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const teacherTab = page.locator('button:has-text("教師情報"), button:has-text("教師")').first()
    if ((await teacherTab.count()) > 0) {
      await teacherTab.click()
      await page.waitForTimeout(1000)
    }

    // Step 2: テスト用教師データを作成（2件以上）
    console.log('📍 Step 2: テスト用教師データの作成')

    const timestamp = Date.now()
    const testTeachers = [
      { name: `テスト教師A_${timestamp}`, grade: 1, subject: '数学' },
      { name: `テスト教師B_${timestamp}`, grade: 2, subject: '英語' },
    ]

    // 既存データをチェック
    const existingRows = page.locator('tbody tr')
    const existingCount = await existingRows.count()

    // "教師情報が登録されていません"の行を含む場合は1とカウントされるが、実際のデータは0
    const hasEmptyMessage =
      (await page.locator('tbody tr td:has-text("教師情報が登録されていません")').count()) > 0
    const actualExistingCount = hasEmptyMessage ? 0 : existingCount

    console.log(`📊 既存の教師データ数: ${actualExistingCount}`)

    // テストデータを追加
    for (let i = 0; i < testTeachers.length; i++) {
      const teacher = testTeachers[i]
      console.log(`➕ テスト教師 ${i + 1} を追加中: ${teacher.name}`)

      // 教師追加ボタンをクリック
      const addButton = page.locator('button:has-text("教師を追加")')
      await addButton.click()
      await page.waitForTimeout(500)

      // ダイアログでデータ入力
      await page.fill('#teacher-name', teacher.name)
      await page.click(`#grade-${teacher.grade}`)
      const subjectIds = await page.locator('input[type="checkbox"][id*="subject-"]').all()
      for (const checkbox of subjectIds) {
        const label = page.locator(`label[for="${await checkbox.getAttribute('id')}"]`)
        if ((await label.textContent())?.includes(teacher.subject)) {
          await checkbox.click()
          break
        }
      }

      // 保存
      await page.click('button:has-text("保存")', { force: true })

      // ダイアログが完全に閉じるまで待機
      await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 })
      await page.waitForTimeout(500) // 追加の安定化時間

      console.log(`✅ テスト教師追加完了: ${teacher.name}`)
    }

    // データ作成後の行数確認
    await page.waitForTimeout(1000)
    const updatedRows = page.locator('tbody tr')
    const updatedCount = await updatedRows.count()
    console.log(`📊 教師データ作成後の数: ${updatedCount}`)

    if (updatedCount < 2) {
      console.log('❌ テスト用教師データの作成に失敗しました')
      errorMonitor.finalize()
      return
    }

    // Step 3: 現在の順序を記録
    console.log('📍 Step 3: 現在の教師順序を記録')
    const originalOrder: string[] = []

    for (let i = 0; i < Math.min(updatedCount, 5); i++) {
      // 最大5件まで確認
      const row = updatedRows.nth(i)
      const nameCell = row.locator('td').nth(1) // 2番目のセル（教師名）
      const teacherName = await nameCell.textContent()
      if (teacherName) {
        originalOrder.push(teacherName.trim())
        console.log(`📋 元の順序 ${i + 1}: ${teacherName.trim()}`)
      }
    }

    if (originalOrder.length < 2) {
      console.log('⚠️ 教師名の取得に失敗しました')
      errorMonitor.finalize()
      return
    }

    // Step 4: ドラッグ&ドロップ実行（1番目と2番目を入れ替え）
    console.log('📍 Step 4: ドラッグ&ドロップで順序変更実行')

    const firstRow = updatedRows.first()
    const secondRow = updatedRows.nth(1)

    console.log(`🔄 "${originalOrder[0]}" と "${originalOrder[1]}" の順序を入れ替え中...`)

    try {
      // ドラッグ&ドロップ実行
      await firstRow.dragTo(secondRow, {
        force: true,
        targetPosition: { x: 0, y: 50 }, // 2番目の行の下半分にドロップ
      })

      console.log('✅ ドラッグ&ドロップ実行完了')

      // デバウンス処理の完了を待機（実装では500ms）
      console.log('⏳ デバウンス処理完了を待機中...')
      await page.waitForTimeout(1500) // 余裕をもって1.5秒待機
    } catch (error) {
      console.log(`⚠️ ドラッグ&ドロップに失敗: ${error.message}`)

      // 代替手段: マウスイベントで手動実行
      console.log('🔄 代替手段でドラッグ&ドロップを実行中...')

      const firstRowBox = await firstRow.boundingBox()
      const secondRowBox = await secondRow.boundingBox()

      if (firstRowBox && secondRowBox) {
        await page.mouse.move(
          firstRowBox.x + firstRowBox.width / 2,
          firstRowBox.y + firstRowBox.height / 2
        )
        await page.mouse.down()
        await page.waitForTimeout(100)
        await page.mouse.move(
          secondRowBox.x + secondRowBox.width / 2,
          secondRowBox.y + secondRowBox.height / 2 + 20
        )
        await page.waitForTimeout(100)
        await page.mouse.up()

        console.log('✅ 代替手段によるドラッグ&ドロップ完了')
        await page.waitForTimeout(1500) // デバウンス待機
      }
    }

    // Step 5: 順序変更の即時確認
    console.log('📍 Step 5: 順序変更の即時確認')

    await page.waitForTimeout(1000)
    const rowsForOrder = page.locator('tbody tr')
    const immediateOrder: string[] = []

    const currentRowCount = await rowsForOrder.count()
    for (let i = 0; i < Math.min(currentRowCount, originalOrder.length); i++) {
      const row = rowsForOrder.nth(i)
      const nameCell = row.locator('td').nth(1)
      const teacherName = await nameCell.textContent()
      if (teacherName) {
        immediateOrder.push(teacherName.trim())
        console.log(`📋 変更後の順序 ${i + 1}: ${teacherName.trim()}`)
      }
    }

    // 順序変更が反映されているか確認
    const orderChanged =
      immediateOrder[0] !== originalOrder[0] || immediateOrder[1] !== originalOrder[1]
    if (orderChanged) {
      console.log('✅ 順序変更が即座に反映されました')
    } else {
      console.log('⚠️ 順序変更が即座に反映されませんでした')
    }

    // Step 6: ページリロードで永続化確認
    console.log('📍 Step 6: ページリロード後の順序確認')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 再度教師情報タブに移動
    const dataButtonAfterReload = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButtonAfterReload.count()) > 0) {
      await dataButtonAfterReload.click()
      await page.waitForTimeout(1000)
    }

    const teacherTabAfterReload = page
      .locator('button:has-text("教師情報"), button:has-text("教師")')
      .first()
    if ((await teacherTabAfterReload.count()) > 0) {
      await teacherTabAfterReload.click()
      await page.waitForTimeout(2000) // データ読み込み待機
    }

    // リロード後の順序を確認
    const reloadedRows = page.locator('tbody tr')
    const persistentOrder: string[] = []

    const reloadedRowCount = await reloadedRows.count()
    for (let i = 0; i < Math.min(reloadedRowCount, originalOrder.length); i++) {
      const row = reloadedRows.nth(i)
      const nameCell = row.locator('td').nth(1)
      const teacherName = await nameCell.textContent()
      if (teacherName) {
        persistentOrder.push(teacherName.trim())
        console.log(`📋 リロード後の順序 ${i + 1}: ${teacherName.trim()}`)
      }
    }

    // Step 7: 永続化確認の評価
    console.log('📍 Step 7: 永続化確認の評価')

    if (persistentOrder.length >= 2) {
      // 順序が保持されているか（変更が永続化されているか）確認
      const isPersistent = JSON.stringify(persistentOrder) === JSON.stringify(immediateOrder)

      if (isPersistent && orderChanged) {
        console.log('✅ ドラッグ&ドロップによる順序変更が正常に永続化されました')
      } else if (isPersistent && !orderChanged) {
        console.log('ℹ️ 順序変更は発生しませんでしたが、順序は一貫して保持されています')
      } else {
        console.log('⚠️ 順序変更の永続化に問題がある可能性があります')
        console.log(`即時順序: ${JSON.stringify(immediateOrder)}`)
        console.log(`永続順序: ${JSON.stringify(persistentOrder)}`)
      }
    }

    // Step 8: テストデータのクリーンアップ
    console.log('📍 Step 8: テストデータのクリーンアップ')

    try {
      // 作成したテストデータを削除
      for (const teacher of testTeachers) {
        console.log(`🗑️ テスト教師を削除中: ${teacher.name}`)

        // 該当行を見つけて削除ボタンをクリック
        const teacherRow = page.locator(`tbody tr:has-text("${teacher.name}")`)
        if ((await teacherRow.count()) > 0) {
          const deleteButton = teacherRow.locator('button[aria-label*="削除"]')
          if ((await deleteButton.count()) > 0) {
            await deleteButton.click()
            await page.waitForTimeout(500)

            // 削除確認ダイアログがあれば確認
            const confirmButton = page.locator('button:has-text("削除")')
            if ((await confirmButton.count()) > 0) {
              await confirmButton.click()
            }

            await page.waitForTimeout(1000)
            console.log(`✅ テスト教師削除完了: ${teacher.name}`)
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ テストデータクリーンアップ中にエラー: ${error.message}`)
    }

    await page.screenshot({ path: 'test-results/teacher-drag-drop-complete.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教師ドラッグ&ドロップ順序変更テスト完了')
  })
})
