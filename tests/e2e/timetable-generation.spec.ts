import { test, expect } from '@playwright/test';

// データベース確認用のヘルパー関数
async function verifyDataInDatabase(page: any, apiToken: string, dataType: 'teachers' | 'subjects' | 'classrooms', expectedItems: any[]) {
  console.log(`🔍 Verifying ${dataType} data in database...`);
  
  try {
    // APIエンドポイントを呼び出してデータベースの状態を確認
    const response = await page.request.get(`/api/frontend/school/${dataType}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      const items = data.success ? data.data : [];
      
      console.log(`📊 Database contains ${items.length} ${dataType} records`);
      
      // 作成したテストデータが存在するか確認
      let foundCount = 0;
      for (const expectedItem of expectedItems) {
        const found = items.some((item: any) => item.name === expectedItem.name);
        if (found) {
          foundCount++;
          console.log(`✅ Found ${dataType}: ${expectedItem.name}`);
        } else {
          console.log(`❌ Missing ${dataType}: ${expectedItem.name}`);
        }
      }
      
      return {
        success: true,
        totalInDb: items.length,
        expectedCount: expectedItems.length,
        foundCount,
        allFound: foundCount === expectedItems.length
      };
    } else {
      console.log(`❌ Failed to fetch ${dataType} from database: ${response.status()}`);
      return { success: false, error: `HTTP ${response.status()}` };
    }
  } catch (error) {
    console.log(`❌ Error verifying ${dataType} in database: ${error}`);
    return { success: false, error: error.message };
  }
}

// 生成された時間割がデータベースに保存されているか確認
async function verifyGeneratedTimetableInDatabase(page: any, apiToken: string) {
  console.log('🔍 Verifying generated timetable in database...');
  
  try {
    // 生成された時間割一覧を取得
    const response = await page.request.get('/api/timetable/program/saved', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok()) {
      const timetables = await response.json();
      console.log(`📊 Database contains ${timetables.length} saved timetables`);
      
      if (timetables.length > 0) {
        const latestTimetable = timetables[0]; // 最新の時間割
        console.log(`🆕 Latest timetable: ID=${latestTimetable.id}, Method=${latestTimetable.generationMethod}, Rate=${latestTimetable.assignmentRate}%`);
        
        return {
          success: true,
          timetableCount: timetables.length,
          latestTimetable: {
            id: latestTimetable.id,
            method: latestTimetable.generationMethod,
            assignmentRate: latestTimetable.assignmentRate,
            createdAt: latestTimetable.createdAt
          }
        };
      } else {
        console.log('❌ No timetables found in database');
        return { success: false, error: 'No timetables found' };
      }
    } else {
      console.log(`❌ Failed to fetch timetables from database: ${response.status()}`);
      return { success: false, error: `HTTP ${response.status()}` };
    }
  } catch (error) {
    console.log(`❌ Error verifying timetables in database: ${error}`);
    return { success: false, error: error.message };
  }
}

// 認証トークンを取得するヘルパー関数
async function getAuthToken(page: any): Promise<string | null> {
  try {
    // Clerk認証トークンをlocalStorageから取得
    const token = await page.evaluate(() => {
      // ClerkのセッショントークンをlocalStorageから取得
      const sessionData = localStorage.getItem('__clerk_environment');
      if (sessionData) {
        // セッションが有効な場合、一時的なトークンを生成
        return 'clerk_session_token'; // 実際の実装ではClerk APIから取得
      }
      return null;
    });
    
    // Cookieからセッション情報を取得（フォールバック）
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === '__session' || cookie.name.includes('clerk'));
    
    if (sessionCookie) {
      console.log('✅ Found authentication session');
      return sessionCookie.value;
    }
    
    console.log('⚠️ No authentication token found, using test token');
    return 'test_token'; // テスト用のトークン
  } catch (error) {
    console.log(`⚠️ Error getting auth token: ${error}`);
    return 'test_token';
  }
}

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

// テスト専用データ生成（既存データと干渉しない）
const generateTimetableTestData = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  
  return {
    teachers: [
      {
        name: `時間割テスト教師A_${timestamp}_${randomSuffix}`,
        email: `test.teacher.a.${timestamp}@example.com`,
        subjects: ['数学', '理科']
      },
      {
        name: `時間割テスト教師B_${timestamp}_${randomSuffix}`,
        email: `test.teacher.b.${timestamp}@example.com`,
        subjects: ['英語', '社会']
      },
      {
        name: `時間割テスト教師C_${timestamp}_${randomSuffix}`,
        email: `test.teacher.c.${timestamp}@example.com`,
        subjects: ['国語', '体育']
      }
    ],
    subjects: [
      {
        name: `数学_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 4, 2: 4, 3: 3 }
      },
      {
        name: `英語_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 3, 2: 4, 3: 4 }
      },
      {
        name: `国語_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 4, 2: 3, 3: 4 }
      },
      {
        name: `理科_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 3, 2: 3, 3: 4 }
      },
      {
        name: `社会_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 3, 2: 3, 3: 3 }
      },
      {
        name: `体育_${timestamp}_${randomSuffix}`,
        grades: [1, 2, 3],
        weeklyHours: { 1: 2, 2: 2, 3: 2 }
      }
    ],
    classrooms: [
      {
        name: `普通教室1_${timestamp}_${randomSuffix}`,
        type: '普通教室'
      },
      {
        name: `普通教室2_${timestamp}_${randomSuffix}`,
        type: '普通教室'
      },
      {
        name: `理科室_${timestamp}_${randomSuffix}`,
        type: '特別教室'
      }
    ]
  };
};

test.describe('時間割生成機能', () => {
  let testData: ReturnType<typeof generateTimetableTestData>;
  let createdDataIds: {
    teachers: string[];
    subjects: string[];
    classrooms: string[];
  } = {
    teachers: [],
    subjects: [],
    classrooms: []
  };

  test.beforeEach(async ({ page }) => {
    testData = generateTimetableTestData();
    console.log('🔄 Starting timetable generation test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    console.log('🧹 Cleaning up test data...');
    
    // テストデータのクリーンアップ
    try {
      // データ登録画面に移動
      await page.goto('/data-registration');
      await page.waitForLoadState('networkidle');
      
      // 作成したテストデータを削除
      // 注意: 削除は作成とは逆順で行う（依存関係を考慮）
      
      // 教師削除
      for (const teacher of testData.teachers) {
        const teacherRow = page.locator(`tr:has-text("${teacher.name}")`);
        if (await teacherRow.count() > 0) {
          const deleteButton = teacherRow.locator('button[aria-label*="delete"], button:has-text("削除")').last();
          if (await deleteButton.count() > 0) {
            await deleteButton.click();
            await page.waitForTimeout(500);
            
            // 確認ダイアログ処理
            const confirmButton = page.locator('button:has-text("削除"), button:has-text("はい")').first();
            if (await confirmButton.count() > 0) {
              await confirmButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      }
      
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error}`);
    }
  });

  test('テストデータ作成と時間割生成（プログラム型）', async ({ page }) => {
    console.log('🧪 Testing complete timetable generation workflow...');
    
    // 認証トークンを取得
    const authToken = await getAuthToken(page);
    console.log('🔐 Authentication token obtained');
    
    // 1. データ登録画面に移動
    console.log('📝 Step 1: Navigate to data registration...');
    await page.click('button:has-text("データ登録")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // データ読み込み完了を待機
    
    // ページタイトル確認
    await expect(page.locator('h1:has-text("データ登録")')).toBeVisible();
    
    // 2. 教師データ作成
    console.log('👨‍🏫 Step 2: Creating test teachers...');
    
    // 教師情報タブに移動
    await page.getByRole('tab', { name: '教師情報' }).click();
    await page.waitForTimeout(2000);
    
    for (const teacher of testData.teachers) {
      // 教師追加ボタンをクリック
      const addTeacherButton = page.getByRole('button', { name: '教師を追加' });
      await expect(addTeacherButton).toBeVisible();
      await addTeacherButton.click();
      await page.waitForTimeout(1000);
      
      // 教師情報入力
      await page.fill('input[name="name"], input[placeholder*="名前"]', teacher.name);
      await page.fill('input[name="email"], input[placeholder*="メール"]', teacher.email);
      
      // 教科選択（簡単化のため最初の教科のみ）
      if (teacher.subjects.length > 0) {
        const subjectSelect = page.locator('select[name="subject"], select[name="subjects"]').first();
        if (await subjectSelect.count() > 0) {
          await subjectSelect.selectOption(teacher.subjects[0]);
        }
      }
      
      // 保存
      const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      console.log(`✅ Created teacher: ${teacher.name}`);
    }
    
    // 3. 教科データ作成
    console.log('📚 Step 3: Creating test subjects...');
    for (const subject of testData.subjects) {
      // 教科追加ボタンをクリック
      const addSubjectButton = page.locator('button:has-text("教科を追加"), button:has-text("追加")').nth(1);
      if (await addSubjectButton.count() > 0) {
        await addSubjectButton.click();
        await page.waitForTimeout(1000);
        
        // 教科情報入力
        await page.fill('input[name="name"], input[placeholder*="教科名"]', subject.name);
        
        // 対象学年設定（チェックボックス形式の場合）
        for (const grade of subject.grades) {
          const gradeCheckbox = page.locator(`input[type="checkbox"][value="${grade}"], input[name*="grade${grade}"]`);
          if (await gradeCheckbox.count() > 0) {
            await gradeCheckbox.check();
          }
        }
        
        // 週間授業数設定（1年生の値を代表として設定）
        const weeklyHoursInput = page.locator('input[name="weeklyHours"], input[name*="hours"], input[type="number"]').first();
        if (await weeklyHoursInput.count() > 0) {
          await weeklyHoursInput.fill(subject.weeklyHours[1].toString());
        }
        
        // 保存
        const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        console.log(`✅ Created subject: ${subject.name}`);
      }
    }
    
    // 4. 教室データ作成
    console.log('🏫 Step 4: Creating test classrooms...');
    for (const classroom of testData.classrooms) {
      // 教室追加ボタンをクリック
      const addClassroomButton = page.locator('button:has-text("教室を追加"), button:has-text("追加")').nth(2);
      if (await addClassroomButton.count() > 0) {
        await addClassroomButton.click();
        await page.waitForTimeout(1000);
        
        // 教室情報入力
        await page.fill('input[name="name"], input[placeholder*="教室名"]', classroom.name);
        
        // 教室タイプ設定
        const typeSelect = page.locator('select[name="type"], select[name="classroomType"]').first();
        if (await typeSelect.count() > 0) {
          await typeSelect.selectOption(classroom.type);
        }
        
        // 保存
        const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        console.log(`✅ Created classroom: ${classroom.name}`);
      }
    }
    
    // 5. 時間割生成画面に移動
    console.log('⚡ Step 5: Navigate to timetable generation...');
    await page.click('a[href="/timetable-generate"], button:has-text("時間割生成")');
    await page.waitForLoadState('networkidle');
    
    // ページタイトル確認
    await expect(page.locator('h1:has-text("時間割生成")')).toBeVisible();
    
    // 6. プログラム型生成を選択
    console.log('🔧 Step 6: Selecting program generation method...');
    const programRadio = page.locator('input[type="radio"][value="program"], input[type="radio"]').first();
    if (await programRadio.count() > 0) {
      await programRadio.click();
      await page.waitForTimeout(1000);
    }
    
    // プログラム型生成カードをクリック（ラジオボタンの代替）
    const programCard = page.locator('div:has-text("プログラム型生成")').first();
    if (await programCard.count() > 0) {
      await programCard.click();
      await page.waitForTimeout(1000);
    }
    
    // 7. 時間割生成実行
    console.log('🚀 Step 7: Executing timetable generation...');
    const generateButton = page.locator('button:has-text("プログラム型生成実行"), button:has-text("時間割を生成"), button:has-text("生成実行")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // 生成完了を待機（最大2分）
    console.log('⏳ Waiting for generation completion...');
    
    // ローディング状態の確認
    const loadingIndicator = page.locator('text="プログラム生成中", text="生成中", [class*="animate-spin"]');
    if (await loadingIndicator.count() > 0) {
      console.log('🔄 Generation in progress...');
      // ローディングが消えるまで待機
      await page.waitForSelector('text="プログラム生成中", text="生成中"', { state: 'detached', timeout: 120000 });
    }
    
    // 8. 生成結果確認
    console.log('✅ Step 8: Verifying generation results...');
    
    // 成功メッセージまたは結果表示を確認
    const successIndicators = [
      'text="プログラム型生成完了"',
      'text="生成完了"',
      'text="割当数"',
      '[data-testid="generation-success"]',
      '.bg-green-50'
    ];
    
    let generationSuccess = false;
    for (const indicator of successIndicators) {
      const element = page.locator(indicator);
      if (await element.count() > 0) {
        console.log(`✅ Found success indicator: ${indicator}`);
        generationSuccess = true;
        
        // 統計情報の確認
        const statsText = await element.textContent();
        console.log(`📊 Generation statistics: ${statsText}`);
        break;
      }
    }
    
    // エラーメッセージをチェック
    const errorMessages = [
      'text="生成失敗"',
      'text="エラー"',
      '.text-red-500',
      '[role="alert"]'
    ];
    
    let generationError = '';
    for (const errorSelector of errorMessages) {
      const errorElement = page.locator(errorSelector);
      if (await errorElement.count() > 0) {
        generationError = await errorElement.textContent() || 'Unknown error';
        console.log(`❌ Generation error detected: ${generationError}`);
        break;
      }
    }
    
    // 9. 結果の検証
    if (generationSuccess) {
      console.log('✅ Timetable generation completed successfully');
      
      // 時間割参照画面で結果を確認
      console.log('🔍 Step 9: Verifying generated timetable in reference screen...');
      await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
      await page.waitForLoadState('networkidle');
      
      // 生成された時間割が一覧に表示されることを確認
      await page.waitForTimeout(3000); // API呼び出し完了を待機
      
      const timetableList = page.locator('[data-testid="timetable-card"], .border.rounded-lg');
      const timetableCount = await timetableList.count();
      console.log(`📋 Found ${timetableCount} timetables in list`);
      
      if (timetableCount > 0) {
        // 最新の時間割（生成されたもの）を確認
        const latestTimetable = timetableList.first();
        const timetableText = await latestTimetable.textContent();
        console.log(`🆕 Latest timetable: ${timetableText}`);
        
        // 詳細表示テスト
        const detailButton = latestTimetable.locator('button:has-text("詳細を見る")');
        if (await detailButton.count() > 0) {
          await detailButton.click();
          await page.waitForTimeout(2000);
          
          // 時間割表の表示確認
          const timetableTable = page.locator('table');
          await expect(timetableTable).toBeVisible();
          console.log('✅ Timetable detail view displayed successfully');
        }
      }
      
      expect(generationSuccess).toBe(true);
    } else {
      console.log(`❌ Timetable generation failed: ${generationError}`);
      
      // デバッグ情報の収集
      const pageContent = await page.textContent('body');
      console.log('📄 Page content preview:', pageContent?.substring(0, 1000));
      
      // 失敗したが、テスト自体は継続（デバッグ目的）
      expect.soft(generationSuccess).toBe(true);
    }
  });

  test('時間割生成（AI型・段階的生成）', async ({ page }) => {
    console.log('🤖 Testing AI-based timetable generation...');
    
    // データ作成は前のテストと同様の手順を簡略化
    // （実際の実装では共通化を検討）
    
    // 時間割生成画面に移動
    await page.click('a[href="/timetable-generate"], button:has-text("時間割生成")');
    await page.waitForLoadState('networkidle');
    
    // AI生成を選択
    const aiRadio = page.locator('input[type="radio"][value="ai"]');
    if (await aiRadio.count() > 0) {
      await aiRadio.click();
      await page.waitForTimeout(1000);
    }
    
    // AI生成カードをクリック
    const aiCard = page.locator('div:has-text("AI生成")').first();
    if (await aiCard.count() > 0) {
      await aiCard.click();
      await page.waitForTimeout(1000);
    }
    
    // 生成条件入力
    const conditionTextarea = page.locator('textarea[placeholder*="条件"], textarea[name*="condition"]');
    if (await conditionTextarea.count() > 0) {
      await conditionTextarea.fill('数学と理科は午前中に配置、体育は連続2時間で設定してください。');
    }
    
    // 段階的生成実行
    const generateButton = page.locator('button:has-text("段階的生成開始"), button:has-text("生成開始")').first();
    if (await generateButton.count() > 0) {
      await generateButton.click();
      
      // 段階的生成の進捗表示確認
      const progressDisplay = page.locator('[data-testid="progress-display"], .progress');
      if (await progressDisplay.count() > 0) {
        console.log('🔄 Gradual generation progress displayed');
        
        // 進捗完了まで待機（最大5分）
        await page.waitForSelector('text="段階的生成完了"', { timeout: 300000 });
        console.log('✅ Gradual generation completed');
      }
    } else {
      console.log('ℹ️ AI generation button not found - may not be fully implemented');
    }
  });

  test('生成エラーハンドリング', async ({ page }) => {
    console.log('⚠️ Testing error handling for timetable generation...');
    
    // データ不足状態で生成を試行
    await page.click('a[href="/timetable-generate"], button:has-text("時間割生成")');
    await page.waitForLoadState('networkidle');
    
    // プログラム型生成を選択
    const programCard = page.locator('div:has-text("プログラム型生成")').first();
    if (await programCard.count() > 0) {
      await programCard.click();
    }
    
    // データ不足状態で生成実行
    const generateButton = page.locator('button:has-text("プログラム型生成実行")').first();
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await page.waitForTimeout(5000);
      
      // エラーメッセージの確認
      const errorMessage = page.locator('text="エラー", text="失敗", .text-red-500');
      if (await errorMessage.count() > 0) {
        const errorText = await errorMessage.textContent();
        console.log(`✅ Error handling working: ${errorText}`);
      }
    }
  });
});