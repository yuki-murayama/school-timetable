export interface TimetableProgressData {
  current: number
  total: number
  percentage: number
  currentStep: string
}

export interface TimetableSessionCreateResponse {
  success: boolean
  sessionId: string
  totalSteps: number
  message: string
}

export interface TimetableSessionStepResponse {
  success: boolean
  data: {
    sessionId: string
    completed: boolean
    currentDay?: string
    currentClass?: string
    progress: {
      current: number
      total: number
      percentage: number
      currentStep: string
    }
    message: string
    error?: string[]
  }
}

export interface TimetableSessionResultResponse {
  success: boolean
  message?: string
  timetable: {
    id: string
    schoolId: string
    generatedAt: string
    timetable: {
      [key: string]: unknown
    }
  }
}

export class TimetableGenerator {
  private sessionId: string | null = null
  private isGenerating: boolean = false
  private baseUrl: string = 'https://school-timetable-backend.grundhunter.workers.dev'
  private token: string | null = null

  public onProgress: ((progress: TimetableProgressData, error?: string[] | null) => void) | null = null
  public onComplete: ((finalTimetableId: string) => void) | null = null
  public onError: ((error: Error) => void) | null = null

  constructor(token?: string) {
    this.token = token || null
  }

  async startGeneration(): Promise<void> {
    if (this.isGenerating) return

    this.isGenerating = true

    try {
      // 1. セッション作成
      const createResponse = await this.fetchWithRetry(`${this.baseUrl}/frontend/session/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        body: JSON.stringify({ schoolId: 'school-1' })
      })

      const createData: TimetableSessionCreateResponse = await createResponse.json()

      // デバッグログ追加
      console.log('✅ セッション作成成功')
      console.log('セッション作成レスポンス:', createData)
      console.log('セッションID:', createData.sessionId)
      console.log('総ステップ数:', createData.totalSteps)

      // レスポンス検証
      if (!createData || !createData.success || !createData.sessionId) {
        throw new Error(`セッション作成失敗: ${createData?.message || 'Unknown error'}`)
      }

      this.sessionId = createData.sessionId

      // 初期進捗を通知（デフォルト値を設定）
      const totalSteps = createData.totalSteps ?? 36
      
      this.notifyProgress({
        current: 0,
        total: totalSteps,
        percentage: 0,
        currentStep: 'セッション作成完了、生成開始中...'
      })

      // 2. 段階的実行
      await this.executeSteps()

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      this.isGenerating = false
    }
  }

  private async executeSteps(): Promise<void> {
    let completed = false
    
    while (!completed && this.isGenerating && this.sessionId) {
      try {
        const stepResponse = await this.fetchWithRetry(`${this.baseUrl}/frontend/session/step`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
          },
          body: JSON.stringify({ sessionId: this.sessionId })
        })

        const stepResult: TimetableSessionStepResponse = await stepResponse.json()

        // デバッグログ追加（バックエンドClaudeの推奨ログ形式）
        console.log('🔄 ステップ実行レスポンス受信')
        console.log('フルレスポンス:', stepResult)
        console.log('レスポンスデータ:', stepResult.data)
        console.log('プログレスオブジェクト:', stepResult.data?.progress)
        console.log('プログレス詳細:', {
          current: stepResult.data?.progress?.current,
          total: stepResult.data?.progress?.total,
          percentage: stepResult.data?.progress?.percentage,
          currentStep: stepResult.data?.progress?.currentStep
        })

        // レスポンス検証
        if (!stepResult || typeof stepResult !== 'object' || !stepResult.data) {
          throw new Error('Invalid step response format')
        }

        // ステップ実行が失敗した場合の処理
        if (!stepResult.success) {
          throw new Error(`ステップ実行失敗: ${stepResult.data?.message || 'Unknown error'}`)
        }

        // dataフィールドから安全に値を取得
        const stepData = stepResult.data
        const progress = stepData.progress || {}

        // 進捗を通知（安全なアクセス方法でデフォルト値を設定）
        const current = progress.current || 0
        const total = progress.total || 36
        const percentage = progress.percentage || 0

        console.log(`進捗: ${current}/${total} (${percentage}%)`)

        // より詳細なステップ情報を表示
        const stepMessage = stepData.currentDay && stepData.currentClass
          ? `${stepData.currentClass}の${stepData.currentDay}を処理中...`
          : stepData.message || progress.currentStep || `ステップ ${current}/${total} 実行中...`

        this.notifyProgress({
          current,
          total,
          percentage,
          currentStep: stepMessage
        }, stepData.error)

        completed = stepData.completed

        if (completed) {
          // 3. 最終結果取得
          await this.getFinalResult()
          break
        }

        // UI応答性のため少し待機（仕様書の100msではなく1秒で実装）
        await this.wait(1000)

      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error('Unknown error'))
        break
      }
    }
  }

  private async getFinalResult(): Promise<void> {
    if (!this.sessionId) return

    try {
      const resultResponse = await this.fetchWithRetry(`${this.baseUrl}/frontend/session/result/${this.sessionId}`)
      const finalResult: TimetableSessionResultResponse = await resultResponse.json()

      console.log('最終結果レスポンス:', finalResult)

      // レスポンス検証
      if (!finalResult || !finalResult.success || !finalResult.timetable) {
        throw new Error(`最終結果取得失敗: ${finalResult?.message || 'Unknown error'}`)
      }

      this.notifyComplete(finalResult.timetable.id)
      
      // 完了進捗を通知
      this.notifyProgress({
        current: 36,
        total: 36,
        percentage: 100,
        currentStep: '時間割生成完了'
      })

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Final result fetch failed'))
    }
  }

  private notifyProgress(progress: TimetableProgressData, error?: string[] | null): void {
    if (this.onProgress) {
      this.onProgress(progress, error)
    }

    console.log(`進捗: ${progress.percentage}% (${progress.current}/${progress.total}) - ${progress.currentStep}`)
    if (error && error.length > 0) {
      console.warn('ステップエラー:', error)
    }
  }

  private notifyComplete(finalTimetableId: string): void {
    if (this.onComplete) {
      this.onComplete(finalTimetableId)
    }
    console.log('時間割生成完了! ID:', finalTimetableId)
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error)
    }
    console.error('時間割生成エラー:', error)
  }

  public stop(): void {
    this.isGenerating = false
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async fetchWithRetry(url: string, options?: RequestInit, maxRetries: number = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options)
        if (response.ok) return response
        
        // エラーレスポンスの詳細を取得
        let errorDetails = `HTTP ${response.status}`
        try {
          const errorBody = await response.text()
          console.error(`❌ ${url} - HTTP ${response.status} エラー`)
          console.error('エラーレスポンス:', errorBody)
          console.error('リクエスト詳細:', {
            url,
            method: options?.method || 'GET',
            headers: options?.headers,
            body: options?.body
          })
          
          if (errorBody) {
            try {
              const errorData = JSON.parse(errorBody)
              errorDetails = `HTTP ${response.status}: ${errorData.message || errorData.error || '詳細不明'}`
              console.error('パースされたエラーデータ:', errorData)
            } catch (jsonError) {
              errorDetails = `HTTP ${response.status}: ${errorBody}`
              console.error('JSON解析失敗、生レスポンス:', errorBody)
            }
          }
        } catch (responseError) {
          console.error('レスポンス読み取りエラー:', responseError)
          errorDetails = `HTTP ${response.status} (レスポンス読み取り失敗)`
        }
        
        throw new Error(errorDetails)
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    throw new Error('Max retries reached')
  }
}