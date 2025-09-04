// E2Eテスト用のユーザー認証情報
export const E2E_TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@school.local',
  password: process.env.TEST_USER_PASSWORD || 'password123'
}

// 管理者テストユーザー
export const E2E_ADMIN_USER = {
  email: process.env.ADMIN_USER_EMAIL || 'admin@school.local',
  password: process.env.ADMIN_USER_PASSWORD || 'admin123'
}

// 教師テストユーザー
export const E2E_TEACHER_USER = {
  email: process.env.TEACHER_USER_EMAIL || 'teacher@school.local',
  password: process.env.TEACHER_USER_PASSWORD || 'teacher123'
}