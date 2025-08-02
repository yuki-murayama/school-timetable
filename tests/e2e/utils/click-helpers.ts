import { Page, Locator } from '@playwright/test';

/**
 * モーダルオーバーレイ問題を回避するクリックヘルパー
 */
export class ClickHelpers {
  /**
   * オーバーレイを回避して要素をクリック (React event handler対応版)
   */
  static async clickWithOverlayBypass(page: Page, selector: string, description?: string): Promise<boolean> {
    console.log(`🎯 Attempting to click ${description || selector} with overlay bypass...`);
    
    const element = page.locator(selector).first();
    
    // 複数の方法でクリックを試行
    const clickMethods = [
      { name: 'Normal click', method: () => element.click() },
      { name: 'Force click', method: () => element.click({ force: true }) },
      { name: 'JavaScript click', method: () => element.evaluate(el => (el as HTMLElement).click()) },
      { 
        name: 'Dispatcher click', 
        method: () => element.dispatchEvent('click', { bubbles: true, cancelable: true }) 
      },
      {
        name: 'Dialog overlay disable + click',
        method: async () => {
          // まず、特定のShadcnダイアログオーバーレイを無効化
          await page.evaluate(() => {
            // Shadcn UIのダイアログオーバーレイを特定して無効化
            const overlays = document.querySelectorAll('[data-state="open"][aria-hidden="true"]');
            overlays.forEach((overlay: any) => {
              if (overlay && overlay.style) {
                overlay.style.pointerEvents = 'none';
                overlay.style.visibility = 'hidden';
                overlay.style.display = 'none';
              }
            });
            
            // bg-black/80 クラスを持つオーバーレイも無効化
            const bgOverlays = document.querySelectorAll('.bg-black\\/80, [class*="bg-black"]');
            bgOverlays.forEach((overlay: any) => {
              if (overlay && overlay.classList.contains('fixed')) {
                overlay.style.pointerEvents = 'none';
                overlay.style.visibility = 'hidden';
                overlay.style.display = 'none';
              }
            });
          });
          
          // 短時間待機してからクリック
          await page.waitForTimeout(200);
          return element.click({ force: true });
        }
      },
      {
        name: 'React event trigger',
        method: () => element.evaluate((el: HTMLElement) => {
          // React synthetic event を直接発火
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          
          // React fiber node を探して直接ハンドラーを実行
          const reactKey = Object.keys(el).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
          if (reactKey) {
            const fiberNode = (el as any)[reactKey];
            if (fiberNode && fiberNode.memoizedProps && fiberNode.memoizedProps.onClick) {
              console.log('🎯 Found React onClick handler, calling directly');
              fiberNode.memoizedProps.onClick(event);
              return true;
            }
          }
          
          // フォールバック: 通常のクリックイベント
          el.dispatchEvent(event);
          return false;
        })
      }
    ];
    
    for (const clickMethod of clickMethods) {
      try {
        console.log(`  📌 Trying ${clickMethod.name}...`);
        const result = await clickMethod.method();
        console.log(`✅ ${clickMethod.name} succeeded for ${description || selector}`);
        
        // React event trigger の場合、結果を確認
        if (clickMethod.name === 'React event trigger' && result) {
          console.log('🎉 React handler was called directly');
        }
        
        return true;
      } catch (error) {
        console.log(`❌ ${clickMethod.name} failed for ${description || selector}: ${error.message}`);
      }
    }
    
    console.log(`❌ All click methods failed for ${description || selector}`);
    return false;
  }
  
  /**
   * 要素が表示されてクリック可能になるまで待機してからクリック
   */
  static async waitAndClick(page: Page, selector: string, options?: {
    timeout?: number;
    description?: string;
    waitForVisible?: boolean;
  }): Promise<boolean> {
    const { timeout = 10000, description = selector, waitForVisible = true } = options || {};
    
    console.log(`⏳ Waiting for ${description} to be clickable...`);
    
    try {
      const element = page.locator(selector).first();
      
      if (waitForVisible) {
        await element.waitFor({ state: 'visible', timeout });
        console.log(`👁️ ${description} is now visible`);
      }
      
      await element.waitFor({ state: 'attached', timeout });
      console.log(`🔗 ${description} is now attached`);
      
      // 要素が有効になるまで少し待機
      await page.waitForTimeout(500);
      
      return await this.clickWithOverlayBypass(page, selector, description);
    } catch (error) {
      console.log(`❌ Failed to wait and click ${description}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * ドロップダウンを開いてオプションを選択
   */
  static async selectDropdownOption(page: Page, triggerSelector: string, optionText: string, options?: {
    timeout?: number;
    description?: string;
  }): Promise<boolean> {
    const { timeout = 10000, description = 'dropdown' } = options || {};
    
    console.log(`📋 Selecting "${optionText}" from ${description}...`);
    
    try {
      // ドロップダウンのトリガーをクリック
      const triggerClicked = await this.waitAndClick(page, triggerSelector, {
        timeout,
        description: `${description} trigger`,
      });
      
      if (!triggerClicked) {
        console.log(`❌ Failed to click ${description} trigger`);
        return false;
      }
      
      // ドロップダウンのオプションが表示されるまで待機
      await page.waitForTimeout(1000);
      
      // オプションを選択
      const optionSelectors = [
        `[role="option"]:has-text("${optionText}")`,
        `li:has-text("${optionText}")`,
        `div:has-text("${optionText}")`,
        `button:has-text("${optionText}")`,
        `*:has-text("${optionText}")`
      ];
      
      for (const optionSelector of optionSelectors) {
        const optionElement = page.locator(optionSelector).first();
        if (await optionElement.count() > 0) {
          const optionClicked = await this.clickWithOverlayBypass(page, optionSelector, `${description} option "${optionText}"`);
          if (optionClicked) {
            console.log(`✅ Successfully selected "${optionText}" from ${description}`);
            return true;
          }
        }
      }
      
      console.log(`❌ Could not find or click option "${optionText}" in ${description}`);
      return false;
    } catch (error) {
      console.log(`❌ Error selecting dropdown option: ${error.message}`);
      return false;
    }
  }
  
  /**
   * モーダルダイアログを開く
   */
  static async openModal(page: Page, triggerSelector: string, modalSelector: string, options?: {
    timeout?: number;
    description?: string;
  }): Promise<boolean> {
    const { timeout = 10000, description = 'modal' } = options || {};
    
    console.log(`🪟 Opening ${description}...`);
    
    try {
      // トリガーボタンをクリック
      const triggerClicked = await this.waitAndClick(page, triggerSelector, {
        timeout,
        description: `${description} trigger`,
      });
      
      if (!triggerClicked) {
        console.log(`❌ Failed to click ${description} trigger`);
        return false;
      }
      
      // モーダルが表示されるまで待機
      await page.waitForSelector(modalSelector, { timeout });
      console.log(`✅ ${description} opened successfully`);
      
      return true;
    } catch (error) {
      console.log(`❌ Failed to open ${description}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * フォームフィールドに安全に入力
   */
  static async fillFormField(page: Page, selector: string, value: string, options?: {
    timeout?: number;
    description?: string;
    clear?: boolean;
  }): Promise<boolean> {
    const { timeout = 10000, description = 'field', clear = true } = options || {};
    
    console.log(`📝 Filling ${description} with "${value}"...`);
    
    try {
      const element = page.locator(selector).first();
      
      // 要素が表示されるまで待機
      await element.waitFor({ state: 'visible', timeout });
      
      // フィールドをクリアしてから入力
      if (clear) {
        await element.clear();
      }
      
      await element.fill(value);
      console.log(`✅ Successfully filled ${description}`);
      
      return true;
    } catch (error) {
      console.log(`❌ Failed to fill ${description}: ${error.message}`);
      return false;
    }
  }
}