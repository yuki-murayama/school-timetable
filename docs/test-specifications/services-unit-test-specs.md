# 型安全サービス層 単体テスト仕様書

## 目的

型安全性の向上に伴うサービス層のビジネスロジック品質保証を目的とし、100％分岐カバレッジを達成する包括的な単体テスト仕様を定義する。

## テスト対象範囲

### 1. 統一サービス基盤 (`src/backend/services/`)
- `type-safe-service.ts` - 統一サービス基盤とデータベースヘルパー
- CRUD操作の型安全性とエラーハンドリング

### 2. 時間割生成サービス (`src/backend/services/`)
- `timetable-generation-service.ts` - AI駆動時間割生成エンジン
- 制約充足問題ソルバーと最適化アルゴリズム

### 3. データベースヘルパー
- `TypeSafeDbHelper` - 型安全データベース操作
- クエリビルダーとトランザクション処理

---

## TC-SV-001: TypeSafeDbHelper データベースヘルパー

### 目的
データベース操作の型安全性と包括的エラーハンドリング検証

### テストケース

#### TC-SV-001-001: エンティティ作成（正常）
```typescript
/**
 * 分岐: データバリデーション成功、INSERT成功
 * 期待値: 作成済みエンティティ（ID付き）
 */
describe('TypeSafeDbHelper', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新しいエンティティを作成する', async () => {
    const newTeacher = {
      name: '新規先生',
      subjects: ['数学'],
      grades: ['1'],
      assignmentRestrictions: [],
      order: 0
    }

    const createdTeacher = { id: 'teacher-new-id', ...newTeacher }

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdTeacher])
      })
    })

    const dbHelper = new TypeSafeDbHelper(mockDb as any)
    const result = await dbHelper.create('teachers', newTeacher, TeacherSchema)

    expect(result).toEqual(createdTeacher)
    expect(mockDb.insert).toHaveBeenCalledWith(expect.any(Object))
  })
})
```

#### TC-SV-001-002: エンティティ作成（バリデーションエラー）
```typescript
/**
 * 分岐: Zodバリデーション失敗
 * 期待値: ZodError throw、データベース操作未実行
 */
it('無効なデータでの作成時にバリデーションエラー', async () => {
  const invalidTeacher = {
    name: '', // 空文字（無効）
    subjects: [], // 空配列（無効）
    grades: 'invalid' // 文字列（無効、配列であるべき）
  }

  const dbHelper = new TypeSafeDbHelper(mockDb as any)

  await expect(
    dbHelper.create('teachers', invalidTeacher, TeacherSchema)
  ).rejects.toThrow(ZodError)

  expect(mockDb.insert).not.toHaveBeenCalled()
})
```

#### TC-SV-001-003: エンティティ作成（データベースエラー）
```typescript
/**
 * 分岐: バリデーション成功、INSERT失敗
 * 期待値: データベースエラー throw、適切なエラーメッセージ
 */
it('データベースエラーが発生した場合', async () => {
  const validTeacher = {
    name: '先生',
    subjects: ['数学'],
    grades: ['1'],
    assignmentRestrictions: [],
    order: 0
  }

  const dbError = new Error('UNIQUE constraint failed')
  dbError.name = 'DatabaseError'

  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(dbError)
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)

  await expect(
    dbHelper.create('teachers', validTeacher, TeacherSchema)
  ).rejects.toThrow('UNIQUE constraint failed')
})
```

#### TC-SV-001-004: エンティティ取得（ID指定・存在）
```typescript
/**
 * 分岐: ID存在、データ存在
 * 期待値: 指定エンティティデータ
 */
it('指定IDのエンティティを取得する', async () => {
  const teacherId = 'teacher-123'
  const mockTeacher = {
    id: teacherId,
    name: '田中先生',
    subjects: ['数学'],
    grades: ['1'],
    assignmentRestrictions: [],
    order: 0
  }

  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockTeacher])
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.findById('teachers', teacherId, TeacherSchema)

  expect(result).toEqual(mockTeacher)
  expect(mockDb.select).toHaveBeenCalled()
})
```

#### TC-SV-001-005: エンティティ取得（ID指定・不存在）
```typescript
/**
 * 分岐: ID存在、データ不存在
 * 期待値: null 返却
 */
it('存在しないIDの場合nullを返す', async () => {
  const nonExistentId = 'non-existent-id'

  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([])
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.findById('teachers', nonExistentId, TeacherSchema)

  expect(result).toBeNull()
})
```

#### TC-SV-001-006: エンティティ一覧取得（フィルタなし）
```typescript
/**
 * 分岐: フィルタ条件なし
 * 期待値: 全エンティティリスト、ページネーション情報
 */
it('全エンティティ一覧を取得する', async () => {
  const mockTeachers = [
    { id: '1', name: '田中先生', subjects: ['数学'], grades: ['1'] },
    { id: '2', name: '佐藤先生', subjects: ['国語'], grades: ['2'] }
  ]

  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(mockTeachers)
      })
    })
  })

  // カウントクエリのモック
  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue([{ count: 2 }])
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.findMany('teachers', {}, TeacherSchema)

  expect(result.data).toEqual(mockTeachers)
  expect(result.pagination).toEqual({
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1
  })
})
```

#### TC-SV-001-007: エンティティ一覧取得（フィルタ付き）
```typescript
/**
 * 分岐: 検索・フィルタ条件存在
 * 期待値: フィルタ適用済みエンティティリスト
 */
it('フィルタ条件付きで一覧を取得する', async () => {
  const filters = {
    search: '田中',
    grade: '1',
    page: 2,
    limit: 5
  }

  const filteredTeachers = [
    { id: '1', name: '田中先生', subjects: ['数学'], grades: ['1'] }
  ]

  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(filteredTeachers)
        })
      })
    })
  })

  mockDb.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue([{ count: 1 }])
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.findMany('teachers', filters, TeacherSchema)

  expect(result.data).toEqual(filteredTeachers)
  expect(result.pagination.page).toBe(2)
  expect(result.pagination.limit).toBe(5)
})
```

#### TC-SV-001-008: エンティティ更新（正常）
```typescript
/**
 * 分岐: ID存在、バリデーション成功、UPDATE成功
 * 期待値: 更新済みエンティティ
 */
it('エンティティを更新する', async () => {
  const teacherId = 'teacher-123'
  const updateData = {
    name: '更新後先生',
    subjects: ['数学', '理科']
  }

  const updatedTeacher = {
    id: teacherId,
    name: '更新後先生',
    subjects: ['数学', '理科'],
    grades: ['1'],
    assignmentRestrictions: [],
    order: 0
  }

  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedTeacher])
      })
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.update('teachers', teacherId, updateData, TeacherSchema)

  expect(result).toEqual(updatedTeacher)
  expect(mockDb.update).toHaveBeenCalled()
})
```

#### TC-SV-001-009: エンティティ更新（存在しないID）
```typescript
/**
 * 分岐: ID存在、データ不存在
 * 期待値: null 返却
 */
it('存在しないIDの更新時nullを返す', async () => {
  const nonExistentId = 'non-existent-id'
  const updateData = { name: '更新データ' }

  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([])
      })
    })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.update('teachers', nonExistentId, updateData, TeacherSchema)

  expect(result).toBeNull()
})
```

#### TC-SV-001-010: エンティティ削除（正常）
```typescript
/**
 * 分岐: ID存在、DELETE成功
 * 期待値: true 返却
 */
it('エンティティを削除する', async () => {
  const teacherId = 'teacher-123'

  mockDb.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue({ changes: 1 })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.delete('teachers', teacherId)

  expect(result).toBe(true)
  expect(mockDb.delete).toHaveBeenCalled()
})
```

#### TC-SV-001-011: エンティティ削除（存在しないID）
```typescript
/**
 * 分岐: ID存在、削除対象なし
 * 期待値: false 返却
 */
it('存在しないIDの削除時falseを返す', async () => {
  const nonExistentId = 'non-existent-id'

  mockDb.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue({ changes: 0 })
  })

  const dbHelper = new TypeSafeDbHelper(mockDb as any)
  const result = await dbHelper.delete('teachers', nonExistentId)

  expect(result).toBe(false)
})
```

---

## TC-SV-002: TypeSafeSchoolService 学校管理サービス

### 目的
学校設定管理のビジネスロジックと型安全性検証

### テストケース

#### TC-SV-002-001: 学校設定取得（拡張プロパティ付き）
```typescript
/**
 * 分岐: 設定データ存在、拡張プロパティ合成
 * 期待値: EnhancedSchoolSettings形式の設定データ
 */
describe('TypeSafeSchoolService', () => {
  const mockDbHelper = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }

  const schoolService = new TypeSafeSchoolService(mockDbHelper as any)

  it('拡張プロパティ付きで学校設定を取得する', async () => {
    const baseSettings = {
      id: 'settings-1',
      schoolName: 'テスト中学校',
      periodsPerDay: 6,
      daysPerWeek: 5,
      maxStudentsPerClass: 30
    }

    mockDbHelper.findFirst.mockResolvedValue(baseSettings)

    const result = await schoolService.getSchoolSettings()

    expect(result).toEqual({
      ...baseSettings,
      enhancedProperties: {
        aiGenerationEnabled: true,
        optimizationLevel: 'standard',
        multiLanguageSupport: false,
        advancedConstraints: false
      }
    })
  })
})
```

#### TC-SV-002-002: 学校設定取得（データなし）
```typescript
/**
 * 分岐: 設定データ不存在
 * 期待値: null 返却
 */
it('設定データが存在しない場合nullを返す', async () => {
  mockDbHelper.findFirst.mockResolvedValue(null)

  const result = await schoolService.getSchoolSettings()

  expect(result).toBeNull()
})
```

#### TC-SV-002-003: 学校設定更新（拡張プロパティ含む）
```typescript
/**
 * 分岐: 拡張プロパティ更新、バリデーション成功
 * 期待値: 更新済み拡張設定
 */
it('拡張プロパティを含む設定を更新する', async () => {
  const updateData = {
    schoolName: '更新後中学校',
    periodsPerDay: 7,
    enhancedProperties: {
      aiGenerationEnabled: false,
      optimizationLevel: 'maximum',
      multiLanguageSupport: true
    }
  }

  const updatedSettings = {
    id: 'settings-1',
    ...updateData,
    daysPerWeek: 5,
    maxStudentsPerClass: 30
  }

  mockDbHelper.update.mockResolvedValue(updatedSettings)

  const result = await schoolService.updateSchoolSettings(updateData)

  expect(result).toEqual(updatedSettings)
  expect(mockDbHelper.update).toHaveBeenCalledWith(
    'school_settings',
    expect.any(String),
    expect.objectContaining({
      schoolName: '更新後中学校',
      periodsPerDay: 7
    }),
    expect.any(Object)
  )
})
```

#### TC-SV-002-004: 学校設定初期化
```typescript
/**
 * 分岐: 初期設定作成
 * 期待値: デフォルト値付き新規設定
 */
it('初期設定を作成する', async () => {
  const defaultSettings = {
    schoolName: 'デフォルト学校',
    periodsPerDay: 6,
    daysPerWeek: 5,
    maxStudentsPerClass: 30,
    enhancedProperties: {
      aiGenerationEnabled: true,
      optimizationLevel: 'standard',
      multiLanguageSupport: false,
      advancedConstraints: false
    }
  }

  const createdSettings = { id: 'new-settings-id', ...defaultSettings }

  mockDbHelper.create.mockResolvedValue(createdSettings)

  const result = await schoolService.createDefaultSettings()

  expect(result).toEqual(createdSettings)
  expect(mockDbHelper.create).toHaveBeenCalledWith(
    'school_settings',
    expect.objectContaining(defaultSettings),
    expect.any(Object)
  )
})
```

---

## TC-SV-003: TypeSafeTeacherService 教師管理サービス

### 目的
教師CRUD操作のビジネスロジックと高度な検索機能検証

### テストケース

#### TC-SV-003-001: 教師一覧取得（高度な検索）
```typescript
/**
 * 分岐: 複合検索条件（名前、科目、学年）
 * 期待値: 複合フィルタ適用済み教師一覧
 */
describe('TypeSafeTeacherService', () => {
  const mockDbHelper = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }

  const teacherService = new TypeSafeTeacherService(mockDbHelper as any)

  it('複合検索条件で教師一覧を取得する', async () => {
    const searchCriteria = {
      search: '田中',
      subject: '数学',
      grade: '1',
      hasRestrictions: true,
      page: 1,
      limit: 10
    }

    const mockResults = {
      data: [
        {
          id: '1',
          name: '田中先生',
          subjects: ['数学', '物理'],
          grades: ['1', '2'],
          assignmentRestrictions: ['午前のみ']
        }
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
    }

    mockDbHelper.findMany.mockResolvedValue(mockResults)

    const result = await teacherService.getTeachers(searchCriteria)

    expect(result).toEqual(mockResults)
    expect(mockDbHelper.findMany).toHaveBeenCalledWith(
      'teachers',
      expect.objectContaining({
        search: '田中',
        subject: '数学',
        grade: '1',
        hasRestrictions: true
      }),
      expect.any(Object)
    )
  })
})
```

#### TC-SV-003-002: 教師作成（自動順序付け）
```typescript
/**
 * 分岐: 新規教師作成、自動order設定
 * 期待値: order値付き新規教師
 */
it('自動順序付けで新しい教師を作成する', async () => {
  const newTeacherData = {
    name: '新規先生',
    subjects: ['英語'],
    grades: ['3'],
    assignmentRestrictions: []
  }

  // 既存教師の最大order値を取得するクエリ
  mockDbHelper.findMany.mockResolvedValueOnce({
    data: [{ order: 5 }],
    pagination: { total: 1, page: 1, limit: 1, totalPages: 1 }
  })

  const createdTeacher = {
    id: 'new-teacher-id',
    ...newTeacherData,
    order: 6 // 最大値 + 1
  }

  mockDbHelper.create.mockResolvedValue(createdTeacher)

  const result = await teacherService.createTeacher(newTeacherData)

  expect(result).toEqual(createdTeacher)
  expect(result.order).toBe(6)
})
```

#### TC-SV-003-003: 教師更新（部分更新）
```typescript
/**
 * 分岐: 部分データ更新、既存データ保持
 * 期待値: 部分更新済み教師
 */
it('部分的なデータ更新を行う', async () => {
  const teacherId = 'teacher-123'
  const partialUpdate = {
    subjects: ['数学', '理科', '物理'], // 科目のみ更新
    assignmentRestrictions: ['午後のみ'] // 制限のみ更新
  }

  const existingTeacher = {
    id: teacherId,
    name: '田中先生', // 変更なし
    subjects: ['数学'], // 更新対象
    grades: ['1', '2'], // 変更なし
    assignmentRestrictions: [], // 更新対象
    order: 1 // 変更なし
  }

  const updatedTeacher = {
    ...existingTeacher,
    ...partialUpdate
  }

  mockDbHelper.update.mockResolvedValue(updatedTeacher)

  const result = await teacherService.updateTeacher(teacherId, partialUpdate)

  expect(result).toEqual(updatedTeacher)
  expect(result.name).toBe('田中先生') // 元のまま
  expect(result.subjects).toEqual(['数学', '理科', '物理']) // 更新済み
})
```

#### TC-SV-003-004: 教師削除（依存関係チェック）
```typescript
/**
 * 分岐: 削除前依存関係チェック、依存なし
 * 期待値: 削除成功
 */
it('依存関係のない教師を削除する', async () => {
  const teacherId = 'teacher-123'

  // 依存関係チェック（時間割での使用状況）
  mockDbHelper.findMany.mockResolvedValueOnce({
    data: [], // 時間割で使用されていない
    pagination: { total: 0, page: 1, limit: 1, totalPages: 0 }
  })

  mockDbHelper.delete.mockResolvedValue(true)

  const result = await teacherService.deleteTeacher(teacherId)

  expect(result).toBe(true)
})
```

#### TC-SV-003-005: 教師削除（依存関係エラー）
```typescript
/**
 * 分岐: 削除前依存関係チェック、依存あり
 * 期待値: 依存関係エラー throw
 */
it('依存関係のある教師の削除時エラー', async () => {
  const teacherId = 'teacher-123'

  // 依存関係チェック（時間割で使用中）
  mockDbHelper.findMany.mockResolvedValueOnce({
    data: [{ id: 'timetable-1', teacherId }], // 時間割で使用中
    pagination: { total: 1, page: 1, limit: 1, totalPages: 1 }
  })

  await expect(
    teacherService.deleteTeacher(teacherId)
  ).rejects.toThrow('この教師は時間割で使用されているため削除できません')

  expect(mockDbHelper.delete).not.toHaveBeenCalled()
})
```

---

## TC-SV-004: TimetableGenerationService AI時間割生成エンジン

### 目的
AI駆動時間割生成システムの制約充足問題ソルバーと最適化アルゴリズム検証

### テストケース

#### TC-SV-004-001: 制約充足問題ソルバー（基本制約）
```typescript
/**
 * 分岐: 基本制約条件（教師、科目、教室、時限）
 * 期待値: 制約を満たす時間割配列
 */
describe('TimetableGenerationService', () => {
  const mockDbHelper = {
    findMany: vi.fn(),
    create: vi.fn()
  }

  const timetableService = new TimetableGenerationService(mockDbHelper as any)

  it('基本制約条件で時間割を生成する', async () => {
    const constraints = {
      teachers: ['teacher-1', 'teacher-2'],
      subjects: ['数学', '国語'],
      classrooms: ['1-A', '1-B'],
      periodsPerDay: 6,
      daysPerWeek: 5,
      maxStudentsPerClass: 30
    }

    const options = {
      method: 'standard',
      optimizationLevel: 'balanced',
      timeout: 30000
    }

    // 制約充足アルゴリズムの内部実装をモック
    const mockTimetable = [
      [
        [ // Day 1
          [{ teacherId: 'teacher-1', subjectId: '数学', classroomId: '1-A' }], // Period 1
          [{ teacherId: 'teacher-2', subjectId: '国語', classroomId: '1-B' }], // Period 2
          // ... 他の時限
        ]
      ]
    ]

    const expectedResult = {
      success: true,
      timetable: mockTimetable,
      statistics: {
        totalSlots: 30, // 5日 × 6時限 × 1クラス
        filledSlots: 20,
        fillRate: 0.67,
        conflictCount: 0,
        generationTime: expect.any(Number)
      },
      method: 'standard',
      generatedAt: expect.any(String)
    }

    // CSPソルバーの実装をモック
    const solveSpy = vi.spyOn(timetableService, 'solveCsp' as any)
    solveSpy.mockResolvedValue({
      solution: mockTimetable,
      conflicts: 0,
      iterations: 100
    })

    const result = await timetableService.generateTimetable(constraints, options)

    expect(result).toMatchObject(expectedResult)
    expect(result.statistics.conflictCount).toBe(0)
    expect(result.timetable).toEqual(mockTimetable)
  })
})
```

#### TC-SV-004-002: 高度な制約条件処理
```typescript
/**
 * 分岐: 複雑制約（教師優先時限、科目連続授業、特別教室）
 * 期待値: 高度制約を満たす最適化時間割
 */
it('高度な制約条件で時間割を生成する', async () => {
  const complexConstraints = {
    teachers: ['teacher-1', 'teacher-2', 'teacher-3'],
    subjects: ['数学', '体育', '理科実験'],
    classrooms: ['普通教室1', '体育館', '理科室'],
    periodsPerDay: 6,
    daysPerWeek: 5,
    complexConstraints: {
      teacherPreferences: {
        'teacher-1': { 
          preferredPeriods: [1, 2, 3], // 午前希望
          avoidDays: ['金曜日'] // 金曜日回避
        },
        'teacher-2': { 
          avoidPeriods: [6], // 6時限目回避
          maxPeriodsPerDay: 3 // 1日最大3時限
        }
      },
      subjectConstraints: {
        '数学': { 
          consecutivePeriods: 2, // 連続2時限
          maxPerDay: 1, // 1日最大1回
          preferredPeriods: [2, 3, 4] // 2-4時限目希望
        },
        '体育': { 
          specialClassroom: '体育館', // 専用教室
          avoidAfterLunch: true // 昼食後回避
        },
        '理科実験': {
          specialClassroom: '理科室',
          preparationTime: 10, // 準備時間10分
          cleanupTime: 15 // 片付け時間15分
        }
      },
      classroomConstraints: {
        '体育館': { 
          availability: ['月', '水', '金'], // 利用可能日
          maintenanceTime: '16:00-17:00' // メンテナンス時間
        },
        '理科室': {
          maxConsecutiveUse: 2, // 連続使用最大2時限
          ventilationTime: 5 // 換気時間5分
        }
      }
    }
  }

  const aiOptions = {
    method: 'ai-enhanced',
    optimizationLevel: 'maximum',
    aiParameters: {
      learningRate: 0.01,
      iterations: 1000,
      convergenceThreshold: 0.95,
      constraintWeights: {
        teacherPreference: 0.3,
        subjectConstraint: 0.4,
        classroomConstraint: 0.2,
        studentWelfare: 0.1
      }
    }
  }

  // AI最適化アルゴリズムの実装をモック
  const optimizeSpy = vi.spyOn(timetableService, 'optimizeWithAi' as any)
  optimizeSpy.mockResolvedValue({
    optimizedTimetable: [[[/* 最適化済み時間割 */]]],
    optimizationScore: 0.95,
    constraintViolations: 0,
    aiMetrics: {
      convergenceRate: 0.97,
      iterationsUsed: 850,
      finalLoss: 0.02
    }
  })

  const result = await timetableService.generateTimetable(complexConstraints, aiOptions)

  expect(result.success).toBe(true)
  expect(result.statistics.optimizationScore).toBeGreaterThan(0.9)
  expect(result.statistics.aiMetrics).toBeDefined()
  expect(result.method).toBe('ai-enhanced')
})
```

#### TC-SV-004-003: 制約充足失敗処理
```typescript
/**
 * 分岐: 制約条件が満たせない場合
 * 期待値: 生成失敗、詳細な失敗理由と改善提案
 */
it('制約条件が満たせない場合の失敗処理', async () => {
  const impossibleConstraints = {
    teachers: ['teacher-1'], // 教師1人
    subjects: ['数学', '国語', '英語', '理科', '社会', '体育'], // 科目6個
    classrooms: ['1-A', '2-A', '3-A'], // クラス3個
    periodsPerDay: 6,
    daysPerWeek: 5
    // 1人の教師で6科目×3クラス×5日間は物理的に不可能
  }

  // 制約充足失敗をモック
  const solveSpy = vi.spyOn(timetableService, 'solveCsp' as any)
  solveSpy.mockResolvedValue({
    solution: null,
    conflicts: 50,
    failureReason: 'INSUFFICIENT_TEACHERS'
  })

  const result = await timetableService.generateTimetable(impossibleConstraints)

  expect(result).toEqual({
    success: false,
    message: '制約条件を満たす時間割の生成ができませんでした',
    failureReason: 'INSUFFICIENT_TEACHERS',
    conflicts: 50,
    suggestions: expect.arrayContaining([
      '教師数を増やしてください',
      '1日あたりの授業数を減らしてください',
      'クラス数を減らしてください'
    ]),
    generatedAt: expect.any(String)
  })
})
```

#### TC-SV-004-004: 時間割最適化（段階的改善）
```typescript
/**
 * 分岐: 初期解から段階的最適化
 * 期待値: 最適化スコア向上、収束過程記録
 */
it('段階的最適化で時間割品質を向上させる', async () => {
  const constraints = {
    teachers: ['teacher-1', 'teacher-2', 'teacher-3'],
    subjects: ['数学', '国語', '英語'],
    classrooms: ['1-A', '1-B'],
    periodsPerDay: 6,
    daysPerWeek: 5
  }

  const optimizationOptions = {
    method: 'optimized',
    optimizationLevel: 'maximum',
    maxIterations: 1000,
    convergenceThreshold: 0.95,
    improvementThreshold: 0.01
  }

  // 段階的最適化プロセスをモック
  const optimizationHistory = [
    { iteration: 0, score: 0.60, conflicts: 10 },
    { iteration: 100, score: 0.75, conflicts: 5 },
    { iteration: 500, score: 0.90, conflicts: 2 },
    { iteration: 850, score: 0.95, conflicts: 0 }
  ]

  const optimizeSpy = vi.spyOn(timetableService, 'iterativeOptimization' as any)
  optimizeSpy.mockResolvedValue({
    finalTimetable: [[[/* 最適化済み */]]],
    optimizationHistory,
    finalScore: 0.95,
    convergenceIteration: 850
  })

  const result = await timetableService.generateTimetable(constraints, optimizationOptions)

  expect(result.success).toBe(true)
  expect(result.statistics.optimizationScore).toBe(0.95)
  expect(result.statistics.conflictCount).toBe(0)
  expect(result.statistics.optimizationHistory).toEqual(optimizationHistory)
})
```

#### TC-SV-004-005: 時間割保存と検索
```typescript
/**
 * 分岐: 生成済み時間割の永続化と検索機能
 * 期待値: データベース保存、メタデータ付き検索
 */
it('生成した時間割を保存し検索する', async () => {
  const timetableData = {
    name: '2024年度1学期時間割',
    timetable: [[[/* 時間割データ */]]],
    metadata: {
      constraints: { /* 制約条件 */ },
      generationMethod: 'ai-enhanced',
      optimizationScore: 0.95,
      generatedAt: '2024-04-01T09:00:00Z'
    },
    statistics: {
      totalSlots: 150,
      filledSlots: 140,
      fillRate: 0.93
    }
  }

  const savedTimetable = { id: 'timetable-123', ...timetableData }

  mockDbHelper.create.mockResolvedValue(savedTimetable)

  const result = await timetableService.saveTimetable(timetableData)

  expect(result).toEqual(savedTimetable)
  expect(mockDbHelper.create).toHaveBeenCalledWith(
    'timetables',
    expect.objectContaining({
      name: '2024年度1学期時間割',
      timetable: expect.any(Array),
      metadata: expect.objectContaining({
        generationMethod: 'ai-enhanced'
      })
    }),
    expect.any(Object)
  )
})
```

#### TC-SV-004-006: パフォーマンス最適化
```typescript
/**
 * 分岐: 大規模時間割の高速生成
 * 期待値: 並列処理、メモリ効率、実行時間制限
 */
it('大規模時間割を効率的に生成する', async () => {
  const largeScaleConstraints = {
    teachers: Array.from({ length: 50 }, (_, i) => `teacher-${i+1}`),
    subjects: Array.from({ length: 15 }, (_, i) => `subject-${i+1}`),
    classrooms: Array.from({ length: 30 }, (_, i) => `classroom-${i+1}`),
    periodsPerDay: 7,
    daysPerWeek: 5,
    maxStudentsPerClass: 35
  }

  const performanceOptions = {
    method: 'ai-enhanced',
    optimizationLevel: 'fast',
    parallelProcessing: true,
    memoryLimit: '512MB',
    timeout: 60000, // 1分制限
    chunkSize: 10 // 並列処理チャンクサイズ
  }

  const startTime = Date.now()

  // 高速アルゴリズムの実装をモック
  const fastGenerateSpy = vi.spyOn(timetableService, 'generateWithParallelProcessing' as any)
  fastGenerateSpy.mockResolvedValue({
    timetable: [[[/* 大規模時間割 */]]],
    processingTime: 45000, // 45秒
    memoryUsage: '480MB',
    parallelWorkers: 4
  })

  const result = await timetableService.generateTimetable(largeScaleConstraints, performanceOptions)

  const endTime = Date.now()
  const actualTime = endTime - startTime

  expect(result.success).toBe(true)
  expect(result.statistics.generationTime).toBeLessThan(60000)
  expect(actualTime).toBeLessThan(60000)
  expect(result.statistics.memoryUsage).toBeDefined()
  expect(result.statistics.parallelWorkers).toBe(4)
})
```

---

## TC-SV-005: トランザクション処理とデータ整合性

### 目的
複雑なビジネス操作でのトランザクション処理とデータ整合性検証

### テストケース

#### TC-SV-005-001: 教師削除時の関連データ整合性
```typescript
/**
 * 分岐: 教師削除時の時間割データ整合性保持
 * 期待値: トランザクション内での関連データ更新
 */
describe('Transaction and Data Consistency', () => {
  const mockDb = {
    transaction: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }

  it('教師削除時に関連時間割データを整合性保持して更新する', async () => {
    const teacherId = 'teacher-123'

    // トランザクション処理をモック
    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback({
        update: mockDb.update,
        delete: mockDb.delete
      })
    })

    // 関連時間割の更新
    mockDb.update.mockResolvedValue({ changes: 5 }) // 5つの時間割を更新
    // 教師の削除
    mockDb.delete.mockResolvedValue({ changes: 1 }) // 教師1人を削除

    const service = new TypeSafeTeacherService(mockDb as any)
    const result = await service.deleteTeacherWithConsistency(teacherId)

    expect(result).toEqual({
      teacherDeleted: true,
      timetablesUpdated: 5,
      transactionSuccess: true
    })

    expect(mockDb.transaction).toHaveBeenCalled()
    expect(mockDb.update).toHaveBeenCalledWith(
      'timetables',
      expect.objectContaining({
        teacherId: null // 関連する時間割のteacherIdをnullに設定
      })
    )
    expect(mockDb.delete).toHaveBeenCalledWith('teachers', teacherId)
  })
})
```

#### TC-SV-005-002: 時間割生成時の原子性保証
```typescript
/**
 * 分岐: 時間割生成と保存の原子性処理
 * 期待値: 全体成功 or 全体ロールバック
 */
it('時間割生成と保存を原子的に処理する', async () => {
  const constraints = { /* 制約条件 */ }
  const generatedTimetable = { /* 生成済み時間割 */ }

  mockDb.transaction.mockImplementation(async (callback) => {
    // 意図的にエラーを発生させてロールバックをテスト
    throw new Error('Database save failed')
  })

  const service = new TimetableGenerationService(mockDb as any)

  await expect(
    service.generateAndSaveTimetable(constraints)
  ).rejects.toThrow('Database save failed')

  // トランザクションが呼ばれたが、ロールバックされた
  expect(mockDb.transaction).toHaveBeenCalled()
})
```

---

## TC-SV-006: キャッシュとパフォーマンス最適化

### 目的
サービス層でのキャッシュ機能とパフォーマンス最適化検証

### テストケース

#### TC-SV-006-001: 学校設定キャッシュ
```typescript
/**
 * 分岐: 学校設定の読み取りキャッシュ
 * 期待値: 初回DB読み取り、2回目以降キャッシュ利用
 */
describe('Caching and Performance', () => {
  const mockCache = new Map()
  const mockDbHelper = {
    findFirst: vi.fn()
  }

  const service = new TypeSafeSchoolService(mockDbHelper as any, mockCache)

  it('学校設定を効率的にキャッシュする', async () => {
    const settingsData = {
      id: 'settings-1',
      schoolName: 'テスト中学校',
      periodsPerDay: 6
    }

    mockDbHelper.findFirst.mockResolvedValue(settingsData)

    // 1回目: データベースから読み取り
    const result1 = await service.getSchoolSettings()
    expect(result1).toEqual(expect.objectContaining(settingsData))
    expect(mockDbHelper.findFirst).toHaveBeenCalledTimes(1)

    // 2回目: キャッシュから読み取り
    const result2 = await service.getSchoolSettings()
    expect(result2).toEqual(expect.objectContaining(settingsData))
    expect(mockDbHelper.findFirst).toHaveBeenCalledTimes(1) // 増加しない

    // キャッシュヒット確認
    expect(mockCache.has('school-settings')).toBe(true)
  })
})
```

#### TC-SV-006-002: 教師一覧のページネーションキャッシュ
```typescript
/**
 * 分岐: ページネーション結果のキャッシュ最適化
 * 期待値: ページ単位でのキャッシュ、無効化処理
 */
it('教師一覧のページネーション結果をキャッシュする', async () => {
  const page1Results = {
    data: [{ id: '1', name: '教師1' }],
    pagination: { page: 1, total: 100 }
  }

  const page2Results = {
    data: [{ id: '2', name: '教師2' }],
    pagination: { page: 2, total: 100 }
  }

  mockDbHelper.findMany
    .mockResolvedValueOnce(page1Results)
    .mockResolvedValueOnce(page2Results)

  const service = new TypeSafeTeacherService(mockDbHelper as any, mockCache)

  // Page 1 キャッシュ
  await service.getTeachers({ page: 1, limit: 10 })
  expect(mockCache.has('teachers-page-1-limit-10')).toBe(true)

  // Page 2 キャッシュ
  await service.getTeachers({ page: 2, limit: 10 })
  expect(mockCache.has('teachers-page-2-limit-10')).toBe(true)

  // 新規教師作成でキャッシュ無効化
  await service.createTeacher({ name: '新規教師' })
  expect(mockCache.size).toBe(0) // 全キャッシュクリア
})
```

---

## カバレッジ要件

### 分岐カバレッジ 100%
- **条件分岐**: データ存在/不存在、バリデーション成功/失敗
- **エラーハンドリング**: データベースエラー、バリデーションエラー、ビジネスロジックエラー
- **最適化パス**: キャッシュヒット/ミス、並列処理、メモリ制限

### 機能カバレッジ 100%
- **CRUD操作**: Create, Read, Update, Delete の全パターン
- **ビジネスロジック**: 制約充足、最適化、依存関係チェック
- **パフォーマンス**: キャッシュ、並列処理、メモリ管理

### データパターンカバレッジ
- **正常データ**: 標準的な入力値での処理
- **境界値**: 最小/最大値、空配列/null値
- **異常データ**: 型不一致、制約違反、循環参照

## テスト実行環境

### モック設定
```typescript
// サービス層の依存関係モック
vi.mock('../db/type-safe-db-helper')
vi.mock('../db/database-connection')

// 外部サービスのモック
vi.mock('../external/ai-optimization-service')
vi.mock('../external/cache-service')
```

### パフォーマンステスト
```typescript
// 実行時間計測
const startTime = performance.now()
await service.method()
const endTime = performance.now()
expect(endTime - startTime).toBeLessThan(1000) // 1秒以内

// メモリ使用量監視
const memBefore = process.memoryUsage()
await service.heavyOperation()
const memAfter = process.memoryUsage()
expect(memAfter.heapUsed - memBefore.heapUsed).toBeLessThan(50 * 1024 * 1024) // 50MB増加以内
```

---

## 実装優先度

### Phase 1: 基盤サービステスト
1. TypeSafeDbHelper データベースヘルパー
2. TypeSafeSchoolService 学校管理
3. 基本的なCRUD操作とエラーハンドリング

### Phase 2: ビジネスロジックテスト
1. TypeSafeTeacherService 教師管理
2. 検索・フィルタ機能
3. 依存関係チェック

### Phase 3: 高度機能テスト
1. TimetableGenerationService AI時間割生成
2. 制約充足問題ソルバー
3. 最適化アルゴリズム

### Phase 4: システム統合テスト
1. トランザクション処理
2. データ整合性
3. パフォーマンス最適化
4. 完全カバレッジ達成