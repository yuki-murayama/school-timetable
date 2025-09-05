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
        if (msg.type() === 'error') {
          const errorText = msg.text()
          if (this.config.enableConsoleLogging) {
            console.error(`🚨 [${this.config.testName}] ブラウザコンソールエラー: ${errorText}`)
          }
          this.consoleErrors.push(errorText)
        }
      })
    }

    if (this.config.enableNetworkLogging) {
      this.page.on('response', response => {
        if (response.status() >= 400) {
          const errorInfo = `${response.request().method()} ${response.url()} - Status: ${response.status()}`
          if (this.config.enableNetworkLogging) {
            console.error(`🌐 [${this.config.testName}] ネットワークエラー: ${errorInfo}`)
          }
          this.networkErrors.push(errorInfo)
        }
      })
    }

    if (this.config.enablePageErrorLogging) {
      this.page.on('pageerror', error => {
        const errorText = `Page error: ${error.message}`
        if (this.config.enablePageErrorLogging) {
          console.error(`💥 [${this.config.testName}] ページエラー: ${error.message}`)
        }
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
  private detectFatalErrors(): string[] {
    const allErrors = [...this.consoleErrors, ...this.networkErrors, ...this.pageErrors]

    const fatalErrors = allErrors.filter(
      error =>
        error.includes('SQLITE_ERROR') ||
        error.includes('D1_ERROR') ||
        error.includes('Authorization token required') ||
        error.includes('TypeError') ||
        error.includes('is not iterable') ||
        error.includes('no such column') ||
        error.includes('ReferenceError') ||
        error.includes('SyntaxError') ||
        error.includes('Cannot read propert') ||
        error.includes('undefined is not a function') ||
        error.includes('null is not an object') ||
        error.includes('Network request failed') ||
        error.includes('ValidationError') || // バリデーションエラーを致命的エラーに追加
        error.includes('Validation failed') || // バリデーション失敗も致命的エラーに追加
        error.includes('500') ||
        error.includes('502') ||
        error.includes('503') ||
        error.includes('504')
    )

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
