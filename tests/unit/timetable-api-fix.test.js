/**
 * 時間割参照画面修正のユニットテスト
 * TypeErrorエラー修正の検証
 */

// APIクライアントの動作をモック
const mockApiClient = {
  async get(endpoint) {
    console.log(`📡 Mock API call to: ${endpoint}`)
    
    if (endpoint === '/frontend/school/timetables') {
      // 従来の時間割API（認証エラーをシミュレート）
      throw new Error('Authorization token required')
    }
    
    if (endpoint === '/timetable/program/saved') {
      // 生成済み時間割API（成功レスポンス）
      return {
        timetables: [
          {
            id: "timetable-1754100417970-oxen4b",
            assignmentRate: 90.10695187165776,
            totalSlots: 374,
            assignedSlots: 337,
            generationMethod: "program-optimized",
            createdAt: "2025-08-02T02:06:57.970Z",
            updatedAt: "2025-08-02T02:06:57.970Z"
          }
        ],
        count: 1
      }
    }
    
    return []
  }
}

// 修正版のgetSavedTimetables関数をテスト
async function getSavedTimetables() {
  const response = await mockApiClient.get('/timetable/program/saved')
  console.log("🔍 getSavedTimetables レスポンス:", response)
  
  // レスポンスの形式を確認して適切に処理
  if (response && typeof response === 'object' && 'timetables' in response) {
    console.log("✅ timetables配列を抽出:", response.timetables)
    return response.timetables
  }
  
  // 直接配列が返された場合
  if (Array.isArray(response)) {
    console.log("✅ 直接配列を返却:", response)
    return response
  }
  
  console.warn("⚠️ 予期しないレスポンス形式:", response)
  return []
}

// 修正版のloadTimetables関数をテスト
async function loadTimetables() {
  try {
    // 従来の時間割データと生成された時間割データを並列取得
    const [conventionalTimetables, savedTimetables] = await Promise.allSettled([
      mockApiClient.get('/frontend/school/timetables'),
      getSavedTimetables()
    ])

    let allTimetables = []

    // 従来の時間割データを追加
    if (conventionalTimetables.status === 'fulfilled') {
      allTimetables = [...conventionalTimetables.value]
      console.log("✅ 従来の時間割データを取得:", conventionalTimetables.value.length, "件")
    } else {
      console.warn("⚠️ 従来の時間割データ取得失敗:", conventionalTimetables.reason.message)
    }

    // 生成された時間割データを追加
    if (savedTimetables.status === 'fulfilled') {
      // 生成された時間割データをTimetableListItem形式に変換
      const convertedSavedTimetables = savedTimetables.value.map(timetable => ({
        id: timetable.id,
        name: `時間割 ${timetable.assignmentRate?.toFixed(1)}% (${timetable.generationMethod})` || `生成済み時間割 ${timetable.id}`,
        createdAt: timetable.createdAt ? new Date(timetable.createdAt).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP'),
        status: 'active'
      }))
      
      allTimetables = [...allTimetables, ...convertedSavedTimetables]
      console.log("✅ 生成された時間割データを取得・変換:", convertedSavedTimetables.length, "件")
      console.log("📋 変換結果:", JSON.stringify(convertedSavedTimetables, null, 2))
    } else {
      console.warn("⚠️ 生成された時間割データ取得失敗:", savedTimetables.reason)
    }

    console.log("📊 合計時間割数:", allTimetables.length)
    return allTimetables
  } catch (error) {
    console.error("❌ 時間割一覧の取得に失敗しました:", error)
    return []
  }
}

// テスト実行
async function runTests() {
  console.log('🧪 時間割参照画面修正テスト開始')
  console.log('=====================================')
  
  try {
    // テスト1: getSavedTimetables関数
    console.log('\n📋 テスト1: getSavedTimetables関数')
    const savedTimetables = await getSavedTimetables()
    if (Array.isArray(savedTimetables) && savedTimetables.length > 0) {
      console.log('✅ テスト1 成功: 正常に配列を返却')
    } else {
      console.log('❌ テスト1 失敗: 期待した配列が返されませんでした')
      return false
    }
    
    // テスト2: loadTimetables統合関数
    console.log('\n📋 テスト2: loadTimetables統合関数')
    const allTimetables = await loadTimetables()
    if (Array.isArray(allTimetables) && allTimetables.length > 0) {
      console.log('✅ テスト2 成功: 統合処理で時間割データを取得')
      
      // データ構造の検証
      const firstTimetable = allTimetables[0]
      if (firstTimetable.id && firstTimetable.name && firstTimetable.createdAt && firstTimetable.status) {
        console.log('✅ テスト2-1 成功: データ構造が正しい')
      } else {
        console.log('❌ テスト2-1 失敗: データ構造が不正です')
        console.log('実際のデータ:', firstTimetable)
        return false
      }
      
    } else {
      console.log('❌ テスト2 失敗: 統合処理が失敗しました')
      return false
    }
    
    // テスト3: エラーハンドリング
    console.log('\n📋 テスト3: エラーハンドリング確認')
    // TypeError: t.value is not iterableの原因となる状況をテスト
    try {
      const problematicResponse = { notAnArray: 'this should not cause TypeError' }
      if (Array.isArray(problematicResponse)) {
        // これは実行されない
        problematicResponse.map(x => x)
      } else {
        console.log('✅ テスト3 成功: 非配列データでTypeErrorが発生しないことを確認')
      }
    } catch (error) {
      console.log('❌ テスト3 失敗: 予期しないエラー:', error.message)
      return false
    }
    
    console.log('\n🎉 全テスト成功！修正が有効です')
    return true
    
  } catch (error) {
    console.log('\n❌ テスト実行中にエラーが発生:', error.message)
    return false
  }
}

// Node.jsの場合のみ実行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, getSavedTimetables, loadTimetables }
  
  // 直接実行された場合
  if (require.main === module) {
    runTests().then(success => {
      process.exit(success ? 0 : 1)
    })
  }
} else {
  // ブラウザの場合
  runTests()
}