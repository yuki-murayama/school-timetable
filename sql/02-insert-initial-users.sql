-- ==============================================
-- 認証システム用初期ユーザーデータ登録
-- ==============================================

-- パスワードハッシュ化について：
-- 本例では簡易的なハッシュを使用していますが、本番環境では適切なハッシュ化アルゴリズム
-- （bcrypt、scrypt、Argon2等）を使用してください

-- 既存データのクリーンアップ（必要に応じて）
-- DELETE FROM user_sessions;
-- DELETE FROM users WHERE email LIKE '%@school.local';

-- ==============================================
-- 管理者ユーザー
-- ==============================================
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  login_attempts,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'admin@school.local',
  -- パスワード: admin123
  -- 実際の本番環境では適切なハッシュ化を行ってください
  'e3afed0047b08059d0fada10f400c1e5',  -- MD5ハッシュ（例）
  '管理者',
  'admin',
  1,
  0,
  datetime('now'),
  datetime('now')
);

-- ==============================================
-- 一般ユーザー（教師）
-- ==============================================
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  login_attempts,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'teacher@school.local',
  -- パスワード: teacher123
  'fde697c4a45ed5b79a97e629e5f66e9e',  -- MD5ハッシュ（例）
  '教師ユーザー',
  'teacher',
  1,
  0,
  datetime('now'),
  datetime('now')
);

-- ==============================================
-- E2Eテスト用ユーザー
-- ==============================================
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  login_attempts,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'test@school.local',
  -- パスワード: test123
  '098f6bcd4621d373cade4e832627b4f6',  -- MD5ハッシュ（例）
  'E2Eテストユーザー',
  'teacher',
  1,
  0,
  datetime('now'),
  datetime('now')
);

-- ==============================================
-- 開発用ユーザー（オプション）
-- ==============================================
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  login_attempts,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  'dev@school.local',
  -- パスワード: dev123
  'ba1f0fcf0c4f1c4e0e4f0c4f1c4e0e4f',  -- MD5ハッシュ（例）
  '開発者ユーザー',
  'admin',
  1,
  0,
  datetime('now'),
  datetime('now')
);

-- ==============================================
-- デモ用ユーザー（オプション）
-- ==============================================
INSERT OR REPLACE INTO users (
  id, 
  email, 
  hashed_password, 
  name, 
  role, 
  is_active, 
  login_attempts,
  created_at, 
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440005',
  'demo@school.local',
  -- パスワード: demo123
  'c93d3bf7a7c4afe94b64e30c2ce39f4f',  -- MD5ハッシュ（例）
  'デモユーザー',
  'teacher',
  1,
  0,
  datetime('now'),
  datetime('now')
);

-- ==============================================
-- 登録確認
-- ==============================================
SELECT 
  id,
  email,
  name,
  role,
  is_active,
  login_attempts,
  created_at
FROM users 
WHERE email LIKE '%@school.local'
ORDER BY role DESC, created_at;

-- 登録されたユーザー数の確認
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
FROM users 
WHERE email LIKE '%@school.local'
GROUP BY role
ORDER BY role;