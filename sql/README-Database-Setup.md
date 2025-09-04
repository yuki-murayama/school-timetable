# 認証システム用データベースセットアップ手順

## 概要

Clerkから自前認証システムへの移行に伴い、データベースに認証用テーブルと初期ユーザーデータを追加します。

## ファイル構成

```
sql/
├── 01-create-auth-table.sql      # 認証用テーブル作成DDL
├── 02-insert-initial-users.sql   # 初期ユーザーデータ登録
├── 03-password-hash-reference.sql # パスワードハッシュ化参考情報
└── README-Database-Setup.md      # このファイル
```

## 実行手順

### 1. データベース接続

```bash
# Cloudflare D1データベースに接続
npx wrangler d1 execute school-timetable-db2 --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 2. テーブル作成

```bash
# 認証用テーブル作成
npx wrangler d1 execute school-timetable-db2 --file=sql/01-create-auth-table.sql
```

### 3. 初期ユーザーデータ登録

```bash
# 初期ユーザー登録
npx wrangler d1 execute school-timetable-db2 --file=sql/02-insert-initial-users.sql
```

### 4. 登録確認

```bash
# ユーザー登録確認
npx wrangler d1 execute school-timetable-db2 --command="SELECT id, email, name, role, is_active FROM users WHERE email LIKE '%@school.local';"
```

## 作成されるユーザーアカウント

| メールアドレス | パスワード | 役割 | 用途 |
|---|---|---|---|
| admin@school.local | admin123 | admin | 管理者ユーザー |
| teacher@school.local | teacher123 | teacher | 一般教師ユーザー |
| test@school.local | test123 | teacher | E2Eテスト用 |
| dev@school.local | dev123 | admin | 開発者用（オプション） |
| demo@school.local | demo123 | teacher | デモ用（オプション） |

## セキュリティ注意事項

### 🚨 重要：パスワードハッシュ化

現在のSQLファイルでは**開発・テスト用の簡易MD5ハッシュ**を使用しています。

**本番環境では以下を実装してください：**

1. **適切なハッシュ化アルゴリズム**
   - bcrypt（推奨）
   - scrypt
   - Argon2

2. **実装例（Node.js + bcrypt）**
   ```javascript
   const bcrypt = require('bcrypt');
   const saltRounds = 12;
   const hashedPassword = await bcrypt.hash('password', saltRounds);
   ```

3. **パスワードポリシー**
   - 最低8文字（推奨12文字以上）
   - 大文字・小文字・数字・特殊文字を含む
   - 定期的なパスワード変更推奨

### 🔒 セキュリティ機能

作成されるテーブルには以下のセキュリティ機能が含まれています：

- **ログイン試行回数制限** (`login_attempts`)
- **アカウントロック機能** (`locked_until`)
- **セッション管理** (`user_sessions` テーブル)
- **監査ログ** (IPアドレス、ユーザーエージェント)

## トラブルシューティング

### テーブル作成失敗

```bash
# 既存テーブル確認
npx wrangler d1 execute school-timetable-db2 --command="PRAGMA table_info(users);"

# テーブル削除（必要な場合のみ）
npx wrangler d1 execute school-timetable-db2 --command="DROP TABLE IF EXISTS users;"
```

### ユーザー登録失敗

```bash
# 重複ユーザー確認
npx wrangler d1 execute school-timetable-db2 --command="SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;"

# 特定ユーザー削除
npx wrangler d1 execute school-timetable-db2 --command="DELETE FROM users WHERE email = 'test@school.local';"
```

### セッション管理

```bash
# アクティブセッション確認
npx wrangler d1 execute school-timetable-db2 --command="SELECT COUNT(*) as active_sessions FROM user_sessions WHERE expires_at > datetime('now');"

# 期限切れセッション削除
npx wrangler d1 execute school-timetable-db2 --command="DELETE FROM user_sessions WHERE expires_at <= datetime('now');"
```

## 次のステップ

1. **データベース更新完了後**：
   - バックエンド認証API実装
   - フロントエンド認証UI実装
   - Clerk関連コード削除

2. **E2Eテスト更新**：
   - `.env.e2e` ファイル更新
   - 認証テストの修正

3. **セキュリティ強化**：
   - 適切なパスワードハッシュ化実装
   - JWT/セッション管理実装
   - HTTPS通信確認

## 参考情報

- **パスワードハッシュ化**: `sql/03-password-hash-reference.sql`
- **E2E設定例**: `.env.e2e.example`
- **データベース設計**: `src/backend/services/database.ts`