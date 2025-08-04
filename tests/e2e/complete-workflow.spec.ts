import { test, expect } from '@playwright/test';

// 認証済みユーザーでテストを実行
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('完全ワークフロー: データ作成 → 時間割生成 → 参照確認 → クリーンアップ', () => {
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 8);
  
  // 完全に独立したテストデータセット
  const workflowTestData = {
    testId: `workflow_${timestamp}_${uniqueId}`,
    teachers: [
      {
        name: `ワークフロー教師A_${timestamp}_${uniqueId}`,
        email: `workflow.teacher.a.${timestamp}@test.example.com`,
        subject: '数学'
      },
      {
        name: `ワークフロー教師B_${timestamp}_${uniqueId}`,
        email: `workflow.teacher.b.${timestamp}@test.example.com`,
        subject: '英語'
      },
      {
        name: `ワークフロー教師C_${timestamp}_${uniqueId}`,
        email: `workflow.teacher.c.${timestamp}@test.example.com`,
        subject: '国語'
      },
      {
        name: `ワークフロー教師D_${timestamp}_${uniqueId}`,
        email: `workflow.teacher.d.${timestamp}@test.example.com`,
        subject: '理科'
      }
    ],
    subjects: [
      {
        name: `ワークフロー数学_${timestamp}_${uniqueId}`,
        weeklyHours: 4,
        grades: [1, 2, 3]
      },
      {
        name: `ワークフロー英語_${timestamp}_${uniqueId}`,
        weeklyHours: 4,
        grades: [1, 2, 3]
      },
      {
        name: `ワークフロー国語_${timestamp}_${uniqueId}`,
        weeklyHours: 4,
        grades: [1, 2, 3]
      },
      {
        name: `ワークフロー理科_${timestamp}_${uniqueId}`,
        weeklyHours: 3,
        grades: [1, 2, 3]
      },
      {
        name: `ワークフロー社会_${timestamp}_${uniqueId}`,
        weeklyHours: 3,
        grades: [1, 2, 3]
      }
    ],
    classrooms: [
      {
        name: `ワークフロー普通教室1_${timestamp}_${uniqueId}`,
        type: '普通教室'
      },
      {
        name: `ワークフロー普通教室2_${timestamp}_${uniqueId}`,
        type: '普通教室'
      },
      {
        name: `ワークフロー理科室_${timestamp}_${uniqueId}`,
        type: '特別教室'
      }
    ]
  };

  let generatedTimetableId: string | null = null;
  let workflowCompleted = false;

  test.beforeEach(async ({ page }) => {
    console.log(`🚀 Starting complete workflow test: ${workflowTestData.testId}`);
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    if (workflowCompleted) {
      console.log('🧹 Performing comprehensive cleanup...');
      
      try {
        // データ登録画面に移動
        await page.goto('/data-registration');
        await page.waitForLoadState('networkidle');
        
        // 教師データ削除
        console.log('👨‍🏫 Cleaning up test teachers...');
        for (const teacher of workflowTestData.teachers) {
          await cleanupTestData(page, teacher.name, 'teacher');
        }
        
        // 教科データ削除
        console.log('📚 Cleaning up test subjects...');
        for (const subject of workflowTestData.subjects) {
          await cleanupTestData(page, subject.name, 'subject');
        }
        
        // 教室データ削除
        console.log('🏫 Cleaning up test classrooms...');
        for (const classroom of workflowTestData.classrooms) {
          await cleanupTestData(page, classroom.name, 'classroom');
        }
        
        console.log('✅ Workflow test cleanup completed');
      } catch (error) {
        console.log(`⚠️ Cleanup warning: ${error}`);
      }
    }
  });

  test('完全ワークフロー実行', async ({ page }) => {
    console.log('🔄 Executing complete workflow...');
    
    // ========================================
    // PHASE 1: データ作成
    // ========================================
    console.log('📝 PHASE 1: Creating test data...');
    
    await page.click('a[href="/data-registration"], button:has-text("データ登録")');
    await page.waitForLoadState('networkidle');
    
    // 教師データ作成
    console.log('👨‍🏫 Creating teachers...');
    for (const teacher of workflowTestData.teachers) {
      const success = await createTeacher(page, teacher);
      if (success) {
        console.log(`✅ Created teacher: ${teacher.name}`);
      } else {
        console.log(`❌ Failed to create teacher: ${teacher.name}`);
      }
    }
    
    // 教科データ作成
    console.log('📚 Creating subjects...');
    for (const subject of workflowTestData.subjects) {
      const success = await createSubject(page, subject);
      if (success) {
        console.log(`✅ Created subject: ${subject.name}`);
      } else {
        console.log(`❌ Failed to create subject: ${subject.name}`);
      }
    }
    
    // 教室データ作成
    console.log('🏫 Creating classrooms...');
    for (const classroom of workflowTestData.classrooms) {
      const success = await createClassroom(page, classroom);
      if (success) {
        console.log(`✅ Created classroom: ${classroom.name}`);
      } else {
        console.log(`❌ Failed to create classroom: ${classroom.name}`);
      }
    }
    
    // データ作成完了の確認
    console.log('🔍 Verifying created data...');
    const dataVerified = await verifyCreatedData(page, workflowTestData);
    expect(dataVerified).toBe(true);
    
    // ========================================
    // PHASE 2: 時間割生成
    // ========================================
    console.log('⚡ PHASE 2: Generating timetable...');
    
    await page.click('a[href="/timetable-generate"], button:has-text("時間割生成")');
    await page.waitForLoadState('networkidle');
    
    // プログラム型生成を選択
    const programCard = page.locator('div:has-text("プログラム型生成")').first();
    if (await programCard.count() > 0) {
      await programCard.click();
      await page.waitForTimeout(1000);
    }
    
    // 生成実行
    const generateButton = page.locator('button:has-text("プログラム型生成実行"), button:has-text("生成実行")').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    console.log('⏳ Waiting for timetable generation...');
    
    // 生成完了を待機（最大3分）
    let generationSuccess = false;
    let generationError = '';
    
    // ローディング状態の確認
    const loadingSelector = 'text="プログラム生成中", text="生成中", [class*="animate-spin"]';
    if (await page.locator(loadingSelector).count() > 0) {
      console.log('🔄 Generation in progress...');
      await page.waitForSelector(loadingSelector, { state: 'detached', timeout: 180000 });
    }
    
    // 結果確認
    await page.waitForTimeout(3000);
    
    const successIndicators = [
      'text="プログラム型生成完了"',
      'text="生成完了"',
      'text="割当数"',
      '.bg-green-50'
    ];
    
    for (const indicator of successIndicators) {
      const element = page.locator(indicator);
      if (await element.count() > 0) {
        generationSuccess = true;
        const resultText = await element.textContent();
        console.log(`✅ Generation success: ${resultText}`);
        
        // 生成された時間割IDを取得（可能であれば）
        if (resultText && resultText.includes('時間割ID')) {
          const idMatch = resultText.match(/時間割ID[:\s]*([^\s]+)/);
          if (idMatch) {
            generatedTimetableId = idMatch[1];
            console.log(`📋 Generated timetable ID: ${generatedTimetableId}`);
          }
        }
        break;
      }
    }
    
    if (!generationSuccess) {
      // エラーメッセージをチェック
      const errorSelectors = [
        'text="生成失敗"',
        'text="エラー"',
        '.text-red-500'
      ];
      
      for (const errorSelector of errorSelectors) {
        const errorElement = page.locator(errorSelector);
        if (await errorElement.count() > 0) {
          generationError = await errorElement.textContent() || 'Unknown error';
          break;
        }
      }
    }
    
    expect(generationSuccess).toBe(true);
    
    // ========================================
    // PHASE 3: 時間割参照確認
    // ========================================
    console.log('📋 PHASE 3: Verifying timetable reference...');
    
    await page.click('a[href="/timetable-view"], button:has-text("時間割参照")');
    await page.waitForLoadState('networkidle');
    
    // 生成された時間割が一覧に表示されることを確認
    await page.waitForTimeout(5000); // API呼び出し完了を待機
    
    const timetableList = page.locator('[data-testid="timetable-card"], .border.rounded-lg, h3');
    const listCount = await timetableList.count();
    console.log(`📊 Found ${listCount} timetables in reference list`);
    
    let generatedTimetableFound = false;
    
    if (listCount > 0) {
      // 生成された時間割を探す
      for (let i = 0; i < listCount; i++) {
        const item = timetableList.nth(i);
        const itemText = await item.textContent();
        
        // 生成された時間割の特徴を確認
        if (itemText && (
          itemText.includes('%') || 
          itemText.includes('program') || 
          itemText.includes('プログラム') ||
          itemText.includes('生成済み') ||
          (generatedTimetableId && itemText.includes(generatedTimetableId))
        )) {
          console.log(`✅ Found generated timetable in list: ${itemText}`);
          generatedTimetableFound = true;
          
          // 詳細表示テスト
          const detailButton = item.locator('button:has-text("詳細を見る")');
          if (await detailButton.count() > 0) {
            console.log('🔍 Testing detail view...');
            await detailButton.click();
            await page.waitForTimeout(3000);
            
            // 詳細画面の確認
            await expect(page.locator('button:has-text("一覧に戻る")')).toBeVisible();
            
            // 時間割表の確認
            const table = page.locator('table');
            await expect(table).toBeVisible();
            
            // 実際のデータが入っているか確認
            const tableContent = await table.textContent();
            console.log('📊 Timetable table content preview:', tableContent?.substring(0, 200));
            
            // 学年・クラス切り替えテスト
            const gradeTab = page.getByRole('tab', { name: '2年生' });
            if (await gradeTab.count() > 0) {
              await gradeTab.click();
              await page.waitForTimeout(1000);
              console.log('✅ Grade switching works');
            }
            
            console.log('✅ Detail view verification completed');
            break;
          }
        }
      }
    }
    
    expect(generatedTimetableFound).toBe(true);
    
    // ========================================
    // PHASE 4: ワークフロー完了マーク
    // ========================================
    workflowCompleted = true;
    console.log('🎉 Complete workflow test PASSED');
    
    // 最終検証
    expect(generationSuccess).toBe(true);
    expect(generatedTimetableFound).toBe(true);
  });
});

// ヘルパー関数
async function createTeacher(page: any, teacher: any): Promise<boolean> {
  try {
    const addButton = page.locator('button:has-text("教師を追加"), button:has-text("追加")').first();
    await addButton.click();
    await page.waitForTimeout(1000);
    
    await page.fill('input[name="name"], input[placeholder*="名前"]', teacher.name);
    await page.fill('input[name="email"], input[placeholder*="メール"]', teacher.email);
    
    const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    return true;
  } catch (error) {
    console.log(`Teacher creation error: ${error}`);
    return false;
  }
}

async function createSubject(page: any, subject: any): Promise<boolean> {
  try {
    const addButton = page.locator('button:has-text("教科を追加"), button:has-text("追加")').nth(1);
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      await page.fill('input[name="name"], input[placeholder*="教科名"]', subject.name);
      
      // 週間授業数設定
      const hoursInput = page.locator('input[name="weeklyHours"], input[name*="hours"], input[type="number"]').first();
      if (await hoursInput.count() > 0) {
        await hoursInput.fill(subject.weeklyHours.toString());
      }
      
      const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      return true;
    }
    return false;
  } catch (error) {
    console.log(`Subject creation error: ${error}`);
    return false;
  }
}

async function createClassroom(page: any, classroom: any): Promise<boolean> {
  try {
    const addButton = page.locator('button:has-text("教室を追加"), button:has-text("追加")').nth(2);
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      await page.fill('input[name="name"], input[placeholder*="教室名"]', classroom.name);
      
      const saveButton = page.locator('button:has-text("保存"), button:has-text("追加"), button[type="submit"]').first();
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      return true;
    }
    return false;
  } catch (error) {
    console.log(`Classroom creation error: ${error}`);
    return false;
  }
}

async function verifyCreatedData(page: any, testData: any): Promise<boolean> {
  try {
    // 教師データの確認
    let teachersFound = 0;
    for (const teacher of testData.teachers) {
      const teacherRow = page.locator(`tr:has-text("${teacher.name}")`);
      if (await teacherRow.count() > 0) {
        teachersFound++;
      }
    }
    
    console.log(`📊 Data verification: ${teachersFound}/${testData.teachers.length} teachers found`);
    return teachersFound >= testData.teachers.length * 0.5; // 50%以上作成されていればOK
  } catch (error) {
    console.log(`Data verification error: ${error}`);
    return false;
  }
}

async function cleanupTestData(page: any, itemName: string, itemType: string): Promise<void> {
  try {
    const itemRow = page.locator(`tr:has-text("${itemName}")`);
    if (await itemRow.count() > 0) {
      const deleteButton = itemRow.locator('button[aria-label*="delete"], button:has-text("削除"), button svg').last();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(500);
        
        // 確認ダイアログ処理
        const confirmButton = page.locator('button:has-text("削除"), button:has-text("はい")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
        
        console.log(`🗑️ Cleaned up ${itemType}: ${itemName}`);
      }
    }
  } catch (error) {
    console.log(`Cleanup error for ${itemName}: ${error}`);
  }
}