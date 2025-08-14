import { test } from '@playwright/test'

test('Debug - アイコン表示問題の詳細調査', async ({ page }) => {
  console.log('🔍 アイコン表示問題の詳細調査を開始')
  
  // データ登録ページに移動
  await page.goto('/')
  await page.click('button:has-text("データ登録")')
  await page.click('[data-value="subjects"]')
  
  // 教科テーブルが表示されるまで待機
  await page.waitForSelector('table')
  
  console.log('📊 教科テーブルのアイコン詳細調査')
  
  // 最初の教科行を取得
  const firstRow = page.locator('table tbody tr').first()
  
  // ボタン要素を取得
  const editButton = firstRow.locator('button[data-testid^="edit-subject-"]')
  const deleteButton = firstRow.locator('button[data-testid^="delete-subject-"]')
  
  // SVG要素の存在確認
  const editSvg = editButton.locator('svg')
  const deleteSvg = deleteButton.locator('svg')
  
  console.log('🔘 編集ボタン詳細:')
  console.log('   SVG存在:', await editSvg.count() > 0)
  console.log('   SVG classes:', await editSvg.getAttribute('class'))
  console.log('   SVGサイズ:', {
    width: await editSvg.getAttribute('width'),
    height: await editSvg.getAttribute('height')
  })
  console.log('   ボタンスタイル:', await editButton.getAttribute('style'))
  console.log('   計算後スタイル:', await editButton.evaluate(el => {
    const computed = window.getComputedStyle(el)
    return {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      color: computed.color,
      fontSize: computed.fontSize
    }
  }))
  
  console.log('🔘 削除ボタン詳細:')
  console.log('   SVG存在:', await deleteSvg.count() > 0)
  console.log('   SVG classes:', await deleteSvg.getAttribute('class'))
  console.log('   SVGサイズ:', {
    width: await deleteSvg.getAttribute('width'),
    height: await deleteSvg.getAttribute('height')
  })
  
  // SVG内部構造も確認
  if (await editSvg.count() > 0) {
    const paths = editSvg.locator('path')
    console.log('   編集アイコンpath数:', await paths.count())
    
    for (let i = 0; i < await paths.count(); i++) {
      const path = paths.nth(i)
      console.log(`   path[${i}]:`, {
        d: await path.getAttribute('d'),
        fill: await path.getAttribute('fill'),
        stroke: await path.getAttribute('stroke'),
        style: await path.getAttribute('style')
      })
    }
  }
  
  // スクリーンショット撮影
  await page.screenshot({ 
    path: 'debug-icon-issue.png',
    clip: { x: 300, y: 300, width: 800, height: 400 }
  })
  console.log('📸 スクリーンショット保存: debug-icon-issue.png')
})