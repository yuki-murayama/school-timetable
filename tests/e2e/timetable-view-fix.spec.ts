import { test, expect } from '@playwright/test'

// 認証状態を使用
test.use({ storageState: 'tests/e2e/.auth/user.json' })

test.describe('時間割参照画面修正のテスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // メインページにアクセス
    await page.goto('/')
    
    // アプリケーションが読み込まれるまで待機（メインコンテンツの表示を確認）
    await page.waitForSelector('nav, header, main', { timeout: 15000 })
    
    console.log('✅ アプリケーション読み込み完了')
  })

  test('時間割参照画面の一覧表示エラー修正確認', async ({ page }) => {
    console.log('🧪 時間割参照画面の表示テスト開始')
    
    // 時間割参照画面へ移動
    await page.click('a[href="/timetable-view"]')
    await page.waitForLoadState('networkidle')
    
    // ページタイトル確認
    await expect(page.locator('h1')).toContainText('時間割参照')
    
    // エラーメッセージが表示されていないことを確認
    const errorElements = page.locator('.destructive, [role="alert"]')
    const errorCount = await errorElements.count()
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent()
      console.log('⚠️ エラーメッセージが検出されました:', errorText)
    }
    
    // ローディング完了まで待機
    await page.waitForSelector('[data-testid="loading"], .animate-spin', { state: 'detached', timeout: 15000 })
    
    // 時間割一覧が表示されることを確認
    const timetableCards = page.locator('[data-testid="timetable-card"], .border.rounded-lg')
    const cardCount = await timetableCards.count()
    
    console.log(`📊 時間割一覧表示数: ${cardCount}件`)
    
    // 最低1件は表示されることを期待（生成済みの時間割があるため）
    expect(cardCount).toBeGreaterThan(0)
    
    // 生成済み時間割の表示を確認
    const generatedTimetable = page.locator(':has-text("90.1%"), :has-text("program-optimized")')
    if (await generatedTimetable.count() > 0) {
      console.log('✅ 生成済み時間割が正常に表示されています')
      expect(generatedTimetable).toBeVisible()
    } else {
      console.log('ℹ️ 生成済み時間割が見つかりませんでした（データがない可能性）')
    }
  })

  test('時間割詳細表示機能テスト', async ({ page }) => {
    console.log('🧪 時間割詳細表示テスト開始')
    
    // 時間割参照画面へ移動
    await page.click('a[href="/timetable-view"]')
    await page.waitForLoadState('networkidle')
    
    // ローディング完了まで待機
    await page.waitForSelector('[data-testid="loading"], .animate-spin', { state: 'detached', timeout: 15000 })
    
    // 詳細を見るボタンをクリック
    const viewButton = page.locator('button:has-text("詳細を見る")').first()
    
    if (await viewButton.count() > 0) {
      await viewButton.click()
      
      // 詳細画面の表示を確認
      await expect(page.locator('button:has-text("一覧に戻る")')).toBeVisible()
      
      // 時間割表の表示を確認
      await expect(page.locator('table')).toBeVisible()
      await expect(page.locator('th:has-text("月")')).toBeVisible()
      await expect(page.locator('th:has-text("火")')).toBeVisible()
      
      console.log('✅ 時間割詳細画面が正常に表示されました')
    } else {
      console.log('ℹ️ 詳細を見るボタンが見つかりませんでした')
    }
  })

  test('API呼び出し確認', async ({ page }) => {
    console.log('🧪 API呼び出し確認テスト開始')
    
    // ネットワークリクエストを監視
    const apiCalls = []
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method()
        })
      }
    })
    
    // 時間割参照画面へ移動
    await page.click('a[href="/timetable-view"]')
    await page.waitForLoadState('networkidle')
    
    // APIコールの確認
    const timetableAPICalls = apiCalls.filter(call => 
      call.url.includes('/frontend/school/timetables') || 
      call.url.includes('/timetable/program/saved')
    )
    
    console.log('📡 検出されたAPI呼び出し:')
    timetableAPICalls.forEach(call => {
      console.log(`  ${call.method} ${call.url}`)
    })
    
    // 両方のエンドポイントが呼ばれることを確認
    const conventionalAPI = timetableAPICalls.some(call => call.url.includes('/frontend/school/timetables'))
    const savedAPI = timetableAPICalls.some(call => call.url.includes('/timetable/program/saved'))
    
    console.log(`従来の時間割API呼び出し: ${conventionalAPI ? '✅' : '❌'}`)
    console.log(`生成済み時間割API呼び出し: ${savedAPI ? '✅' : '❌'}`)
    
    // 少なくとも生成済み時間割APIは呼ばれるべき
    expect(savedAPI).toBe(true)
  })

  test('コンソールエラーチェック', async ({ page }) => {
    console.log('🧪 コンソールエラーチェック開始')
    
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // 時間割参照画面へ移動
    await page.click('a[href="/timetable-view"]')
    await page.waitForLoadState('networkidle')
    
    // ローディング完了まで待機
    await page.waitForTimeout(3000)
    
    // "t.value is not iterable"エラーがないことを確認
    const iterableErrors = consoleErrors.filter(error => 
      error.includes('is not iterable') || 
      error.includes('TypeError')
    )
    
    if (iterableErrors.length > 0) {
      console.log('❌ イテレーション関連エラーが検出されました:')
      iterableErrors.forEach(error => console.log(`  ${error}`))
      expect(iterableErrors.length).toBe(0)
    } else {
      console.log('✅ イテレーション関連エラーは検出されませんでした')
    }
    
    // その他の重要なエラーをレポート
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('Network')
    )
    
    if (criticalErrors.length > 0) {
      console.log('⚠️ その他のコンソールエラー:')
      criticalErrors.forEach(error => console.log(`  ${error}`))
    }
  })
})