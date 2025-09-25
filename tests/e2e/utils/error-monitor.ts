/**
 * E2Eテスト用コンソールエラー監視ユーティリティ
 *
 * 機能:
 * - ブラウザコンソールエラー、ネットワークエラー、ページエラーの監視
 * - テストケース毎のログ分離
 * - 致命的エラーの自動検出と報告
 * - テスト終了時の詳細エラーレポート生成
 */

import type { Page } from '@playwright/test'

export interface ErrorMonitorConfig {
  testName: string
  enableConsoleLogging?: boolean
  enableNetworkLogging?: boolean
  enablePageErrorLogging?: boolean
  fatalErrorThreshold?: number // 致命的エラーの閾値（デフォルト: 1）
  ignorablePatterns?: string[] // 無視するエラーパターン（オプション）
}

export interface ErrorReport {
  testName: string
  consoleErrors: string[]
  networkErrors: string[]
  pageErrors: string[]
  fatalErrors: string[]
  totalErrors: number
  hasFatalErrors: boolean
  startTime: string
  endTime?: string
}

export class ErrorMonitor {
  private consoleErrors: string[] = []
  private networkErrors: string[] = []
  private pageErrors: string[] = []
  private config: Required<ErrorMonitorConfig>
  private startTime: string
  private page: Page

  constructor(page: Page, config: ErrorMonitorConfig) {
    this.page = page
    this.config = {
      enableConsoleLogging: true,
      enableNetworkLogging: true,
      enablePageErrorLogging: true,
      fatalErrorThreshold: 1,
      ...config,
    }
    this.startTime = new Date().toISOString()
    this.setupMonitoring()
  }

  /**
   * エラー監視を開始
   */
  private setupMonitoring(): void {
    console.log(`🔍 [${this.config.testName}] エラー監視開始: ${this.startTime}`)

    if (this.config.enableConsoleLogging) {
      this.page.on('console', msg => {
        const msgType = msg.type()
        const msgText = msg.text()

        // デバッグ: 全コンソールメッセージをログ出力
        console.log(`🔍 [${this.config.testName}] Console ${msgType}: ${msgText}`)

        // error レベルのメッセージは原則的に全て記録
        if (msgType === 'error') {
          console.error(`🚨 [${this.config.testName}] ブラウザコンソールエラー: ${msgText}`)
          this.consoleErrors.push(`ERROR: ${msgText}`)
        }
        // warn レベルのメッセージも原則的に全て記録
        else if (msgType === 'warn') {
          console.error(`⚠️ [${this.config.testName}] ブラウザコンソール警告: ${msgText}`)
          this.consoleErrors.push(`WARN: ${msgText}`)
        }
      })
    }

    if (this.config.enableNetworkLogging) {
      // リクエスト監視を強化
      this.page.on('request', request => {
        const url = request.url()
        const method = request.method()
        const headers = request.headers()

        // API リクエストを詳細ログ出力
        if (url.includes('/api/')) {
          console.log(`📤 [${this.config.testName}] API Request: ${method} ${url}`)

          // POSTリクエストの場合、詳細をログ出力
          if (method === 'POST' && url.includes('/api/school/subjects')) {
            console.log(`🚨 [${this.config.testName}] 教科POST発見: ${method} ${url}`)
            console.log(`📋 [${this.config.testName}] リクエストヘッダー:`, headers)
            try {
              const postData = request.postData()
              console.log(`📋 [${this.config.testName}] POSTデータ:`, postData)
            } catch (error) {
              console.log(`📋 [${this.config.testName}] POSTデータ読み取りエラー:`, error.message)
            }
          }
        }
      })

      // レスポンス監視を強化
      this.page.on('response', async response => {
        const url = response.url()
        const status = response.status()
        const method = response.request().method()

        // 全APIレスポンスをログ出力
        if (url.includes('/api/')) {
          console.log(
            `📥 [${this.config.testName}] API Response: ${method} ${url} - Status: ${status}`
          )

          // 教科API関連の詳細ログ
          if (url.includes('/api/school/subjects')) {
            console.log(
              `🔍 [${this.config.testName}] 教科API詳細: ${method} ${url} - Status: ${status}`
            )
            try {
              const responseText = await response.text()
              console.log(
                `📋 [${this.config.testName}] レスポンス内容 (最初の500文字):`,
                responseText.substring(0, 500)
              )
            } catch (error) {
              console.log(`📋 [${this.config.testName}] レスポンス読み取りエラー:`, error.message)
            }
          }
        }

        // 400番台以上のHTTPエラーは原則的に全て記録
        if (status >= 400) {
          let responseBody = ''
          try {
            responseBody = await response.text()
          } catch (error) {
            responseBody = `レスポンス読み込みエラー: ${error.message}`
          }

          const errorInfo = `${method} ${url} - Status: ${status}, Body: ${responseBody}`

          console.error(`🌐 [${this.config.testName}] ネットワークエラー: ${errorInfo}`)
          this.networkErrors.push(errorInfo)
        }
      })

      // リクエスト失敗を監視
      this.page.on('requestfailed', request => {
        const url = request.url()
        const method = request.method()
        const failure = request.failure()

        const errorInfo = `${method} ${url} - Failed: ${failure?.errorText || 'Unknown error'}`

        console.error(`🌐 [${this.config.testName}] リクエスト失敗: ${errorInfo}`)
        this.networkErrors.push(errorInfo)
      })
    }

    if (this.config.enablePageErrorLogging) {
      this.page.on('pageerror', error => {
        const errorText = `Page error: ${error.message}`
        console.error(`💥 [${this.config.testName}] ページエラー: ${error.message}`)
        this.pageErrors.push(errorText)
      })
    }
  }

  /**
   * ログをクリア（テストケース開始時に呼び出し）
   */
  clearLogs(): void {
    this.consoleErrors = []
    this.networkErrors = []
    this.pageErrors = []
    console.log(`🧹 [${this.config.testName}] ログクリア完了`)
  }

  /**
   * 致命的エラーを検出
   */
  /**
   * 致命的エラーを検出
   */
  private detectFatalErrors(): string[] {
    const allErrors = [...this.consoleErrors, ...this.networkErrors, ...this.pageErrors]

    // デフォルトの無視して良いメッセージパターンを定義
    const defaultIgnorablePatterns = [
      // 開発環境の無害なメッセージ
      'Download the React DevTools',
      'React DevTools',
      'WebSocket connection',
      'HMR',
      'Hot Module Replacement',
      // Playwrightの内部メッセージ
      'playwright',
      'Playwright',
      // ブラウザの無害な警告
      'Permissions Policy',
      'Feature Policy',
      // 一般的な無害なリソースエラー（必要に応じて追加）
      'favicon.ico - Status: 404',
      // その他の既知の無害なメッセージ（必要に応じて追加）
    ]

    // 設定から無視パターンを取得し、デフォルトパターンとマージ
    const ignorablePatterns = [
      ...defaultIgnorablePatterns,
      ...(this.config.ignorablePatterns || []),
    ]

    // 無視パターンに該当しないエラーを致命的エラーとして扱う
    const fatalErrors = allErrors.filter(error => {
      // 無視すべきパターンをチェック
      const shouldIgnore = ignorablePatterns.some(pattern =>
        error.toLowerCase().includes(pattern.toLowerCase())
      )

      if (shouldIgnore) {
        console.log(`🔕 [${this.config.testName}] 無視するエラー: ${error}`)
        return false
      }

      // 無視パターンに該当しない場合は致命的エラーとして扱う
      console.error(`💀 [${this.config.testName}] 致命的エラーとして検出: ${error}`)
      return true
    })

    return fatalErrors
  }

  /**
   * エラーレポート生成
   */
  generateReport(): ErrorReport {
    const fatalErrors = this.detectFatalErrors()

    const report: ErrorReport = {
      testName: this.config.testName,
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      pageErrors: [...this.pageErrors],
      fatalErrors,
      totalErrors: this.consoleErrors.length + this.networkErrors.length + this.pageErrors.length,
      hasFatalErrors: fatalErrors.length >= this.config.fatalErrorThreshold,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
    }

    return report
  }

  /**
   * エラーレポート表示
   */
  printReport(): ErrorReport {
    const report = this.generateReport()

    console.log(`\n📊 [${this.config.testName}] エラー監視レポート`)
    console.log(`⏰ 監視期間: ${this.startTime} ~ ${report.endTime}`)

    if (report.totalErrors === 0) {
      console.log('✅ エラーは検出されませんでした')
      return report
    }

    console.log(`🚨 総エラー数: ${report.totalErrors}件`)

    if (report.consoleErrors.length > 0) {
      console.error(`🔍 コンソールエラー (${report.consoleErrors.length}件):`)
      report.consoleErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`)
      })
    }

    if (report.networkErrors.length > 0) {
      console.error(`🌐 ネットワークエラー (${report.networkErrors.length}件):`)
      report.networkErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`)
      })
    }

    if (report.pageErrors.length > 0) {
      console.error(`💥 ページエラー (${report.pageErrors.length}件):`)
      report.pageErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`)
      })
    }

    if (report.hasFatalErrors) {
      console.error(`💀 致命的なエラーが検出されました (${report.fatalErrors.length}件):`)
      report.fatalErrors.forEach((error, index) => {
        console.error(`  FATAL ${index + 1}: ${error}`)
      })
    }

    return report
  }

  /**
   * 致命的エラーがある場合は例外を投げる
   */
  throwIfFatal(): void {
    const report = this.generateReport()

    if (report.hasFatalErrors) {
      throw new Error(
        `[${this.config.testName}] 致命的なエラーが${report.fatalErrors.length}件検出されました。システムの修復が必要です。`
      )
    }
  }

  /**
   * エラー監視終了とレポート生成
   */
  finalize(): ErrorReport {
    const report = this.printReport()
    this.throwIfFatal()
    return report
  }

  /**
   * 現在のエラー統計を取得
   */
  getStats(): { console: number; network: number; page: number; total: number; fatal: number } {
    const fatalErrors = this.detectFatalErrors()

    return {
      console: this.consoleErrors.length,
      network: this.networkErrors.length,
      page: this.pageErrors.length,
      total: this.consoleErrors.length + this.networkErrors.length + this.pageErrors.length,
      fatal: fatalErrors.length,
    }
  }
}

/**
 * テスト用のヘルパー関数
 */
export function createErrorMonitor(
  page: Page,
  testName: string,
  options?: Partial<ErrorMonitorConfig>
): ErrorMonitor {
  return new ErrorMonitor(page, { testName, ...options })
}

/**
 * テストケース用のデコレーター関数
 */
export function withErrorMonitoring<T extends unknown[]>(
  testName: string,
  testFunction: (errorMonitor: ErrorMonitor, ...args: T) => Promise<void>,
  options?: Partial<ErrorMonitorConfig>
) {
  return async (page: Page, ...args: T): Promise<void> => {
    const errorMonitor = createErrorMonitor(page, testName, options)

    try {
      await testFunction(errorMonitor, ...args)
    } finally {
      errorMonitor.finalize()
    }
  }
}
