# 型安全バックエンドAPI 単体テスト仕様書

## 目的

型安全性の向上に伴うバックエンドAPI層の品質保証を目的とし、100％分岐カバレッジを達成する包括的な単体テスト仕様を定義する。

## テスト対象範囲

### 1. 型安全コントローラー (`src/backend/controllers/`)
- `type-safe-controller.ts` - 統一コントローラー基盤
- 各種エンドポイント固有のコントローラー実装

### 2. 型安全ルート (`src/backend/routes/`)
- `type-safe-routes.ts` - OpenAPI統合ルーティング
- レガシー互換性ルート

### 3. 型安全サービス層 (`src/backend/services/`)
- `type-safe-service.ts` - 統一サービス基盤
- `timetable-generation-service.ts` - AI時間割生成エンジン

---

## TC-BE-001: TypeSafeController 基盤クラス

### 目的
統一コントローラー基盤の完全性と型安全性を検証

### テストケース

#### TC-BE-001-001: 正常レスポンス生成
```typescript
/**
 * 分岐: success=true, data存在
 * 期待値: TypedApiResponse<T> 形式の成功レスポンス
 */
describe('createSuccessResponse', () => {
  it('データ付き成功レスポンスを生成する', () => {
    const controller = new TypeSafeController()
    const testData = { id: '1', name: 'test' }
    
    const response = controller.createSuccessResponse(testData)
    
    expect(response).toEqual({
      success: true,
      data: testData,
      timestamp: expect.any(String),
      version: 'v2'
    })
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
```

#### TC-BE-001-002: データなし成功レスポンス
```typescript
/**
 * 分岐: success=true, data=undefined
 * 期待値: データフィールドなしの成功レスポンス
 */
it('データなし成功レスポンスを生成する', () => {
  const controller = new TypeSafeController()
  
  const response = controller.createSuccessResponse()
  
  expect(response).toEqual({
    success: true,
    timestamp: expect.any(String),
    version: 'v2'
  })
  expect(response.data).toBeUndefined()
})
```

#### TC-BE-001-003: バリデーションエラーレスポンス
```typescript
/**
 * 分岐: ZodError検出
 * 期待値: 400ステータス、バリデーションエラー詳細
 */
it('Zodバリデーションエラーを適切に処理する', () => {
  const controller = new TypeSafeController()
  const zodError = new ZodError([
    {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['name'],
      message: 'Expected string, received number'
    }
  ])
  
  const response = controller.createErrorResponse(zodError)
  
  expect(response.status).toBe(400)
  expect(response.body).toEqual({
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      message: 'バリデーションエラーが発生しました',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          message: 'Expected string, received number'
        })
      ])
    },
    timestamp: expect.any(String),
    version: 'v2'
  })
})
```

#### TC-BE-001-004: 一般エラーレスポンス
```typescript
/**
 * 分岐: 非ZodError
 * 期待値: 500ステータス、汎用エラーメッセージ
 */
it('一般エラーを適切に処理する', () => {
  const controller = new TypeSafeController()
  const generalError = new Error('Database connection failed')
  
  const response = controller.createErrorResponse(generalError)
  
  expect(response.status).toBe(500)
  expect(response.body).toEqual({
    success: false,
    error: {
      type: 'INTERNAL_ERROR',
      message: 'Database connection failed'
    },
    timestamp: expect.any(String),
    version: 'v2'
  })
})
```

#### TC-BE-001-005: 認証エラーレスポンス
```typescript
/**
 * 分岐: 認証関連エラー
 * 期待値: 401ステータス、認証エラーメッセージ
 */
it('認証エラーを適切に処理する', () => {
  const controller = new TypeSafeController()
  const authError = new Error('Invalid token')
  authError.name = 'AuthenticationError'
  
  const response = controller.createErrorResponse(authError)
  
  expect(response.status).toBe(401)
  expect(response.body.error.type).toBe('AUTHENTICATION_ERROR')
})
```

---

## TC-BE-002: 学校設定コントローラー

### 目的
学校設定管理の型安全性とビジネスロジック検証

### テストケース

#### TC-BE-002-001: 学校設定取得（正常）
```typescript
/**
 * 分岐: 設定データ存在
 * 期待値: EnhancedSchoolSettings形式の設定データ
 */
describe('getSchoolSettings', () => {
  it('学校設定を正常に取得する', async () => {
    const mockSettings = {
      id: 'settings-1',
      schoolName: 'テスト中学校',
      periodsPerDay: 6,
      daysPerWeek: 5,
      maxStudentsPerClass: 30,
      enhancedProperties: {
        aiGenerationEnabled: true,
        optimizationLevel: 'standard'
      }
    }
    
    vi.mocked(typeSafeService.getSchoolSettings).mockResolvedValue(mockSettings)
    
    const controller = new SchoolSettingsController()
    const response = await controller.getSettings({} as any)
    
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual(mockSettings)
    expect(typeSafeService.getSchoolSettings).toHaveBeenCalledTimes(1)
  })
})
```

#### TC-BE-002-002: 学校設定取得（データなし）
```typescript
/**
 * 分岐: 設定データ不存在
 * 期待値: 404ステータス、データなしエラー
 */
it('設定データが存在しない場合', async () => {
  vi.mocked(typeSafeService.getSchoolSettings).mockResolvedValue(null)
  
  const controller = new SchoolSettingsController()
  const response = await controller.getSettings({} as any)
  
  expect(response.status).toBe(404)
  expect(response.body.success).toBe(false)
  expect(response.body.error.type).toBe('NOT_FOUND')
})
```

#### TC-BE-002-003: 学校設定更新（正常）
```typescript
/**
 * 分岐: バリデーション成功、更新成功
 * 期待値: 更新済み設定データ
 */
it('学校設定を正常に更新する', async () => {
  const updateData = {
    schoolName: '更新後中学校',
    periodsPerDay: 7,
    enhancedProperties: {
      aiGenerationEnabled: false
    }
  }
  
  const updatedSettings = { id: 'settings-1', ...updateData }
  vi.mocked(typeSafeService.updateSchoolSettings).mockResolvedValue(updatedSettings)
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue(updateData)
  } as any
  
  const controller = new SchoolSettingsController()
  const response = await controller.updateSettings(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data).toEqual(updatedSettings)
  expect(typeSafeService.updateSchoolSettings).toHaveBeenCalledWith(updateData)
})
```

#### TC-BE-002-004: 学校設定更新（バリデーションエラー）
```typescript
/**
 * 分岐: Zodバリデーション失敗
 * 期待値: 400ステータス、バリデーションエラー詳細
 */
it('無効なデータでの更新時にバリデーションエラー', async () => {
  const invalidData = {
    schoolName: '', // 空文字（無効）
    periodsPerDay: -1, // 負の数（無効）
  }
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue(invalidData)
  } as any
  
  const controller = new SchoolSettingsController()
  const response = await controller.updateSettings(mockRequest)
  
  expect(response.status).toBe(400)
  expect(response.body.error.type).toBe('VALIDATION_ERROR')
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'schoolName' }),
      expect.objectContaining({ field: 'periodsPerDay' })
    ])
  )
})
```

---

## TC-BE-003: 教師管理コントローラー

### 目的
教師CRUD操作の型安全性と包括的エラーハンドリング検証

### テストケース

#### TC-BE-003-001: 教師一覧取得（フィルタなし）
```typescript
/**
 * 分岐: クエリパラメータなし
 * 期待値: 全教師データ、ページネーション情報
 */
describe('getTeachers', () => {
  it('全教師一覧を取得する', async () => {
    const mockTeachers = [
      { id: '1', name: '田中先生', subjects: ['数学'], grades: ['1'] },
      { id: '2', name: '佐藤先生', subjects: ['国語'], grades: ['2'] }
    ]
    const mockPagination = { total: 2, page: 1, limit: 10, totalPages: 1 }
    
    vi.mocked(typeSafeService.getTeachers).mockResolvedValue({
      data: mockTeachers,
      pagination: mockPagination
    })
    
    const mockRequest = { query: vi.fn().mockReturnValue({}) } as any
    
    const controller = new TeachersController()
    const response = await controller.getTeachers(mockRequest)
    
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(mockTeachers)
    expect(response.body.pagination).toEqual(mockPagination)
  })
})
```

#### TC-BE-003-002: 教師一覧取得（検索フィルタ）
```typescript
/**
 * 分岐: search, grade, subject クエリ存在
 * 期待値: フィルタ適用済み教師データ
 */
it('検索条件付きで教師一覧を取得する', async () => {
  const searchParams = {
    search: '田中',
    grade: '1',
    subject: '数学',
    page: '2',
    limit: '5'
  }
  
  const mockRequest = { 
    query: vi.fn().mockImplementation((key) => searchParams[key])
  } as any
  
  const controller = new TeachersController()
  await controller.getTeachers(mockRequest)
  
  expect(typeSafeService.getTeachers).toHaveBeenCalledWith({
    search: '田中',
    grade: '1',
    subject: '数学',
    page: 2,
    limit: 5
  })
})
```

#### TC-BE-003-003: 教師詳細取得（正常）
```typescript
/**
 * 分岐: ID存在、教師データ存在
 * 期待値: 指定教師の詳細データ
 */
it('指定IDの教師詳細を取得する', async () => {
  const teacherId = 'teacher-123'
  const mockTeacher = {
    id: teacherId,
    name: '田中先生',
    subjects: ['数学', '物理'],
    grades: ['1', '2'],
    assignmentRestrictions: ['午前のみ']
  }
  
  vi.mocked(typeSafeService.getTeacherById).mockResolvedValue(mockTeacher)
  
  const mockRequest = { param: vi.fn().mockReturnValue(teacherId) } as any
  
  const controller = new TeachersController()
  const response = await controller.getTeacherById(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data).toEqual(mockTeacher)
  expect(typeSafeService.getTeacherById).toHaveBeenCalledWith(teacherId)
})
```

#### TC-BE-003-004: 教師詳細取得（存在しないID）
```typescript
/**
 * 分岐: ID存在、教師データ不存在
 * 期待値: 404ステータス、NOT_FOUNDエラー
 */
it('存在しないIDの場合404エラー', async () => {
  const nonExistentId = 'non-existent-id'
  
  vi.mocked(typeSafeService.getTeacherById).mockResolvedValue(null)
  
  const mockRequest = { param: vi.fn().mockReturnValue(nonExistentId) } as any
  
  const controller = new TeachersController()
  const response = await controller.getTeacherById(mockRequest)
  
  expect(response.status).toBe(404)
  expect(response.body.error.type).toBe('NOT_FOUND')
  expect(response.body.error.message).toContain('教師が見つかりません')
})
```

#### TC-BE-003-005: 教師作成（正常）
```typescript
/**
 * 分岐: バリデーション成功、作成成功
 * 期待値: 201ステータス、作成済み教師データ
 */
it('新しい教師を作成する', async () => {
  const newTeacherData = {
    name: '新規先生',
    subjects: ['英語'],
    grades: ['3'],
    assignmentRestrictions: []
  }
  
  const createdTeacher = { id: 'new-teacher-id', ...newTeacherData, order: 0 }
  
  vi.mocked(typeSafeService.createTeacher).mockResolvedValue(createdTeacher)
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue(newTeacherData)
  } as any
  
  const controller = new TeachersController()
  const response = await controller.createTeacher(mockRequest)
  
  expect(response.status).toBe(201)
  expect(response.body.data).toEqual(createdTeacher)
  expect(typeSafeService.createTeacher).toHaveBeenCalledWith(newTeacherData)
})
```

#### TC-BE-003-006: 教師作成（バリデーションエラー）
```typescript
/**
 * 分岐: Zodバリデーション失敗
 * 期待値: 400ステータス、バリデーションエラー詳細
 */
it('無効なデータでの作成時にバリデーションエラー', async () => {
  const invalidData = {
    name: '', // 空文字（無効）
    subjects: [], // 空配列（無効）
    grades: 'invalid-grades' // 文字列（無効、配列であるべき）
  }
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue(invalidData)
  } as any
  
  const controller = new TeachersController()
  const response = await controller.createTeacher(mockRequest)
  
  expect(response.status).toBe(400)
  expect(response.body.error.type).toBe('VALIDATION_ERROR')
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'name' }),
      expect.objectContaining({ field: 'subjects' }),
      expect.objectContaining({ field: 'grades' })
    ])
  )
})
```

#### TC-BE-003-007: 教師更新（正常）
```typescript
/**
 * 分岐: ID存在、バリデーション成功、更新成功
 * 期待値: 更新済み教師データ
 */
it('既存教師を更新する', async () => {
  const teacherId = 'teacher-123'
  const updateData = {
    name: '更新後先生',
    subjects: ['数学', '理科'],
    assignmentRestrictions: ['午後のみ']
  }
  
  const updatedTeacher = { id: teacherId, ...updateData, grades: ['1'], order: 1 }
  
  vi.mocked(typeSafeService.updateTeacher).mockResolvedValue(updatedTeacher)
  
  const mockRequest = {
    param: vi.fn().mockReturnValue(teacherId),
    json: vi.fn().mockResolvedValue(updateData)
  } as any
  
  const controller = new TeachersController()
  const response = await controller.updateTeacher(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data).toEqual(updatedTeacher)
  expect(typeSafeService.updateTeacher).toHaveBeenCalledWith(teacherId, updateData)
})
```

#### TC-BE-003-008: 教師更新（存在しないID）
```typescript
/**
 * 分岐: ID存在、教師データ不存在
 * 期待値: 404ステータス、NOT_FOUNDエラー
 */
it('存在しないIDの更新時404エラー', async () => {
  const nonExistentId = 'non-existent-id'
  const updateData = { name: '更新データ' }
  
  vi.mocked(typeSafeService.updateTeacher).mockResolvedValue(null)
  
  const mockRequest = {
    param: vi.fn().mockReturnValue(nonExistentId),
    json: vi.fn().mockResolvedValue(updateData)
  } as any
  
  const controller = new TeachersController()
  const response = await controller.updateTeacher(mockRequest)
  
  expect(response.status).toBe(404)
  expect(response.body.error.type).toBe('NOT_FOUND')
})
```

#### TC-BE-003-009: 教師削除（正常）
```typescript
/**
 * 分岐: ID存在、削除成功
 * 期待値: 204ステータス、レスポンスボディなし
 */
it('指定教師を削除する', async () => {
  const teacherId = 'teacher-123'
  
  vi.mocked(typeSafeService.deleteTeacher).mockResolvedValue(true)
  
  const mockRequest = { param: vi.fn().mockReturnValue(teacherId) } as any
  
  const controller = new TeachersController()
  const response = await controller.deleteTeacher(mockRequest)
  
  expect(response.status).toBe(204)
  expect(response.body).toBeUndefined()
  expect(typeSafeService.deleteTeacher).toHaveBeenCalledWith(teacherId)
})
```

#### TC-BE-003-010: 教師削除（存在しないID）
```typescript
/**
 * 分岐: ID存在、削除失敗（データ不存在）
 * 期待値: 404ステータス、NOT_FOUNDエラー
 */
it('存在しないIDの削除時404エラー', async () => {
  const nonExistentId = 'non-existent-id'
  
  vi.mocked(typeSafeService.deleteTeacher).mockResolvedValue(false)
  
  const mockRequest = { param: vi.fn().mockReturnValue(nonExistentId) } as any
  
  const controller = new TeachersController()
  const response = await controller.deleteTeacher(mockRequest)
  
  expect(response.status).toBe(404)
  expect(response.body.error.type).toBe('NOT_FOUND')
})
```

---

## TC-BE-004: 時間割生成コントローラー

### 目的
AI駆動時間割生成システムの型安全性と複雑なビジネスロジック検証

### テストケース

#### TC-BE-004-001: 時間割生成（正常・標準モード）
```typescript
/**
 * 分岐: 制約条件有効、標準生成モード
 * 期待値: 生成済み時間割データ、統計情報
 */
describe('generateTimetable', () => {
  it('標準モードで時間割を生成する', async () => {
    const constraints = {
      teachers: ['teacher-1', 'teacher-2'],
      subjects: ['数学', '国語'],
      classrooms: ['1-A', '1-B'],
      periodsPerDay: 6,
      daysPerWeek: 5,
      maxStudentsPerClass: 30
    }
    
    const generationOptions = {
      method: 'standard',
      optimizationLevel: 'balanced',
      timeout: 30000
    }
    
    const expectedResult = {
      success: true,
      timetable: [[[/* 3次元配列 */]]],
      statistics: {
        totalSlots: 150,
        filledSlots: 120,
        fillRate: 0.8,
        conflictCount: 0,
        generationTime: 5000
      },
      method: 'standard',
      generatedAt: expect.any(String)
    }
    
    vi.mocked(timetableGenerationService.generateTimetable).mockResolvedValue(expectedResult)
    
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ constraints, options: generationOptions })
    } as any
    
    const controller = new TimetableController()
    const response = await controller.generateTimetable(mockRequest)
    
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(expectedResult)
    expect(timetableGenerationService.generateTimetable).toHaveBeenCalledWith(
      constraints,
      generationOptions
    )
  })
})
```

#### TC-BE-004-002: 時間割生成（AI最適化モード）
```typescript
/**
 * 分岐: AI最適化モード、高度な制約条件
 * 期待値: AI最適化された時間割、詳細統計
 */
it('AI最適化モードで時間割を生成する', async () => {
  const constraints = {
    teachers: ['teacher-1', 'teacher-2', 'teacher-3'],
    subjects: ['数学', '国語', '英語', '理科'],
    classrooms: ['1-A', '1-B', '2-A'],
    periodsPerDay: 7,
    daysPerWeek: 5,
    complexConstraints: {
      teacherPreferences: {
        'teacher-1': { preferredPeriods: [1, 2, 3] },
        'teacher-2': { avoidPeriods: [6, 7] }
      },
      subjectConstraints: {
        '数学': { consecutivePeriods: 2, maxPerDay: 1 },
        '体育': { specialClassroom: true }
      }
    }
  }
  
  const aiOptions = {
    method: 'ai-enhanced',
    optimizationLevel: 'maximum',
    aiParameters: {
      learningRate: 0.01,
      iterations: 1000,
      convergenceThreshold: 0.95
    }
  }
  
  const expectedResult = {
    success: true,
    timetable: [[[/* 最適化された3次元配列 */]]],
    statistics: {
      totalSlots: 210,
      filledSlots: 195,
      fillRate: 0.93,
      conflictCount: 0,
      optimizationScore: 0.95,
      aiMetrics: {
        convergenceRate: 0.97,
        iterationsUsed: 850,
        finalLoss: 0.02
      }
    },
    method: 'ai-enhanced'
  }
  
  vi.mocked(timetableGenerationService.generateTimetable).mockResolvedValue(expectedResult)
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue({ constraints, options: aiOptions })
  } as any
  
  const controller = new TimetableController()
  const response = await controller.generateTimetable(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data.statistics.aiMetrics).toBeDefined()
  expect(response.body.data.statistics.optimizationScore).toBeGreaterThan(0.9)
})
```

#### TC-BE-004-003: 時間割生成（制約条件エラー）
```typescript
/**
 * 分岐: 制約条件バリデーション失敗
 * 期待値: 400ステータス、制約条件エラー詳細
 */
it('無効な制約条件での生成時にバリデーションエラー', async () => {
  const invalidConstraints = {
    teachers: [], // 空配列（無効）
    subjects: ['数学'],
    periodsPerDay: 0, // ゼロ（無効）
    daysPerWeek: 8, // 週8日（無効）
    maxStudentsPerClass: -5 // 負の数（無効）
  }
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue({ constraints: invalidConstraints })
  } as any
  
  const controller = new TimetableController()
  const response = await controller.generateTimetable(mockRequest)
  
  expect(response.status).toBe(400)
  expect(response.body.error.type).toBe('VALIDATION_ERROR')
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'teachers' }),
      expect.objectContaining({ field: 'periodsPerDay' }),
      expect.objectContaining({ field: 'daysPerWeek' }),
      expect.objectContaining({ field: 'maxStudentsPerClass' })
    ])
  )
})
```

#### TC-BE-004-004: 時間割生成（生成失敗）
```typescript
/**
 * 分岐: 制約充足問題解決失敗
 * 期待値: 生成失敗レスポンス、失敗理由
 */
it('制約充足が不可能な場合の生成失敗', async () => {
  const impossibleConstraints = {
    teachers: ['teacher-1'],
    subjects: ['数学', '国語', '英語', '理科', '社会', '体育'],
    classrooms: ['1-A', '2-A', '3-A'],
    periodsPerDay: 6,
    daysPerWeek: 5,
    // 1人の教師で6科目を3クラス分（不可能）
  }
  
  const failureResult = {
    success: false,
    message: '制約条件を満たす時間割の生成ができませんでした',
    failureReason: 'INSUFFICIENT_TEACHERS',
    suggestions: [
      '教師数を増やしてください',
      '1日あたりの授業数を減らしてください'
    ]
  }
  
  vi.mocked(timetableGenerationService.generateTimetable).mockResolvedValue(failureResult)
  
  const mockRequest = {
    json: vi.fn().mockResolvedValue({ constraints: impossibleConstraints })
  } as any
  
  const controller = new TimetableController()
  const response = await controller.generateTimetable(mockRequest)
  
  expect(response.status).toBe(422) // Unprocessable Entity
  expect(response.body.data).toEqual(failureResult)
  expect(response.body.data.suggestions).toHaveLength(2)
})
```

#### TC-BE-004-005: 時間割取得（正常）
```typescript
/**
 * 分岐: 時間割ID存在、データ存在
 * 期待値: 指定時間割の詳細データ
 */
it('指定IDの時間割を取得する', async () => {
  const timetableId = 'timetable-123'
  const mockTimetable = {
    id: timetableId,
    name: '2024年度1学期時間割',
    timetable: [[[/* 3次元配列 */]]],
    metadata: {
      createdAt: '2024-04-01T09:00:00Z',
      generatedBy: 'ai-enhanced',
      version: '1.0'
    },
    statistics: {
      totalSlots: 150,
      filledSlots: 140,
      fillRate: 0.93
    }
  }
  
  vi.mocked(timetableGenerationService.getTimetable).mockResolvedValue(mockTimetable)
  
  const mockRequest = { param: vi.fn().mockReturnValue(timetableId) } as any
  
  const controller = new TimetableController()
  const response = await controller.getTimetable(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data).toEqual(mockTimetable)
  expect(timetableGenerationService.getTimetable).toHaveBeenCalledWith(timetableId)
})
```

#### TC-BE-004-006: 時間割一覧取得（フィルタ付き）
```typescript
/**
 * 分岐: 検索・フィルタクエリ存在
 * 期待値: フィルタ適用済み時間割一覧
 */
it('フィルタ条件付きで時間割一覧を取得する', async () => {
  const filterParams = {
    year: '2024',
    semester: '1',
    generatedBy: 'ai-enhanced',
    status: 'active',
    page: '1',
    limit: '10'
  }
  
  const mockTimetables = [
    { id: 'tt-1', name: '2024年度1学期時間割', status: 'active' },
    { id: 'tt-2', name: '2024年度1学期時間割（修正版）', status: 'active' }
  ]
  
  const mockPagination = { total: 2, page: 1, limit: 10, totalPages: 1 }
  
  vi.mocked(timetableGenerationService.getTimetables).mockResolvedValue({
    data: mockTimetables,
    pagination: mockPagination
  })
  
  const mockRequest = {
    query: vi.fn().mockImplementation((key) => filterParams[key])
  } as any
  
  const controller = new TimetableController()
  const response = await controller.getTimetables(mockRequest)
  
  expect(response.status).toBe(200)
  expect(response.body.data).toEqual(mockTimetables)
  expect(timetableGenerationService.getTimetables).toHaveBeenCalledWith({
    year: 2024,
    semester: 1,
    generatedBy: 'ai-enhanced',
    status: 'active',
    page: 1,
    limit: 10
  })
})
```

---

## TC-BE-005: エラーハンドリング統合テスト

### 目的
コントローラー層での統一エラーハンドリングの完全性検証

### テストケース

#### TC-BE-005-001: データベースエラー処理
```typescript
/**
 * 分岐: データベース接続エラー
 * 期待値: 500ステータス、データベースエラーメッセージ
 */
describe('Database Error Handling', () => {
  it('データベース接続エラーを適切に処理する', async () => {
    const dbError = new Error('Connection timeout')
    dbError.name = 'DatabaseError'
    
    vi.mocked(typeSafeService.getTeachers).mockRejectedValue(dbError)
    
    const controller = new TeachersController()
    const response = await controller.getTeachers({} as any)
    
    expect(response.status).toBe(500)
    expect(response.body.error.type).toBe('DATABASE_ERROR')
    expect(response.body.error.message).toContain('データベース')
  })
})
```

#### TC-BE-005-002: ネットワークタイムアウト処理
```typescript
/**
 * 分岐: 外部API呼び出しタイムアウト
 * 期待値: 408ステータス、タイムアウトエラーメッセージ
 */
it('外部APIタイムアウトを適切に処理する', async () => {
  const timeoutError = new Error('Request timeout')
  timeoutError.name = 'TimeoutError'
  
  vi.mocked(timetableGenerationService.generateTimetable).mockRejectedValue(timeoutError)
  
  const controller = new TimetableController()
  const response = await controller.generateTimetable({
    json: vi.fn().mockResolvedValue({ constraints: {} })
  } as any)
  
  expect(response.status).toBe(408)
  expect(response.body.error.type).toBe('TIMEOUT_ERROR')
})
```

#### TC-BE-005-003: メモリ不足エラー処理
```typescript
/**
 * 分岐: メモリ不足によるシステムエラー
 * 期待値: 503ステータス、リソース不足エラーメッセージ
 */
it('メモリ不足エラーを適切に処理する', async () => {
  const memoryError = new Error('JavaScript heap out of memory')
  memoryError.name = 'RangeError'
  
  vi.mocked(timetableGenerationService.generateTimetable).mockRejectedValue(memoryError)
  
  const controller = new TimetableController()
  const response = await controller.generateTimetable({
    json: vi.fn().mockResolvedValue({ constraints: {} })
  } as any)
  
  expect(response.status).toBe(503)
  expect(response.body.error.type).toBe('RESOURCE_ERROR')
})
```

---

## TC-BE-006: レスポンス形式統一性テスト

### 目的
全APIエンドポイントでのレスポンス形式統一性検証

### テストケース

#### TC-BE-006-001: 成功レスポンス形式統一
```typescript
/**
 * 分岐: 各種成功レスポンス
 * 期待値: TypedApiResponse形式の統一レスポンス
 */
describe('Response Format Consistency', () => {
  it('全ての成功レスポンスが統一形式である', async () => {
    const controllers = [
      new SchoolSettingsController(),
      new TeachersController(),
      new TimetableController()
    ]
    
    const responses = await Promise.all([
      controllers[0].getSettings({} as any),
      controllers[1].getTeachers({} as any),
      controllers[2].getTimetables({} as any)
    ])
    
    responses.forEach(response => {
      expect(response.body).toHaveProperty('success')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('version', 'v2')
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})
```

#### TC-BE-006-002: エラーレスポンス形式統一
```typescript
/**
 * 分岐: 各種エラーレスポンス
 * 期待値: TypedApiErrorResponse形式の統一レスポンス
 */
it('全てのエラーレスポンスが統一形式である', async () => {
  // 意図的にエラーを発生させる
  vi.mocked(typeSafeService.getSchoolSettings).mockRejectedValue(new Error('Test error'))
  vi.mocked(typeSafeService.getTeachers).mockRejectedValue(new ZodError([]))
  vi.mocked(timetableGenerationService.getTimetables).mockRejectedValue(new Error('Auth error'))
  
  const controllers = [
    new SchoolSettingsController(),
    new TeachersController(),
    new TimetableController()
  ]
  
  const responses = await Promise.all([
    controllers[0].getSettings({} as any),
    controllers[1].getTeachers({} as any),
    controllers[2].getTimetables({} as any)
  ])
  
  responses.forEach(response => {
    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toHaveProperty('type')
    expect(response.body.error).toHaveProperty('message')
    expect(response.body).toHaveProperty('timestamp')
    expect(response.body).toHaveProperty('version', 'v2')
  })
})
```

---

## カバレッジ要件

### 分岐カバレッジ 100%
- **制御構文**: if/else, switch/case, try/catch 全分岐
- **論理演算子**: &&, ||, ?? の短絡評価分岐
- **三項演算子**: condition ? true : false 分岐
- **オプショナルチェーン**: obj?.prop 分岐

### 機能カバレッジ 100%
- **全メソッド**: public/private メソッド実行
- **エラーパス**: 想定される全エラー発生パターン
- **エッジケース**: 境界値、null/undefined、空配列/オブジェクト

### ステートメントカバレッジ 100%
- **全実行行**: 条件分岐内含む全行の実行
- **デッドコード検出**: 到達不可能コードの特定と除去

## テスト実行環境

### テストフレームワーク
```typescript
// vitest.config.ts 設定例
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
      }
    }
  }
})
```

### モック設定
```typescript
// 型安全サービス層のモック
vi.mock('../services/type-safe-service')
vi.mock('../services/timetable-generation-service')

// データベースヘルパーのモック
vi.mock('../db/type-safe-db-helper')
```

---

## 実装優先度

### Phase 1: 基盤テスト
1. TypeSafeController基盤クラス
2. エラーハンドリング統合
3. レスポンス形式統一性

### Phase 2: CRUD操作テスト
1. 学校設定コントローラー
2. 教師管理コントローラー
3. 基本的なCRUD操作

### Phase 3: 高度機能テスト
1. 時間割生成コントローラー
2. AI最適化機能
3. 複雑な制約条件処理

### Phase 4: 完全カバレッジ達成
1. エッジケース完全網羅
2. エラーパス完全カバレッジ
3. パフォーマンステスト統合