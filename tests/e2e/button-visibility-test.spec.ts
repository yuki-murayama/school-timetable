import { test, expect } from '@playwright/test'

test('教科情報画面の編集・削除ボタン視認性確認', async ({ page }) => {
  console.log('🔍 教科情報画面のボタン視認性テスト開始')
  
  // データ登録ページに移動
  await page.goto('/')
  await page.click('button:has-text("データ登録")')
  await page.click('[data-value="subjects"]')
  
  // 教科テーブルが表示されるまで待機
  await page.waitForSelector('table')
  
  console.log('📊 教科情報テーブル確認')
  
  // 最初の教科行を取得
  const firstRow = page.locator('table tbody tr').first()
  const rowCount = await page.locator('table tbody tr').count()
  console.log('📝 表示されている教科数:', rowCount)
  
  if (rowCount > 0) {
    // 編集ボタンの視認性確認
    const editButton = firstRow.locator('button[data-testid^="edit-subject-"]')
    const editButtonExists = await editButton.count() > 0
    console.log('✏️ 編集ボタン存在:', editButtonExists)
    
    if (editButtonExists) {
      // ボタンのアウトライン表示確認
      const buttonClass = await editButton.getAttribute('class')
      console.log('🎨 編集ボタンクラス:', buttonClass)
      
      // ボタンが視覚的に識別可能かチェック
      const buttonStyle = await editButton.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          border: computed.border,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          opacity: computed.opacity,
          visibility: computed.visibility
        }
      })
      console.log('🔘 編集ボタン計算済みスタイル:', JSON.stringify(buttonStyle, null, 2))
    }
    
    // 削除ボタンの視認性確認
    const deleteButton = firstRow.locator('button[data-testid^="delete-subject-"]')
    const deleteButtonExists = await deleteButton.count() > 0
    console.log('🗑️ 削除ボタン存在:', deleteButtonExists)
    
    if (deleteButtonExists) {
      const buttonClass = await deleteButton.getAttribute('class')
      console.log('🎨 削除ボタンクラス:', buttonClass)
      
      const buttonStyle = await deleteButton.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          border: computed.border,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          opacity: computed.opacity,
          visibility: computed.visibility
        }
      })
      console.log('🔘 削除ボタン計算済みスタイル:', JSON.stringify(buttonStyle, null, 2))
    }
    
    // Expectアサーションでボタンの存在と可視性を検証
    await expect(editButton).toBeVisible()
    await expect(deleteButton).toBeVisible()
    
    console.log('✅ 両方のボタンが可視状態で存在することを確認')
  } else {
    console.log('⚠️ 教科データがありません')
  }
  
  // スクリーンショット撮影
  await page.screenshot({ 
    path: 'button-visibility-test.png',
    clip: { x: 280, y: 230, width: 900, height: 400 }
  })
  console.log('📸 スクリーンショット保存: button-visibility-test.png')
})