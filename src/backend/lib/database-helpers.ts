/**
 * データベースヘルパー関数
 * D1データベース直接操作による管理・メンテナンス機能
 */

// データベース統計情報取得
export async function getDatabaseStatistics(db: D1Database) {
  try {
    const stats = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM teachers').first(),
      db.prepare('SELECT COUNT(*) as count FROM subjects').first(),
      db.prepare('SELECT COUNT(*) as count FROM classrooms').first(),
      db.prepare('SELECT COUNT(*) as count FROM school_settings').first(),
    ])

    return {
      totalUsers: 0, // users テーブルは現在使用されていません
      totalSchools: stats[3]?.count || 0,
      totalClasses: 0, // classes テーブルは現在使用されていません
      totalTeachers: stats[0]?.count || 0,
      totalSubjects: stats[1]?.count || 0,
      totalClassrooms: stats[2]?.count || 0,
      totalTimetables: 0, // timetables テーブルは現在使用されていません
      totalSchedules: 0, // schedules テーブルは現在使用されていません
      totalGenerationLogs: 0, // generationLogs テーブルは現在使用されていません
    }
  } catch (error) {
    console.error('Database statistics error:', error)
    return {
      totalUsers: 0,
      totalSchools: 0,
      totalClasses: 0,
      totalTeachers: 0,
      totalSubjects: 0,
      totalClassrooms: 0,
      totalTimetables: 0,
      totalSchedules: 0,
      totalGenerationLogs: 0,
    }
  }
}

// 基本的なデータベースヘルスチェック
export async function checkDatabaseHealth(db: D1Database) {
  try {
    // 主要テーブルの存在確認
    const tables = ['teachers', 'subjects', 'classrooms', 'school_settings']
    const results = []

    for (const table of tables) {
      try {
        const result = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first()
        results.push({ table, count: result?.count || 0, status: 'ok' })
      } catch (error) {
        results.push({ table, count: 0, status: 'error', error: error.message })
      }
    }

    return {
      healthy: results.every(r => r.status === 'ok'),
      tables: results,
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    }
  }
}
