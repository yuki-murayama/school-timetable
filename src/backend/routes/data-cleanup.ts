/**
 * データクリーンアップAPI
 * 不正なJSONデータや型違反データの検出と修正
 */

import { Hono } from 'hono'
import { SubjectValidationService } from '../services/SubjectValidationService'
import type { Env } from '../../shared/types'

const app = new Hono<{ Bindings: Env }>()

interface CleanupResult {
  totalRecords: number
  validRecords: number
  corruptedRecords: number
  fixedRecords: number
  deletedRecords: number
  errors: Array<{
    id: string
    field: string
    originalValue: any
    error: string
    action: 'fixed' | 'deleted' | 'skipped'
  }>
}

/**
 * 教科データの一括クリーンアップ
 */
app.post('/subjects', async (c) => {
  try {
    const db = c.env.DB
    console.log('🧹 教科データクリーンアップ開始')

    // すべての教科データを取得
    const allSubjects = await db.prepare('SELECT * FROM subjects').all()
    const subjects = allSubjects.results || []

    const result: CleanupResult = {
      totalRecords: subjects.length,
      validRecords: 0,
      corruptedRecords: 0,
      fixedRecords: 0,
      deletedRecords: 0,
      errors: []
    }

    console.log(`📊 ${subjects.length}件の教科データをスキャン中...`)

    for (const subject of subjects) {
      try {
        // 型検証を試行
        const cleanData = SubjectValidationService.validateAndCleanSubject(subject)
        result.validRecords++
        
        // 元のデータと比較して修正が必要かチェック
        const needsUpdate = (
          subject.weekly_hours !== cleanData.weeklyHours ||
          JSON.stringify(JSON.parse(subject.target_grades || '[]')) !== JSON.stringify(cleanData.targetGrades)
        )

        if (needsUpdate) {
          // データを修正
          const dbData = SubjectValidationService.validateForDatabase(cleanData)
          
          await db.prepare(`
            UPDATE subjects 
            SET weeklyHours = ?, target_grades = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `)
          .bind(dbData.weeklyHours, dbData.targetGrades, subject.id)
          .run()

          result.fixedRecords++
          result.errors.push({
            id: String(subject.id),
            field: 'weekly_hours/target_grades',
            originalValue: {
              weekly_hours: subject.weekly_hours,
              target_grades: subject.target_grades
            },
            error: '型不整合',
            action: 'fixed'
          })

          console.log(`🔧 修正: 教科「${cleanData.name}」の週間授業数を${cleanData.weeklyHours}に正規化`)
        }

      } catch (error) {
        result.corruptedRecords++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        console.error(`❌ 教科ID ${subject.id} の検証失敗:`, errorMessage)
        
        // 巨大なJSONデータや修復不可能なデータは削除を検討
        const isCorrupted = (
          typeof subject.weekly_hours === 'object' ||
          JSON.stringify(subject).length > 10000 // 10KB超のレコード
        )

        if (isCorrupted) {
          console.warn(`🗑️ 破損データを削除: 教科ID ${subject.id}`)
          
          await db.prepare('DELETE FROM subjects WHERE id = ?')
            .bind(subject.id)
            .run()
            
          result.deletedRecords++
          result.errors.push({
            id: String(subject.id),
            field: 'entire_record',
            originalValue: JSON.stringify(subject).slice(0, 200) + '...',
            error: '破損データ',
            action: 'deleted'
          })
        } else {
          result.errors.push({
            id: String(subject.id),
            field: 'validation',
            originalValue: subject,
            error: errorMessage,
            action: 'skipped'
          })
        }
      }
    }

    const summary = {
      success: true,
      message: `クリーンアップ完了: ${result.fixedRecords}件修正、${result.deletedRecords}件削除`,
      result: {
        ...result,
        successRate: Math.round((result.validRecords / result.totalRecords) * 100)
      }
    }

    console.log('✅ 教科データクリーンアップ完了:', summary)
    
    return c.json(summary)

  } catch (error) {
    console.error('❌ クリーンアップ処理でエラー:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * データベース全体の健全性チェック
 */
app.get('/health-check', async (c) => {
  try {
    const db = c.env.DB
    
    console.log('🏥 データベース健全性チェック開始')
    
    // 教科データの健全性チェック
    const subjectsResult = await db.prepare('SELECT * FROM subjects').all()
    const subjects = subjectsResult.results || []
    
    let validSubjects = 0
    let corruptedSubjects = 0
    const corruptionDetails: Array<{id: string, issues: string[]}> = []
    
    for (const subject of subjects) {
      const issues: string[] = []
      
      try {
        SubjectValidationService.validateAndCleanSubject(subject)
        validSubjects++
      } catch (error) {
        corruptedSubjects++
        issues.push(error instanceof Error ? error.message : 'Validation failed')
        
        // 具体的な問題を特定
        if (typeof subject.weekly_hours === 'object') {
          issues.push('weekly_hours にオブジェクト型データが含まれています')
        }
        if (JSON.stringify(subject).length > 5000) {
          issues.push('レコードサイズが異常に大きいです')
        }
        
        corruptionDetails.push({
          id: String(subject.id),
          issues
        })
      }
    }
    
    const healthStatus = {
      database: {
        status: corruptedSubjects === 0 ? 'healthy' : 'degraded',
        subjects: {
          total: subjects.length,
          valid: validSubjects,
          corrupted: corruptedSubjects,
          healthRate: Math.round((validSubjects / subjects.length) * 100)
        }
      },
      recommendations: [] as string[]
    }
    
    if (corruptedSubjects > 0) {
      healthStatus.recommendations.push(`教科データに${corruptedSubjects}件の問題があります。/api/data-cleanup/subjects でクリーンアップを実行してください。`)
    }
    
    if (corruptedSubjects > subjects.length * 0.1) {
      healthStatus.database.status = 'critical'
      healthStatus.recommendations.push('データベースの破損が深刻です。バックアップからの復元を検討してください。')
    }
    
    console.log('📊 健全性チェック結果:', healthStatus)
    
    return c.json({
      success: true,
      ...healthStatus,
      corruptionDetails: corruptionDetails.slice(0, 10) // 最初の10件のみ
    })
    
  } catch (error) {
    console.error('❌ 健全性チェックでエラー:', error)
    return c.json({
      success: false,
      database: { status: 'error' },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default app