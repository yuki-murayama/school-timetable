-- ==============================================
-- 認証システム用テーブル作成DDL
-- ==============================================

-- 既存のusersテーブルが認証に適した構造かを確認し、必要に応じて作成/修正

-- 1. 既存のusersテーブルを確認
-- SELECT name FROM sqlite_master WHERE type='table' AND name='users';

-- 2. usersテーブルの構造確認
-- PRAGMA table_info(users);

-- 3. 認証用usersテーブル作成（既存テーブルがない場合、または構造が不適切な場合）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                                    -- ユーザーID（UUID形式推奨）
  email TEXT NOT NULL UNIQUE,                            -- メールアドレス（ログインID）
  hashed_password TEXT NOT NULL,                         -- ハッシュ化パスワード
  name TEXT NOT NULL,                                    -- ユーザー名
  role TEXT DEFAULT 'teacher' NOT NULL,                 -- ユーザー役割（admin/teacher/user）
  is_active INTEGER DEFAULT 1 NOT NULL,                 -- アクティブフラグ（1:有効、0:無効）
  last_login_at DATETIME,                               -- 最終ログイン日時
  login_attempts INTEGER DEFAULT 0,                     -- ログイン試行回数（セキュリティ用）
  locked_until DATETIME,                                -- アカウントロック解除日時
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,        -- 作成日時
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP         -- 更新日時
);

-- 4. インデックス作成（認証パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 5. セッション管理テーブル作成（オプション：より高度な認証が必要な場合）
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,                                    -- セッションID（UUID）
  user_id TEXT NOT NULL,                                 -- ユーザーID
  token TEXT NOT NULL UNIQUE,                           -- セッショントークン
  expires_at DATETIME NOT NULL,                         -- 有効期限
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,        -- 作成日時
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最終アクセス日時
  ip_address TEXT,                                       -- IPアドレス（ログ用）
  user_agent TEXT,                                       -- ユーザーエージェント（ログ用）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. セッションテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- 7. テーブル作成完了確認
SELECT 
  'users' as table_name, 
  COUNT(*) as exists_flag 
FROM sqlite_master 
WHERE type='table' AND name='users'
UNION ALL
SELECT 
  'user_sessions' as table_name, 
  COUNT(*) as exists_flag 
FROM sqlite_master 
WHERE type='table' AND name='user_sessions';

-- 8. テーブル構造確認
PRAGMA table_info(users);
PRAGMA table_info(user_sessions);