import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('時間割参照画面', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔄 Starting timetable reference test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test('時間割参照画面への遷移テスト', async ({ page }) => {
    console.log('📋 Testing navigation to timetable reference page...');
    
    // 時間割参照ボタンをクリック
    const timetableReferenceButton = page.getByRole('button', { name: '時間割参照' });
    await expect(timetableReferenceButton).toBeVisible();
    await timetableReferenceButton.click();
    
    // 時間割参照画面の表示を確認
    await expect(page.getByRole('heading', { name: '時間割参照' })).toBeVisible();
    await expect(page.getByText('生成済みの時間割を参照・編集できます')).toBeVisible();
  });

  test('時間割一覧表示テスト', async ({ page }) => {
    console.log('📋 Testing timetable list display...');
    
    // 時間割参照画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    
    // 時間割一覧セクションの確認
    await expect(page.getByText('生成済み時間割一覧')).toBeVisible();
    await expect(page.getByText('時間割を選択して詳細を確認できます')).toBeVisible();
    
    // APIエラーでもデモデータが表示されることを確認
    await expect(page.getByRole('heading', { name: '2024年度 第1学期' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2024年度 第2学期' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2024年度 第3学期' })).toBeVisible();
    
    // 各時間割の詳細を見るボタンの確認
    const detailButtons = page.getByRole('button', { name: '詳細を見る' });
    await expect(detailButtons).toHaveCount(3);
    
    // 注意メッセージの確認（APIエラー時のフォールバック）
    await expect(page.getByText('サーバーからデータを取得できませんでした。デモデータを表示しています。')).toBeVisible();
  });

  test('時間割詳細表示テスト', async ({ page }) => {
    console.log('📅 Testing timetable detail display...');
    
    // 時間割参照画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    
    // 第1学期の詳細を見るボタンをクリック
    const firstDetailButton = page.getByRole('button', { name: '詳細を見る' }).first();
    await firstDetailButton.click();
    
    // 詳細画面の表示を確認
    await expect(page.getByRole('heading', { name: '2024年度 第1学期', level: 1 })).toBeVisible();
    await expect(page.getByText('時間割の詳細表示')).toBeVisible();
    
    // 一覧に戻るボタンの確認
    await expect(page.getByRole('button', { name: '一覧に戻る' })).toBeVisible();
    
    // 編集するボタンの確認
    await expect(page.getByRole('button', { name: '編集する' })).toBeVisible();
    
    // 学年タブの確認
    await expect(page.getByRole('tab', { name: '1年生' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '2年生' })).toBeVisible(); 
    await expect(page.getByRole('tab', { name: '3年生' })).toBeVisible();
    
    // 1年生が選択されていることを確認
    await expect(page.getByRole('tab', { name: '1年生' })).toHaveAttribute('aria-selected', 'true');
    
    // クラスタブの確認
    await expect(page.getByRole('tab', { name: '1組' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '2組' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '3組' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '4組' })).toBeVisible();
    
    // 1組が選択されていることを確認
    await expect(page.getByRole('tab', { name: '1組' })).toHaveAttribute('aria-selected', 'true');
  });

  test('時間割表の表示と内容確認テスト', async ({ page }) => {
    console.log('📊 Testing timetable table display and content...');
    
    // 詳細画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    
    // 時間割テーブルの表示確認
    const timetableTable = page.getByRole('table');
    await expect(timetableTable).toBeVisible();
    
    // テーブルヘッダーの確認
    await expect(page.getByRole('cell', { name: '時限' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '月' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '火' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '水' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '木' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '金' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '土' })).toBeVisible();
    
    // 時限の確認（1〜6時限）
    for (let period = 1; period <= 6; period++) {
      await expect(page.getByRole('cell', { name: period.toString() })).toBeVisible();
    }
    
    // 教科と教師の表示確認（例：1時限目の月曜日）
    await expect(page.getByText('数学')).toBeVisible();
    await expect(page.getByRole('button', { name: '田中' })).toBeVisible();
    
    // 複数の教科が表示されていることを確認
    await expect(page.getByText('英語')).toBeVisible();
    await expect(page.getByText('理科')).toBeVisible();
    await expect(page.getByText('国語')).toBeVisible();
    await expect(page.getByText('社会')).toBeVisible();
    await expect(page.getByText('体育')).toBeVisible();
    
    // 注意メッセージの確認（デモデータ表示時）
    await expect(page.getByText('サーバーから時間割データを取得できませんでした。デモデータを表示しています。')).toBeVisible();
  });

  test('学年・クラス切り替えテスト', async ({ page }) => {
    console.log('🔄 Testing grade and class switching...');
    
    // 詳細画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click(); 
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    
    // 2年生タブをクリック
    await page.getByRole('tab', { name: '2年生' }).click();
    await expect(page.getByRole('tab', { name: '2年生' })).toHaveAttribute('aria-selected', 'true');
    
    // 3年生タブをクリック
    await page.getByRole('tab', { name: '3年生' }).click();
    await expect(page.getByRole('tab', { name: '3年生' })).toHaveAttribute('aria-selected', 'true');
    
    // 1年生に戻る
    await page.getByRole('tab', { name: '1年生' }).click();
    await expect(page.getByRole('tab', { name: '1年生' })).toHaveAttribute('aria-selected', 'true');
    
    // クラス切り替えテスト
    await page.getByRole('tab', { name: '2組' }).click();
    await expect(page.getByRole('tab', { name: '2組' })).toHaveAttribute('aria-selected', 'true');
    
    await page.getByRole('tab', { name: '3組' }).click();
    await expect(page.getByRole('tab', { name: '3組' })).toHaveAttribute('aria-selected', 'true');
    
    await page.getByRole('tab', { name: '4組' }).click();
    await expect(page.getByRole('tab', { name: '4組' })).toHaveAttribute('aria-selected', 'true');
    
    // 1組に戻る
    await page.getByRole('tab', { name: '1組' }).click();
    await expect(page.getByRole('tab', { name: '1組' })).toHaveAttribute('aria-selected', 'true');
  });

  test('ナビゲーションテスト', async ({ page }) => {
    console.log('🧭 Testing navigation between list and detail views...');
    
    // 一覧画面から詳細画面へ
    await page.getByRole('button', { name: '時間割参照' }).click();
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    
    // 詳細画面が表示されることを確認
    await expect(page.getByRole('heading', { name: '2024年度 第1学期', level: 1 })).toBeVisible();
    
    // 一覧に戻るボタンをクリック
    await page.getByRole('button', { name: '一覧に戻る' }).click();
    
    // 一覧画面に戻ることを確認
    await expect(page.getByRole('heading', { name: '時間割参照' })).toBeVisible();
    await expect(page.getByText('生成済み時間割一覧')).toBeVisible();
    
    // 2つ目の時間割の詳細を確認
    const secondDetailButton = page.getByRole('button', { name: '詳細を見る' }).nth(1);
    await secondDetailButton.click();
    
    // 第2学期の詳細画面が表示されることを確認
    await expect(page.getByRole('heading', { name: '2024年度 第2学期', level: 1 })).toBeVisible();
  });

  test('エラー処理とフォールバック機能テスト', async ({ page }) => {
    console.log('⚠️ Testing error handling and fallback functionality...');
    
    // 時間割参照画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    
    // ネットワークエラーでもデモデータが表示されることを確認
    await expect(page.getByRole('heading', { name: '2024年度 第1学期' })).toBeVisible();
    
    // エラーメッセージが表示されることを確認
    const errorMessage = page.getByText('サーバーからデータを取得できませんでした。デモデータを表示しています。');
    await expect(errorMessage).toBeVisible();
    
    // デモデータでも機能が正常に動作することを確認
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    
    // 詳細画面のエラーメッセージ確認
    const detailErrorMessage = page.getByText('サーバーから時間割データを取得できませんでした。デモデータを表示しています。');
    await expect(detailErrorMessage).toBeVisible();
    
    // デモデータの時間割が表示されることを確認
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('数学')).toBeVisible();
  });

  test('レスポンシブ表示テスト', async ({ page }) => {
    console.log('📱 Testing responsive display...');
    
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 時間割参照画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    
    // モバイルでも基本要素が表示されることを確認
    await expect(page.getByRole('heading', { name: '時間割参照' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2024年度 第1学期' })).toBeVisible();
    
    // 詳細画面でのレスポンシブ確認
    await page.getByRole('button', { name: '詳細を見る' }).first().click();
    await expect(page.getByRole('table')).toBeVisible();
    
    // デスクトップサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('アクセシビリティ基本テスト', async ({ page }) => {
    console.log('♿ Testing basic accessibility...');
    
    // 時間割参照画面に移動
    await page.getByRole('button', { name: '時間割参照' }).click();
    
    // 見出しの階層構造を確認
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3); // 3つの時間割
    
    // ボタンにアクセシブルな名前があることを確認
    const detailButtons = page.getByRole('button', { name: '詳細を見る' });
    await expect(detailButtons).toHaveCount(3);
    
    // 詳細画面でのアクセシビリティ確認
    await detailButtons.first().click();
    
    // テーブルの構造確認
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    
    // 戻るボタンのアクセシビリティ確認
    await expect(page.getByRole('button', { name: '一覧に戻る' })).toBeVisible();
    await expect(page.getByRole('button', { name: '編集する' })).toBeVisible();
  });
});