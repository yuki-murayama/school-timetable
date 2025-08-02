# School Timetable Monorepo - 開発環境ガイド

## Claudeへのお願い

- コンソール上に出力する説明は日本語でお願いします。

## 📋 プロジェクト概要

学校時間割管理アプリケーションのモノレポ構成

- **フロントエンド**: React + TypeScript + Vite + Clerk認証
- **バックエンド**: Hono + Cloudflare Workers + D1 Database
- **デプロイ**: 統一されたCloudflare Workersデプロイメント

## 🌐 環境情報

### 🔗 URL

- **本番環境**: https://school-timetable-monorepo.grundhunter.workers.dev
- **Clerk認証**: https://equal-yeti-47.clerk.accounts.dev

### 🗄️ データベース

- **D1 Database**: `school-timetable-db2`
- **Database ID**: `474551c0-3503-4adb-8eb5-71c4fcf42219`

### 🔐 認証情報 (テスト用)

- **テストユーザー**: .env.e2eを参照
- **パスワード**: .env.e2eを参照
- **設定ファイル**: `.env.e2e`

## 📦 主要なコマンド

### 🚀 開発・ビルド・デプロイ

```bash
# 全体の開発サーバー起動
npm run dev

# フロントエンドのみ
npm run dev:frontend

# バックエンドのみ (Wrangler dev)
npm run dev:backend

# ビルド
npm run build

# デプロイ
npm run deploy
```

### 🧪 テスト関連

```bash
# E2Eテスト (全体)
npm run test:e2e

# 認証セットアップのみ
npm run test:e2e:auth

# CRUD操作テスト
npm run test:e2e:crud

# 学校設定のみテスト
npm run test:e2e:school

# UI付きテスト実行
npm run test:e2e:ui

# テスト結果レポート表示
npm run test:e2e:report

# ユニットテスト
npm test
```

### 🗄️ データベース関連

```bash
# データベース初期化 (API経由)
curl -X POST https://school-timetable-monorepo.grundhunter.workers.dev/api/init-db

# Drizzle Studio (ローカル開発時)
npm run db:studio

# スキーマ生成
npm run db:generate

# マイグレーション適用
npm run db:push
```

### 📊 その他のツール

```bash
# コード品質チェック
npm run lint

# コード自動修正
npm run lint:fix

# コードフォーマット
npm run format

# Wrangler tail (ログ確認)
npx wrangler tail --format pretty

# 型生成
npm run cf-typegen
```

## 🏗️ プロジェクト構造

```text
src/
├── frontend/          # React フロントエンドコード
│   ├── components/    # UIコンポーネント
│   ├── lib/          # ユーティリティとAPI
│   └── hooks/        # カスタムフック
├── backend/          # Honoバックエンドコード
│   ├── routes/       # APIルート
│   ├── services/     # ビジネスロジック
│   └── types/        # 型定義
├── shared/           # 共有の型定義
└── worker.ts         # Workersエントリーポイント

tests/
└── e2e/             # E2Eテスト
    ├── auth.setup.ts         # 認証セットアップ
    ├── authenticated-crud.spec.ts  # CRUD操作テスト
    └── utils/        # テストユーティリティ
```

## 🔧 設定ファイル

### 重要な設定ファイル

- `wrangler.toml` - Cloudflare Workers設定
- `playwright.config.ts` - E2Eテスト設定
- `.env.e2e` - E2Eテスト環境変数
- `vite.frontend.config.ts` - フロントエンドビルド設定
- `vite.backend.config.ts` - バックエンドビルド設定

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. データベーステーブルが存在しない

```bash
# 解決: データベース初期化を実行
curl -X POST https://school-timetable-monorepo.grundhunter.workers.dev/api/init-db
```

#### 2. E2Eテストで認証に失敗

```bash
# 解決: 認証セットアップを単独で実行
npm run test:e2e:auth
```

#### 3. デプロイエラー

```bash
# 解決: 明示的にwrangler.tomlを指定
npx wrangler deploy --config ./wrangler.toml
```

#### 4. 依存関係の問題

```bash
# パッケージの再インストール
rm -rf node_modules package-lock.json
npm install
```

## 📝 API エンドポイント

### 主要なAPIエンドポイント

- `GET /api/frontend/school/settings` - 学校設定取得
- `PUT /api/frontend/school/settings` - 学校設定更新
- `GET /api/frontend/school/teachers` - 教師一覧取得
- `POST /api/frontend/school/teachers` - 教師追加
- `GET /api/frontend/school/subjects` - 教科一覧取得
- `POST /api/frontend/school/subjects` - 教科追加
- `GET /api/frontend/school/classrooms` - 教室一覧取得
- `POST /api/frontend/school/classrooms` - 教室追加
- `POST /api/init-db` - データベース初期化

## 🎯 最近の変更・修正事項

### ✅ 完了した修正

1. **データベース問題**: `school_settings`テーブル作成と初期化
2. **API修正**: 学校設定更新の500エラー解決
3. **E2E認証**: Clerk認証フローの自動化実装
4. **CRUD操作**: データ登録画面の読み取り・更新機能確認

### 🔄 進行中/今後の予定

1. モーダルオーバーレイでクリックできない問題の修正
2. 教師・教科・教室の CRUD操作完全テスト
3. パフォーマンス最適化

## 💡 開発のベストプラクティス

1. **コミット前**: `npm run lint:fix` でコード品質を確認
2. **デプロイ前**: `npm run test:e2e` でE2Eテスト実行
3. **API変更後**: データベース初期化が必要な場合がある
4. **認証テスト**: `.env.e2e`の認証情報を最新に保つ
