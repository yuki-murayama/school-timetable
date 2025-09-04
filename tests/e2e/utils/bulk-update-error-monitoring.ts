/**
 * E2Eテストファイル一括更新スクリプト
 * 全てのE2Eテストファイルにエラー監視機能を追加
 */

import * as fs from 'fs'
import * as path from 'path'

const testFiles = [
  '01-authentication.spec.ts',
  '02-school-settings.spec.ts', 
  '04-timetable-workflow.spec.ts',
  '05-complete-integration.spec.ts',
  'simple-app-test.spec.ts'
]

const testDir = path.join(__dirname, '..')

for (const testFile of testFiles) {
  const filePath = path.join(testDir, testFile)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ ファイルが見つかりません: ${testFile}`)
    continue
  }
  
  let content = fs.readFileSync(filePath, 'utf-8')
  
  // 既に更新済みの場合はスキップ
  if (content.includes('createErrorMonitor')) {
    console.log(`✅ 既に更新済み: ${testFile}`)
    continue
  }
  
  // インポート文を追加
  content = content.replace(
    /import { test, expect.*} from '@playwright\/test'/,
    `import { test, expect, Page } from '@playwright/test'
import { createErrorMonitor } from './utils/error-monitor'`
  )
  
  // 各テストケースの開始部分にエラー監視を追加
  content = content.replace(
    /test\('([^']+)', async \(\{ page \}\) => \{\s*console\.log\('([^']+)'\)/g,
    (match, testName, logMessage) => {
      return `test('${testName}', async ({ page }) => {
    console.log('${logMessage}')
    
    // エラー監視の設定
    const errorMonitor = createErrorMonitor(page, '${testName}')`
    }
  )
  
  // テスト終了部分にエラー監視終了処理を追加
  content = content.replace(
    /console\.log\('✅ ([^']+)テスト完了'\)\s*\}\)/g,
    (match, testType) => {
      return `// エラー監視終了とレポート生成
    errorMonitor.finalize()
    
    console.log('✅ ${testType}テスト完了')
  })`
    }
  )
  
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ 更新完了: ${testFile}`)
}

console.log('\n🎉 全ファイルの更新が完了しました！')