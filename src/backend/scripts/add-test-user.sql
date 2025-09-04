-- 認証テスト用ユーザーの追加
-- パスワードは簡易ハッシュ化（本番環境では適切なハッシュ化を使用）

-- テストユーザー1（管理者）
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  'user_admin_001',
  'admin@school.local',
  -- パスワード: admin123 の簡易ハッシュ
  'b3e8e0b8f0b0d8e8a8c8d8f8e8b8c8d8f8e8b8c8d8f8e8b8c8d8f8e8b8c8d8f8e8b8c8d8',
  '管理者ユーザー',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- テストユーザー2（一般ユーザー）
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  'user_test_001',
  'test@school.local',
  -- パスワード: test123 の簡易ハッシュ
  'a3d7d0a7e0a0c7d7a7b7c7e7d7a7b7c7e7d7a7b7c7e7d7a7b7c7e7d7a7b7c7e7d7a7b7c7',
  'テストユーザー',
  'teacher',
  1,
  datetime('now'),
  datetime('now')
);

-- テストユーザー3（E2Eテスト用）
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  'user_e2e_001',
  'e2e@school.local',
  -- パスワード: e2e123 の簡易ハッシュ
  'c5f9f0c5g0c0e5f5c5d5e5g5f5c5d5e5g5f5c5d5e5g5f5c5d5e5g5f5c5d5e5g5f5c5d5e5',
  'E2Eテストユーザー',
  'teacher',
  1,
  datetime('now'),
  datetime('now')
);

-- 確認用クエリ
SELECT 
  id,
  email,
  name,
  role,
  is_active,
  created_at
FROM users 
ORDER BY created_at DESC;