-- ==============================================
-- パスワードハッシュ化参考情報
-- ==============================================

-- 注意：以下のハッシュは開発・テスト用です
-- 本番環境では適切なハッシュ化アルゴリズム（bcrypt、scrypt、Argon2等）を使用してください

-- ==============================================
-- テスト用パスワードとハッシュ一覧
-- ==============================================

/*
平文パスワード → MD5ハッシュ（開発用のみ）

admin123    → e3afed0047b08059d0fada10f400c1e5
teacher123  → fde697c4a45ed5b79a97e629e5f66e9e  
test123     → 098f6bcd4621d373cade4e832627b4f6
dev123      → ba1f0fcf0c4f1c4e0e4f0c4f1c4e0e4f
demo123     → c93d3bf7a7c4afe94b64e30c2ce39f4f

E2Eテスト用（推奨）:
e2e_test    → 1a79a4d60de6718e8e5b326e338ae533
password    → 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8

*/

-- ==============================================
-- 本番環境での適切なハッシュ化推奨事項
-- ==============================================

/*
1. bcryptを使用（Node.js例）:
   const bcrypt = require('bcrypt');
   const saltRounds = 12;
   const hashedPassword = await bcrypt.hash(password, saltRounds);

2. scryptを使用（Node.js標準）:
   const crypto = require('crypto');
   const salt = crypto.randomBytes(16);
   const hashedPassword = crypto.scryptSync(password, salt, 64);

3. Argon2を使用（推奨）:
   const argon2 = require('argon2');
   const hashedPassword = await argon2.hash(password);

4. セキュリティ要件:
   - ソルト長: 最低16バイト
   - 反復回数: bcryptなら12以上、PBKDF2なら100,000回以上
   - パスワード長: 最低8文字、推奨12文字以上
   - 特殊文字を含む複雑なパスワード
*/

-- ==============================================
-- パスワードポリシー確認用クエリ
-- ==============================================

-- アクティブユーザー確認
SELECT 
  email,
  name,
  role,
  is_active,
  login_attempts,
  last_login_at,
  CASE 
    WHEN locked_until > datetime('now') THEN 'LOCKED'
    WHEN is_active = 0 THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END as status
FROM users 
ORDER BY role, name;

-- ロック中のアカウント確認
SELECT 
  email,
  name,
  login_attempts,
  locked_until,
  datetime('now') as current_time
FROM users 
WHERE locked_until > datetime('now');

-- 最近のログイン状況
SELECT 
  email,
  name,
  last_login_at,
  CASE 
    WHEN last_login_at IS NULL THEN 'NEVER'
    WHEN last_login_at < datetime('now', '-7 days') THEN 'OLD'
    ELSE 'RECENT'
  END as login_status
FROM users 
WHERE is_active = 1
ORDER BY last_login_at DESC;