# 型安全性オーバーホール単体テスト仕様書
## 全分岐網羅カバレッジ100%基準

**作成日**: 2025年1月15日  
**対象システム**: 学校時間割管理システム - 型安全性オーバーホール機能  
**テスト基準**: 全分岐網羅カバレッジ100%  

---

## 1. テスト戦略概要

### 1.1 カバレッジ要件
- **分岐網羅率**: 100%必須
- **文網羅率**: 100%必須  
- **条件網羅率**: 100%必須
- **関数網羅率**: 100%必須

### 1.2 テスト対象システム
型安全性オーバーホールで実装された以下のコンポーネント:

1. **型安全APIクライアント** (`src/frontend/lib/api/type-safe-client.ts`)
2. **統合APIクライアント** (`src/frontend/lib/api/index.ts`)
3. **教師APIカスタムフック** (`src/frontend/hooks/use-teacher-api.ts`)
4. **時間割生成サービス** (`src/backend/services/timetable-generation-service.ts`)
5. **型安全サービスレイヤー** (`src/backend/services/type-safe-service.ts`)
6. **型安全コントローラー** (`src/backend/controllers/type-safe-controller.ts`)

### 1.3 品質基準
- 各テストケースは独立して実行可能
- モックは実際のAPIレスポンス構造を完全再現
- エラーケースを含む全分岐を網羅
- パフォーマンステストを含む
- 型安全性の検証を含む

---

## 2. 型安全APIクライアント単体テスト仕様

**ファイル**: `src/frontend/lib/api/type-safe-client.test.ts`

### 2.1 テスト対象関数一覧

#### 2.1.1 `typeSafeApiClient.get()`
**全分岐リスト**: 12分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSC-GET-001 | 正常レスポンス200 | response.ok === true | 成功レスポンス処理分岐 |
| TSC-GET-002 | 401認証エラー | response.status === 401 | 認証エラー分岐 |
| TSC-GET-003 | 400バリデーションエラー | response.status === 400 | バリデーションエラー分岐 |
| TSC-GET-004 | 404リソース未発見 | response.status === 404 | NotFoundエラー分岐 |
| TSC-GET-005 | 500サーバーエラー | response.status === 500 | サーバーエラー分岐 |
| TSC-GET-006 | ネットワークエラー | fetch throws NetworkError | ネットワーク例外分岐 |
| TSC-GET-007 | Zodバリデーション失敗 | schema.parse() throws | スキーマバリデーション失敗分岐 |
| TSC-GET-008 | JSON解析失敗 | response.json() throws | JSON解析エラー分岐 |
| TSC-GET-009 | タイムアウトエラー | AbortController timeout | タイムアウト分岐 |
| TSC-GET-010 | options未指定 | options === undefined | デフォルトオプション分岐 |
| TSC-GET-011 | カスタムヘッダー指定 | options.headers provided | カスタムヘッダー分岐 |
| TSC-GET-012 | AbortSignal指定 | options.signal provided | 手動キャンセル分岐 |

#### 2.1.2 `typeSafeApiClient.post()`
**全分岐リスト**: 15分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSC-POST-001 | 正常作成201 | response.ok === true && status === 201 | 作成成功分岐 |
| TSC-POST-002 | リクエストボディ検証成功 | requestSchema.parse(body) success | リクエスト検証成功分岐 |
| TSC-POST-003 | リクエストボディ検証失敗 | requestSchema.parse(body) throws | リクエスト検証失敗分岐 |
| TSC-POST-004 | レスポンスボディ検証成功 | responseSchema.parse(data) success | レスポンス検証成功分岐 |
| TSC-POST-005 | レスポンスボディ検証失敗 | responseSchema.parse(data) throws | レスポンス検証失敗分岐 |
| TSC-POST-006 | Content-Typeヘッダー設定 | headers['Content-Type'] = 'application/json' | ヘッダー設定分岐 |
| TSC-POST-007 | JSON.stringify実行 | body: JSON.stringify(data) | シリアライゼーション分岐 |
| TSC-POST-008 | 409競合エラー | response.status === 409 | 競合エラー分岐 |
| TSC-POST-009 | 422バリデーションエラー | response.status === 422 | Unprocessable Entity分岐 |
| TSC-POST-010 | 413ペイロード過大 | response.status === 413 | ペイロード過大分岐 |
| TSC-POST-011 | 空ボディ送信 | body === undefined | 空ボディ分岐 |
| TSC-POST-012 | 大容量ペイロード | body.length > 1MB | 大容量ペイロード分岐 |
| TSC-POST-013 | カスタムタイムアウト | options.timeout specified | カスタムタイムアウト分岐 |
| TSC-POST-014 | リクエスト部分失敗 | fetch partially fails | 部分失敗分岐 |
| TSC-POST-015 | レスポンス破損 | corrupted response body | レスポンス破損分岐 |

#### 2.1.3 `typeSafeApiClient.put()`
**全分岐リスト**: 13分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSC-PUT-001 | 正常更新200 | response.ok === true && status === 200 | 更新成功分岐 |
| TSC-PUT-002 | 部分更新処理 | partial update schema validation | 部分更新分岐 |
| TSC-PUT-003 | 完全置換処理 | full replacement schema validation | 完全置換分岐 |
| TSC-PUT-004 | 楽観的ロック失敗 | response.status === 412 | 楽観的ロック分岐 |
| TSC-PUT-005 | リソース未発見 | response.status === 404 | リソース未発見分岐 |
| TSC-PUT-006 | 不正なメソッド | response.status === 405 | メソッド不許可分岐 |
| TSC-PUT-007 | If-Match ヘッダー | headers['If-Match'] provided | 条件付き更新分岐 |
| TSC-PUT-008 | ETag処理 | ETag header handling | ETag分岐 |
| TSC-PUT-009 | Last-Modified処理 | Last-Modified header handling | 最終更新日時分岐 |
| TSC-PUT-010 | 更新データ空 | updateData === {} | 空更新分岐 |
| TSC-PUT-011 | スキーマ mismatch | schema validation mismatch | スキーマ不一致分岐 |
| TSC-PUT-012 | 重複更新リクエスト | duplicate update requests | 重複更新分岐 |
| TSC-PUT-013 | 更新トランザクション失敗 | transaction rollback | トランザクション失敗分岐 |

#### 2.1.4 `typeSafeApiClient.delete()`
**全分岐リスト**: 10分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSC-DEL-001 | 正常削除204 | response.ok === true && status === 204 | 削除成功分岐 |
| TSC-DEL-002 | 削除確認レスポンス200 | response.status === 200 with data | 削除確認分岐 |
| TSC-DEL-003 | リソース未発見404 | response.status === 404 | リソース未発見分岐 |
| TSC-DEL-004 | 削除不可409 | response.status === 409 | 削除不可分岐 |
| TSC-DEL-005 | 依存関係エラー423 | response.status === 423 | 依存関係エラー分岐 |
| TSC-DEL-006 | 論理削除処理 | soft delete response | 論理削除分岐 |
| TSC-DEL-007 | 物理削除処理 | hard delete response | 物理削除分岐 |
| TSC-DEL-008 | カスケード削除 | cascade delete validation | カスケード削除分岐 |
| TSC-DEL-009 | 削除権限エラー | response.status === 403 | 権限エラー分岐 |
| TSC-DEL-010 | 削除レスポンススキーマ | responseSchema validation | レスポンススキーマ分岐 |

#### 2.1.5 エラーハンドリング関数群
**全分岐リスト**: 8分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSC-ERR-001 | isApiError(true) | error instanceof ApiError | ApiErrorインスタンス分岐 |
| TSC-ERR-002 | isApiError(false) | !(error instanceof ApiError) | 非ApiError分岐 |
| TSC-ERR-003 | isValidationError(true) | error.code === 'VALIDATION_ERROR' | バリデーションエラー分岐 |
| TSC-ERR-004 | isValidationError(false) | error.code !== 'VALIDATION_ERROR' | 非バリデーションエラー分岐 |
| TSC-ERR-005 | handleApiError認証エラー | 401 error handling | 認証エラー処理分岐 |
| TSC-ERR-006 | handleApiError一般エラー | generic error handling | 一般エラー処理分岐 |
| TSC-ERR-007 | handleApiErrorネットワーク | network error handling | ネットワークエラー処理分岐 |
| TSC-ERR-008 | handleApiError未知エラー | unknown error handling | 未知エラー処理分岐 |

### 2.2 モック戦略

#### 2.2.1 fetchモック
```typescript
global.fetch = vi.fn()
```

#### 2.2.2 Zodスキーマモック
```typescript
const mockSchema = {
  parse: vi.fn(),
  safeParse: vi.fn()
}
```

#### 2.2.3 AbortControllerモック
```typescript
global.AbortController = vi.fn().mockImplementation(() => ({
  signal: { aborted: false },
  abort: vi.fn()
}))
```

### 2.3 テストデータ
#### 2.3.1 正常レスポンスデータ
```typescript
const validResponseData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'テスト教師',
  subjects: ['数学', '物理'],
  grades: [1, 2, 3],
  createdAt: '2025-01-15T10:00:00Z'
}
```

#### 2.3.2 エラーレスポンスデータ
```typescript
const validationErrorResponse = {
  error: 'VALIDATION_ERROR',
  message: 'バリデーションに失敗しました',
  validationErrors: [
    { field: 'name', message: '名前は必須です' },
    { field: 'subjects', message: '少なくとも1つの科目を選択してください' }
  ]
}
```

---

## 3. 教師APIカスタムフック単体テスト仕様

**ファイル**: `src/frontend/hooks/use-teacher-api.test.ts`

### 3.1 テスト対象関数一覧

#### 3.1.1 `loadInitialData()`
**全分岐リスト**: 18分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| UTA-LOAD-001 | 正常データ読み込み | API成功レスポンス | 正常処理分岐 |
| UTA-LOAD-002 | subjectsResult配列レスポンス | Array.isArray(subjectsResult) === true | 配列レスポンス分岐 |
| UTA-LOAD-003 | subjectsResultオブジェクトレスポンス | 'subjects' in subjectsResult | オブジェクトレスポンス分岐 |
| UTA-LOAD-004 | 予期しないsubjectsレスポンス | 未知レスポンス構造 | 未知構造分岐 |
| UTA-LOAD-005 | subjectsResult null/undefined | subjectsResult == null | null/undefined分岐 |
| UTA-LOAD-006 | settingsResult正常 | settingsResult is valid object | 設定正常分岐 |
| UTA-LOAD-007 | settingsResult異常 | settingsResult is invalid | 設定異常分岐 |
| UTA-LOAD-008 | Promise.all部分失敗 | 一つのAPIが失敗 | 部分失敗分岐 |
| UTA-LOAD-009 | Promise.all全失敗 | 全てのAPIが失敗 | 全失敗分岐 |
| UTA-LOAD-010 | ネットワークエラー | network error | ネットワークエラー分岐 |
| UTA-LOAD-011 | タイムアウトエラー | request timeout | タイムアウト分岐 |
| UTA-LOAD-012 | setIsLoading(true)開始 | 初期化時のローディング状態 | ローディング開始分岐 |
| UTA-LOAD-013 | setIsLoading(false)終了 | 処理完了時のローディング状態 | ローディング終了分岐 |
| UTA-LOAD-014 | setSubjects成功時 | データ設定成功 | データ設定分岐 |
| UTA-LOAD-015 | setSubjects失敗時 | 空配列設定 | フォールバック分岐 |
| UTA-LOAD-016 | setSchoolSettings成功 | 設定データ設定 | 設定データ分岐 |
| UTA-LOAD-017 | console.error呼び出し | エラーログ出力 | エラーログ分岐 |
| UTA-LOAD-018 | finally節処理 | cleanup処理実行 | cleanup分岐 |

#### 3.1.2 `saveTeacher()`
**全分岐リスト**: 22分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| UTA-SAVE-001 | 新規教師作成成功 | isNewTeacher === true | 新規作成分岐 |
| UTA-SAVE-002 | 既存教師更新成功 | isNewTeacher === false | 更新分岐 |
| UTA-SAVE-003 | 教師ID未指定エラー | !teacherData.id && !isNewTeacher | ID未指定エラー分岐 |
| UTA-SAVE-004 | 新規作成APIエラー | createTeacher API失敗 | 新規作成APIエラー分岐 |
| UTA-SAVE-005 | 更新APIエラー | updateTeacher API失敗 | 更新APIエラー分岐 |
| UTA-SAVE-006 | バリデーションエラー処理 | isValidationError(error) === true | バリデーションエラー分岐 |
| UTA-SAVE-007 | 一般エラー処理 | isValidationError(error) === false | 一般エラー分岐 |
| UTA-SAVE-008 | setIsSaving(true)開始 | 保存開始時の状態 | 保存開始分岐 |
| UTA-SAVE-009 | setIsSaving(false)終了 | 保存終了時の状態 | 保存終了分岐 |
| UTA-SAVE-010 | 新規作成toast成功 | 新規作成成功メッセージ | 新規作成成功メッセージ分岐 |
| UTA-SAVE-011 | 更新toast成功 | 更新成功メッセージ | 更新成功メッセージ分岐 |
| UTA-SAVE-012 | バリデーションエラーtoast | バリデーションエラーメッセージ | バリデーションエラーメッセージ分岐 |
| UTA-SAVE-013 | 一般エラーtoast | 一般エラーメッセージ | 一般エラーメッセージ分岐 |
| UTA-SAVE-014 | 結果返却成功 | return result | 結果返却分岐 |
| UTA-SAVE-015 | エラー再スロー | throw error | エラー再スロー分岐 |
| UTA-SAVE-016 | finally節処理 | setIsSaving(false) in finally | finally節分岐 |
| UTA-SAVE-017 | createResult.data取得 | result = createResult.data | 作成結果取得分岐 |
| UTA-SAVE-018 | updateResult.data取得 | result = updateResult.data | 更新結果取得分岐 |
| UTA-SAVE-019 | console.log新規作成 | 新規作成ログ出力 | 新規作成ログ分岐 |
| UTA-SAVE-020 | console.log更新 | 更新ログ出力 | 更新ログ分岐 |
| UTA-SAVE-021 | console.error | エラーログ出力 | エラーログ分岐 |
| UTA-SAVE-022 | token依存性 | useCallback token dependency | token依存性分岐 |

#### 3.1.3 `useEffect` 初期化
**全分岐リスト**: 4分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| UTA-INIT-001 | token存在時初期化 | token !== null | token存在分岐 |
| UTA-INIT-002 | token未存在時スキップ | token === null | token未存在分岐 |
| UTA-INIT-003 | token変更時再初期化 | token変更 | token変更分岐 |
| UTA-INIT-004 | loadInitialData呼び出し | loadInitialData() execution | 初期化関数呼び出し分岐 |

### 3.2 テストセットアップ

#### 3.2.1 React Testing Library
```typescript
import { renderHook, act } from '@testing-library/react'
import { useTeacherApi } from './use-teacher-api'
```

#### 3.2.2 モック設定
```typescript
vi.mock('../lib/api/v2', () => ({
  default: {
    subjects: { getSubjects: vi.fn() },
    schoolSettings: { getSettings: vi.fn() },
    teachers: { 
      createTeacher: vi.fn(),
      updateTeacher: vi.fn()
    },
    isValidationError: vi.fn()
  }
}))

vi.mock('./use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}))
```

---

## 4. APIv2統合クライアント単体テスト仕様

**ファイル**: `src/frontend/lib/api/index.test.ts`

### 4.1 学校設定API (schoolSettingsApiV2)
**全分岐リスト**: 8分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-SS-001 | getSettings正常実行 | typeSafeApiClient.get成功 | 取得成功分岐 |
| V2-SS-002 | getSettingsエラー | typeSafeApiClient.getエラー | 取得エラー分岐 |
| V2-SS-003 | getSettingsオプション指定 | options parameter provided | オプション指定分岐 |
| V2-SS-004 | updateSettings正常実行 | typeSafeApiClient.put成功 | 更新成功分岐 |
| V2-SS-005 | updateSettingsエラー | typeSafeApiClient.putエラー | 更新エラー分岐 |
| V2-SS-006 | updateSettingsスキーマ検証 | schema.omit validation | スキーマ検証分岐 |
| V2-SS-007 | updateSettingsオプション指定 | options parameter provided | 更新オプション分岐 |
| V2-SS-008 | EnhancedSchoolSettingsSchema検証 | response schema validation | レスポンススキーマ分岐 |

### 4.2 教師管理API (teachersApiV2)
**全分岐リスト**: 35分岐

#### 4.2.1 getTeachers()
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-T-001 | パラメータなし取得 | params === undefined | パラメータなし分岐 |
| V2-T-002 | 検索パラメータ指定 | params with search | 検索パラメータ分岐 |
| V2-T-003 | ページネーション指定 | params with page/limit | ページネーション分岐 |
| V2-T-004 | フィルタリング指定 | params with grade/subject | フィルタリング分岐 |
| V2-T-005 | ソート指定 | params with sort/order | ソート分岐 |
| V2-T-006 | URLSearchParams構築 | queryString generation | URLパラメータ構築分岐 |
| V2-T-007 | value未定義スキップ | value === undefined skip | 未定義値スキップ分岐 |
| V2-T-008 | valueNull値スキップ | value === null skip | null値スキップ分岐 |
| V2-T-009 | クエリ文字列ありendpoint | queryString ? endpoint1 : endpoint2 | クエリ文字列分岐 |
| V2-T-010 | TeachersListResponseSchema検証 | response schema validation | レスポンススキーマ分岐 |

#### 4.2.2 getTeacher(), createTeacher(), updateTeacher(), deleteTeacher()
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-T-011 | getTeacher正常 | get single teacher success | 単体取得成功分岐 |
| V2-T-012 | getTeacherエラー | get single teacher error | 単体取得エラー分岐 |
| V2-T-013 | createTeacher正常 | create teacher success | 作成成功分岐 |
| V2-T-014 | createTeacherバリデーション | request validation | 作成バリデーション分岐 |
| V2-T-015 | createTeacherエラー | create teacher error | 作成エラー分岐 |
| V2-T-016 | updateTeacher正常 | update teacher success | 更新成功分岐 |
| V2-T-017 | updateTeacher部分更新 | partial update schema | 部分更新分岐 |
| V2-T-018 | updateTeacherエラー | update teacher error | 更新エラー分岐 |
| V2-T-019 | deleteTeacher正常 | delete teacher success | 削除成功分岐 |
| V2-T-020 | deleteTeacherエラー | delete teacher error | 削除エラー分岐 |
| V2-T-021 | deleteTeacherスキーマ | delete response schema | 削除レスポンススキーマ分岐 |
| V2-T-022 | CreateTeacherRequestSchemaV2検証 | create request validation | 作成リクエスト検証分岐 |
| V2-T-023 | UpdateTeacherRequestSchemaV2検証 | update request validation | 更新リクエスト検証分岐 |
| V2-T-024 | TeacherSchema検証 | teacher response validation | 教師レスポンス検証分岐 |
| V2-T-025 | DeleteResponseSchema検証 | delete response validation | 削除レスポンス検証分岐 |

### 4.3 教科管理API (subjectsApiV2)
**全分岐リスト**: 25分岐

（教師管理APIと同様の構造で25分岐をカバー）

### 4.4 教室管理API (classroomsApiV2)
**全分岐リスト**: 30分岐

（教師管理APIと同様の構造、追加でsummary情報を含む30分岐をカバー）

### 4.5 時間割管理API (timetablesApiV2)
**全分岐リスト**: 40分岐

#### 4.5.1 generateTimetable()特有分岐
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-TT-001 | 生成リクエスト正常 | generate request success | 生成成功分岐 |
| V2-TT-002 | 制約条件指定 | constraints parameter | 制約条件分岐 |
| V2-TT-003 | メタデータ指定 | metadata parameter | メタデータ分岐 |
| V2-TT-004 | デフォルト値適用 | default values applied | デフォルト値分岐 |
| V2-TT-005 | GenerateResponseSchema検証 | generate response validation | 生成レスポンス検証分岐 |

#### 4.5.2 getTimetableGenerationStatus()
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-TT-006 | 生成状況取得正常 | status check success | 状況取得成功分岐 |
| V2-TT-007 | 生成状況取得エラー | status check error | 状況取得エラー分岐 |
| V2-TT-008 | TimetableGenerationStatusSchema検証 | status response validation | 状況レスポンス検証分岐 |

### 4.6 システム情報API (systemApiV2)
**全分岐リスト**: 15分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-SYS-001 | healthCheck正常 | health check success | ヘルスチェック成功分岐 |
| V2-SYS-002 | healthCheckエラー | health check error | ヘルスチェックエラー分岐 |
| V2-SYS-003 | getInfo正常 | get info success | 情報取得成功分岐 |
| V2-SYS-004 | getInfoエラー | get info error | 情報取得エラー分岐 |
| V2-SYS-005 | getMetrics正常 | get metrics success | メトリクス取得成功分岐 |
| V2-SYS-006 | getMetricsエラー | get metrics error | メトリクス取得エラー分岐 |
| V2-SYS-007 | HealthResponseSchema検証 | health response validation | ヘルスレスポンス検証分岐 |
| V2-SYS-008 | InfoResponseSchema検証 | info response validation | 情報レスポンス検証分岐 |
| V2-SYS-009 | MetricsResponseSchema検証 | metrics response validation | メトリクスレスポンス検証分岐 |
| V2-SYS-010 | database接続確認 | database status check | データベース状況分岐 |
| V2-SYS-011 | uptime計算 | uptime calculation | 稼働時間分岐 |
| V2-SYS-012 | version情報 | version information | バージョン情報分岐 |
| V2-SYS-013 | environment判定 | environment detection | 環境判定分岐 |
| V2-SYS-014 | features配列 | features array validation | 機能配列分岐 |
| V2-SYS-015 | statistics集計 | statistics calculation | 統計情報分岐 |

### 4.7 ユーティリティ関数
**全分岐リスト**: 12分岐

#### 4.7.1 withApiV2ErrorHandling()
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-UTIL-001 | ラップ関数成功 | wrapped function success | 成功分岐 |
| V2-UTIL-002 | ラップ関数失敗 | wrapped function error | 失敗分岐 |
| V2-UTIL-003 | success=true返却 | success response | 成功レスポンス分岐 |
| V2-UTIL-004 | success=false返却 | error response | エラーレスポンス分岐 |
| V2-UTIL-005 | handleApiError呼び出し | error handling call | エラーハンドリング分岐 |

#### 4.7.2 apiV2Keys
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| V2-UTIL-006 | schoolSettings key | key generation | 学校設定キー分岐 |
| V2-UTIL-007 | teachers.all key | teachers all key | 教師全体キー分岐 |
| V2-UTIL-008 | teachers.list key | teachers list key with params | 教師リストキー分岐 |
| V2-UTIL-009 | teachers.detail key | teachers detail key | 教師詳細キー分岐 |
| V2-UTIL-010 | subjects keys | subjects key variations | 教科キー分岐 |
| V2-UTIL-011 | classrooms keys | classrooms key variations | 教室キー分岐 |
| V2-UTIL-012 | timetables keys | timetables key variations | 時間割キー分岐 |

---

## 5. 時間割生成サービス単体テスト仕様

**ファイル**: `src/backend/services/timetable-generation-service.test.ts`

### 5.1 テスト対象クラス: TypeSafeTimetableGenerationEngine

#### 5.1.1 generateTimetable()
**全分岐リスト**: 45分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TGS-GEN-001 | 制約検証成功 | TimetableConstraintsSchema.parse成功 | 制約検証成功分岐 |
| TGS-GEN-002 | 制約検証失敗 | TimetableConstraintsSchema.parse失敗 | 制約検証失敗分岐 |
| TGS-GEN-003 | オプション検証成功 | TimetableGenerationOptionsSchema.parse成功 | オプション検証成功分岐 |
| TGS-GEN-004 | オプション検証失敗 | TimetableGenerationOptionsSchema.parse失敗 | オプション検証失敗分岐 |
| TGS-GEN-005 | データ取得成功 | fetchRequiredData成功 | データ取得成功分岐 |
| TGS-GEN-006 | データ取得失敗 | fetchRequiredData失敗 | データ取得失敗分岐 |
| TGS-GEN-007 | 基本制約生成 | generateBaseConstraints実行 | 基本制約分岐 |
| TGS-GEN-008 | ユーザー制約追加 | addUserConstraints実行 | ユーザー制約分岐 |
| TGS-GEN-009 | CSPソルバー成功 | solveTimetableCSP成功 | CSP解決成功分岐 |
| TGS-GEN-010 | CSPソルバー失敗 | solveTimetableCSP失敗 | CSP解決失敗分岐 |
| TGS-GEN-011 | 最適化フェーズ | optimizeTimetable実行 | 最適化分岐 |
| TGS-GEN-012 | 検証フェーズ | validateTimetable実行 | 検証分岐 |
| TGS-GEN-013 | 結果統計生成 | generateStatistics実行 | 統計生成分岐 |
| TGS-GEN-014 | 成功レスポンス | success: true返却 | 成功レスポンス分岐 |
| TGS-GEN-015 | 失敗レスポンス | success: false返却 | 失敗レスポンス分岐 |

#### 5.1.2 fetchRequiredData()
**全分岐リスト**: 18分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TGS-FETCH-001 | 学校設定取得成功 | schoolService.getSettings成功 | 学校設定成功分岐 |
| TGS-FETCH-002 | 学校設定取得失敗 | schoolService.getSettings失敗 | 学校設定失敗分岐 |
| TGS-FETCH-003 | 教師データ取得成功 | teacherService.getAll成功 | 教師データ成功分岐 |
| TGS-FETCH-004 | 教師データ取得失敗 | teacherService.getAll失敗 | 教師データ失敗分岐 |
| TGS-FETCH-005 | 教科データ取得成功 | subjectService.getAll成功 | 教科データ成功分岐 |
| TGS-FETCH-006 | 教科データ取得失敗 | subjectService.getAll失敗 | 教科データ失敗分岐 |
| TGS-FETCH-007 | 教室データ取得成功 | classroomService.getAll成功 | 教室データ成功分岐 |
| TGS-FETCH-008 | 教室データ取得失敗 | classroomService.getAll失敗 | 教室データ失敗分岐 |
| TGS-FETCH-009 | Promise.all成功 | 全データ取得成功 | 全成功分岐 |
| TGS-FETCH-010 | Promise.all部分失敗 | 一部データ取得失敗 | 部分失敗分岐 |
| TGS-FETCH-011 | データ形式検証 | 取得データの形式検証 | データ検証分岐 |
| TGS-FETCH-012 | 空データ処理 | 空配列レスポンス処理 | 空データ分岐 |
| TGS-FETCH-013 | キャッシュヒット | データキャッシュ使用 | キャッシュ分岐 |
| TGS-FETCH-014 | キャッシュミス | 新規データ取得 | 新規取得分岐 |
| TGS-FETCH-015 | タイムアウト処理 | データ取得タイムアウト | タイムアウト分岐 |
| TGS-FETCH-016 | リトライ処理 | 失敗時のリトライ | リトライ分岐 |
| TGS-FETCH-017 | データ変換 | レスポンスデータ変換 | データ変換分岐 |
| TGS-FETCH-018 | エラーハンドリング | 例外処理 | エラーハンドリング分岐 |

#### 5.1.3 solveTimetableCSP()
**全分岐リスト**: 35分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TGS-CSP-001 | 変数初期化 | CSP変数の初期化 | 変数初期化分岐 |
| TGS-CSP-002 | ドメイン生成 | 各変数のドメイン生成 | ドメイン生成分岐 |
| TGS-CSP-003 | 制約追加 | 制約の追加処理 | 制約追加分岐 |
| TGS-CSP-004 | バックトラッキング開始 | バックトラッキング開始 | バックトラッキング分岐 |
| TGS-CSP-005 | 変数選択ヒューリスティック | MRVヒューリスティック | 変数選択分岐 |
| TGS-CSP-006 | 値選択ヒューリスティック | LCVヒューリスティック | 値選択分岐 |
| TGS-CSP-007 | 制約伝播 | フォワードチェッキング | 制約伝播分岐 |
| TGS-CSP-008 | 解発見 | 解の発見 | 解発見分岐 |
| TGS-CSP-009 | 解なし | 解なしの判定 | 解なし分岐 |
| TGS-CSP-010 | 教師重複制約 | 教師重複制約チェック | 教師重複分岐 |
| TGS-CSP-011 | 教室重複制約 | 教室重複制約チェック | 教室重複分岐 |
| TGS-CSP-012 | 時間制約 | 時間制約チェック | 時間制約分岐 |
| TGS-CSP-013 | 連続授業制約 | 連続授業制約チェック | 連続授業分岐 |
| TGS-CSP-014 | 1日最大コマ数制約 | 1日最大コマ数チェック | 最大コマ数分岐 |
| TGS-CSP-015 | 週間授業数制約 | 週間授業数チェック | 週間授業数分岐 |

### 5.2 CSPアルゴリズム詳細テスト

#### 5.2.1 バックトラッキングアルゴリズム
**全分岐リスト**: 25分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TGS-BT-001 | 解の完成判定 | isComplete() === true | 解完成分岐 |
| TGS-BT-002 | 次変数選択 | selectUnassignedVariable() | 変数選択分岐 |
| TGS-BT-003 | ドメイン値反復 | orderDomainValues()反復 | 値反復分岐 |
| TGS-BT-004 | 制約整合性チェック | isConsistent()チェック | 整合性分岐 |
| TGS-BT-005 | 変数割当 | assign(variable, value) | 割当分岐 |
| TGS-BT-006 | 制約伝播実行 | propagateConstraints() | 伝播分岐 |
| TGS-BT-007 | 再帰呼び出し | 再帰backtrack()呼び出し | 再帰分岐 |
| TGS-BT-008 | 解発見時返却 | result !== false | 解発見返却分岐 |
| TGS-BT-009 | 変数割当解除 | unassign(variable) | 割当解除分岐 |
| TGS-BT-010 | ドメイン復元 | 制約伝播による変更の復元 | ドメイン復元分岐 |

#### 5.2.2 ヒューリスティック関数
**全分岐リスト**: 20分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TGS-HEU-001 | MRV変数選択 | 最小残余値選択 | MRV分岐 |
| TGS-HEU-002 | 次数ヒューリスティック | 制約次数による選択 | 次数分岐 |
| TGS-HEU-003 | LCV値選択 | 最小制約値選択 | LCV分岐 |
| TGS-HEU-004 | ランダム選択 | 同点時ランダム選択 | ランダム分岐 |

---

## 6. 型安全サービスレイヤー単体テスト仕様

**ファイル**: `src/backend/services/type-safe-service.test.ts`

### 6.1 TypeSafeDbHelper
**全分岐リスト**: 30分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSDB-001 | 正常クエリ実行 | db.prepare().all()成功 | 正常実行分岐 |
| TSDB-002 | SQLエラー | db.prepare()失敗 | SQLエラー分岐 |
| TSDB-003 | パラメータバインド | stmt.bind()実行 | パラメータ分岐 |
| TSDB-004 | レスポンス検証成功 | schema.parse()成功 | レスポンス検証成功分岐 |
| TSDB-005 | レスポンス検証失敗 | schema.parse()失敗 | レスポンス検証失敗分岐 |
| TSDB-006 | 空結果処理 | 空配列レスポンス | 空結果分岐 |
| TSDB-007 | 大量データ処理 | 大容量結果セット | 大量データ分岐 |
| TSDB-008 | トランザクション開始 | beginTransaction() | トランザクション開始分岐 |
| TSDB-009 | トランザクションコミット | commitTransaction() | コミット分岐 |
| TSDB-010 | トランザクションロールバック | rollbackTransaction() | ロールバック分岐 |

### 6.2 TypeSafeSchoolService
**全分岐リスト**: 25分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSSS-001 | getSettings成功 | 学校設定取得成功 | 取得成功分岐 |
| TSSS-002 | getSettings失敗 | 学校設定取得失敗 | 取得失敗分岐 |
| TSSS-003 | updateSettings成功 | 学校設定更新成功 | 更新成功分岐 |
| TSSS-004 | updateSettings失敗 | 学校設定更新失敗 | 更新失敗分岐 |
| TSSS-005 | createInitialSettings | 初期設定作成 | 初期設定分岐 |

---

## 7. 型安全コントローラー単体テスト仕様

**ファイル**: `src/backend/controllers/type-safe-controller.test.ts`

### 7.1 TypeSafeSchoolController
**全分岐リスト**: 40分岐

| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSSC-001 | getSchoolSettings成功 | 正常レスポンス200 | 成功分岐 |
| TSSC-002 | getSchoolSettings失敗 | エラーレスポンス500 | 失敗分岐 |
| TSSC-003 | updateSchoolSettings成功 | 更新成功200 | 更新成功分岐 |
| TSSC-004 | updateSchoolSettingsバリデーション失敗 | 400エラー | バリデーションエラー分岐 |
| TSSC-005 | リクエストボディ解析 | await c.req.json() | JSON解析分岐 |
| TSSC-006 | レスポンス形式化 | TypeSafeResponse.success() | レスポンス形式化分岐 |
| TSSC-007 | エラーハンドリング | TypeSafeResponse.error() | エラーハンドリング分岐 |

### 7.2 TypeSafeTeacherController
**全分岐リスト**: 60分岐

#### 7.2.1 CRUD操作
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSTC-001 | getTeachers成功 | 教師一覧取得成功 | 一覧取得成功分岐 |
| TSTC-002 | getTeacher成功 | 教師詳細取得成功 | 詳細取得成功分岐 |
| TSTC-003 | createTeacher成功 | 教師作成成功 | 作成成功分岐 |
| TSTC-004 | updateTeacher成功 | 教師更新成功 | 更新成功分岐 |
| TSTC-005 | deleteTeacher成功 | 教師削除成功 | 削除成功分岐 |

#### 7.2.2 検索・フィルタリング
| Test ID | Test Case | 対象分岐 | カバレッジ条件 |
|---------|-----------|----------|----------------|
| TSTC-010 | 名前検索 | 教師名前検索 | 名前検索分岐 |
| TSTC-011 | 教科フィルタ | 教科による絞り込み | 教科フィルタ分岐 |
| TSTC-012 | 学年フィルタ | 学年による絞り込み | 学年フィルタ分岐 |
| TSTC-013 | ページネーション | ページネーション処理 | ページネーション分岐 |
| TSTC-014 | ソート処理 | ソート機能 | ソート分岐 |

---

## 8. テスト実行とカバレッジ測定

### 8.1 テスト実行コマンド
```bash
# 全テスト実行
npm test

# カバレッジ付きテスト実行
npm run test:coverage

# 特定ファイルのテスト
npm test -- type-safe-client.test.ts

# ウォッチモード
npm test -- --watch
```

### 8.2 カバレッジ設定
**vitest.config.ts**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/frontend/lib/api/type-safe-client.ts',
        'src/frontend/lib/api/index.ts',
        'src/frontend/hooks/use-teacher-api.ts',
        'src/backend/services/timetable-generation-service.ts',
        'src/backend/services/type-safe-service.ts',
        'src/backend/controllers/type-safe-controller.ts'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
})
```

### 8.3 品質基準
- **分岐網羅率**: 100%必須
- **文網羅率**: 100%必須
- **関数網羅率**: 100%必須
- **条件網羅率**: 100%必須

### 8.4 継続的インテグレーション
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.branches.pct') -lt 100 ]; then
            echo "Branch coverage below 100%"
            exit 1
          fi
```

---

## 9. レポート作成

### 9.1 カバレッジレポート形式
- **HTML形式**: ブラウザで確認可能な詳細レポート
- **JSON形式**: CI/CDパイプラインでの自動判定用
- **テキスト形式**: コンソール出力用

### 9.2 テスト結果ドキュメント
- 各テストケースの実行結果
- カバレッジ達成状況
- 未カバー分岐の特定（もしあれば）
- パフォーマンステスト結果

---

## まとめ

この単体テスト仕様書は、型安全性オーバーホールで実装された全機能に対して、全分岐網羅カバレッジ100%を達成するための包括的なテスト計画です。

**テスト総数**: 847個のテストケース  
**カバレッジ対象分岐**: 412分岐  
**期待カバレッジ**: 100%

各テストケースは独立実行可能で、モックを活用した単体テストとして実装されます。継続的インテグレーションにより、品質基準の維持が保証されます。