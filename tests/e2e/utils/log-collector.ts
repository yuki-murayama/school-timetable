import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  type: 'console' | 'network' | 'error' | 'warning';
  level: 'info' | 'warn' | 'error' | 'debug';  
  message: string;
  details?: any;
  url?: string;
  status?: number;
}

export class LogCollector {
  private logs: LogEntry[] = [];
  private page: Page;
  private testName: string;

  constructor(page: Page, testName: string) {
    this.page = page;
    this.testName = testName;
    this.setupLogCollection();
  }

  private setupLogCollection() {
    // コンソールログの収集
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();
      
      let level: 'info' | 'warn' | 'error' | 'debug' = 'info';
      if (type === 'error') level = 'error';
      else if (type === 'warning' || type === 'warn') level = 'warn';
      else if (type === 'debug') level = 'debug';

      this.logs.push({
        timestamp,
        type: 'console',
        level,
        message: text,
        details: {
          consoleType: type,
          location: msg.location()
        }
      });
    });

    // ページエラーの収集
    this.page.on('pageerror', (error) => {
      this.logs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        level: 'error',
        message: error.message,
        details: {
          stack: error.stack,
          name: error.name
        }
      });
    });

    // ネットワークリクエストの収集
    this.page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const timestamp = new Date().toISOString();

      // APIリクエストのみを記録
      if (url.includes('/api/') || url.includes('/frontend/')) {
        let responseBody: any = 'Could not read body';
        try {
          const contentType = response.headers()['content-type'] || '';
          responseBody = await response.text();
          
          if (contentType.includes('application/json')) {
            try {
              responseBody = JSON.parse(responseBody);
            } catch (e) {
              // JSONパースに失敗した場合はそのままテキストとして保持
            }
          }
        } catch (e) {
          responseBody = 'Failed to read response body';
        }

        this.logs.push({
          timestamp,
          type: 'network',
          level: status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info',
          message: `${response.request().method()} ${url}`,
          url,
          status,
          details: {
            method: response.request().method(),
            headers: response.headers(),
            responseBody: typeof responseBody === 'string' && responseBody.length > 1000 
              ? responseBody.substring(0, 1000) + '...' 
              : responseBody
          }
        });
      }
    });

    // リクエスト失敗の収集
    this.page.on('requestfailed', (request) => {
      this.logs.push({
        timestamp: new Date().toISOString(),
        type: 'network',
        level: 'error',
        message: `Request failed: ${request.method()} ${request.url()}`,
        url: request.url(),
        details: {
          method: request.method(),
          failure: request.failure()?.errorText || 'Unknown error'
        }
      });
    });
  }

  // ログの取得
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // エラーログのみ取得
  getErrors(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  // 警告ログのみ取得
  getWarnings(): LogEntry[] {
    return this.logs.filter(log => log.level === 'warn');
  }

  // APIリクエストログのみ取得
  getApiLogs(): LogEntry[] {
    return this.logs.filter(log => log.type === 'network');
  }

  // コンソールログの統計
  getLogStatistics() {
    const stats = {
      total: this.logs.length,
      errors: this.getErrors().length,
      warnings: this.getWarnings().length,
      apiRequests: this.getApiLogs().length,
      consoleMessages: this.logs.filter(log => log.type === 'console').length
    };

    return stats;
  }

  // ログの出力（コンソール）
  printLogs() {
    console.log(`\n===== LOGS FOR TEST: ${this.testName} =====`);
    
    const stats = this.getLogStatistics();
    console.log(`📊 Statistics: ${stats.total} total, ${stats.errors} errors, ${stats.warnings} warnings, ${stats.apiRequests} API requests`);
    
    if (stats.errors > 0) {
      console.log(`\n❌ ERRORS (${stats.errors}):`);
      this.getErrors().forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.message}`);
        if (log.details && log.details.stack) {
          console.log(`   Stack: ${log.details.stack}`);
        }
      });
    }

    if (stats.warnings > 0) {
      console.log(`\n⚠️ WARNINGS (${stats.warnings}):`);
      this.getWarnings().forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.message}`);
      });
    }

    if (stats.apiRequests > 0) {
      console.log(`\n🌐 API REQUESTS (${stats.apiRequests}):`);
      this.getApiLogs().forEach((log, index) => {
        const statusEmoji = log.status && log.status >= 400 ? '❌' : log.status && log.status >= 200 && log.status < 300 ? '✅' : '❓';
        console.log(`${index + 1}. ${statusEmoji} [${log.timestamp}] ${log.message} (${log.status || 'No status'})`);
        
        if (log.details && log.details.responseBody) {
          const body = log.details.responseBody;
          if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
            console.log(`   ⚠️ Response is HTML (possible routing issue)`);
          } else if (typeof body === 'object') {
            console.log(`   📄 JSON Response: ${JSON.stringify(body, null, 2).substring(0, 200)}...`);
          }
        }
      });
    }

    console.log(`\n📝 ALL CONSOLE MESSAGES:`);
    this.logs.filter(log => log.type === 'console').forEach((log, index) => {
      const levelEmoji = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${index + 1}. ${levelEmoji} [${log.timestamp}] ${log.message}`);
    });

    console.log('='.repeat(50));
  }

  // カスタムログエントリを追加
  addCustomLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: any) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      type: 'console',
      level,
      message,
      details: details || { source: 'test-custom' }
    });
  }

  // ログをファイルに保存
  async saveLogsToFile() {
    const logsDir = path.join(process.cwd(), 'test-results', 'logs');
    
    try {
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const filename = `${this.testName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
      const filepath = path.join(logsDir, filename);
      
      const logData = {
        testName: this.testName,
        timestamp: new Date().toISOString(),
        statistics: this.getLogStatistics(),
        logs: this.logs
      };

      fs.writeFileSync(filepath, JSON.stringify(logData, null, 2), 'utf8');
      console.log(`📁 Logs saved to: ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to save logs: ${error}`);
    }
  }
}