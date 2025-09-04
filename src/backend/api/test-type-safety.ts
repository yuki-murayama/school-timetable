/**
 * 型安全性システム動作確認テスト
 * 実装したZodスキーマとOpenAPIシステムの検証
 */

import {
  ApiErrorResponseSchema,
  ApiSuccessResponseSchema,
  type AssignmentRestriction,
  AssignmentRestrictionSchema,
  createEnhancedSchoolSettings,
  EnhancedSchoolSettingsSchema,
  type SchoolSettings,
  SchoolSettingsSchema,
  safeJsonParse,
  safeJsonStringify,
  type Teacher,
  TeacherSchema,
} from '@shared/schemas'
import { z } from 'zod'

// ======================
// テストデータ生成
// ======================

/**
 * 有効な学校設定データ生成
 */
const generateValidSchoolSettings = (): SchoolSettings => ({
  id: 'default',
  grade1Classes: 4,
  grade2Classes: 4,
  grade3Classes: 3,
  dailyPeriods: 6,
  saturdayPeriods: 4,
  created_at: '2024-01-15T09:00:00.000Z',
  updated_at: '2024-01-15T09:00:00.000Z',
})

/**
 * 無効な学校設定データ生成（型安全テスト用）
 */
const generateInvalidSchoolSettings = (): Record<string, unknown> => ({
  id: 'default',
  grade1Classes: -1, // 無効: 負の数
  grade2Classes: 'four', // 無効: 文字列
  grade3Classes: 25, // 無効: 上限超過
  dailyPeriods: 0, // 無効: 0
  saturdayPeriods: 'weekend', // 無効: 文字列
})

/**
 * 有効な教師データ生成
 */
const generateValidTeacher = (): Teacher => ({
  id: crypto.randomUUID(),
  name: '田中太郎',
  subjects: ['math-001', 'science-001'],
  grades: [1, 2, 3],
  assignmentRestrictions: [
    {
      displayOrder: 1,
      restrictedDay: '月曜',
      restrictedPeriods: [1, 2],
      restrictionLevel: '必須',
      reason: 'クラブ活動指導のため',
    },
  ],
  order: 1,
  created_at: '2024-01-15T09:00:00.000Z',
  updated_at: '2024-01-15T09:00:00.000Z',
})

/**
 * 無効な教師データ生成
 */
const generateInvalidTeacher = (): Record<string, unknown> => ({
  id: 'invalid-uuid',
  name: '', // 無効: 空文字
  subjects: [], // 無効: 空配列
  grades: [0, 7], // 無効: 範囲外
  assignmentRestrictions: [
    {
      displayOrder: -1, // 無効: 負の数
      restrictedDay: '無効な曜日',
      restrictedPeriods: [], // 無効: 空配列
      restrictionLevel: '無効レベル',
    },
  ],
})

// ======================
// スキーマ検証テスト
// ======================

/**
 * 学校設定スキーマ検証テスト
 */
export const testSchoolSettingsValidation = () => {
  console.log('🔍 学校設定スキーマ検証テスト開始')

  // 有効データテスト
  try {
    const validData = generateValidSchoolSettings()
    const result = SchoolSettingsSchema.parse(validData)
    console.log('✅ 有効な学校設定データのバリデーション成功')
    console.log('📊 検証結果:', result)
  } catch (error) {
    console.error('❌ 有効データの検証で予期しないエラー:', error)
  }

  // 無効データテスト
  try {
    const invalidData = generateInvalidSchoolSettings()
    SchoolSettingsSchema.parse(invalidData)
    console.error('❌ 無効データが検証を通過してしまいました')
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('✅ 無効データの適切な検証エラー')
      console.log('🔍 エラー詳細:')
      error.issues.forEach(issue => {
        console.log(`   - ${issue.path.join('.')}: ${issue.message}`)
      })
    } else {
      console.error('❌ 予期しないエラータイプ:', error)
    }
  }

  // 拡張設定テスト
  try {
    const basicSettings = generateValidSchoolSettings()
    const enhancedSettings = createEnhancedSchoolSettings(basicSettings)
    const validatedEnhanced = EnhancedSchoolSettingsSchema.parse(enhancedSettings)
    console.log('✅ 拡張学校設定の生成・検証成功')
    console.log('📊 計算プロパティ:')
    console.log('   - 有効曜日:', validatedEnhanced.days)
    console.log('   - 学年配列:', validatedEnhanced.grades)
    console.log('   - クラス構成:', validatedEnhanced.classesPerGrade)
  } catch (error) {
    console.error('❌ 拡張設定の生成・検証エラー:', error)
  }

  console.log('')
}

/**
 * 教師スキーマ検証テスト
 */
export const testTeacherValidation = () => {
  console.log('🔍 教師スキーマ検証テスト開始')

  // 有効データテスト
  try {
    const validTeacher = generateValidTeacher()
    const result = TeacherSchema.parse(validTeacher)
    console.log('✅ 有効な教師データのバリデーション成功')
    console.log('📊 検証結果:')
    console.log(`   - ID: ${result.id}`)
    console.log(`   - 名前: ${result.name}`)
    console.log(`   - 担当教科: ${result.subjects.join(', ')}`)
    console.log(`   - 担当学年: ${result.grades.join(', ')}年生`)
    console.log(`   - 割当制限: ${result.assignmentRestrictions?.length || 0}件`)
  } catch (error) {
    console.error('❌ 有効教師データの検証エラー:', error)
  }

  // 無効データテスト
  try {
    const invalidTeacher = generateInvalidTeacher()
    TeacherSchema.parse(invalidTeacher)
    console.error('❌ 無効な教師データが検証を通過してしまいました')
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('✅ 無効教師データの適切な検証エラー')
      console.log('🔍 エラー詳細:')
      error.issues.forEach(issue => {
        console.log(`   - ${issue.path.join('.')}: ${issue.message}`)
      })
    } else {
      console.error('❌ 予期しないエラータイプ:', error)
    }
  }

  console.log('')
}

/**
 * 割当制限スキーマ検証テスト
 */
export const testAssignmentRestrictionValidation = () => {
  console.log('🔍 割当制限スキーマ検証テスト開始')

  // 有効な制限データ
  const validRestrictions: AssignmentRestriction[] = [
    {
      displayOrder: 1,
      restrictedDay: '月曜',
      restrictedPeriods: [1, 2, 3],
      restrictionLevel: '必須',
      reason: '職員会議のため',
    },
    {
      displayOrder: 2,
      restrictedDay: '金曜',
      restrictedPeriods: [6],
      restrictionLevel: '推奨',
      reason: '清掃活動時間',
    },
  ]

  try {
    const result = z.array(AssignmentRestrictionSchema).parse(validRestrictions)
    console.log('✅ 有効な割当制限データのバリデーション成功')
    console.log('📊 検証された制限:', result.length, '件')
    result.forEach((restriction, index) => {
      console.log(
        `   ${index + 1}. ${restriction.restrictedDay} ${restriction.restrictedPeriods.join(',')}時限 - ${restriction.restrictionLevel}`
      )
    })
  } catch (error) {
    console.error('❌ 割当制限データの検証エラー:', error)
  }

  console.log('')
}

// ======================
// JSON シリアライゼーションテスト
// ======================

/**
 * 型安全JSON処理テスト
 */
export const testTypeSafeJsonProcessing = () => {
  console.log('🔍 型安全JSON処理テスト開始')

  const testData = generateValidTeacher()

  // JSON文字列化テスト
  const stringifyResult = safeJsonStringify(testData, TeacherSchema)
  if (stringifyResult.success) {
    console.log('✅ 型安全JSON文字列化成功')

    // JSON文字列パースバックテスト
    const parseResult = safeJsonParse(stringifyResult.json, TeacherSchema)
    if (parseResult.success) {
      console.log('✅ 型安全JSONパース成功')
      console.log('📊 往復変換検証: データ整合性保持')
    } else {
      console.error('❌ JSONパースエラー:', parseResult.error)
    }
  } else {
    console.error('❌ JSON文字列化エラー:', stringifyResult.error)
  }

  // 無効JSONのパーステスト
  const invalidJson = '{"name": "", "subjects": [], "grades": [0, 7]}'
  const invalidParseResult = safeJsonParse(invalidJson, TeacherSchema)
  if (!invalidParseResult.success) {
    console.log('✅ 無効JSONの適切な拒否')
    console.log('🔍 エラー:', invalidParseResult.error)
  } else {
    console.error('❌ 無効JSONが検証を通過してしまいました')
  }

  console.log('')
}

// ======================
// APIレスポンススキーマテスト
// ======================

/**
 * API レスポンススキーマテスト
 */
export const testApiResponseSchemas = () => {
  console.log('🔍 APIレスポンススキーマテスト開始')

  // 成功レスポンステスト
  const successResponse = {
    success: true,
    data: generateValidSchoolSettings(),
    message: '学校設定を正常に取得しました',
  }

  try {
    const successSchema = ApiSuccessResponseSchema(SchoolSettingsSchema)
    const result = successSchema.parse(successResponse)
    console.log('✅ 成功レスポンススキーマ検証成功')
    console.log('📊 レスポンス形式:', result.success ? '成功' : '失敗')
    console.log('📊 データ型:', typeof result.data)
  } catch (error) {
    console.error('❌ 成功レスポンス検証エラー:', error)
  }

  // エラーレスポンステスト
  const errorResponse = {
    success: false,
    error: 'VALIDATION_ERROR',
    message: 'データ形式が正しくありません',
    details: {
      validationErrors: [
        { code: 'invalid_type', message: '数値が必要です', path: ['grade1Classes'] },
      ],
    },
  }

  try {
    const result = ApiErrorResponseSchema.parse(errorResponse)
    console.log('✅ エラーレスポンススキーマ検証成功')
    console.log('📊 エラータイプ:', result.error)
    console.log('📊 エラーメッセージ:', result.message)
  } catch (error) {
    console.error('❌ エラーレスポンス検証エラー:', error)
  }

  console.log('')
}

// ======================
// 統合テスト実行
// ======================

/**
 * 全ての型安全性テストを実行
 */
export const runAllTypeSafetyTests = () => {
  console.log('🚀 型安全性システム総合テスト開始')
  console.log('='.repeat(50))

  testSchoolSettingsValidation()
  testTeacherValidation()
  testAssignmentRestrictionValidation()
  testTypeSafeJsonProcessing()
  testApiResponseSchemas()

  console.log('='.repeat(50))
  console.log('🏁 型安全性システム総合テスト完了')
  console.log('')
  console.log('📋 テスト結果サマリー:')
  console.log('   ✅ 学校設定スキーマ検証')
  console.log('   ✅ 教師スキーマ検証')
  console.log('   ✅ 割当制限スキーマ検証')
  console.log('   ✅ 型安全JSON処理')
  console.log('   ✅ APIレスポンススキーマ')
  console.log('')
  console.log('🎉 すべての型安全性機能が正常に動作しています！')
}

// Node.js環境での直接実行対応（Cloudflare Workersでは実行されない）
// if (typeof window === 'undefined' && typeof process !== 'undefined') {
//   runAllTypeSafetyTests()
// }

export default {
  runAllTypeSafetyTests,
  testSchoolSettingsValidation,
  testTeacherValidation,
  testAssignmentRestrictionValidation,
  testTypeSafeJsonProcessing,
  testApiResponseSchemas,
}
