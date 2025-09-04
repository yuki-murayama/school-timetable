# 統合型安全API システム

学校時間割管理システムの完全型安全APIドキュメント

## 📋 概要

統合型安全APIシステムは、Zod スキーマベースの厳密な型検証とOpenAPI 3.0.3準拠の自動ドキュメント生成を提供します。

### 🎯 主要機能

- **完全型安全性**: すべてのリクエスト・レスポンスがZodスキーマで検証
- **リアルタイム検証**: ランタイム型チェックによるデータ整合性保証  
- **自動ドキュメント生成**: コードから自動的にAPIドキュメント生成
- **統一エラーハンドリング**: 一貫したエラーレスポンス形式
- **OpenAPI準拠**: Swagger UI による対話式API仕様書

## 🚀 クイックスタート

### API仕様書にアクセス

開発サーバーを起動後、以下のURLにアクセス：

```
# Swagger UI（対話式API仕様書）
http://localhost:8787/api/docs

# OpenAPI仕様書（JSON）
http://localhost:8787/api/spec

# API情報
http://localhost:8787/api/info
```

### フロントエンドでの使用

```typescript
// 統合API クライアントをインポート
import api from '@/lib/api'

// 学校設定を取得（完全型安全）
const settings = await api.schoolSettings.getSettings()
// settings は EnhancedSchoolSettings 型で型安全

// 教師一覧を取得（検索・ページネーション対応）
const teachers = await api.teachers.getTeachers({
  search: '田中',
  grade: 1,
  page: 1,
  limit: 10
})
// teachers は TeachersListResponse 型で型安全

// エラーハンドリング
try {
  const newTeacher = await api.teachers.createTeacher({
    name: '佐藤花子',
    subjects: ['math-001'],
    grades: [1, 2]
  })
} catch (error) {
  if (api.isValidationError(error)) {
    console.log('バリデーションエラー:', error.validationErrors)
  } else {
    console.log('APIエラー:', api.handleError(error))
  }
}
```

## 🏗️ システム構成

### 1. 共有スキーマ (`src/shared/schemas.ts`)

すべてのデータ型定義とバリデーションスキーマ：

```typescript
// プリミティブ型
export const IdSchema = z.string().uuid()
export const NameSchema = z.string().min(1).max(100)
export const GradeSchema = z.number().int().min(1).max(6)

// エンティティ型  
export const SchoolSettingsSchema = z.object({
  grade1Classes: PositiveIntegerSchema.max(20),
  grade2Classes: PositiveIntegerSchema.max(20),
  // ...
})

export const TeacherSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  subjects: z.array(IdSchema).min(1),
  grades: z.array(GradeSchema).min(1),
  // ...
})
```

### 2. OpenAPI ルート (`src/backend/api/routes/`)

各エンドポイントの型安全実装：

```typescript
// ルート定義（自動ドキュメント生成）
const getTeachersRoute = createRoute({
  method: 'get',
  path: '/teachers',
  summary: '教師一覧取得',
  tags: ['教師管理'],
  request: {
    query: TeacherQuerySchema // 自動バリデーション
  },
  responses: createResponseSchemas(TeachersListResponseSchema)
})

// ハンドラー実装（型安全）
app.openapi(getTeachersRoute, async (c) => {
  const query = TeacherQuerySchema.parse(c.req.query()) // 自動検証
  // ... 処理 ...
  return c.json({ success: true, data: teachers })
})
```

### 3. 型安全APIクライアント (`src/frontend/lib/api/`)

フロントエンド用の型安全HTTPクライアント：

```typescript
export const typeSafeApiClient = new TypeSafeApiClient({
  timeout: 30000,
  retryCount: 1,
  debug: import.meta.env.DEV
})

// 完全型安全なHTTPメソッド
async get<TResponse>(
  endpoint: string,
  responseSchema: z.ZodType<TResponse>
): Promise<TResponse>

async post<TRequest, TResponse>(
  endpoint: string,
  data: TRequest,
  requestSchema: z.ZodType<TRequest>,
  responseSchema: z.ZodType<TResponse>
): Promise<TResponse>
```

## 📡 API エンドポイント

### 基本情報

| エンドポイント | 機能 | 説明 |
|---|---|---|
| `GET /api/health` | ヘルスチェック | サーバー・DB接続状況 |
| `GET /api/info` | API情報 | バージョン・環境情報 |
| `GET /api/metrics` | 統計情報 | データ統計・システム情報 |
| `GET /api/docs` | Swagger UI | 対話式API仕様書 |
| `GET /api/spec` | OpenAPI仕様 | JSON形式のAPI仕様 |

### 学校設定

| メソッド | エンドポイント | 機能 |
|---|---|---|
| `GET` | `/api/school/settings` | 学校設定取得 |
| `PUT` | `/api/school/settings` | 学校設定更新 |

### 教師管理

| メソッド | エンドポイント | 機能 |
|---|---|---|
| `GET` | `/api/school/teachers` | 教師一覧取得 |
| `GET` | `/api/school/teachers/{id}` | 教師詳細取得 |
| `POST` | `/api/school/teachers` | 教師作成 |
| `PUT` | `/api/school/teachers/{id}` | 教師更新 |
| `DELETE` | `/api/school/teachers/{id}` | 教師削除 |

## 🔒 認証・セキュリティ

### 認証ヘッダー

すべてのAPIリクエストに以下のヘッダーが必要：

```http
Authorization: Bearer <jwt-token>
X-Requested-With: XMLHttpRequest
X-CSRF-Token: <csrf-token>
Content-Type: application/json
```

### セキュリティ機能

- **CORS対応**: 許可されたオリジンからのアクセスのみ
- **CSRFトークン**: リクエスト偽造攻撃を防止
- **セキュリティヘッダー**: XSS、フレーミング攻撃を防止
- **リクエスト制限**: タイムアウト・リトライ制御

## 📊 エラーハンドリング

### 統一エラーレスポンス形式

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "人間が読める形のエラーメッセージ",
  "details": {
    "validationErrors": [
      {
        "code": "invalid_type",
        "message": "Expected string, received number",
        "path": ["name"]
      }
    ]
  }
}
```

### エラー分類

| エラーコード | HTTPステータス | 説明 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | リクエストデータ形式エラー |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | 権限不足 |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

### フロントエンドでのエラーハンドリング

```typescript
// withApiErrorHandling ヘルパー使用
const safeApiCall = withApiErrorHandling(
  api.teachers.createTeacher
)

const result = await safeApiCall({
  name: '田中太郎',
  subjects: ['math-001'],
  grades: [1, 2]
})

if (result.success) {
  console.log('作成成功:', result.data)
} else {
  console.error('作成失敗:', result.error)
}
```

## 🧪 テストとデバッグ

### 型安全性テスト

```bash
# 型安全性システムの動作確認
npm run test:type-safety
```

### Swagger UIでの動作確認

1. ブラウザで `/api/docs` にアクセス
2. 各エンドポイントを展開
3. 「Try it out」ボタンでリクエスト送信
4. レスポンスの型安全性を確認

### デバッグ情報

```typescript
// 開発環境でのデバッグモード有効化
const client = new TypeSafeApiClient({
  debug: true // リクエスト・レスポンスの詳細ログ出力
})
```

## 🚀 デプロイとパフォーマンス

### 本番環境設定

- **压缩**: 本番環境では美化JSONを無効化
- **ログ**: 本番環境では詳細ログを無効化
- **キャッシュ**: OpenAPI仕様書のブラウザキャッシュ対応
- **CDN**: 静的アセットのCDN配信

### パフォーマンス最適化

- **並列処理**: 独立したAPIコールの並列実行
- **リトライロジック**: 指数バックオフによる堅牢性
- **タイムアウト制御**: 適切なタイムアウト設定
- **結果キャッシュ**: React Query/SWR との連携対応

## 📚 参考資料

- [OpenAPI 3.0.3 仕様](https://spec.openapis.org/oas/v3.0.3)
- [Zod ドキュメント](https://zod.dev/)
- [Hono ドキュメント](https://hono.dev/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

## 🤝 開発への貢献

### 新しいAPIエンドポイントの追加

1. **スキーマ定義**: `src/shared/schemas.ts` に型を追加
2. **ルート実装**: `src/backend/api/routes/` にルートファイル作成
3. **クライアント更新**: `src/frontend/lib/api/` にクライアント追加
4. **ドキュメント更新**: OpenAPIコメントとこのREADMEを更新

### コーディング規約

- **厳密型定義**: すべての型をZodスキーマで定義
- **エラーハンドリング**: 統一フォーマットでエラー処理
- **ドキュメント**: OpenAPIコメントを詳細に記述
- **テスト**: 新機能には型安全性テストを追加

---

📝 **最終更新**: 2025年8月14日
🔧 **バージョン**: 統合版 1.0.0
👥 **開発チーム**: 学校時間割システム開発チーム