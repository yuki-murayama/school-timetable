import { Hono } from 'hono'
import type { Env } from '../../shared/types'
import { TimetableController } from '../controllers/timetableController'

const app = new Hono<{ Bindings: Env }>()
const timetableController = new TimetableController()

// プログラム型時間割生成
app.post('/generate', c => timetableController.generateProgramTimetable(c))

// 生成設定取得
app.get('/config', c => timetableController.getProgramGenerationConfig(c))

// データ変換確認用デバッグエンドポイント
app.get('/debug-data', c => timetableController.getProgramDebugData(c))

// 軽量テスト用エンドポイント
app.get('/quick-test', c => timetableController.runProgramQuickTest(c))

// 制約分析専用エンドポイント（重複しているため一つに統合）
app.get('/constraint-analysis', c => timetableController.runProgramQuickTest(c))

// 教師と教科のID照合テスト
app.get('/test-matching', c => timetableController.testProgramMatching(c))

// 制約チェックのテスト実行
app.post('/validate', c => timetableController.validateProgramTimetable(c))

// 最適化された時間割生成API
app.post('/generate-optimized', c => timetableController.generateProgramTimetable(c))

// 時間割保存API
app.post('/save', c => timetableController.saveProgramTimetable(c))

// 保存済み時間割一覧取得API
app.get('/saved', c => timetableController.getSavedProgramTimetables(c))

// 特定の時間割取得API
app.get('/saved/:id', c => timetableController.getSavedProgramTimetableById(c))

export default app
