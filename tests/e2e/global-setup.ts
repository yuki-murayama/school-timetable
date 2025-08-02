import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for authentication...');
  
  // 認証状態ファイルのパス
  const authFile = path.join(__dirname, '.auth', 'user.json');
  
  // 環境変数から認証情報を取得（.env.testファイルから）
  const testUserEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testUserPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
  
  console.log(`Using test credentials: ${testUserEmail}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to application...');
    const baseURL = 'https://school-timetable-monorepo.grundhunter.workers.dev';
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Clerkの認証フローを実行
    console.log('🔍 Looking for authentication elements...');
    
    // 認証要素が表示されるまで待機
    const authElement = page.locator('.cl-rootBox, .cl-signIn-root, button:has-text("ログイン"), button:has-text("Sign In")');
    await authElement.first().waitFor({ timeout: 10000 });
    
    console.log('✅ Authentication elements found');
    
    // If there's a sign-in button, click it
    const signInButton = page.locator('button:has-text("ログイン"), button:has-text("Sign In")');
    if (await signInButton.count() > 0) {
      await signInButton.first().click();
      await page.waitForTimeout(2000);
    }
    
    // メールアドレス入力
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill(testUserEmail);
      console.log('✅ Email filled');
    }
    
    // パスワード入力
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.count() > 0) {
      await passwordInput.fill(testUserPassword);
      console.log('✅ Password filled');
    }
    
    // ログインボタンをクリック - 複数の方法を試行
    console.log('🔍 Looking for submit button...');
    
    // まずEnterキーでの送信を試行
    if (await passwordInput.count() > 0) {
      await passwordInput.press('Enter');
      console.log('✅ Login submitted via Enter key');
      await page.waitForTimeout(3000);
    }
    
    // 次に表示されているボタンを探す
    const submitSelectors = [
      'button[type="submit"]:visible',
      'button:has-text("続行"):visible',
      'button:has-text("Continue"):visible',
      'button[data-variant="solid"]:visible',
      '.cl-button:visible'
    ];
    
    let submitSuccess = false;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        try {
          // ボタンが有効になるまで待機
          await page.waitForTimeout(2000);
          
          // Force clickを使用してオーバーレイ問題を回避
          await button.click({ force: true });
          console.log(`✅ Login submitted via: ${selector}`);
          submitSuccess = true;
          break;
        } catch (error) {
          console.log(`⚠️ Failed to click ${selector}: ${error}`);
        }
      }
    }
    
    if (submitSuccess) {
      
      // 認証完了を待機（サイドバーまたはメインアプリの表示）
      try {
        await page.waitForSelector('nav, .sidebar, [data-testid*="sidebar"]', { timeout: 15000 });
        console.log('✅ Authentication successful - main app loaded');
        
        // 認証状態を保存
        await page.context().storageState({ path: authFile });
        console.log(`💾 Authentication state saved to: ${authFile}`);
        
      } catch (error) {
        console.log('⚠️ Could not confirm successful authentication, but continuing...');
        // 認証状態を保存（部分的成功として扱う）
        await page.context().storageState({ path: authFile });
      }
    } else {
      console.log('⚠️ No submit button found, trying to save current state...');
      await page.context().storageState({ path: authFile });
    }
    
  } catch (error) {
    console.error(`❌ Authentication setup failed: ${error}`);
    
    // デバッグ情報
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Page title: ${pageTitle}`);
    
    // スクリーンショットを保存
    await page.screenshot({ path: path.join(__dirname, '.auth', 'setup-failed.png') });
    
    // エラーがあっても続行（テスト実行時に再試行）
    console.log('⚠️ Continuing with setup despite authentication error...');
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;