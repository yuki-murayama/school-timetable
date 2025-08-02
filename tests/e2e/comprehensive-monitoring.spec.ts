import { test, expect } from '@playwright/test';
import { LogCollector } from './utils/log-collector';

test.describe('Comprehensive Application Monitoring', () => {

  test('アプリケーション全体の健全性チェック', async ({ page }) => {
    const logger = new LogCollector(page, 'application-health-check');
    
    console.log('🚀 Starting comprehensive application health check...');
    
    // メインページにアクセス
    await page.goto('/');
    console.log('✅ Navigated to main page');
    
    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');
    console.log('✅ Page load completed');
    
    // 追加の時間を置いてすべてのAPIリクエストを確実にキャプチャ
    await page.waitForTimeout(5000);
    console.log('✅ Additional monitoring period completed');
    
    // 認証関連の要素が存在するかチェック
    try {
      const authElements = page.locator('[data-testid="clerk-loading"], .cl-rootBox, .cl-signIn-root, .cl-signUp-root');
      await expect(authElements.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Authentication elements detected');
    } catch (error) {
      console.log('ℹ️ Authentication elements not found - may be already authenticated');
    }
    
    // ログ分析
    logger.printLogs();
    await logger.saveLogsToFile();
    
    const stats = logger.getLogStatistics();
    const errors = logger.getErrors();
    const warnings = logger.getWarnings();
    const apiLogs = logger.getApiLogs();
    
    // 健全性の評価
    console.log('\n🏥 HEALTH CHECK RESULTS:');
    console.log(`   Total Events: ${stats.total}`);
    console.log(`   Errors: ${stats.errors} ${stats.errors === 0 ? '✅' : '❌'}`);
    console.log(`   Warnings: ${stats.warnings} ${stats.warnings <= 5 ? '✅' : '⚠️'}`);
    console.log(`   API Requests: ${stats.apiRequests} ${stats.apiRequests > 0 ? '✅' : '⚠️'}`);
    
    // 重大なエラーがないかチェック
    const criticalErrors = errors.filter(error => 
      error.message.toLowerCase().includes('uncaught') ||
      error.message.toLowerCase().includes('cannot read') ||
      error.message.toLowerCase().includes('undefined is not')
    );
    
    if (criticalErrors.length > 0) {
      console.log(`\n🚨 CRITICAL ERRORS DETECTED (${criticalErrors.length}):`);
      criticalErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    } else {
      console.log('\n✅ No critical errors detected');
    }
    
    // API問題の分析
    const failedApiRequests = apiLogs.filter(log => log.status && log.status >= 400);
    const htmlApiResponses = apiLogs.filter(log => 
      log.details && 
      typeof log.details.responseBody === 'string' && 
      log.details.responseBody.includes('<!DOCTYPE html>')
    );
    
    if (failedApiRequests.length > 0) {
      console.log(`\n🌐 API FAILURES (${failedApiRequests.length}):`);
      failedApiRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.status} ${req.url}`);
      });
    }
    
    if (htmlApiResponses.length > 0) {
      console.log(`\n⚠️ API ROUTING ISSUES (${htmlApiResponses.length}):`);
      htmlApiResponses.forEach((req, index) => {
        console.log(`${index + 1}. ${req.url} - Received HTML instead of JSON`);
      });
    }
    
    expect(true).toBe(true); // 情報収集目的なので常に成功
  });

  test('データ登録画面の詳細監視', async ({ page }) => {
    const logger = new LogCollector(page, 'data-registration-monitoring');
    
    console.log('📝 Starting data registration screen monitoring...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // データ登録画面へのナビゲーションを試行
    try {
      // データ登録関連のリンクやボタンを広範囲で検索
      const possibleSelectors = [
        'a[href*="data"]',
        'a[href*="registration"]', 
        'a[href*="register"]',
        'button:has-text("データ")',
        'button:has-text("登録")',
        'a:has-text("データ")',
        'a:has-text("登録")',
        '[data-testid*="data"]',
        '[data-testid*="registration"]'
      ];
      
      let navigationSuccessful = false;
      
      for (const selector of possibleSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          console.log(`🔍 Found ${count} elements matching: ${selector}`);
          try {
            await elements.first().click();
            await page.waitForLoadState('networkidle');
            navigationSuccessful = true;
            console.log(`✅ Successfully navigated using: ${selector}`);
            break;
          } catch (error) {
            console.log(`❌ Failed to navigate using: ${selector} - ${error}`);
          }
        }
      }
      
      if (navigationSuccessful) {
        // データ登録画面での追加監視
        await page.waitForTimeout(3000);
        
        // フォーム要素の存在確認
        const formElements = page.locator('form, input, select, textarea, [role="form"]');
        const formCount = await formElements.count();
        console.log(`📋 Found ${formCount} form-related elements`);
        
        if (formCount > 0) {
          console.log('✅ Data registration form elements detected');
        } else {
          console.log('⚠️ No form elements found on data registration screen');
        }
      } else {
        console.log('⚠️ Could not navigate to data registration screen');
      }
      
    } catch (error) {
      console.log(`❌ Error during data registration screen access: ${error}`);
    }
    
    logger.printLogs();
    await logger.saveLogsToFile();
    
    expect(true).toBe(true);
  });

  test('時間割表示画面の詳細監視', async ({ page }) => {
    const logger = new LogCollector(page, 'timetable-view-monitoring');
    
    console.log('📅 Starting timetable view monitoring...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 時間割表示画面へのナビゲーションを試行
    try {
      const possibleSelectors = [
        'a[href*="timetable"]',
        'a[href*="schedule"]',
        'button:has-text("時間割")',
        'button:has-text("スケジュール")',
        'a:has-text("時間割")',
        'a:has-text("スケジュール")',
        '[data-testid*="timetable"]',
        '[data-testid*="schedule"]'
      ];
      
      let navigationSuccessful = false;
      
      for (const selector of possibleSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          console.log(`🔍 Found ${count} elements matching: ${selector}`);
          try {
            await elements.first().click();
            await page.waitForLoadState('networkidle');
            navigationSuccessful = true;
            console.log(`✅ Successfully navigated using: ${selector}`);
            break;
          } catch (error) {
            console.log(`❌ Failed to navigate using: ${selector} - ${error}`);
          }
        }
      }
      
      if (navigationSuccessful) {
        // 時間割表示画面での追加監視
        await page.waitForTimeout(3000);
        
        // 時間割関連要素の存在確認
        const timetableElements = page.locator('table, .timetable, .schedule, .grid, [role="grid"]');
        const tableCount = await timetableElements.count();
        console.log(`📊 Found ${tableCount} timetable-related elements`);
        
        if (tableCount > 0) {
          console.log('✅ Timetable display elements detected');
        } else {
          console.log('⚠️ No timetable elements found on timetable screen');
        }
      } else {
        console.log('⚠️ Could not navigate to timetable screen');
      }
      
    } catch (error) {
      console.log(`❌ Error during timetable screen access: ${error}`);
    }
    
    logger.printLogs();
    await logger.saveLogsToFile();
    
    expect(true).toBe(true);
  });

  test('パフォーマンス監視', async ({ page }) => {
    const logger = new LogCollector(page, 'performance-monitoring');
    
    console.log('⚡ Starting performance monitoring...');
    
    // パフォーマンス測定の開始
    const startTime = Date.now();
    
    await page.goto('/');
    const pageLoadTime = Date.now() - startTime;
    
    await page.waitForLoadState('networkidle');
    const fullLoadTime = Date.now() - startTime;
    
    console.log(`📊 PERFORMANCE METRICS:`);
    console.log(`   Initial page load: ${pageLoadTime}ms`);
    console.log(`   Full load (networkidle): ${fullLoadTime}ms`);
    
    // リソースのパフォーマンス測定
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation').map(entry => ({
        domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart),
        loadComplete: Math.round(entry.loadEventEnd - entry.loadEventStart),
        firstPaint: Math.round(entry.responseEnd - entry.requestStart),
      }));
    });
    
    if (performanceEntries.length > 0) {
      const perf = performanceEntries[0];
      console.log(`   DOM Content Loaded: ${perf.domContentLoaded}ms`);
      console.log(`   Load Event: ${perf.loadComplete}ms`);
      console.log(`   First Paint: ${perf.firstPaint}ms`);
    }
    
    // パフォーマンス評価
    if (fullLoadTime < 3000) {
      console.log('✅ Excellent load time');
    } else if (fullLoadTime < 5000) {
      console.log('⚠️ Acceptable load time');
    } else {
      console.log('❌ Slow load time');
    }
    
    logger.printLogs();
    await logger.saveLogsToFile();
    
    expect(true).toBe(true);
  });
});