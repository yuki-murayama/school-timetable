import { test, expect } from '@playwright/test'

test('Debug - テーブルの列数の不一致確認', async ({ page }) => {
  console.log('🔍 テーブルの列数の不一致を調査')
  
  // データ登録ページに移動
  await page.goto('/')
  await page.click('button:has-text("データ登録")')
  await page.click('[data-value="subjects"]')
  
  // 教科テーブルが表示されるまで待機
  await page.waitForSelector('table')
  
  console.log('📊 テーブル構造の詳細調査')
  
  // ヘッダー行の列数確認
  const headerCells = page.locator('table thead tr th')
  const headerCount = await headerCells.count()
  console.log('🔤 ヘッダー列数:', headerCount)
  
  for (let i = 0; i < headerCount; i++) {
    const text = await headerCells.nth(i).textContent()
    console.log(`   ヘッダー[${i}]: "${text}"`)
  }
  
  // ボディ行の最初の行の列数確認
  const firstBodyRow = page.locator('table tbody tr').first()
  const bodyCells = firstBodyRow.locator('td')
  const bodyCount = await bodyCells.count()
  console.log('🔤 ボディ列数:', bodyCount)
  
  for (let i = 0; i < bodyCount; i++) {
    const cell = bodyCells.nth(i)
    const text = await cell.textContent()
    const innerHTML = await cell.innerHTML()
    console.log(`   ボディ[${i}]: "${text?.trim()}"`)
    console.log(`   HTML[${i}]: ${innerHTML.substring(0, 100)}...`)
  }
  
  // 各行の列数を確認
  const allRows = page.locator('table tbody tr')
  const rowCount = await allRows.count()
  console.log('📊 総行数:', rowCount)
  
  for (let i = 0; i < Math.min(rowCount, 3); i++) {
    const row = allRows.nth(i)
    const cells = row.locator('td')
    const cellCount = await cells.count()
    console.log(`   行[${i}]の列数: ${cellCount}`)
  }
  
  // スクリーンショット撮影
  await page.screenshot({ 
    path: 'debug-column-count.png',
    fullPage: true
  })
  console.log('📸 スクリーンショット保存: debug-column-count.png')
  
  // 期待値との比較
  console.log('✅ ヘッダー列数:', headerCount)
  console.log('✅ ボディ列数:', bodyCount)
  console.log('✅ 列数一致:', headerCount === bodyCount ? 'YES' : 'NO')
})