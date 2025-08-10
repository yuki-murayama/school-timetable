import type React from 'react'
import { useCallback, useState } from 'react'
import type { Subject, Teacher } from '../../shared/types'
import { timetableUtils } from '../lib/api'
import type { TimetableSlotData } from './use-timetable-data'

interface DraggedItem {
  subject: string
  teacher: string
  period: string
  day: string
  grade: number
  classNumber: number
}

export const useTimetableDragDrop = (
  timetableData: TimetableSlotData[],
  setTimetableData: (data: TimetableSlotData[]) => void,
  teachers: Teacher[],
  subjects: Subject[]
) => {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)

  // ドラッグ開始処理
  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      subject: string,
      teacher: string,
      period: string,
      day: string,
      grade: number,
      classNumber: number
    ) => {
      const draggedData = { subject, teacher, period, day, grade, classNumber }
      setDraggedItem(draggedData)
      e.dataTransfer.setData('text/plain', JSON.stringify(draggedData))
    },
    []
  )

  // ドラッグオーバー処理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // ドロップ処理
  const handleDrop = useCallback(
    (e: React.DragEvent, targetPeriod: string, targetDay: string) => {
      e.preventDefault()

      if (!draggedItem) return

      console.log('🎯 ドロップ操作:', {
        from: `${draggedItem.day}曜日${draggedItem.period}時限目`,
        to: `${targetDay}曜日${targetPeriod}時限目`,
        subject: draggedItem.subject,
        teacher: draggedItem.teacher,
      })

      const newTimetableData = [...timetableData]

      // ドラッグ元のデータをクリア
      const draggedPeriodIndex = newTimetableData.findIndex(
        row => row.period === draggedItem.period
      )

      const targetPeriodIndex = newTimetableData.findIndex(row => row.period === targetPeriod)

      if (draggedPeriodIndex !== -1 && targetPeriodIndex !== -1) {
        // ドラッグ元をクリア
        const draggedRow = { ...newTimetableData[draggedPeriodIndex] }
        const draggedDayKey = draggedItem.day as keyof TimetableSlotData
        if (draggedDayKey in draggedRow) {
          delete draggedRow[draggedDayKey]
        }
        newTimetableData[draggedPeriodIndex] = draggedRow

        // ドロップ先に移動
        const targetRow = { ...newTimetableData[targetPeriodIndex] }
        const targetDayKey = targetDay as keyof TimetableSlotData
        ;(targetRow as any)[targetDayKey] = {
          subject: draggedItem.subject,
          teacher: draggedItem.teacher,
          classroom: '',
        }
        newTimetableData[targetPeriodIndex] = targetRow

        applyChangesWithValidation(newTimetableData)
      }

      setDraggedItem(null)
    },
    [draggedItem, timetableData, applyChangesWithValidation]
  )

  // バリデーション付きでの変更適用
  const applyChangesWithValidation = useCallback(
    async (newTimetableData: TimetableSlotData[]) => {
      console.log('🔍 変更をバリデーション付きで適用')

      try {
        const validation = await timetableUtils.validateTimetableConstraints(
          newTimetableData,
          teachers,
          subjects
        )

        if (!validation.isValid && validation.conflicts.length > 0) {
          const conflictMessages = validation.conflicts.map(c => c.message).join('\n')
          console.warn('⚠️ 制約違反が検出されました:', conflictMessages)
        }

        // 適合率を計算
        const compliance = await timetableUtils.calculateComplianceRate(
          newTimetableData,
          teachers,
          subjects
        )

        console.log(`📊 適合率: ${compliance.overallRate}%`)

        // 違反情報を追加
        const dataWithViolations = await timetableUtils.addViolationInfo(
          newTimetableData,
          compliance.violations
        )

        setTimetableData(dataWithViolations as TimetableSlotData[])
      } catch (error) {
        console.error('バリデーション処理でエラー:', error)
        setTimetableData(newTimetableData)
      }
    },
    [teachers, subjects, setTimetableData]
  )

  return {
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    applyChangesWithValidation,
  }
}
