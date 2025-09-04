# School Timetable Monorepo - 開発環境ガイド

## Claudeへのお願い

- コンソール上に出力する説明は日本語でお願いします。

## 📋 プロジェクト概要

学校時間割管理アプリケーションのモノレポ構成

- **フロントエンド**: React + TypeScript + Vite + 自前JWT認証
- **バックエンド**: Hono + Cloudflare Workers + D1 Database
- **デプロイ**: 統一されたCloudflare Workersデプロイメント

## 🌐 環境情報

### 🔗 URL

- **本番環境**: https://school-timetable-monorepo.grundhunter.workers.dev
- **認証システム**: 自前JWT認証（ローカルDB管理）

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
# E2Eテスト (全体) - 10分タイムアウト推奨
npm run test:e2e

# E2Eテスト (全体) - 10分タイムアウト設定
timeout 600 npm run test:e2e

# 認証セットアップのみ
npm run test:e2e:auth

# CRUD操作テスト
npm run test:e2e:crud

# 学校設定のみテスト
npm run test:e2e:school

# 時間割生成機能テスト
npx playwright test timetable-generation.spec.ts

# 時間割参照機能テスト（実データ）
npx playwright test timetable-reference-real.spec.ts

# 完全ワークフローテスト
npx playwright test complete-workflow.spec.ts

# UI付きテスト実行
npm run test:e2e:ui

# テスト結果レポート表示
npm run test:e2e:report

# ユニットテスト
npm test

# 本番環境テスト（基本疎通確認のみ - 3テスト）
npm run test:e2e:production

# 🚨 本番環境全量テスト（全27テスト + クロスブラウザ）
# ⚠️ 注意：サービスイン前・メンテナンス時のみ使用
npm run test:e2e:production-full

# 本番環境全量テスト（Chrome認証済み）- 主要テスト
npm run test:e2e:production-full:chrome

# 本番環境全量テスト（Firefox）- 主要テストのみ
npm run test:e2e:production-full:firefox

# 本番環境全量テスト（クロスブラウザ）- Chrome + Firefox + Edge
npm run test:e2e:production-full:cross-browser

# 本番環境全量テスト（モバイル）- レスポンシブ確認
npm run test:e2e:production-full:mobile

# 本番環境全量テスト（API専用）- 認証なしAPIテスト
npm run test:e2e:production-full:api

# 本番環境全量テスト結果レポート表示
npm run test:e2e:production-full:report
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
    ├── auth.setup.ts                    # 認証セットアップ
    ├── authenticated-crud.spec.ts       # CRUD操作テスト
    ├── timetable-generation.spec.ts     # 時間割生成機能テスト
    ├── timetable-reference-real.spec.ts # 時間割参照機能テスト（実データ）
    ├── complete-workflow.spec.ts        # 完全ワークフローテスト
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

### ✨ 統合API（推奨）

**完全型安全・自動ドキュメント生成システム**

- **Swagger UI**: `http://localhost:8787/api/docs` - 対話式API仕様書
- **OpenAPI仕様**: `http://localhost:8787/api/spec` - JSON形式のAPI仕様
- **API情報**: `http://localhost:8787/api/info` - システム情報
- **ヘルスチェック**: `http://localhost:8787/api/health` - サーバー状況

#### 型安全APIエンドポイント

**学校設定**:
- `GET /api/school/settings` - 学校設定取得（拡張プロパティ付き）
- `PUT /api/school/settings` - 学校設定更新（厳密バリデーション）

**教師管理**:
- `GET /api/school/teachers` - 教師一覧（検索・フィルタ・ページネーション）
- `GET /api/school/teachers/{id}` - 教師詳細取得
- `POST /api/school/teachers` - 教師作成（Zod検証）
- `PUT /api/school/teachers/{id}` - 教師更新（部分更新対応）
- `DELETE /api/school/teachers/{id}` - 教師削除

#### フロントエンド実装例

```typescript
import api from '@/lib/api/v2'

// 型安全な学校設定取得
const settings = await apiV2.schoolSettings.getSettings()
// settings は EnhancedSchoolSettings 型で完全型安全

// 型安全な教師検索
const teachers = await apiV2.teachers.getTeachers({
  search: '田中',
  grade: 1,
  page: 1,
  limit: 10
})

// エラーハンドリング
if (apiV2.isValidationError(error)) {
  console.log('バリデーションエラー:', error.validationErrors)
}
```

### 📚 レガシーAPIエンドポイント（v1）

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
3. **E2E認証**: 自前認証システムの自動化実装
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

## 🚨 本番環境テスト戦略

### 基本テスト（通常時）- 3テスト
```bash
npm run test:e2e:production
```
- API疎通確認
- 認証システム確認  
- データベース接続確認
- **実行時間**: 約5分

### 全量テスト（特殊時のみ）- 27テスト + クロスブラウザ
```bash
npm run test:e2e:production-full
```

#### 使用条件
- **サービスイン前**: 最終動作確認
- **メンテナンス時**: 全機能動作確認
- **大規模アップデート後**: 完全リグレッションテスト
- **クロスブラウザ対応確認時**: 複数ブラウザでの動作検証

#### 実行時間目安
- **Chrome認証済み**: 約45分（全テスト）
- **Firefox主要テスト**: 約15分（重要テストのみ）
- **クロスブラウザ**: 約1.5時間（Chrome + Firefox + Edge）
- **モバイル**: 約30分（レスポンシブテスト）
- **API専用**: 約10分（認証なしAPI）

#### 注意事項
- **統一テストデータ管理システム使用**: 本番データに影響なし
- **Cloudflare Workers使用量**: 通常より多くなります
- **実行推奨時間**: メンテナンス時間帯
- **結果確認**: `npm run test:e2e:production-full:report`

## 🤖 Playwright MCP テストルール

### 削除機能テスト時の重要なルール

**⚠️ 必須ルール**: Playwright MCPで教師・教科・教室の削除機能をテストする際は、必ず**削除専用のテストデータ**を作成してからテストを実行すること。

#### 削除テスト手順

1. **削除専用データ作成**:
   ```
   テスト教師名: "削除テスト用教師_YYYY-MM-DD_HH-mm-ss"
   テスト教科名: "削除テスト用教科_YYYY-MM-DD_HH-mm-ss"  
   テスト教室名: "削除テスト用教室_YYYY-MM-DD_HH-mm-ss"
   ```

2. **作成→削除の流れ**:
   - データ登録画面で削除専用のテストデータを作成
   - 作成確認後、削除操作を実行
   - 削除確認とクリーンアップ

3. **既存データを絶対に削除しない**:
   - 本番で使用中の教師・教科・教室データは削除禁止
   - 時間割生成テストに必要なデータも削除禁止
   - テスト用データのみを対象とする

#### 理由

- 削除テストが時間割生成テストに影響するのを防ぐため
- 既存の本番データを保護するため
- テスト間の干渉を避けるため

#### 実装例

```javascript
// 削除テスト用の一意なデータを作成
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testTeacherName = `削除テスト用教師_${timestamp}`;

// 1. テストデータ作成
await page.fill('input[name="name"]', testTeacherName);
await page.click('button:has-text("追加")');

// 2. 削除実行
const testRow = page.locator(`tr:has-text("${testTeacherName}")`);
await testRow.locator('button[aria-label*="delete"]').click();
```

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
