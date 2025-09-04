# 型安全システム統合テスト仕様書

## 目的

型安全性の向上に伴うシステム全体の統合テストを定義し、フロントエンド・バックエンド・データベース間のエンドツーエンドでの型安全性とデータフローの完全性を検証する。100％分岐カバレッジとシステム統合品質を保証する。

## テスト対象範囲

### 1. エンドツーエンド型安全性
- フロントエンド → バックエンドAPI → データベース
- 型安全APIクライアント（v2）→ 型安全コントローラー → 型安全サービス
- レスポンス型検証とエラーハンドリング統合

### 2. データフロー統合性
- CRUD操作の完全なライフサイクル
- 複雑なビジネスロジック（時間割生成）の統合フロー
- トランザクション処理とデータ整合性

### 3. 三層アーキテクチャ統合
- API v2（OpenAPI）、API Safe（レガシー互換）、API Legacy の相互運用
- 段階的移行シナリオでの一貫性
- エラープロパゲーションとレスポンス形式統一

---

## TC-INT-001: エンドツーエンド教師管理フロー

### 目的
教師CRUD操作のフロントエンド〜データベース間での完全な型安全性検証

### テストケース

#### TC-INT-001-001: 教師作成 完全フロー（成功）
```typescript
/**
 * 分岐: フロントエンド入力 → 型安全バリデーション → API v2 → サービス → DB → レスポンス
 * 期待値: エンドツーエンドでの型安全性保証、UI反映
 */
describe('End-to-End Teacher Management', () => {
  // 実際のデータベース接続を使用（テスト用DB）
  let testDb: Database
  let server: Server
  let page: Page

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    server = await startTestServer(testDb)
    page = await setupTestBrowser()
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDb)
    await server.close()
    await page.close()
  })

  it('教師作成の完全フローが型安全に動作する', async () => {
    // 1. フロントエンド: 教師追加ダイアログを開く
    await page.goto('http://localhost:3000/data-management')
    await page.click('button:has-text("教師を追加")')

    // 2. フロントエンド: 教師情報を入力
    const teacherData = {
      name: 'E2E統合テスト先生',
      subjects: ['数学', '物理'],
      grades: ['1', '2'],
      assignmentRestrictions: ['午前のみ']
    }

    await page.fill('input[name="name"]', teacherData.name)
    await page.selectOption('select[name="subjects"]', teacherData.subjects)
    await page.selectOption('select[name="grades"]', teacherData.grades)
    await page.fill('input[name="assignmentRestrictions"]', teacherData.assignmentRestrictions[0])

    // 3. API呼び出し監視
    const apiRequestPromise = page.waitForRequest(req => 
      req.url().includes('/api/school/teachers') && req.method() === 'POST'
    )

    const apiResponsePromise = page.waitForResponse(res => 
      res.url().includes('/api/school/teachers') && res.status() === 201
    )

    // 4. フロントエンド: 保存ボタンクリック
    await page.click('button:has-text("保存")')

    // 5. API呼び出し検証
    const apiRequest = await apiRequestPromise
    const requestPayload = await apiRequest.postDataJSON()
    
    expect(requestPayload).toEqual(expect.objectContaining({
      name: teacherData.name,
      subjects: teacherData.subjects,
      grades: teacherData.grades,
      assignmentRestrictions: teacherData.assignmentRestrictions
    }))

    // 6. API レスポンス検証
    const apiResponse = await apiResponsePromise
    const responseBody = await apiResponse.json()
    
    expect(responseBody).toEqual({
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        name: teacherData.name,
        subjects: teacherData.subjects,
        grades: teacherData.grades,
        assignmentRestrictions: teacherData.assignmentRestrictions,
        order: expect.any(Number)
      }),
      timestamp: expect.any(String),
      version: 'v2'
    })

    // 7. データベース直接検証
    const savedTeacher = await testDb
      .select()
      .from('teachers')
      .where('name', teacherData.name)
      .first()

    expect(savedTeacher).toEqual(expect.objectContaining({
      name: teacherData.name,
      subjects: JSON.stringify(teacherData.subjects),
      grades: JSON.stringify(teacherData.grades),
      assignmentRestrictions: JSON.stringify(teacherData.assignmentRestrictions)
    }))

    // 8. UI反映検証
    await expect(page.locator(`text=${teacherData.name}`)).toBeVisible()
    await expect(page.locator('text=数学')).toBeVisible()
    await expect(page.locator('text=物理')).toBeVisible()

    // 9. 成功トースト表示確認
    await expect(page.locator('text=教師を追加しました')).toBeVisible()
  })
})
```

#### TC-INT-001-002: 教師作成 バリデーションエラーフロー
```typescript
/**
 * 分岐: フロントエンド → バリデーションエラー → エラーレスポンス → UI エラー表示
 * 期待値: エラーハンドリングの型安全性、ユーザーフレンドリーエラー表示
 */
it('教師作成時のバリデーションエラーが適切に処理される', async () => {
  // 1. 無効なデータで教師作成を試行
  await page.click('button:has-text("教師を追加")')
  
  const invalidData = {
    name: '', // 空文字（無効）
    subjects: [], // 空配列（無効）
    grades: ['invalid-grade'] // 無効な学年
  }

  await page.fill('input[name="name"]', invalidData.name)
  // subjects と grades は選択しない（空のまま）

  // 2. API エラーレスポンス監視
  const apiResponsePromise = page.waitForResponse(res => 
    res.url().includes('/api/school/teachers') && res.status() === 400
  )

  await page.click('button:has-text("保存")')

  // 3. API バリデーションエラーレスポンス検証
  const apiResponse = await apiResponsePromise
  const errorResponse = await apiResponse.json()

  expect(errorResponse).toEqual({
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      message: 'バリデーションエラーが発生しました',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('必須')
        }),
        expect.objectContaining({
          field: 'subjects',
          message: expect.stringContaining('選択')
        })
      ])
    },
    timestamp: expect.any(String),
    version: 'v2'
  })

  // 4. UI エラー表示検証
  await expect(page.locator('text=バリデーションエラー')).toBeVisible()
  await expect(page.locator('text=教師名は必須です')).toBeVisible()
  await expect(page.locator('text=担当科目を選択してください')).toBeVisible()

  // 5. データベースに不正データが保存されていないことを確認
  const invalidTeachers = await testDb
    .select()
    .from('teachers')
    .where('name', '')

  expect(invalidTeachers).toHaveLength(0)
})
```

#### TC-INT-001-003: 教師更新 楽観的ロック制御
```typescript
/**
 * 分岐: 同時更新制御、楽観的ロック、競合状態処理
 * 期待値: データ整合性保持、競合エラーの適切な処理
 */
it('教師更新時の同時アクセス制御が正常に動作する', async () => {
  // 事前準備: テスト用教師を作成
  const testTeacher = await testDb.insert('teachers').values({
    name: '同時更新テスト先生',
    subjects: JSON.stringify(['数学']),
    grades: JSON.stringify(['1']),
    version: 1 // 楽観的ロック用バージョン
  }).returning()

  const teacherId = testTeacher[0].id

  // 1. 第1ユーザー: 教師編集開始
  await page.goto(`http://localhost:3000/data-management`)
  await page.click(`button[data-testid="edit-teacher-${teacherId}"]`)
  
  // 2. 第2ユーザー（別セッション）で同じ教師を更新
  const secondUserUpdate = await fetch(`http://localhost:3000/api/school/teachers/${teacherId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '第2ユーザー更新',
      subjects: ['物理'],
      version: 1 // 同じバージョン
    })
  })

  expect(secondUserUpdate.status).toBe(200)

  // 3. 第1ユーザー: 遅れて更新実行
  await page.fill('input[name="name"]', '第1ユーザー更新')
  
  const conflictResponsePromise = page.waitForResponse(res => 
    res.url().includes(`/api/school/teachers/${teacherId}`) && res.status() === 409
  )

  await page.click('button:has-text("保存")')

  // 4. 競合エラーレスポンス検証
  const conflictResponse = await conflictResponsePromise
  const conflictError = await conflictResponse.json()

  expect(conflictError).toEqual({
    success: false,
    error: {
      type: 'CONFLICT_ERROR',
      message: 'データが他のユーザーによって更新されています',
      currentVersion: 2,
      providedVersion: 1
    },
    timestamp: expect.any(String),
    version: 'v2'
  })

  // 5. UI 競合エラー表示検証
  await expect(page.locator('text=データが他のユーザーによって更新されています')).toBeVisible()
  await expect(page.locator('button:has-text("最新データを取得")')).toBeVisible()

  // 6. 最新データ取得機能テスト
  await page.click('button:has-text("最新データを取得")')
  
  await expect(page.locator('input[name="name"]')).toHaveValue('第2ユーザー更新')
})
```

---

## TC-INT-002: 時間割生成 統合フロー

### 目的
AI駆動時間割生成システムの完全な統合プロセス検証

### テストケース

#### TC-INT-002-001: 時間割生成 完全フロー（AI最適化）
```typescript
/**
 * 分岐: UI制約設定 → API制約バリデーション → AI生成エンジン → 結果保存 → UI表示
 * 期待値: 複雑な制約条件での完全な時間割生成プロセス
 */
describe('End-to-End Timetable Generation', () => {
  it('AI最適化モードでの完全な時間割生成フローが正常に動作する', async () => {
    // 事前準備: 必要な基礎データを作成
    const setupData = await setupTimetableTestData(testDb)
    
    // 1. 時間割生成画面に移動
    await page.goto('http://localhost:3000/timetable-generation')

    // 2. 制約条件設定
    const constraints = {
      teachers: setupData.teachers.map(t => t.id),
      subjects: setupData.subjects.map(s => s.id),
      classrooms: setupData.classrooms.map(c => c.id),
      periodsPerDay: 6,
      daysPerWeek: 5,
      complexConstraints: {
        teacherPreferences: {
          [setupData.teachers[0].id]: { preferredPeriods: [1, 2, 3] }
        },
        subjectConstraints: {
          '数学': { consecutivePeriods: 2, maxPerDay: 1 }
        }
      }
    }

    // UI での制約設定
    await page.selectOption('select[name="teachers"]', constraints.teachers)
    await page.selectOption('select[name="subjects"]', constraints.subjects)
    await page.selectOption('select[name="classrooms"]', constraints.classrooms)
    await page.fill('input[name="periodsPerDay"]', constraints.periodsPerDay.toString())
    await page.fill('input[name="daysPerWeek"]', constraints.daysPerWeek.toString())

    // 高度な制約設定
    await page.click('button:has-text("高度な制約設定")')
    await page.click(`checkbox[data-teacher-id="${setupData.teachers[0].id}"][data-period="1"]`)
    await page.click(`checkbox[data-teacher-id="${setupData.teachers[0].id}"][data-period="2"]`)

    // AI最適化モード選択
    await page.selectOption('select[name="generationMethod"]', 'ai-enhanced')
    await page.selectOption('select[name="optimizationLevel"]', 'maximum')

    // 3. 生成開始
    const generationRequestPromise = page.waitForRequest(req => 
      req.url().includes('/api/timetables/generate') && req.method() === 'POST'
    )

    await page.click('button:has-text("時間割を生成")')

    // 4. 生成リクエスト検証
    const generationRequest = await generationRequestPromise
    const requestPayload = await generationRequest.postDataJSON()

    expect(requestPayload).toEqual({
      constraints: expect.objectContaining({
        teachers: constraints.teachers,
        subjects: constraints.subjects,
        periodsPerDay: 6,
        daysPerWeek: 5,
        complexConstraints: expect.objectContaining({
          teacherPreferences: expect.any(Object)
        })
      }),
      options: expect.objectContaining({
        method: 'ai-enhanced',
        optimizationLevel: 'maximum'
      })
    })

    // 5. 生成プロセス監視（プログレスバー）
    await expect(page.locator('text=時間割を生成中...')).toBeVisible()
    await expect(page.locator('[role="progressbar"]')).toBeVisible()

    // 6. 生成完了待機（最大2分）
    const generationResponsePromise = page.waitForResponse(res => 
      res.url().includes('/api/timetables/generate'), 
      { timeout: 120000 }
    )

    const generationResponse = await generationResponsePromise
    const generationResult = await generationResponse.json()

    // 7. 生成結果検証
    expect(generationResult).toEqual({
      success: true,
      data: expect.objectContaining({
        timetable: expect.any(Array), // 3次元配列
        statistics: expect.objectContaining({
          totalSlots: expect.any(Number),
          filledSlots: expect.any(Number),
          fillRate: expect.any(Number),
          conflictCount: 0, // AI最適化で競合ゼロ期待
          optimizationScore: expect.any(Number),
          aiMetrics: expect.objectContaining({
            convergenceRate: expect.any(Number),
            iterationsUsed: expect.any(Number)
          })
        }),
        method: 'ai-enhanced',
        generatedAt: expect.any(String)
      }),
      timestamp: expect.any(String),
      version: 'v2'
    })

    // 8. 統計情報UI表示検証
    await expect(page.locator('text=生成完了')).toBeVisible()
    await expect(page.locator(`text=充填率: ${generationResult.data.statistics.fillRate * 100}%`)).toBeVisible()
    await expect(page.locator(`text=最適化スコア: ${generationResult.data.statistics.optimizationScore}`)).toBeVisible()
    await expect(page.locator('text=競合数: 0')).toBeVisible()

    // 9. 時間割テーブル表示検証
    const timetableTable = page.locator('table[data-testid="timetable-display"]')
    await expect(timetableTable).toBeVisible()

    // 各セルに適切な授業情報が表示されているか確認
    const firstPeriodCell = timetableTable.locator('td[data-day="0"][data-period="0"]')
    await expect(firstPeriodCell).toContainText(expect.any(String)) // 教師名 or 科目名

    // 10. データベース保存検証
    const savedTimetables = await testDb
      .select()
      .from('timetables')
      .where('method', 'ai-enhanced')
      .orderBy('createdAt', 'desc')
      .limit(1)

    expect(savedTimetables).toHaveLength(1)
    expect(savedTimetables[0]).toEqual(expect.objectContaining({
      timetable: expect.any(String), // JSON文字列
      statistics: expect.any(String), // JSON文字列
      method: 'ai-enhanced'
    }))

    // 11. 制約充足確認
    const savedTimetable = JSON.parse(savedTimetables[0].timetable)
    
    // 教師の優先時限制約が守られているか確認
    const teacherSlots = findTeacherSlots(savedTimetable, setupData.teachers[0].id)
    const preferredPeriodSlots = teacherSlots.filter(slot => 
      [1, 2, 3].includes(slot.period)
    )
    
    expect(preferredPeriodSlots.length).toBeGreaterThan(0) // 優先時限に割り当てられている
  })
})
```

#### TC-INT-002-002: 時間割生成失敗処理
```typescript
/**
 * 分岐: 制約条件不満 → 生成失敗 → エラーハンドリング → 改善提案表示
 * 期待値: 適切な失敗処理とユーザー支援機能
 */
it('制約条件を満たせない場合の失敗処理が適切に動作する', async () => {
  // 1. 実現不可能な制約条件を設定
  const impossibleConstraints = {
    teachers: [setupData.teachers[0].id], // 教師1人
    subjects: setupData.subjects.map(s => s.id), // 全科目（6科目）
    classrooms: setupData.classrooms.map(c => c.id), // 全教室（3教室）
    periodsPerDay: 6,
    daysPerWeek: 5
    // 1人で6科目×3教室分は不可能
  }

  await page.selectOption('select[name="teachers"]', impossibleConstraints.teachers)
  await page.selectOption('select[name="subjects"]', impossibleConstraints.subjects)
  await page.selectOption('select[name="classrooms"]', impossibleConstraints.classrooms)

  // 2. 生成実行
  const failureResponsePromise = page.waitForResponse(res => 
    res.url().includes('/api/timetables/generate') && res.status() === 422
  )

  await page.click('button:has-text("時間割を生成")')

  // 3. 失敗レスポンス検証
  const failureResponse = await failureResponsePromise
  const failureResult = await failureResponse.json()

  expect(failureResult).toEqual({
    success: false,
    data: expect.objectContaining({
      success: false,
      message: '制約条件を満たす時間割の生成ができませんでした',
      failureReason: 'INSUFFICIENT_TEACHERS',
      conflicts: expect.any(Number),
      suggestions: expect.arrayContaining([
        '教師数を増やしてください',
        '1日あたりの授業数を減らしてください',
        'クラス数を減らしてください'
      ])
    }),
    timestamp: expect.any(String),
    version: 'v2'
  })

  // 4. UI 失敗表示検証
  await expect(page.locator('text=時間割の生成に失敗しました')).toBeVisible()
  await expect(page.locator('text=制約条件を満たすことができませんでした')).toBeVisible()

  // 5. 改善提案表示検証
  await expect(page.locator('text=改善提案')).toBeVisible()
  await expect(page.locator('text=教師数を増やしてください')).toBeVisible()
  await expect(page.locator('text=1日あたりの授業数を減らしてください')).toBeVisible()

  // 6. 制約条件自動調整機能テスト
  await page.click('button:has-text("自動調整を適用")')
  
  // 自動調整後の制約条件が表示される
  const adjustedTeachers = await page.locator('select[name="teachers"]').inputValue()
  const adjustedPeriods = await page.locator('input[name="periodsPerDay"]').inputValue()
  
  expect(adjustedTeachers.split(',')).toHaveLength(2) // 教師数が増加
  expect(parseInt(adjustedPeriods)).toBeLessThan(6) // 時限数が減少
})
```

---

## TC-INT-003: 三層アーキテクチャ統合

### 目的
API v2、API Safe、API Legacy の三層構成での相互運用性と移行シナリオ検証

### テストケース

#### TC-INT-003-001: レガシーAPI互換性
```typescript
/**
 * 分岐: レガシークライアント → API Safe → 型安全サービス → レスポンス変換
 * 期待値: レガシー互換性保持、型安全性内部実装
 */
describe('Three-Tier API Architecture Integration', () => {
  it('レガシーAPIクライアントが型安全バックエンドと正常に連携する', async () => {
    // 1. レガシー形式でのAPIリクエスト
    const legacyRequest = {
      method: 'POST',
      url: '/api/frontend/school/teachers', // レガシーエンドポイント
      body: {
        name: 'レガシーAPI教師',
        subjects: 'mathematical', // レガシー形式（文字列）
        grades: '1,2', // レガシー形式（カンマ区切り）
        restrictions: 'morning_only' // レガシー形式
      }
    }

    const response = await fetch(`http://localhost:3000${legacyRequest.url}`, {
      method: legacyRequest.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyRequest.body)
    })

    // 2. レガシーレスポンス形式検証
    expect(response.status).toBe(200)
    const responseBody = await response.json()

    expect(responseBody).toEqual({
      success: true,
      teacher: expect.objectContaining({
        id: expect.any(String),
        name: 'レガシーAPI教師',
        subjects: 'mathematical', // レガシー形式で返却
        grades: '1,2',
        restrictions: 'morning_only'
      })
    })

    // 3. 内部的には型安全処理されていることを確認
    const savedTeacher = await testDb
      .select()
      .from('teachers')
      .where('name', 'レガシーAPI教師')
      .first()

    expect(savedTeacher).toEqual(expect.objectContaining({
      subjects: JSON.stringify(['数学']), // 内部では配列形式で保存
      grades: JSON.stringify(['1', '2']),
      assignmentRestrictions: JSON.stringify(['午前のみ'])
    }))
  })
})
```

#### TC-INT-003-002: 段階的移行シナリオ
```typescript
/**
 * 分岐: 同一データを異なるAPI層で操作、データ整合性保持
 * 期待値: API層間でのデータ一貫性、移行期の安定性
 */
it('同一データを異なるAPI層で操作しても整合性が保たれる', async () => {
  // 1. API v2 で教師作成
  const v2CreateResponse = await fetch('http://localhost:3000/api/school/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '移行テスト教師',
      subjects: ['数学', '物理'],
      grades: ['1', '2'],
      assignmentRestrictions: ['午前のみ']
    })
  })

  expect(v2CreateResponse.status).toBe(201)
  const v2Teacher = await v2CreateResponse.json()
  const teacherId = v2Teacher.data.id

  // 2. レガシーAPI で同じ教師を更新
  const legacyUpdateResponse = await fetch(`http://localhost:3000/api/frontend/school/teachers/${teacherId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '移行テスト教師（更新）',
      subjects: 'chemistry,biology', // レガシー形式
      grades: '2,3',
      restrictions: 'afternoon_only'
    })
  })

  expect(legacyUpdateResponse.status).toBe(200)

  // 3. API v2 で読み取り、データ一貫性確認
  const v2ReadResponse = await fetch(`http://localhost:3000/api/school/teachers/${teacherId}`)
  const v2ReadData = await v2ReadResponse.json()

  expect(v2ReadData.data).toEqual(expect.objectContaining({
    id: teacherId,
    name: '移行テスト教師（更新）',
    subjects: ['化学', '生物'], // 正規化済み
    grades: ['2', '3'],
    assignmentRestrictions: ['午後のみ']
  }))

  // 4. データベース直接確認
  const dbTeacher = await testDb
    .select()
    .from('teachers')
    .where('id', teacherId)
    .first()

  expect(dbTeacher).toEqual(expect.objectContaining({
    name: '移行テスト教師（更新）',
    subjects: JSON.stringify(['化学', '生物']),
    grades: JSON.stringify(['2', '3']),
    assignmentRestrictions: JSON.stringify(['午後のみ'])
  }))
})
```

#### TC-INT-003-003: エラーハンドリング統一性
```typescript
/**
 * 分岐: 各API層でのエラーハンドリング統一性検証
 * 期待値: API層によらない一貫したエラー処理
 */
it('各API層で一貫したエラーハンドリングが提供される', async () => {
  const invalidData = {
    name: '', // 空文字（無効）
    subjects: [], // 空配列（無効）
  }

  // 1. API v2 でのバリデーションエラー
  const v2ErrorResponse = await fetch('http://localhost:3000/api/school/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidData)
  })

  expect(v2ErrorResponse.status).toBe(400)
  const v2Error = await v2ErrorResponse.json()

  expect(v2Error).toEqual({
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      message: 'バリデーションエラーが発生しました',
      details: expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'subjects' })
      ])
    },
    timestamp: expect.any(String),
    version: 'v2'
  })

  // 2. レガシーAPI でのバリデーションエラー（同じ内容を異なる形式で）
  const legacyErrorResponse = await fetch('http://localhost:3000/api/frontend/school/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '',
      subjects: '', // レガシー形式での空文字
      grades: ''
    })
  })

  expect(legacyErrorResponse.status).toBe(400)
  const legacyError = await legacyErrorResponse.json()

  // レガシー形式でも構造化されたエラー情報を提供
  expect(legacyError).toEqual({
    success: false,
    error: 'バリデーションエラーが発生しました',
    details: expect.arrayContaining([
      expect.stringContaining('教師名'),
      expect.stringContaining('担当科目')
    ])
  })

  // 3. 内部的には同じバリデーションロジックが使用されていることを確認
  // （ログやメトリクスで検証可能）
})
```

---

## TC-INT-004: パフォーマンス統合テスト

### 目的
実際のデータ量とユーザー操作でのシステム性能検証

### テストケース

#### TC-INT-004-001: 大量データでの応答性能
```typescript
/**
 * 分岐: 大量データ環境での各種操作性能測定
 * 期待値: 応答時間SLA遵守、UI応答性維持
 */
describe('Performance Integration Tests', () => {
  beforeAll(async () => {
    // 大量テストデータ生成
    await generateLargeTestDataset(testDb, {
      teachers: 100,
      subjects: 20,
      classrooms: 50,
      timetables: 10
    })
  })

  it('大量データ環境での教師一覧読み込み性能', async () => {
    const startTime = performance.now()
    
    // 1. 教師管理画面に移動
    await page.goto('http://localhost:3000/data-management')

    // 2. 初期データ読み込み完了待機
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    const loadTime = performance.now() - startTime

    // 3. 応答時間要件確認（3秒以内）
    expect(loadTime).toBeLessThan(3000)

    // 4. ページネーション性能確認
    const paginationStartTime = performance.now()
    
    await page.click('button:has-text("次のページ")')
    await page.waitForSelector('table tbody tr[data-page="2"]')
    
    const paginationTime = performance.now() - paginationStartTime
    expect(paginationTime).toBeLessThan(1000) // 1秒以内

    // 5. 検索性能確認
    const searchStartTime = performance.now()
    
    await page.fill('input[name="search"]', '田中')
    await page.waitForSelector('table tbody tr[data-filtered="true"]')
    
    const searchTime = performance.now() - searchStartTime
    expect(searchTime).toBeLessThan(500) // 0.5秒以内
  })
})
```

#### TC-INT-004-002: 並行ユーザー操作
```typescript
/**
 * 分岐: 複数ユーザーの同時操作、リソース競合
 * 期待値: 同時アクセス時の安定性、データ整合性
 */
it('複数ユーザーの同時操作でも安定性が保たれる', async () => {
  const userCount = 5
  const browsers = await Promise.all(
    Array.from({ length: userCount }, () => setupTestBrowser())
  )

  try {
    // 1. 全ユーザーが同時に教師管理画面にアクセス
    await Promise.all(
      browsers.map((browser, index) => 
        browser.goto(`http://localhost:3000/data-management?user=${index}`)
      )
    )

    // 2. 同時に教師作成操作
    const creationPromises = browsers.map(async (browser, index) => {
      await browser.click('button:has-text("教師を追加")')
      await browser.fill('input[name="name"]', `並行テスト教師${index}`)
      await browser.selectOption('select[name="subjects"]', ['数学'])
      await browser.selectOption('select[name="grades"]', ['1'])
      
      const startTime = performance.now()
      await browser.click('button:has-text("保存")')
      await browser.waitForSelector(`text=並行テスト教師${index}`)
      
      return performance.now() - startTime
    })

    const creationTimes = await Promise.all(creationPromises)

    // 3. 全操作が正常完了し、性能要件を満たすことを確認
    creationTimes.forEach(time => {
      expect(time).toBeLessThan(3000) // 3秒以内
    })

    // 4. データベースで全教師が正しく作成されていることを確認
    const createdTeachers = await testDb
      .select()
      .from('teachers')
      .where('name', 'like', '並行テスト教師%')

    expect(createdTeachers).toHaveLength(userCount)

    // 5. データ重複や競合状態がないことを確認
    const teacherNames = createdTeachers.map(t => t.name)
    const uniqueNames = [...new Set(teacherNames)]
    expect(uniqueNames).toHaveLength(userCount) // 重複なし

  } finally {
    // クリーンアップ
    await Promise.all(browsers.map(browser => browser.close()))
  }
})
```

---

## TC-INT-005: セキュリティ統合テスト

### 目的
認証・認可・データ保護の統合セキュリティ検証

### テストケース

#### TC-INT-005-001: 認証フロー統合
```typescript
/**
 * 分岐: 認証なし → リダイレクト → 認証後 → API アクセス許可
 * 期待値: 適切な認証フロー、セキュアなAPI アクセス制御
 */
describe('Security Integration Tests', () => {
  it('認証フローとAPI アクセス制御が正常に動作する', async () => {
    // 1. 未認証状態でのアクセス試行
    await page.goto('http://localhost:3000/data-management')
    
    // 認証画面にリダイレクトされることを確認
    await expect(page.url()).toContain('/auth/login')
    
    // 2. API への直接アクセス試行（未認証）
    const unauthorizedResponse = await page.evaluate(async () => {
      return await fetch('/api/school/teachers').then(res => res.status)
    })
    
    expect(unauthorizedResponse).toBe(401) // Unauthorized

    // 3. 認証実行
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL)
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD)
    await page.click('button:has-text("ログイン")')

    // 4. 認証成功後、対象画面にリダイレクト
    await page.waitForURL('**/data-management')
    
    // 5. 認証後のAPI アクセス成功確認
    const authorizedResponse = await page.evaluate(async () => {
      return await fetch('/api/school/teachers').then(res => res.status)
    })
    
    expect(authorizedResponse).toBe(200) // OK

    // 6. トークンの適切な管理確認
    const tokenData = await page.evaluate(() => {
      return {
        hasAuthCookie: document.cookie.includes('auth-token'),
        hasLocalStorage: localStorage.getItem('auth-token') !== null
      }
    })
    
    expect(tokenData.hasAuthCookie || tokenData.hasLocalStorage).toBe(true)
  })
})
```

#### TC-INT-005-002: データアクセス制御
```typescript
/**
 * 分岐: 権限レベル別のデータアクセス制御検証
 * 期待値: 適切な認可制御、不正アクセスの防止
 */
it('権限レベル別のデータアクセス制御が正常に動作する', async () => {
  // テスト用の異なる権限レベルユーザーでテスト
  const testUsers = [
    { email: 'admin@test.com', password: 'admin123', role: 'admin' },
    { email: 'teacher@test.com', password: 'teacher123', role: 'teacher' },
    { email: 'viewer@test.com', password: 'viewer123', role: 'viewer' }
  ]

  for (const user of testUsers) {
    // 1. ユーザーでログイン
    await page.goto('http://localhost:3000/auth/login')
    await page.fill('input[name="email"]', user.email)
    await page.fill('input[name="password"]', user.password)
    await page.click('button:has-text("ログイン")')

    await page.waitForURL('**/data-management')

    // 2. 権限に応じたUI要素の表示制御確認
    if (user.role === 'admin') {
      await expect(page.locator('button:has-text("教師を追加")')).toBeVisible()
      await expect(page.locator('button[data-testid^="delete-teacher"]')).toBeVisible()
    } else if (user.role === 'teacher') {
      await expect(page.locator('button:has-text("教師を追加")')).toBeVisible()
      await expect(page.locator('button[data-testid^="delete-teacher"]')).not.toBeVisible()
    } else { // viewer
      await expect(page.locator('button:has-text("教師を追加")')).not.toBeVisible()
      await expect(page.locator('button[data-testid^="delete-teacher"]')).not.toBeVisible()
    }

    // 3. API レベルでの権限制御確認
    if (user.role !== 'admin') {
      const deleteResponse = await page.evaluate(async () => {
        return await fetch('/api/school/teachers/test-id', {
          method: 'DELETE'
        }).then(res => res.status)
      })
      
      expect(deleteResponse).toBe(403) // Forbidden
    }

    // 4. ログアウト
    await page.click('button:has-text("ログアウト")')
    await page.waitForURL('**/auth/login')
  }
})
```

---

## カバレッジ要件

### エンドツーエンドカバレッジ 100%
- **ユーザージャーニー**: 全主要機能の完全なフロー
- **エラーシナリオ**: 予想される全エラーパターン
- **エッジケース**: 境界値、異常データ、ネットワーク障害

### システム統合カバレッジ 100%
- **レイヤー間通信**: フロントエンド ↔ API ↔ サービス ↔ DB
- **データ変換**: 型安全性保証、レガシー互換性
- **トランザクション**: 複数テーブル更新、ロールバック処理

### パフォーマンスカバレッジ
- **応答時間**: 全API エンドポイント 3秒以内
- **スループット**: 同時ユーザー 100人以上
- **リソース使用量**: メモリ 512MB以内、CPU 80%以内

## テスト実行環境

### 統合テスト専用環境
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15
    environment:
      POSTGRES_DB: school_timetable_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"
  
  test-app:
    build: .
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@test-db:5432/school_timetable_test
      NODE_ENV: test
    ports:
      - "3001:3000"
    depends_on:
      - test-db
```

### データ生成ユーティリティ
```typescript
// test/utils/data-generation.ts
export async function generateLargeTestDataset(db: Database, config: {
  teachers: number
  subjects: number
  classrooms: number
  timetables: number
}) {
  // 大量データ生成ロジック
}

export async function setupTimetableTestData(db: Database) {
  // 時間割テスト用の基礎データセットアップ
}
```

---

## 実装優先度

### Phase 1: 基本統合テスト
1. 教師管理 エンドツーエンドフロー
2. API 三層アーキテクチャ統合
3. 基本的な認証・認可フロー

### Phase 2: 高度機能統合テスト
1. 時間割生成 完全フロー
2. 並行処理・パフォーマンステスト
3. エラーハンドリング統合

### Phase 3: セキュリティ・品質保証
1. セキュリティ統合テスト
2. データ整合性・トランザクション
3. 障害回復・可用性テスト

### Phase 4: 完全統合品質保証
1. 本番環境同等負荷テスト
2. 完全カバレッジ達成確認
3. リリース準備完了検証