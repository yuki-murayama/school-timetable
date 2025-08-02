import { test as setup, expect } from '@playwright/test';

// テスト用のユーザー認証情報
// .env.e2eファイルから実際の認証情報を取得
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@liblock.co.jp',
  password: process.env.TEST_USER_PASSWORD || '6dZFtWns9hEDX8i',
};

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Starting authentication setup...');
  
  // アプリケーションにアクセス
  try {
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  } catch (error) {
    console.log(`❌ Failed to navigate to application: ${error}`);
    throw error;
  }
  
  // Clerkの認証画面が表示されるまで待機
  try {
    // サインインボタンまたはサインインフォームを探す
    const signInButton = page.locator('button:has-text("ログイン"), button:has-text("Sign In"), .cl-button, [data-testid*="sign-in"]');
    const signInForm = page.locator('.cl-signIn-root, [data-testid*="sign-in"], form');
    
    // サインインボタンが表示されている場合はクリック
    if (await signInButton.count() > 0) {
      console.log('✅ Found sign-in button, clicking...');
      await signInButton.first().click();
      await page.waitForTimeout(2000);
    }
    
    // メールアドレス入力フィールドを探す
    const emailInputSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="メール"]',
      '.cl-formFieldInput[type="email"]',
      '[data-testid*="email"]'
    ];
    
    let emailInput = null;
    for (const selector of emailInputSelectors) {
      const input = page.locator(selector);
      if (await input.count() > 0) {
        emailInput = input.first();
        console.log(`✅ Found email input: ${selector}`);
        break;
      }
    }
    
    // パスワード入力フィールドを探す
    const passwordInputSelectors = [
      'input[name="password"]',  
      'input[type="password"]',
      'input[placeholder*="password"]',
      'input[placeholder*="パスワード"]',
      '.cl-formFieldInput[type="password"]',
      '[data-testid*="password"]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordInputSelectors) {
      const input = page.locator(selector);
      if (await input.count() > 0) {
        passwordInput = input.first();
        console.log(`✅ Found password input: ${selector}`);
        break;
      }
    }
    
    if (emailInput && passwordInput) {
      console.log('📝 Filling in credentials...');
      
      // 認証情報を入力
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      
      // Enterキーでフォーム送信を試行
      console.log('🚀 Submitting login form with Enter key...');
      await passwordInput.press('Enter');
      
      // またはフォーム送信を直接実行
      await page.waitForTimeout(1000);
      
      // 少し待機してから送信ボタンを探す
      await page.waitForTimeout(2000);
      
      // 送信ボタンを探す（隠されていないもの）
      const visibleButtons = page.locator('button:visible:has-text("Continue"), button:visible:has-text("続行")');
      if (await visibleButtons.count() > 0) {
        console.log('✅ Found visible continue button, waiting for it to be enabled...');
        const button = visibleButtons.first();
        
        // ボタンが有効になるまで待機
        await button.waitFor({ state: 'attached', timeout: 5000 });
        
        // disabledでない場合のみクリック
        const isDisabled = await button.getAttribute('disabled');
        if (isDisabled !== null) {
          console.log('⏳ Button is disabled, waiting for it to be enabled...');
          await page.waitForFunction(() => {
            const btn = document.querySelector('button[data-variant="solid"]');
            return btn && !btn.hasAttribute('disabled');
          }, { timeout: 10000 });
        }
        
        await button.click();
      } else {
        console.log('⚠️ No visible button found, form may have been submitted via Enter key');
      }
      
      // 認証完了を待機（メインアプリが表示されるまで）
      try {
        // サイドバーまたはメインアプリケーションの要素を待機
        await page.waitForSelector('.sidebar, [data-testid*="sidebar"], nav', { timeout: 15000 });
        console.log('✅ Authentication successful - main app loaded');
        
        // 認証状態を保存
        await page.context().storageState({ path: authFile });
        console.log(`💾 Authentication state saved to: ${authFile}`);
        
      } catch (waitError) {
        console.log('⚠️ Could not detect successful login - checking for error messages');
        
        // エラーメッセージをチェック
        const errorMessages = page.locator('.cl-formFieldError, .error, .alert-error, [role="alert"]');
        if (await errorMessages.count() > 0) {
          const errorText = await errorMessages.first().textContent();
          console.log(`❌ Login error: ${errorText}`);
          throw new Error(`Authentication failed: ${errorText}`);
        } else {
          console.log('⏳ Login in progress, waiting longer...');
          await page.waitForTimeout(5000);
          
          // 再度メインアプリの要素をチェック
          const mainApp = page.locator('#root div, .main-app, main');
          if (await mainApp.count() > 0) {
            const content = await mainApp.first().textContent();
            if (content && content.includes('時間割') || content.includes('データ')) {
              console.log('✅ Authentication appears successful');
              await page.context().storageState({ path: authFile });
            }
          }
        }
      }
    } else {
      console.log('❌ Could not find email or password input fields');
      console.log(`Email input found: ${!!emailInput}`);
      console.log(`Password input found: ${!!passwordInput}`);
      
      // デバッグ: ページの内容を確認
      const pageContent = await page.textContent('body');
      console.log(`Current page content: ${pageContent?.substring(0, 300)}...`);
      
      throw new Error('Could not find login form elements');
    }
    
  } catch (error) {
    console.log(`❌ Authentication setup failed: ${error}`);
    
    // デバッグ情報を出力
    const url = page.url();
    const title = await page.title();
    console.log(`Current URL: ${url}`);
    console.log(`Page title: ${title}`);
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'tests/e2e/.auth/failed-login.png' });
    
    throw error;
  }
});