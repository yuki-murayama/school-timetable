import { useState, useCallback, useRef } from 'react'
import { TimetableGenerator, type TimetableProgressData } from '../lib/timetable-generator'

export interface UseTimetableGenerationState {
  isGenerating: boolean
  progress: TimetableProgressData
  error: string | null
  finalTimetableId: string | null
}

export interface UseTimetableGenerationActions {
  startGeneration: () => Promise<void>
  stopGeneration: () => void
}

export function useTimetableGeneration(token?: string): UseTimetableGenerationState & UseTimetableGenerationActions {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<TimetableProgressData>({
    current: 0,
    total: 36,
    percentage: 0,
    currentStep: '待機中'
  })
  const [error, setError] = useState<string | null>(null)
  const [finalTimetableId, setFinalTimetableId] = useState<string | null>(null)

  const generatorRef = useRef<TimetableGenerator | null>(null)

  const startGeneration = useCallback(async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setError(null)
    setFinalTimetableId(null)
    setProgress({
      current: 0,
      total: 36,
      percentage: 0,
      currentStep: 'セッション作成中...'
    })

    const generator = new TimetableGenerator(token)
    generatorRef.current = generator

    generator.onProgress = (progressData: TimetableProgressData, errorData?: string[] | null) => {
      setProgress(progressData)
      if (errorData && errorData.length > 0) {
        setError(errorData.join(', '))
      } else {
        setError(null)
      }
    }

    generator.onComplete = (timetableId: string) => {
      setFinalTimetableId(timetableId)
      setIsGenerating(false)
      setProgress(prev => ({
        ...prev,
        percentage: 100,
        currentStep: '完了'
      }))
    }

    generator.onError = (err: Error) => {
      setError(err.message)
      setIsGenerating(false)
      setProgress(prev => ({
        ...prev,
        currentStep: 'エラー発生'
      }))
    }

    await generator.startGeneration()
  }, [isGenerating, token])

  const stopGeneration = useCallback(() => {
    if (generatorRef.current) {
      generatorRef.current.stop()
    }
    setIsGenerating(false)
    setProgress(prev => ({
      ...prev,
      currentStep: '停止しました'
    }))
  }, [])

  return {
    isGenerating,
    progress,
    error,
    finalTimetableId,
    startGeneration,
    stopGeneration
  }
}