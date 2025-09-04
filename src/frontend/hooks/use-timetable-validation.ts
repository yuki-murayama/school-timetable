import type { Subject, Teacher } from '@shared/schemas'
import { useCallback, useState } from 'react'
import { timetableUtils } from '../lib/api'
import type { TimetableSlotData } from './use-timetable-data'

interface ComplianceData {
  overallRate: number
  violations: Array<{
    period: string
    day: string
    type: 'teacher_conflict' | 'subject_constraint' | 'empty_slot' | 'teacher_mismatch'
    message: string
    severity: 'high' | 'medium' | 'low'
  }>
}

export const useTimetableValidation = () => {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)

  // 適合率計算
  const calculateCompliance = useCallback(
    async (timetableData: unknown, teachers: Teacher[], subjects: Subject[]) => {
      try {
        const compliance = await timetableUtils.calculateComplianceRate(
          timetableData,
          teachers,
          subjects
        )
        setComplianceData(compliance)
        return compliance
      } catch (error) {
        console.error('適合率計算エラー:', error)
        return null
      }
    },
    []
  )

  // 違反情報を表示データに追加
  const addViolationInfo = useCallback(async (displayData: unknown[], violations: unknown[]) => {
    try {
      return await timetableUtils.addViolationInfo(displayData, violations)
    } catch (error) {
      console.error('違反情報追加エラー:', error)
      return displayData
    }
  }, [])

  // リアルタイム制約チェック
  const validateConstraints = useCallback(
    async (displayData: TimetableSlotData[], teachers: Teacher[], subjects: Subject[]) => {
      try {
        const validation = await timetableUtils.validateTimetableConstraints(
          displayData,
          teachers,
          subjects
        )
        return validation
      } catch (error) {
        console.error('制約チェックエラー:', error)
        return { isValid: false, conflicts: [] }
      }
    },
    []
  )

  // 強化された制約チェック
  const validateConstraintsEnhanced = useCallback(
    async (
      displayData: TimetableSlotData[],
      teachers: Teacher[],
      subjects: Subject[],
      grade: number,
      classNumber: number,
      allClassTimetables?: Map<string, unknown[]>
    ) => {
      try {
        const validation = await timetableUtils.validateTimetableConstraintsEnhanced(
          displayData,
          teachers,
          subjects,
          grade,
          classNumber,
          allClassTimetables
        )
        return validation
      } catch (error) {
        console.error('強化制約チェックエラー:', error)
        return { isValid: false, conflicts: [] }
      }
    },
    []
  )

  // 全校横断制約チェック
  const validateSchoolWideConstraints = useCallback(
    async (
      allClassTimetables: Map<string, unknown[]>,
      teachers: Teacher[],
      subjects: Subject[]
    ) => {
      try {
        return await timetableUtils.validateSchoolWideTimetableConstraints(
          allClassTimetables,
          teachers,
          subjects
        )
      } catch (error) {
        console.error('全校制約チェックエラー:', error)
        return { isValid: false, conflicts: [] }
      }
    },
    []
  )

  return {
    // 状態
    complianceData,

    // アクション
    setComplianceData,

    // バリデーション関数
    calculateCompliance,
    addViolationInfo,
    validateConstraints,
    validateConstraintsEnhanced,
    validateSchoolWideConstraints,
  }
}
