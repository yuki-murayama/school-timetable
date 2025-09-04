# 学校時間割管理システム - 詳細設計書

## 1. データベース設計

### 1.1 概要
- **データベース**：Cloudflare D1 (SQLite)
- **データベース名**：school-timetable-db2
- **文字コード**：UTF-8
- **照合順序**：NOCASE

### 1.2 テーブル構造

#### 1.2.1 学校設定テーブル (school_settings)
```sql
CREATE TABLE school_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    grade1Classes INTEGER NOT NULL DEFAULT 4,
    grade2Classes INTEGER NOT NULL DEFAULT 4,
    grade3Classes INTEGER NOT NULL DEFAULT 3,
    dailyPeriods INTEGER NOT NULL DEFAULT 6,
    saturdayPeriods INTEGER NOT NULL DEFAULT 4,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: 学校の基本設定情報
**制約**: 
- id は常に 'default' (単一レコード設計)
- 各クラス数・時限数は正の整数

#### 1.2.2 教師テーブル (teachers)
```sql
CREATE TABLE teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    subjects TEXT,        -- JSON配列形式
    grades TEXT,          -- JSON配列形式
    assignment_restrictions TEXT,  -- JSON形式
    order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: 教師情報とその制約
**JSON形式例**:
```json
// subjects: 担当教科ID配列
["subject_001", "subject_002"]

// grades: 担当学年配列
[1, 2, 3]

// assignment_restrictions: 割当制限配列
[{
    "displayOrder": 1,
    "restrictedDay": "月曜",
    "restrictedPeriods": [1, 2],
    "restrictionLevel": "必須",
    "reason": "会議のため"
}]
```

#### 1.2.3 教科テーブル (subjects)
```sql
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    special_classroom TEXT,
    description TEXT,
    weekly_lessons INTEGER DEFAULT 1,
    target_grades TEXT,   -- JSON配列形式
    order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: 教科情報と制約
**JSON形式例**:
```json
// target_grades: 対象学年配列（空配列=全学年対応）
[1, 2, 3]
```

#### 1.2.4 教室テーブル (classrooms)
```sql
CREATE TABLE classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER,
    count INTEGER DEFAULT 1,
    order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: 教室情報
**制約**: 
- type: '普通教室', '特別教室', '体育館' など
- count: 同一タイプ教室の数量

#### 1.2.5 生成時間割テーブル (generated_timetables)
```sql
CREATE TABLE generated_timetables (
    id TEXT PRIMARY KEY,
    timetable_data TEXT NOT NULL,    -- JSON形式
    statistics TEXT NOT NULL,        -- JSON形式
    metadata TEXT,                   -- JSON形式
    generation_method TEXT DEFAULT 'program',
    assignment_rate REAL NOT NULL DEFAULT 0,
    total_slots INTEGER NOT NULL DEFAULT 0,
    assigned_slots INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: 生成済み時間割の永続化
**JSON形式例**:
```json
// timetable_data: 時間割データ
{
    "月曜": {
        "1": {"subject": "数学", "teacher": "田中", "classroom": "1-A"},
        "2": {"subject": "国語", "teacher": "佐藤", "classroom": "1-A"}
    }
}

// statistics: 生成統計
{
    "totalSlots": 360,
    "assignedSlots": 342,
    "unassignedSlots": 18,
    "backtrackCount": 145,
    "generationTime": "2.3秒",
    "constraintViolations": 3
}
```

#### 1.2.6 ユーザーテーブル (users)
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'teacher' NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**用途**: システムユーザー管理（将来の拡張用）
**制約**: 
- role: 'admin', 'teacher', 'viewer'
- is_active: 0=無効, 1=有効

#### 1.2.7 教師-教科関連テーブル (teacher_subjects)
```sql
CREATE TABLE teacher_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id)
);
```

**用途**: 教師と教科の多対多関係管理

### 1.3 インデックス設計
```sql
-- 検索最適化用インデックス
CREATE INDEX idx_teachers_name ON teachers(name);
CREATE INDEX idx_subjects_name ON subjects(name);
CREATE INDEX idx_classrooms_type ON classrooms(type);
CREATE INDEX idx_generated_timetables_created_at ON generated_timetables(created_at);
CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject ON teacher_subjects(subject_id);
```

### 1.4 データ整合性制約
- **参照整合性**: 外部キー制約による関連データ整合性保証
- **一意性制約**: 重複データの防止
- **NOT NULL 制約**: 必須フィールドの保証
- **CHECK制約**: 数値範囲の妥当性チェック

## 2. API仕様設計

### 2.1 API構成概要
- **ベースURL**: `/api`
- **認証**: Bearer JWT Token
- **レスポンス形式**: JSON
- **エラー形式**: 統一エラーレスポンス

### 2.2 認証API

#### GET /api/auth/user/me
**概要**: 現在のユーザー情報取得
**認証**: Required
```typescript
// レスポンス
{
  success: true,
  data: {
    sub: "user_123",
    name: "田中太郎",
    email: "tanaka@school.edu",
    permissions: ["read:timetables", "write:timetables"]
  }
}
```

### 2.3 学校設定API

#### GET /api/frontend/school/settings
**概要**: 学校設定取得
**認証**: Required (read権限)
```typescript
// レスポンス
{
  success: true,
  data: {
    id: "default",
    grade1Classes: 4,
    grade2Classes: 4,
    grade3Classes: 3,
    dailyPeriods: 6,
    saturdayPeriods: 4,
    days: ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜"],
    grades: [1, 2, 3],
    classesPerGrade: {
      "1": ["A", "B", "C", "D"],
      "2": ["A", "B", "C", "D"],
      "3": ["A", "B", "C"]
    }
  }
}
```

#### PUT /api/frontend/school/settings
**概要**: 学校設定更新
**認証**: Required (admin権限)
```typescript
// リクエスト
{
  grade1Classes: 4,
  grade2Classes: 4,
  grade3Classes: 3,
  dailyPeriods: 6,
  saturdayPeriods: 4
}

// レスポンス
{
  success: true,
  data: SchoolSettings,
  message: "学校設定を更新しました"
}
```

### 2.4 教師管理API

#### GET /api/frontend/school/teachers
**概要**: 教師一覧取得
**認証**: Required (read権限)
```typescript
// レスポンス
{
  success: true,
  data: [
    {
      id: "teacher_001",
      name: "田中太郎",
      subjects: ["math", "science"],
      grades: [1, 2],
      assignmentRestrictions: [
        {
          displayOrder: 1,
          restrictedDay: "月曜",
          restrictedPeriods: [1, 2],
          restrictionLevel: "必須",
          reason: "会議のため"
        }
      ]
    }
  ]
}
```

#### POST /api/frontend/school/teachers
**概要**: 教師追加
**認証**: Required (admin権限)
```typescript
// リクエスト
{
  name: "佐藤花子",
  subjects: ["japanese", "social"],
  grades: [2, 3],
  assignmentRestrictions: []
}

// レスポンス
{
  success: true,
  data: Teacher,
  message: "教師を追加しました"
}
```

#### PUT /api/frontend/school/teachers/:id
**概要**: 教師更新
**認証**: Required (admin権限)

#### DELETE /api/frontend/school/teachers/:id
**概要**: 教師削除
**認証**: Required (admin権限)

### 2.5 時間割API

#### GET /api/frontend/school/timetables
**概要**: 時間割一覧取得
**認証**: Required (read権限)
```typescript
// レスポンス
{
  success: true,
  data: [
    {
      id: "timetable_001",
      name: "2024年度1学期",
      createdAt: "2024-01-15T10:30:00Z",
      isActive: true
    }
  ]
}
```

#### GET /api/frontend/school/timetables/:id
**概要**: 時間割詳細取得
**認証**: Required (read権限)
```typescript
// レスポンス
{
  success: true,
  data: {
    id: "timetable_001",
    name: "2024年度1学期",
    createdAt: "2024-01-15T10:30:00Z",
    isActive: true,
    schedule: [
      {
        classId: "1-A",
        className: "1年A組",
        schedule: [
          {
            day: 0, // 月曜=0
            period: 1,
            subject: "数学",
            teacher: "田中太郎",
            classroom: "1-A",
            hasViolation: false,
            violationSeverity: null
          }
        ]
      }
    ]
  }
}
```

#### POST /api/timetable/program/generate
**概要**: 時間割生成
**認証**: Required (write権限)
```typescript
// リクエスト
{
  useOptimization: true,
  useNewAlgorithm: false,
  tolerantMode: true
}

// レスポンス
{
  success: true,
  sessionId: "session_123",
  data: {
    timetable: GeneratedTimetableData,
    statistics: {
      totalSlots: 360,
      assignedSlots: 342,
      unassignedSlots: 18,
      backtrackCount: 145,
      generationTime: "2.3秒",
      constraintViolations: 3
    },
    generatedAt: "2024-01-15T10:30:00Z",
    method: "optimization"
  }
}
```

### 2.6 エラーレスポンス
```typescript
// 400 Bad Request
{
  success: false,
  error: "Validation failed",
  details: {
    field: "name",
    message: "名前は必須です"
  }
}

// 401 Unauthorized
{
  success: false,
  error: "Unauthorized",
  message: "認証が必要です"
}

// 403 Forbidden
{
  success: false,
  error: "Forbidden",
  message: "この操作を実行する権限がありません"
}

// 404 Not Found
{
  success: false,
  error: "Not Found",
  message: "リソースが見つかりません"
}

// 500 Internal Server Error
{
  success: false,
  error: "Internal Server Error",
  message: "サーバー内部でエラーが発生しました"
}
```

## 3. フロントエンド・バックエンドインターフェース設計

### 3.1 通信プロトコル
- **プロトコル**: HTTPS
- **メソッド**: GET, POST, PUT, DELETE, PATCH
- **Content-Type**: application/json
- **認証ヘッダー**: Authorization: Bearer {token}

### 3.2 セキュリティヘッダー
```typescript
// リクエストヘッダー
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJ0eXAiOiJKV1Q...",
  "X-Requested-With": "XMLHttpRequest",
  "X-CSRF-Token": "abc123def456"
}

// レスポンスヘッダー
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

### 3.3 APIクライアント設計

#### 共通APIクライアント (client.ts)
```typescript
interface ApiOptions {
  token?: string
  getFreshToken?: () => Promise<string | null>
}

const apiClient = {
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T>
  async post<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T>
  async put<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T>
  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T>
  async patch<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T>
}
```

#### ドメイン別APIクライアント
```typescript
// schoolApi (school.ts)
export const schoolApi = {
  getSettings: (options?: ApiOptions) => apiClient.get<SchoolSettings>('/frontend/school/settings', options),
  updateSettings: (data: Partial<SchoolSettings>, options?: ApiOptions) => 
    apiClient.put<SchoolSettings>('/frontend/school/settings', data, options)
}

// teacherApi (teacher.ts)
export const teacherApi = {
  getAll: (options?: ApiOptions) => apiClient.get<Teacher[]>('/frontend/school/teachers', options),
  create: (data: Omit<Teacher, 'id'>, options?: ApiOptions) => 
    apiClient.post<Teacher>('/frontend/school/teachers', data, options),
  update: (id: string, data: Partial<Teacher>, options?: ApiOptions) => 
    apiClient.put<Teacher>(`/frontend/school/teachers/${id}`, data, options),
  delete: (id: string, options?: ApiOptions) => 
    apiClient.delete(`/frontend/school/teachers/${id}`, options)
}
```

### 3.4 状態管理設計

#### カスタムフック設計
```typescript
// use-auth.ts
export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    // トークン取得・更新ロジック
  }, [isSignedIn, user, getToken])

  return {
    isAuthenticated: boolean,
    isLoading: boolean,
    user: AuthUser | null,
    token: string | null,
    getFreshToken: () => Promise<string | null>,
    login: () => void,
    logout: () => Promise<void>
  }
}

// use-teacher-api.ts
export function useTeacherApi() {
  const { token, getFreshToken } = useAuth()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)

  const loadTeachers = useCallback(async () => {
    // API呼び出し & 状態更新
  }, [token])

  return {
    teachers: Teacher[],
    loading: boolean,
    error: string | null,
    loadTeachers: () => Promise<void>,
    createTeacher: (data: Omit<Teacher, 'id'>) => Promise<void>,
    updateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>,
    deleteTeacher: (id: string) => Promise<void>
  }
}
```

## 4. データ型定義

### 4.1 共有型定義 (shared/types.ts)

#### 基本エンティティ型
```typescript
// 環境設定
export interface Env {
  DB: D1Database
  ASSETS?: unknown
  GROQ_API_KEY: string
  AUTH0_DOMAIN: string
  AUTH0_AUDIENCE: string
  AUTH0_CLIENT_ID: string
  VITE_CLERK_PUBLISHABLE_KEY: string
  NODE_ENV: string
}

// 学校設定
export interface SchoolSettings {
  id?: string
  grade1Classes: number
  grade2Classes: number
  grade3Classes: number
  dailyPeriods: number
  saturdayPeriods: number
  days: string[]
  grades: number[]
  classesPerGrade: { [grade: number]: string[] }
  created_at?: string
  updated_at?: string
}

// 教師
export interface Teacher {
  id: string
  name: string
  subjects: (string | Subject)[]
  grades: number[]
  assignmentRestrictions?: AssignmentRestriction[]
  assignment_restrictions?: string // DB互換性
  order?: number
  created_at?: string
  updated_at?: string
}

// 教科
export interface Subject {
  id: string
  name: string
  grades: number[]
  weeklyHours: { [grade: number]: number }
  requiresSpecialClassroom?: boolean
  classroomType?: string
  specialClassroom?: string
  weekly_hours?: number // DB互換性
  target_grades?: number[] // DB互換性
  order?: number
  created_at?: string
  updated_at?: string
}

// 教室
export interface Classroom {
  id: string
  name: string
  capacity?: number
  classroomType?: string
  type?: string
  specialFor?: string
  count?: number
  order?: number
  created_at?: string
  updated_at?: string
}
```

#### 時間割関連型
```typescript
// 時間割スロット
export interface TimetableSlot {
  classGrade: number
  classSection: string
  day: string
  period: number
  subject?: Subject
  teacher?: Teacher
  classroom?: Classroom
  hasViolation?: boolean
  isViolation?: boolean
  violationSeverity?: 'high' | 'medium' | 'low'
  violations?: Array<{
    type: string
    severity: string
    message: string
  }>
}

// 時間割生成結果
export interface TimetableGenerationResult {
  success: boolean
  timetable?: TimetableSlot[][][]
  statistics?: {
    totalAssignments?: number
    assignedSlots?: number
    unassignedSlots?: number
    constraintViolations?: number
    generationTime?: string
    totalSlots?: number
    backtrackCount?: number
  }
  message?: string
  generatedAt?: string
  method?: string
}

// 時間割一覧アイテム
export interface TimetableListItem {
  id: string
  name: string
  createdAt: string
  isActive: boolean
}

// 時間割詳細
export interface TimetableDetail {
  id: string
  name: string
  createdAt: string
  isActive: boolean
  schedule: Array<{
    classId: string
    className: string
    schedule: Array<{
      day: number
      period: number
      subject: string
      teacher: string
      classroom: string
    }>
  }>
}
```

#### 制約・バリデーション型
```typescript
// 割当制限
export interface AssignmentRestriction {
  displayOrder?: number
  restrictedDay: string
  restrictedPeriods: number[]
  restrictionLevel: '必須' | '推奨'
  reason?: string
}

// 制約チェック結果
export interface ConstraintResult {
  isValid: boolean
  reason?: string
  conflictingSlots?: TimetableSlot[]
}

// 拡張制約チェック結果
export interface EnhancedConstraintResult {
  isValid: boolean
  violations: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
    reason?: string
  }>
}
```

### 4.2 時間割生成特化型 (backend/services/timetable/types.ts)

#### アルゴリズム関連型
```typescript
// 割当候補
export interface AssignmentCandidate {
  teacher: Teacher
  subject: Subject
  classGrade: number
  classSection: string
  requiredHours: number
  assignedHours: number
}

// 教師困難度分析
export interface TeacherDifficulty {
  teacher: Teacher
  totalRequiredHours: number
  availableHours: number
  difficultyPercentage: number
  constraintFactors: {
    subjectCount: number
    gradeCount: number
    classCount: number
  }
  assignedHours: number
}

// 品質指標
export interface QualityMetrics {
  assignmentCompletionRate: number // %
  teacherUtilizationRate: number // %
  subjectDistributionBalance: number // 0-1
  constraintViolationCount: number
  loadBalanceScore: number // 0-1
}
```

### 4.3 認証関連型 (frontend/hooks/use-auth.ts)
```typescript
// 認証ユーザー
export interface AuthUser {
  sub: string
  email: string
  name: string
  picture?: string
  roles: string[]
  permissions: string[]
}

// 権限一覧
const PERMISSIONS = [
  'schools:read', 'schools:write',
  'classes:read', 'classes:write',
  'teachers:read', 'teachers:write',
  'subjects:read', 'subjects:write',
  'classrooms:read', 'classrooms:write',
  'timetables:read', 'timetables:write', 'timetables:generate',
  'constraints:read', 'constraints:write',
  'users:read', 'users:write'
] as const

type Permission = typeof PERMISSIONS[number]
```

## 5. セキュリティ実装詳細

### 5.1 認証・認可実装

#### JWT トークン検証 (middleware/auth.ts)
```typescript
export const clerkAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const token = authHeader.substring(7)
  try {
    const payload = await verifyJWT(token, c.env.VITE_CLERK_PUBLISHABLE_KEY)
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ success: false, error: 'Invalid token' }, 401)
  }
}

export const adminAuthMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user?.roles?.includes('school_admin')) {
    return c.json({ success: false, error: 'Insufficient permissions' }, 403)
  }
  await next()
}
```

### 5.2 CSRF保護実装
```typescript
// フロントエンド: セッション単位トークンキャッシュ
let sessionCSRFToken: string | null = null

function getCSRFToken(): string {
  if (!sessionCSRFToken) {
    sessionCSRFToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return sessionCSRFToken
}

// バックエンド: CSRF検証
export const csrfProtection = () => async (c: Context, next: Next) => {
  if (c.req.method !== 'GET') {
    const csrfToken = c.req.header('X-CSRF-Token')
    if (!csrfToken || !isValidCSRFToken(csrfToken)) {
      return c.json({ success: false, error: 'Invalid CSRF token' }, 403)
    }
  }
  await next()
}
```

### 5.3 Rate Limiting実装
```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = (maxRequests: number, windowMs: number) => 
  async (c: Context, next: Next) => {
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // クリーンアップ
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < windowStart) {
        rateLimitStore.delete(ip)
      }
    }

    const current = rateLimitStore.get(clientIP) || { count: 0, resetTime: now + windowMs }
    
    if (current.count >= maxRequests && current.resetTime > now) {
      return c.json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }, 429)
    }

    current.count++
    rateLimitStore.set(clientIP, current)
    await next()
  }
```

### 5.4 入力値検証
```typescript
// Zod スキーマ定義
const TeacherCreateSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内です'),
  subjects: z.array(z.string()).min(1, '担当教科を選択してください'),
  grades: z.array(z.number().int().min(1).max(3)).min(1, '担当学年を選択してください'),
  assignmentRestrictions: z.array(AssignmentRestrictionSchema).optional()
})

// バリデーションミドルウェア
export const validateRequest = (schema: z.ZodSchema) => 
  async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validated = schema.parse(body)
      c.set('validatedData', validated)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: 'Validation failed',
          details: error.issues
        }, 400)
      }
      throw error
    }
  }
```

## 6. パフォーマンス最適化詳細

### 6.1 データベース最適化

#### インデックス戦略
```sql
-- 複合インデックス（検索パターンに応じて）
CREATE INDEX idx_teachers_subjects_grades ON teachers(subjects, grades);
CREATE INDEX idx_timetable_class_day_period ON generated_timetables(
  json_extract(timetable_data, '$.classGrade'), 
  json_extract(timetable_data, '$.day'), 
  json_extract(timetable_data, '$.period')
);

-- 部分インデックス（アクティブレコードのみ）
CREATE INDEX idx_active_timetables ON generated_timetables(created_at) 
WHERE assignment_rate > 0.9;
```

#### クエリ最適化
```typescript
// N+1問題回避：関連データの一括取得
const loadTeachersWithSubjects = async (db: D1Database): Promise<Teacher[]> => {
  // 教師データ取得
  const teachers = await db.prepare('SELECT * FROM teachers ORDER BY name').all()
  
  // 教科データ一括取得
  const teacherIds = teachers.results.map(t => t.id)
  const subjectRelations = await db.prepare(`
    SELECT ts.teacher_id, s.* FROM teacher_subjects ts
    JOIN subjects s ON s.id = ts.subject_id
    WHERE ts.teacher_id IN (${teacherIds.map(() => '?').join(',')})
  `).bind(...teacherIds).all()

  // メモリ内で関連付け
  const subjectMap = new Map<string, Subject[]>()
  for (const rel of subjectRelations.results) {
    const teacherId = rel.teacher_id as string
    if (!subjectMap.has(teacherId)) {
      subjectMap.set(teacherId, [])
    }
    subjectMap.get(teacherId)!.push(rel as Subject)
  }

  return teachers.results.map(teacher => ({
    ...teacher as Teacher,
    subjects: subjectMap.get(teacher.id) || []
  }))
}
```

### 6.2 フロントエンド最適化

#### メモ化戦略
```typescript
// 重い計算のメモ化
const TimetableDetailView = memo(({ timetableId }: Props) => {
  // 時間割データの変換処理をメモ化
  const processedTimetable = useMemo(() => {
    return processComplexTimetableData(rawTimetable)
  }, [rawTimetable])

  // イベントハンドラーのメモ化
  const handleSlotClick = useCallback((slot: TimetableSlot) => {
    // 処理...
  }, [/* 依存配列 */])

  return (
    <TimetableGrid 
      data={processedTimetable}
      onSlotClick={handleSlotClick}
    />
  )
})

// 子コンポーネントの再描画防止
const TimetableSlot = memo(({ slot, onClick }: SlotProps) => {
  return <div onClick={() => onClick(slot)}>{slot.subject}</div>
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return prevProps.slot.id === nextProps.slot.id &&
         prevProps.slot.hasViolation === nextProps.slot.hasViolation
})
```

### 6.3 時間割生成アルゴリズム最適化
```typescript
// 制約事前チェックによる枝刈り
const canAssignToSlot = (
  candidate: AssignmentCandidate,
  day: string,
  period: number,
  timetable: TimetableSlot[][][]
): boolean => {
  // 高速事前チェック（重い計算を避ける）
  if (hasTeacherConflict(candidate.teacher, day, period, timetable)) return false
  if (hasClassroomConflict(candidate.subject, day, period, timetable)) return false
  if (hasTimeRestriction(candidate.teacher, day, period)) return false
  
  return true // 詳細チェックは後で
}

// バックトラッキングの効率化
const generateTimetableOptimized = async (): Promise<TimetableGenerationResult> => {
  // 困難度順でソート（困難な制約から処理）
  const sortedCandidates = candidates.sort((a, b) => 
    calculateDifficulty(b) - calculateDifficulty(a)
  )

  // 制約違反の早期検出
  const result = await backtrackWithPruning(sortedCandidates, timetable)
  
  return result
}
```

---

**最終更新**: 2025年1月 | **バージョン**: 1.0.0 | **ページ数**: 12