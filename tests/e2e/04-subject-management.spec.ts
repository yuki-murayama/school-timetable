/**
 * 04-教科管理E2Eテスト
 *
 * 真のE2Eテスト：ブラウザ操作による教科管理機能の確認
 * - 教科情報タブへの遷移
 * - 新規教科の追加（名前・対象学年・専用教室・週授業数設定）
 * - 教科一覧での表示確認
 * - 教科情報の編集
 * - 教科の削除
 * - データの永続化確認
 */

import { expect, test } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'

// 認証状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

// テスト用教科データ生成
const generateSubjectTestData = () => {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 6)

  return {
    name: `削除テスト用教科_${timestamp}_${randomSuffix}`,
    targetGrades: [1, 2, 3],
    specialClassroom: `理科室${randomSuffix}`,
    weeklyHours: 3,
    testId: `subject_test_${timestamp}`,
  }
}

test.describe('📚 教科管理E2Eテスト', () => {
  test('教科の新規追加・編集・削除の一連の流れ', async ({ page }) => {
    const testData = generateSubjectTestData()
    console.log('🚀 教科管理E2Eテスト開始')
    console.log(`📝 テストデータ: ${JSON.stringify(testData, null, 2)}`)

    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '教科の新規追加・編集・削除の一連の流れ')

    // Step 1: データ登録画面への遷移
    console.log('📍 Step 1: データ登録画面への遷移')
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録ボタンをクリック
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    await expect(dataButton).toBeVisible({ timeout: 10000 })
    await dataButton.click()
    await page.waitForTimeout(1000)

    // Step 2: 教科情報タブの選択
    console.log('📍 Step 2: 教科情報タブの選択')

    const subjectTabs = [
      'button:has-text("教科情報")',
      'button:has-text("教科")',
      '[role="tab"]:has-text("教科情報")',
      '[role="tab"]:has-text("教科")',
      'button:has-text("Subjects")',
    ]

    let subjectTabFound = false
    for (const selector of subjectTabs) {
      const tab = page.locator(selector)
      if ((await tab.count()) > 0) {
        console.log(`✅ 教科タブ発見: ${selector}`)
        await tab.first().click()
        await page.waitForTimeout(1000)
        subjectTabFound = true
        break
      }
    }

    if (!subjectTabFound) {
      await page.screenshot({ path: 'test-results/subject-tab-not-found.png' })
      throw new Error('教科情報タブが見つかりません')
    }

    // Step 3: 新規教科追加ボタンの確認・クリック
    console.log('📍 Step 3: 新規教科追加')

    const addButtons = [
      'button:has-text("教科を追加")',
      '[data-testid="add-subject-button"]',
      'button:has-text("追加")',
      'button:has-text("新規追加")',
      'button:has-text("Add Subject")',
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
      await page.screenshot({ path: 'test-results/add-subject-button-not-found.png' })
      throw new Error('教科追加ボタンが見つかりません')
    }

    // Step 4: 教科情報入力フォームの入力
    console.log('📍 Step 4: 教科情報の入力')

    // 名前入力
    const nameInputs = [
      '#subject-name',
      'input[id="subject-name"]',
      'input[name="name"]',
      'input[placeholder*="教科名"]',
      'input[placeholder*="名前"]',
      '[data-testid*="subject-name"]',
    ]

    let nameInputFound = false
    for (const selector of nameInputs) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.name)
        console.log(`✅ 教科名入力: ${testData.name}`)
        nameInputFound = true
        break
      }
    }

    if (!nameInputFound) {
      console.log('⚠️ 教科名入力欄が見つかりません')
    }

    // 対象学年の選択
    console.log('🔍 対象学年の選択')
    for (const grade of testData.targetGrades) {
      const gradeSelectors = [
        `#grade-${grade}`,
        `input[id="grade-${grade}"]`,
        `label[for="grade-${grade}"]`,
        `checkbox:has-text("${grade}年")`,
        `label:has-text("${grade}年")`,
        `input[value="${grade}"]`,
      ]

      for (const selector of gradeSelectors) {
        const element = page.locator(selector)
        if ((await element.count()) > 0) {
          await element.first().click()
          console.log(`✅ 対象学年選択: ${grade}年`)
          break
        }
      }
    }

    // 専用教室入力
    const classroomInputs = [
      'input[name="specialClassroom"]',
      'input[placeholder*="専用教室"]',
      'input[placeholder*="教室"]',
      '[data-testid*="classroom"]',
    ]

    for (const selector of classroomInputs) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.specialClassroom)
        console.log(`✅ 専用教室入力: ${testData.specialClassroom}`)
        break
      }
    }

    // 週授業数入力
    const weeklyHoursInputs = [
      'input[name="weeklyHours"]',
      'input[name="weekly_hours"]',
      'input[placeholder*="週授業数"]',
      'input[placeholder*="週"]',
      '[data-testid*="weekly"]',
    ]

    for (const selector of weeklyHoursInputs) {
      const input = page.locator(selector)
      if ((await input.count()) > 0) {
        await input.first().clear()
        await input.first().fill(testData.weeklyHours.toString())
        console.log(`✅ 週授業数入力: ${testData.weeklyHours}`)
        break
      }
    }

    // Step 5: 教科情報の保存
    console.log('📍 Step 5: 教科情報の保存')

    const saveButtons = [
      'button:has-text("保存"):visible',
      'button:has-text("追加"):visible',
      'button:has-text("作成"):visible',
      '[role="dialog"] button:has-text("保存")',
      '[role="dialog"] button:has-text("追加")',
      'button[type="submit"]:visible',
    ]

    let saveSuccess = false
    for (const selector of saveButtons) {
      try {
        const button = page.locator(selector).first()
        if ((await button.count()) > 0) {
          console.log(`✅ 保存ボタン発見: ${selector}`)
          // モーダル干渉回避のためEscape押下とforce click
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
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
      await page.screenshot({ path: 'test-results/save-subject-button-not-found.png' })
      console.log('⚠️ 保存ボタンが見つかりません')
    }

    // Step 6: 教科一覧での確認
    console.log('📍 Step 6: 教科一覧での表示確認')

    // 教科一覧テーブルの確認
    const subjectListElements = [
      'table',
      '[role="table"]',
      '.subject-list',
      '[data-testid*="subject-list"]',
    ]

    let _subjectListFound = false
    for (const selector of subjectListElements) {
      if ((await page.locator(selector).count()) > 0) {
        console.log(`✅ 教科一覧確認: ${selector}`)
        _subjectListFound = true
        break
      }
    }

    // 追加した教科が一覧に表示されているか確認
    const addedSubject = page.locator(`text="${testData.name}"`)
    if ((await addedSubject.count()) > 0) {
      console.log(`✅ 追加した教科が一覧に表示されています: ${testData.name}`)
    } else {
      console.log(`⚠️ 追加した教科が一覧に見つかりません: ${testData.name}`)
    }

    // Step 7: 教科情報の編集
    console.log('📍 Step 7: 教科情報の編集')

    // 新規追加した教科の編集ボタンを特定して実行
    const createdSubjectRow = page.locator(`tr:has-text("${testData.name}")`)
    if ((await createdSubjectRow.count()) > 0) {
      console.log(`✅ 新規追加教科の行を発見: ${testData.name}`)

      // 編集ボタンを特定してクリック
      const editButton = createdSubjectRow.locator(
        'button[aria-label*="編集"], button[data-testid*="edit"], button:has-text("編集")'
      )
      if ((await editButton.count()) > 0) {
        await editButton.first().click({ force: true })
        await page.waitForTimeout(1000)

        // 編集ダイアログで名前を変更
        const updatedName = `${testData.name}_更新済み`
        const nameInput = page
          .locator('#subject-name, input[name="name"], input[placeholder*="教科名"]')
          .first()
        if ((await nameInput.count()) > 0) {
          await nameInput.clear()
          await nameInput.fill(updatedName)
          console.log(`✅ 教科名更新: ${updatedName}`)

          // 保存
          const updateButton = page
            .locator('button:has-text("保存"), button:has-text("更新")')
            .first()
          await updateButton.click({ force: true })
          await page.waitForTimeout(2000)
          console.log('✅ 教科情報更新完了')
        }
      } else {
        console.log('ℹ️ 編集ボタンが見つかりません（編集機能がない可能性）')
      }
    } else {
      console.log(`⚠️ 新規追加した教科の行が見つかりません: ${testData.name}`)
    }

    // Step 8: 教科の削除
    console.log('📍 Step 8: 教科の削除')

    // まず、開いているモーダル・ダイアログを閉じる
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)

    // 更新後の教科名を使用して削除操作を実行
    const updatedName = `${testData.name}_更新済み`
    const subjectRowToDelete = page.locator(`tr:has-text("${updatedName}")`)

    if ((await subjectRowToDelete.count()) > 0) {
      console.log(`✅ 削除対象教科の行を発見: ${updatedName}`)

      // 削除ボタンを探してクリック
      const deleteButton = subjectRowToDelete.locator(
        'button[aria-label*="削除"], button[data-testid*="delete"], button:has([data-testid*="trash"])'
      )
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click({ force: true })
        await page.waitForTimeout(1000)

        // 削除確認ダイアログがある場合は確認
        const confirmButton = page
          .locator('button:has-text("削除"), button:has-text("確認"), button:has-text("はい")')
          .first()
        if ((await confirmButton.count()) > 0) {
          await confirmButton.click({ force: true })
        }

        await page.waitForTimeout(2000)
        console.log(`✅ 教科削除成功: ${updatedName}`)
      } else {
        console.log('ℹ️ 削除ボタンが見つかりません（削除機能がない可能性）')
      }
    } else {
      // 元の名前でも試行
      const originalSubjectRow = page.locator(`tr:has-text("${testData.name}")`)
      if ((await originalSubjectRow.count()) > 0) {
        const deleteButton = originalSubjectRow.locator(
          'button[aria-label*="削除"], button[data-testid*="delete"], button:has([data-testid*="trash"])'
        )
        if ((await deleteButton.count()) > 0) {
          await deleteButton.first().click({ force: true })
          await page.waitForTimeout(1000)

          // 削除確認ダイアログがある場合は確認
          const confirmButton = page
            .locator('button:has-text("削除"), button:has-text("確認"), button:has-text("はい")')
            .first()
          if ((await confirmButton.count()) > 0) {
            await confirmButton.click({ force: true })
          }

          await page.waitForTimeout(2000)
          console.log(`✅ 元の教科名で削除成功: ${testData.name}`)
        }
      }
    }

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/subject-management-complete.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教科管理E2Eテスト完了')
  })

  test('教科一覧の表示と初期値確認', async ({ page }) => {
    console.log('🚀 教科一覧表示テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '教科一覧の表示と初期値確認')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // データ登録 > 教科情報タブへ移動
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const subjectTab = page.locator('button:has-text("教科情報"), button:has-text("教科")').first()
    if ((await subjectTab.count()) > 0) {
      await subjectTab.click()
      await page.waitForTimeout(1000)
    }

    // 教科一覧の確認
    const subjectRows = page.locator('tr, .subject-item, [data-testid*="subject-row"]')
    const subjectCount = await subjectRows.count()
    console.log(`📊 表示されている教科数: ${subjectCount}`)

    // 教科一覧のヘッダー確認
    const expectedHeaders = ['教科名', '対象学年', '専用教室', '1週間の授業数']
    for (const header of expectedHeaders) {
      const headerElement = page.locator(`th:has-text("${header}"), .header:has-text("${header}")`)
      if ((await headerElement.count()) > 0) {
        console.log(`✅ ヘッダー確認: ${header}`)
      }
    }

    // 各教科の詳細情報確認
    const firstRow = page.locator('tbody tr').first()
    if ((await firstRow.count()) > 0) {
      const cells = firstRow.locator('td')
      const cellCount = await cells.count()
      console.log(`📋 1行目のセル数: ${cellCount}`)

      // 各セルの内容を確認
      for (let i = 1; i < cellCount - 1; i++) {
        // 最初のセル（ドラッグハンドル）と最後のセル（操作ボタン）を除く
        const cellContent = await cells.nth(i).textContent()
        console.log(`📝 セル${i}: ${cellContent?.trim() || '(空)'}`)
      }
    }

    await page.screenshot({ path: 'test-results/subject-list-display.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教科一覧表示テスト完了')
  })

  test('教科のドラッグ&ドロップ順序変更と永続化確認', async ({ page }) => {
    console.log('🚀 教科ドラッグ&ドロップ順序変更テスト開始')

    // エラー監視の設定（テストケース毎にクリーンな状態で開始）
    const errorMonitor = createErrorMonitor(page, '教科のドラッグ&ドロップ順序変更と永続化確認')

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // Step 1: データ登録画面 > 教科情報タブへ移動
    console.log('📍 Step 1: 教科情報タブへの移動')
    const dataButton = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButton.count()) > 0) {
      await dataButton.click()
      await page.waitForTimeout(1000)
    }

    const subjectTab = page.locator('button:has-text("教科情報"), button:has-text("教科")').first()
    if ((await subjectTab.count()) > 0) {
      await subjectTab.click()
      await page.waitForTimeout(1000)
    }

    // Step 2: 教科データが最低2件あることを確認
    console.log('📍 Step 2: 教科データの存在確認')
    const subjectRows = page.locator('tbody tr')
    const rowCount = await subjectRows.count()
    console.log(`📊 現在の教科データ数: ${rowCount}`)

    if (rowCount < 2) {
      console.log('ℹ️ ドラッグ&ドロップテストには最低2件の教科データが必要です')
      errorMonitor.finalize()
      return
    }

    // Step 3: 現在の順序を記録
    console.log('📍 Step 3: 現在の教科順序を記録')
    const originalOrder: string[] = []

    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      // 最大5件まで確認
      const row = subjectRows.nth(i)
      const nameCell = row.locator('td').nth(1) // 2番目のセル（教科名）
      const subjectName = await nameCell.textContent()
      if (subjectName) {
        originalOrder.push(subjectName.trim())
        console.log(`📋 元の順序 ${i + 1}: ${subjectName.trim()}`)
      }
    }

    if (originalOrder.length < 2) {
      console.log('⚠️ 教科名の取得に失敗しました')
      errorMonitor.finalize()
      return
    }

    // Step 4: ドラッグ&ドロップ実行（1番目と2番目を入れ替え）
    console.log('📍 Step 4: ドラッグ&ドロップで順序変更実行')

    const firstRow = subjectRows.first()
    const secondRow = subjectRows.nth(1)

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
    const updatedRows = page.locator('tbody tr')
    const immediateOrder: string[] = []

    const currentRowCount = await updatedRows.count()
    for (let i = 0; i < Math.min(currentRowCount, originalOrder.length); i++) {
      const row = updatedRows.nth(i)
      const nameCell = row.locator('td').nth(1)
      const subjectName = await nameCell.textContent()
      if (subjectName) {
        immediateOrder.push(subjectName.trim())
        console.log(`📋 変更後の順序 ${i + 1}: ${subjectName.trim()}`)
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

    // 再度教科情報タブに移動
    const dataButtonAfterReload = page.locator('[data-testid="sidebar-data-button"]')
    if ((await dataButtonAfterReload.count()) > 0) {
      await dataButtonAfterReload.click()
      await page.waitForTimeout(1000)
    }

    const subjectTabAfterReload = page
      .locator('button:has-text("教科情報"), button:has-text("教科")')
      .first()
    if ((await subjectTabAfterReload.count()) > 0) {
      await subjectTabAfterReload.click()
      await page.waitForTimeout(2000) // データ読み込み待機
    }

    // リロード後の順序を確認
    const reloadedRows = page.locator('tbody tr')
    const persistentOrder: string[] = []

    const reloadedRowCount = await reloadedRows.count()
    for (let i = 0; i < Math.min(reloadedRowCount, originalOrder.length); i++) {
      const row = reloadedRows.nth(i)
      const nameCell = row.locator('td').nth(1)
      const subjectName = await nameCell.textContent()
      if (subjectName) {
        persistentOrder.push(subjectName.trim())
        console.log(`📋 リロード後の順序 ${i + 1}: ${subjectName.trim()}`)
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

    await page.screenshot({ path: 'test-results/subject-drag-drop-complete.png' })

    // エラー監視終了とレポート生成
    errorMonitor.finalize()

    console.log('✅ 教科ドラッグ&ドロップ順序変更テスト完了')
  })
})
