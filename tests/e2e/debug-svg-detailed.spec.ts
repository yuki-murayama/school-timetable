import { test } from '@playwright/test'

test('Debug - SVG要素の詳細調査', async ({ page }) => {
  console.log('🔍 SVG要素の詳細調査を開始')
  
  // データ登録ページに移動
  await page.goto('/')
  await page.click('button:has-text("データ登録")')
  await page.click('[data-value="subjects"]')
  
  // 教科テーブルが表示されるまで待機
  await page.waitForSelector('table')
  
  console.log('📊 SVG要素の詳細調査')
  
  // 最初の教科行の編集ボタンを取得
  const firstRow = page.locator('table tbody tr').first()
  const editButton = firstRow.locator('button[data-testid^="edit-subject-"]')
  
  // ボタンが存在することを確認
  const buttonExists = await editButton.count() > 0
  console.log('🔘 編集ボタン存在:', buttonExists)
  
  if (buttonExists) {
    // ボタン内部のHTML構造を確認
    const buttonHTML = await editButton.innerHTML()
    console.log('📝 ボタン内部HTML:', buttonHTML)
    
    // SVG要素を確認
    const svgElements = editButton.locator('svg')
    const svgCount = await svgElements.count()
    console.log('🎨 SVG要素数:', svgCount)
    
    if (svgCount > 0) {
      const svg = svgElements.first()
      
      // SVG属性を確認
      const svgAttrs = await svg.evaluate(el => ({
        class: el.className.baseVal || el.getAttribute('class'),
        width: el.getAttribute('width'),
        height: el.getAttribute('height'),
        viewBox: el.getAttribute('viewBox'),
        fill: el.getAttribute('fill'),
        style: el.getAttribute('style'),
        computedStyle: {
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility,
          opacity: window.getComputedStyle(el).opacity,
          color: window.getComputedStyle(el).color,
          width: window.getComputedStyle(el).width,
          height: window.getComputedStyle(el).height
        }
      }))
      
      console.log('🎨 SVG属性:', JSON.stringify(svgAttrs, null, 2))
      
      // path要素を確認
      const paths = svg.locator('path')
      const pathCount = await paths.count()
      console.log('📐 Path要素数:', pathCount)
      
      for (let i = 0; i < pathCount; i++) {
        const path = paths.nth(i)
        const pathAttrs = await path.evaluate(el => ({
          d: el.getAttribute('d'),
          fill: el.getAttribute('fill'),
          stroke: el.getAttribute('stroke'),
          strokeWidth: el.getAttribute('stroke-width'),
          style: el.getAttribute('style'),
          computedStyle: {
            fill: window.getComputedStyle(el).fill,
            stroke: window.getComputedStyle(el).stroke,
            opacity: window.getComputedStyle(el).opacity
          }
        }))
        console.log(`📐 Path[${i}]属性:`, JSON.stringify(pathAttrs, null, 2))
      }
    }
    
    // ボタン自体の計算されたスタイルを確認
    const buttonStyle = await editButton.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        border: computed.border,
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        overflow: computed.overflow
      }
    })
    console.log('🔘 ボタン計算済みスタイル:', JSON.stringify(buttonStyle, null, 2))
  }
  
  // スクリーンショット撮影
  await page.screenshot({ 
    path: 'debug-svg-detailed.png',
    clip: { x: 300, y: 300, width: 800, height: 400 }
  })
  console.log('📸 スクリーンショット保存: debug-svg-detailed.png')
})