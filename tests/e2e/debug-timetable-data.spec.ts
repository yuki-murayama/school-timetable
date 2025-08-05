import { test, expect } from '@playwright/test';

test.describe('100%割り当て率検証テスト', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🔄 Starting debug test setup...');
    await page.goto('https://school-timetable-monorepo.grundhunter.workers.dev');
    await page.waitForLoadState('networkidle');
  });

  test('100%割り当て率の直接API検証', async ({ page }) => {
    console.log('🎯 100%割り当て率検証テスト開始...');
    
    // データベース初期化
    console.log('🗄️ データベース初期化中...');
    const initResponse = await page.request.post('https://school-timetable-monorepo.grundhunter.workers.dev/api/init-db');
    const initResult = await initResponse.json();
    console.log('📊 初期化結果:', initResult);
    expect(initResult.success).toBe(true);
    
    // 時間割生成API呼び出し
    console.log('🚀 時間割生成API呼び出し中...');
    const generateResponse = await page.request.post(
      'https://school-timetable-monorepo.grundhunter.workers.dev/api/frontend/timetable/generate',
      {
        data: {
          useOptimization: true,
          useNewAlgorithm: true
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('📡 APIレスポンスステータス:', generateResponse.status());
    
    if (generateResponse.status() === 200) {
      const result = await generateResponse.json();
      console.log('✅ 時間割生成成功');
      
      // 統計情報の詳細表示
      if (result.statistics) {
        const stats = result.statistics;
        const assignmentRate = (stats.assignedSlots / stats.totalSlots) * 100;
        
        console.log('📊 詳細統計:');
        console.log(`   - 総スロット数: ${stats.totalSlots}`);
        console.log(`   - 割当済みスロット数: ${stats.assignedSlots}`);
        console.log(`   - 未割当スロット数: ${stats.unassignedSlots}`);
        console.log(`   - 制約違反数: ${stats.constraintViolations}`);
        console.log(`   - 割り当て率: ${assignmentRate.toFixed(2)}%`);
        
        // 100%割り当て率の厳密な検証
        console.log(`🎯 100%割り当て率検証: ${assignmentRate >= 99.99 ? '✅ PASS' : '❌ FAIL'}`);
        expect(assignmentRate).toBeGreaterThanOrEqual(99.99);
        
        // 制約違反が5件以下の検証
        console.log(`🎯 制約違反5件以下検証: ${stats.constraintViolations <= 5 ? '✅ PASS' : '❌ FAIL'}`);
        expect(stats.constraintViolations).toBeLessThanOrEqual(5);
        
      } else {
        console.log('❌ 統計情報が取得できませんでした');
        throw new Error('統計情報が取得できませんでした');
      }
      
      // 生成されたメッセージの確認
      if (result.message) {
        console.log('💬 生成メッセージ:', result.message);
      }
      
      // 時間割データの基本検証
      if (result.timetable && Array.isArray(result.timetable)) {
        const totalSlots = result.timetable.length;
        const assignedSlots = result.timetable.filter(slot => slot.subject && slot.teacher).length;
        const actualRate = (assignedSlots / totalSlots) * 100;
        
        console.log('📅 時間割データ検証:');
        console.log(`   - 時間割スロット総数: ${totalSlots}`);
        console.log(`   - 教科・教師が割り当て済み: ${assignedSlots}`);
        console.log(`   - 実際の割り当て率: ${actualRate.toFixed(2)}%`);
        
        // 制約違反データの確認
        const violationSlots = result.timetable.filter(slot => slot.hasViolation);
        console.log(`   - 制約違反スロット数: ${violationSlots.length}`);
        
        if (violationSlots.length > 0) {
          console.log('🚨 制約違反の詳細:');
          violationSlots.slice(0, 5).forEach((slot, index) => {
            console.log(`   ${index + 1}. ${slot.classGrade}年${slot.classSection}組 ${slot.day}曜日${slot.period}時間目`);
            console.log(`      教科: ${slot.subject?.name || '不明'}, 先生: ${slot.teacher?.name || '不明'}`);
            console.log(`      違反レベル: ${slot.violationSeverity || '不明'}`);
            if (slot.violations && slot.violations.length > 0) {
              slot.violations.forEach((violation, vIndex) => {
                console.log(`      - ${violation.type}: ${violation.message}`);
              });
            }
          });
        }
        
        expect(actualRate).toBeGreaterThanOrEqual(99.99);
      }
      
      expect(result.success).toBe(true);
      
    } else {
      const errorText = await generateResponse.text();
      console.log('❌ API呼び出し失敗:', errorText);
      throw new Error(`API呼び出し失敗: ${generateResponse.status()} - ${errorText}`);
    }
  });
});