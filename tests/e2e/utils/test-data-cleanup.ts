/**
 * E2Eテストデータクリーンアップユーティリティ
 * テスト後に作成したテストデータを自動削除
 */

import { Page } from '@playwright/test';

interface TestDataRecord {
  id: string;
  name: string;
  type: 'teacher' | 'subject' | 'classroom';
  timestamp?: number;
}

export class TestDataCleanup {
  private page: Page;
  private createdData: TestDataRecord[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 作成したテストデータを記録
   */
  recordCreatedData(data: TestDataRecord) {
    console.log(`📝 記録: ${data.type} "${data.name}" (ID: ${data.id})`);
    this.createdData.push({
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * テストデータパターンに基づいて自動検出して記録
   */
  async autoDetectAndRecord(type: 'teacher' | 'subject' | 'classroom', namePattern: string) {
    try {
      // データ登録画面に移動
      await this.navigateToDataSection(type);
      
      // テーブル内でパターンに一致するデータを検索
      const rows = this.page.locator('table tbody tr');
      const rowCount = await rows.count();
      
      console.log(`🔍 ${type}データを検索中... (${rowCount}行)`)
      
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const nameCell = row.locator('td').first();
        const name = await nameCell.textContent() || '';
        
        // テストデータパターンをチェック
        if (this.isTestDataName(name, namePattern)) {
          const id = await this.extractIdFromRow(row, type);
          if (id) {
            this.recordCreatedData({ id, name: name.trim(), type });
            console.log(`🎯 テストデータ検出: ${name}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ ${type}データの自動検出でエラー:`, error);
    }
  }

  /**
   * テストデータの命名パターンをチェック
   */
  private isTestDataName(name: string, pattern: string): boolean {
    const testPatterns = [
      /テスト.*_\d+_[a-z0-9]{6}/i,  // テスト科目_1234567890_abc123
      /削除テスト.*_\d{4}-\d{2}-\d{2}/i, // 削除テスト用教師_2023-12-01
      /test.*\d+/i,                        // test_teacher_123
      new RegExp(pattern, 'i')             // カスタムパターンを正規表現に変換
    ];
    
    return testPatterns.some(regex => regex.test(name));
  }

  /**
   * 行からIDを抽出
   */
  private async extractIdFromRow(row: any, type: string): Promise<string | null> {
    try {
      // 編集ボタンからIDを抽出
      const editButton = row.locator(`button[data-testid^="edit-${type}-"]`);
      if (await editButton.count() > 0) {
        const testId = await editButton.getAttribute('data-testid');
        if (testId) {
          return testId.replace(`edit-${type}-`, '');
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 該当するデータセクションに移動
   */
  private async navigateToDataSection(type: 'teacher' | 'subject' | 'classroom') {
    const tabValues = {
      teacher: 'teachers',
      subject: 'subjects', 
      classroom: 'classrooms'
    };
    
    // モーダルが開いている場合は閉じる
    await this.closeAnyOpenModal();
    
    // データ登録画面が表示されていない場合は移動
    if (await this.page.locator('[role="tablist"]').count() === 0) {
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');
      await this.page.click('button:has-text("データ登録")');
      await this.page.waitForTimeout(1000);
    }
    
    // 再度モーダルチェック（データ登録画面移動後）
    await this.closeAnyOpenModal();
    
    // 該当タブをクリック（Radix UIのTabsTrigger要素）
    await this.page.click(`[role="tab"][data-state*="${tabValues[type]}"], button[data-value="${tabValues[type]}"], [role="tab"]:has-text("${this.getTabLabel(type)}")`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 開いているモーダルを閉じる
   */
  private async closeAnyOpenModal(): Promise<void> {
    try {
      // モーダルオーバーレイが表示されているかチェック
      const overlaySelector = 'div[data-state="open"][aria-hidden="true"]';
      const dialogSelector = 'div[role="dialog"][data-state="open"]';
      
      if (await this.page.locator(overlaySelector).count() > 0 || 
          await this.page.locator(dialogSelector).count() > 0) {
        console.log('🔄 モーダルが開いています。閉じる処理を実行中...');
        
        // 1. Escapeキーで閉じる
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
        
        // 2. まだ開いている場合は閉じるボタンを探してクリック
        if (await this.page.locator(overlaySelector).count() > 0) {
          const closeButtons = [
            'button[data-testid*="close"]',
            'button:has-text("キャンセル")',
            'button:has-text("閉じる")',
            'button:has-text("×")',
            '[data-dismiss]',
            '[aria-label*="close" i]',
            '[aria-label*="閉じる"]'
          ];
          
          for (const selector of closeButtons) {
            if (await this.page.locator(selector).count() > 0) {
              await this.page.click(selector);
              await this.page.waitForTimeout(500);
              break;
            }
          }
        }
        
        // 3. 最後の手段：オーバーレイの外をクリック
        if (await this.page.locator(overlaySelector).count() > 0) {
          await this.page.click('body', { position: { x: 0, y: 0 } });
          await this.page.waitForTimeout(500);
        }
        
        console.log('✅ モーダルクローズ処理完了');
      }
    } catch (error) {
      console.warn('⚠️ モーダルクローズで軽微なエラー:', error);
    }
  }

  /**
   * タイプに対応するタブラベルを取得
   */
  private getTabLabel(type: 'teacher' | 'subject' | 'classroom'): string {
    const labels = {
      teacher: '教師情報',
      subject: '教科情報', 
      classroom: '教室情報'
    };
    return labels[type];
  }

  /**
   * 記録したテストデータをすべて削除
   */
  async cleanupAll(): Promise<void> {
    if (this.createdData.length === 0) {
      console.log('🧹 削除対象のテストデータはありません');
      return;
    }

    console.log(`🧹 テストデータクリーンアップ開始 - ${this.createdData.length}件`);

    // タイプ別にグループ化
    const groupedData = this.createdData.reduce((acc, data) => {
      if (!acc[data.type]) acc[data.type] = [];
      acc[data.type].push(data);
      return acc;
    }, {} as Record<string, TestDataRecord[]>);

    // タイプごとに削除
    for (const [type, dataList] of Object.entries(groupedData)) {
      await this.cleanupByType(type as any, dataList);
    }

    console.log('✅ テストデータクリーンアップ完了');
    this.createdData = []; // 記録をクリア
  }

  /**
   * 指定タイプのデータを削除
   */
  private async cleanupByType(type: 'teacher' | 'subject' | 'classroom', dataList: TestDataRecord[]) {
    try {
      console.log(`🗑️ ${type}データを削除中... (${dataList.length}件)`);
      
      await this.navigateToDataSection(type);
      await this.page.waitForTimeout(1000);

      for (const data of dataList) {
        try {
          // 削除前にモーダルを閉じる
          await this.closeAnyOpenModal();
          
          const deleteButton = this.page.locator(`button[data-testid="delete-${type}-${data.id}"]`);
          
          if (await deleteButton.count() > 0) {
            console.log(`🗑️ 削除実行: ${data.name}`);
            
            // 削除ボタンをクリック
            await deleteButton.click();
            await this.page.waitForTimeout(500);
            
            // 確認ダイアログがある場合は確認
            const confirmButton = this.page.locator('button:has-text("削除"), button:has-text("Delete"), button:has-text("確認")');
            if (await confirmButton.count() > 0) {
              await confirmButton.first().click();
            }
            
            await this.page.waitForTimeout(1000);
            
            // 削除後にモーダルを閉じる
            await this.closeAnyOpenModal();
            
            console.log(`✅ 削除完了: ${data.name}`);
          } else {
            console.log(`⚠️ 削除ボタンが見つかりません: ${data.name} (既に削除済みの可能性)`);
          }
        } catch (error) {
          console.error(`❌ ${data.name}の削除でエラー:`, error);
          // エラー後もモーダルを閉じる
          await this.closeAnyOpenModal();
        }
      }
    } catch (error) {
      console.error(`❌ ${type}データの削除でエラー:`, error);
    }
  }

  /**
   * パターンベースの一括クリーンアップ
   * 既存のテストデータを名前のパターンで検出して削除
   */
  async cleanupByPattern(patterns: { type: 'teacher' | 'subject' | 'classroom'; pattern: RegExp }[]): Promise<void> {
    console.log('🔍 パターンベースクリーンアップ開始');
    
    for (const { type, pattern } of patterns) {
      await this.cleanupByPatternForType(type, pattern);
    }
  }

  /**
   * 特定タイプのパターンマッチングクリーンアップ
   */
  private async cleanupByPatternForType(type: 'teacher' | 'subject' | 'classroom', pattern: RegExp) {
    try {
      await this.navigateToDataSection(type);
      
      const rows = this.page.locator('table tbody tr');
      const rowCount = await rows.count();
      
      console.log(`🔍 ${type}データのパターンマッチング... (${rowCount}行)`);
      
      const toDelete: { name: string; id: string }[] = [];
      
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const nameCell = row.locator('td').first();
        const name = await nameCell.textContent() || '';
        
        if (pattern.test(name.trim())) {
          const id = await this.extractIdFromRow(row, type);
          if (id) {
            toDelete.push({ name: name.trim(), id });
          }
        }
      }
      
      console.log(`🎯 ${type}で${toDelete.length}件のパターンマッチデータを検出`);
      
      // 検出されたデータを削除
      for (const item of toDelete) {
        try {
          // 削除前にモーダルを閉じる
          await this.closeAnyOpenModal();
          
          const deleteButton = this.page.locator(`button[data-testid="delete-${type}-${item.id}"]`);
          
          if (await deleteButton.count() > 0) {
            console.log(`🗑️ パターンマッチ削除: ${item.name}`);
            await deleteButton.click();
            await this.page.waitForTimeout(500);
            
            const confirmButton = this.page.locator('button:has-text("削除"), button:has-text("Delete"), button:has-text("確認")');
            if (await confirmButton.count() > 0) {
              await confirmButton.first().click();
            }
            
            await this.page.waitForTimeout(1000);
            
            // 削除後にモーダルを閉じる
            await this.closeAnyOpenModal();
          }
        } catch (error) {
          console.error(`❌ パターンマッチ削除でエラー: ${item.name}`, error);
          // エラー後もモーダルを閉じる
          await this.closeAnyOpenModal();
        }
      }
    } catch (error) {
      console.error(`❌ ${type}のパターンクリーンアップでエラー:`, error);
    }
  }

  /**
   * 記録データの状況を表示
   */
  getCleanupSummary(): string {
    const summary = this.createdData.reduce((acc, data) => {
      acc[data.type] = (acc[data.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `テストデータ記録: ${Object.entries(summary).map(([type, count]) => `${type}=${count}`).join(', ')} (合計${this.createdData.length}件)`;
  }
}