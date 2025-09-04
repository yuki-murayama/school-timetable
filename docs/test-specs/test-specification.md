# 学校時間割管理システム - テスト仕様書

## 1. テスト概要

### 1.1 テスト目的
- システムの品質保証と信頼性確保
- 設計書との一致性検証
- リグレッション防止
- パフォーマンス・セキュリティ要件の検証

### 1.2 テスト戦略
- **テスト駆動開発**: 実装前にテスト仕様確定
- **階層テスト**: 単体→統合→E2E の段階的検証
- **継続的テスト**: CI/CD パイプライン統合
- **自動化重視**: 手動テストの最小化

### 1.3 テストレベル
```
E2E テスト (Playwright)      ← ユーザーシナリオベース
       ↑
統合テスト (Vitest)          ← API・DB統合検証
       ↑
単体テスト (Vitest)          ← 個別機能検証
```

### 1.4 品質目標
- **コードカバレッジ**: 80%以上
- **API応答時間**: 95%が200ms以内
- **フロントエンド性能**: Core Web Vitals 全項目クリア
- **セキュリティ**: OWASP Top 10 対策完了

## 2. 単体テスト仕様

### 2.1 フロントエンド単体テスト

#### 2.1.1 認証フック (use-auth.ts)
```typescript
describe('useAuth Hook', () => {
  describe('認証状態管理', () => {
    test('初期状態は未認証である', () => {
      // Given: 未認証状態
      const { result } = renderHook(() => useAuth())
      
      // Then: 認証状態は false
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
    })

    test('Clerkログイン成功時に認証状態が更新される', async () => {
      // Given: Clerkログイン成功
      const mockUser = createMockClerkUser()
      mockUseUser.mockReturnValue({ isSignedIn: true, user: mockUser })
      
      // When: フックを実行
      const { result } = renderHook(() => useAuth())
      await waitFor(() => result.current.isAuthenticated)
      
      // Then: 認証状態が更新される
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.email).toBe(mockUser.emailAddresses[0].emailAddress)
      expect(result.current.token).toBeTruthy()
    })

    test('トークンリフレッシュが正常に動作する', async () => {
      // Given: 期限切れトークン
      const expiredToken = 'expired.jwt.token'
      mockGetToken.mockResolvedValueOnce('fresh.jwt.token')
      
      // When: フレッシュトークン取得
      const { result } = renderHook(() => useAuth())
      const freshToken = await result.current.getFreshToken()
      
      // Then: 新しいトークンが返される
      expect(freshToken).toBe('fresh.jwt.token')
      expect(mockGetToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('エラーハンドリング', () => {
    test('トークン取得失敗時はnullを返す', async () => {
      // Given: トークン取得失敗
      mockGetToken.mockRejectedValueOnce(new Error('Token fetch failed'))
      
      // When: フレッシュトークン取得
      const { result } = renderHook(() => useAuth())
      const token = await result.current.getFreshToken()
      
      // Then: nullが返される
      expect(token).toBe(null)
    })
  })
})
```

#### 2.1.2 APIクライアント (api/client.ts)
```typescript
describe('APIClient', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  describe('GET要求', () => {
    test('正常レスポンス時はデータを返す', async () => {
      // Given: 成功レスポンス
      const mockData = { id: '1', name: 'テストデータ' }
      fetchMock.mockResponseOnce(JSON.stringify({ success: true, data: mockData }))
      
      // When: GET要求実行
      const result = await apiClient.get<any>('/test-endpoint')
      
      // Then: データが返される
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test-endpoint',
        expect.objectContaining({ method: undefined })
      )
    })

    test('401エラー時はトークンリフレッシュを試行する', async () => {
      // Given: 初回401、リフレッシュ後成功
      fetchMock
        .mockResponseOnce('Unauthorized', { status: 401 })
        .mockResponseOnce(JSON.stringify({ success: true, data: 'success' }))
      
      const mockGetFreshToken = jest.fn().mockResolvedValue('fresh-token')
      
      // When: GET要求実行（リフレッシュ付き）
      const result = await apiClient.get('/test-endpoint', { 
        getFreshToken: mockGetFreshToken 
      })
      
      // Then: リフレッシュ後成功
      expect(result).toBe('success')
      expect(mockGetFreshToken).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('POST要求', () => {
    test('JSONデータを正常に送信する', async () => {
      // Given: POST データ
      const postData = { name: '新規データ', value: 123 }
      fetchMock.mockResponseOnce(JSON.stringify({ success: true, data: postData }))
      
      // When: POST要求実行
      const result = await apiClient.post('/test-endpoint', postData)
      
      // Then: データが送信される
      expect(result).toEqual(postData)
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })
  })
})
```

#### 2.1.3 時間割グリッドコンポーネント (TimetableGrid.tsx)
```typescript
describe('TimetableGrid Component', () => {
  const mockTimetableData = [
    {
      classId: '1-A',
      className: '1年A組',
      schedule: [
        { day: 0, period: 1, subject: '数学', teacher: '田中', classroom: '1-A' },
        { day: 0, period: 2, subject: '国語', teacher: '佐藤', classroom: '1-A' }
      ]
    }
  ]

  test('時間割データが正常に表示される', () => {
    // When: コンポーネントをレンダリング
    render(<TimetableGrid data={mockTimetableData} />)
    
    // Then: データが表示される
    expect(screen.getByText('1年A組')).toBeInTheDocument()
    expect(screen.getByText('数学')).toBeInTheDocument()
    expect(screen.getByText('田中')).toBeInTheDocument()
  })

  test('制約違反がある時は警告色で表示される', () => {
    // Given: 制約違反データ
    const violationData = [{
      ...mockTimetableData[0],
      schedule: [{
        ...mockTimetableData[0].schedule[0],
        hasViolation: true,
        violationSeverity: 'high'
      }]
    }]
    
    // When: レンダリング
    render(<TimetableGrid data={violationData} />)
    
    // Then: 警告スタイルが適用される
    const violationSlot = screen.getByText('数学').closest('.timetable-slot')
    expect(violationSlot).toHaveClass('bg-red-100', 'border-red-500')
  })

  test('ドラッグ&ドロップが正常に動作する', async () => {
    // Given: ドラッグ可能な設定
    const mockOnSlotChange = jest.fn()
    render(
      <TimetableGrid 
        data={mockTimetableData} 
        editable={true}
        onSlotChange={mockOnSlotChange}
      />
    )
    
    // When: ドラッグ&ドロップ実行
    const sourceSlot = screen.getByText('数学').closest('[draggable="true"]')
    const targetSlot = screen.getAllByText('空き')[0]
    
    fireEvent.dragStart(sourceSlot!)
    fireEvent.dragOver(targetSlot)
    fireEvent.drop(targetSlot)
    
    // Then: 変更コールバックが呼ばれる
    expect(mockOnSlotChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.any(Object),
        to: expect.any(Object)
      })
    )
  })
})
```

### 2.2 バックエンド単体テスト

#### 2.2.1 時間割生成オーケストレータ (TimetableOrchestrator.ts)
```typescript
describe('TimetableOrchestrator', () => {
  let orchestrator: TimetableOrchestrator
  let mockDb: D1Database

  beforeEach(() => {
    mockDb = createMockD1Database()
    orchestrator = new TimetableOrchestrator(mockDb)
  })

  describe('時間割生成', () => {
    test('標準モードで時間割を生成する', async () => {
      // Given: 基本データ
      mockDb.prepare.mockReturnValueOnce({
        all: jest.fn().mockResolvedValue({
          results: [mockSchoolSettings, mockTeachers, mockSubjects, mockClassrooms]
        })
      })

      // When: 標準生成実行
      const result = await orchestrator.generateTimetable({ 
        useOptimization: false 
      })

      // Then: 成功結果が返される
      expect(result.success).toBe(true)
      expect(result.timetable).toBeDefined()
      expect(result.statistics?.assignedSlots).toBeGreaterThan(0)
    })

    test('最適化モードで複数回試行する', async () => {
      // Given: 最適化設定
      const spyGenerate = jest.spyOn(TimetableGenerator.prototype, 'generateTimetable')
      spyGenerate
        .mockResolvedValueOnce({ success: true, statistics: { assignedSlots: 100, totalSlots: 150 } })
        .mockResolvedValueOnce({ success: true, statistics: { assignedSlots: 120, totalSlots: 150 } })
        .mockResolvedValueOnce({ success: true, statistics: { assignedSlots: 140, totalSlots: 150 } })

      // When: 最適化生成実行
      const result = await orchestrator.generateTimetable({ 
        useOptimization: true 
      })

      // Then: 複数回試行し最良解を選択
      expect(spyGenerate).toHaveBeenCalledTimes(3)
      expect(result.statistics?.bestAssignmentRate).toBeCloseTo(93.3, 1) // 140/150
    })

    test('データ不足時はエラーを発生させる', async () => {
      // Given: 教師データなし
      mockDb.prepare.mockReturnValueOnce({
        all: jest.fn().mockResolvedValue({ results: [] })
      })

      // When/Then: エラーが発生する
      await expect(
        orchestrator.generateTimetable()
      ).rejects.toThrow('教師データが登録されていません')
    })
  })
})
```

#### 2.2.2 制約チェッカー (ConstraintChecker.ts)
```typescript
describe('ConstraintChecker', () => {
  let checker: ConstraintChecker
  let mockTimetable: TimetableSlot[][][]

  beforeEach(() => {
    checker = new ConstraintChecker()
    mockTimetable = createEmptyTimetable()
  })

  describe('教師競合チェック', () => {
    test('同一時間に同じ教師が割り当てられている場合は違反とする', () => {
      // Given: 同一時間・同一教師の割り当て
      const teacher = createMockTeacher('teacher_001')
      const slot1 = createTimetableSlot(1, 'A', '月曜', 1, { teacher })
      const slot2 = createTimetableSlot(2, 'A', '月曜', 1, { teacher })
      
      mockTimetable[0][0][0] = slot1 // 1年A組 月曜1限
      mockTimetable[0][0][1] = slot2 // 2年A組 月曜1限

      // When: 制約チェック実行
      const result = checker.checkTeacherConflicts(mockTimetable)

      // Then: 競合エラーが検出される
      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('teacher_conflict')
      expect(result.violations[0].severity).toBe('critical')
    })

    test('異なる時間の同じ教師割り当ては問題なし', () => {
      // Given: 異なる時間・同一教師の割り当て
      const teacher = createMockTeacher('teacher_001')
      const slot1 = createTimetableSlot(1, 'A', '月曜', 1, { teacher })
      const slot2 = createTimetableSlot(1, 'A', '月曜', 2, { teacher })
      
      mockTimetable[0][0][0] = slot1 // 月曜1限
      mockTimetable[0][1][0] = slot2 // 月曜2限

      // When: 制約チェック実行
      const result = checker.checkTeacherConflicts(mockTimetable)

      // Then: エラーなし
      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('時間制限チェック', () => {
    test('教師の割当制限時間は違反として検出する', () => {
      // Given: 制限時間での割り当て
      const restriction: AssignmentRestriction = {
        restrictedDay: '月曜',
        restrictedPeriods: [1, 2],
        restrictionLevel: '必須'
      }
      const teacher = createMockTeacher('teacher_001', { restrictions: [restriction] })
      const slot = createTimetableSlot(1, 'A', '月曜', 1, { teacher })
      mockTimetable[0][0][0] = slot

      // When: 制約チェック実行
      const result = checker.checkTimeRestrictions(mockTimetable)

      // Then: 時間制限違反が検出される
      expect(result.isValid).toBe(false)
      expect(result.violations[0].type).toBe('time_restriction')
    })
  })
})
```

## 3. 統合テスト仕様

### 3.1 API統合テスト

#### 3.1.1 認証API統合テスト
```typescript
describe('Auth API Integration', () => {
  let testApp: Hono
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = createMockEnv()
    testApp = createTestApp(mockEnv)
  })

  describe('JWT認証フロー', () => {
    test('有効なJWTトークンで認証が成功する', async () => {
      // Given: 有効なJWTトークン
      const validToken = await createValidJWT(mockEnv.VITE_CLERK_PUBLISHABLE_KEY)
      
      // When: 認証が必要なエンドポイントにアクセス
      const res = await testApp.request('/api/frontend/school/settings', {
        headers: { 'Authorization': `Bearer ${validToken}` }
      })

      // Then: 成功レスポンス
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    test('無効なトークンは401エラーを返す', async () => {
      // Given: 無効なJWTトークン
      const invalidToken = 'invalid.jwt.token'
      
      // When: 認証エンドポイントにアクセス
      const res = await testApp.request('/api/frontend/school/settings', {
        headers: { 'Authorization': `Bearer ${invalidToken}` }
      })

      // Then: 401エラー
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('権限チェック', () => {
    test('admin権限が必要なエンドポイントは一般ユーザーを拒否する', async () => {
      // Given: 一般ユーザートークン
      const userToken = await createUserJWT({ roles: ['teacher'] })
      
      // When: admin専用エンドポイントにアクセス
      const res = await testApp.request('/api/frontend/school/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({ grade1Classes: 5 })
      })

      // Then: 403エラー
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Insufficient permissions')
    })
  })
})
```

#### 3.1.2 教師CRUD統合テスト
```typescript
describe('Teacher CRUD API Integration', () => {
  let testApp: Hono
  let adminToken: string
  let testDb: D1Database

  beforeEach(async () => {
    testDb = await createTestDatabase()
    testApp = createTestApp({ ...mockEnv, DB: testDb })
    adminToken = await createAdminJWT()
  })

  afterEach(async () => {
    await cleanupTestDatabase(testDb)
  })

  describe('教師作成', () => {
    test('有効なデータで教師を作成する', async () => {
      // Given: 有効な教師データ
      const teacherData = {
        name: '山田太郎',
        subjects: ['math', 'science'],
        grades: [1, 2],
        assignmentRestrictions: []
      }

      // When: 教師作成API呼び出し
      const res = await testApp.request('/api/frontend/school/teachers', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teacherData)
      })

      // Then: 作成成功
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('山田太郎')

      // データベース検証
      const created = await testDb.prepare(
        'SELECT * FROM teachers WHERE name = ?'
      ).bind('山田太郎').first()
      expect(created).toBeTruthy()
    })

    test('必須項目不足時は400エラーを返す', async () => {
      // Given: 必須項目なしのデータ
      const invalidData = { subjects: ['math'] }

      // When: 作成API呼び出し
      const res = await testApp.request('/api/frontend/school/teachers', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      // Then: バリデーションエラー
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('教師一覧取得', () => {
    test('全教師データを取得する', async () => {
      // Given: テストデータ準備
      await createTestTeachers(testDb, [
        { name: '教師A', subjects: ['math'] },
        { name: '教師B', subjects: ['japanese'] }
      ])

      // When: 一覧取得
      const res = await testApp.request('/api/frontend/school/teachers', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })

      // Then: データ取得成功
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('教師A')
    })
  })
})
```

### 3.2 データベース統合テスト

#### 3.2.1 トランザクション整合性テスト
```typescript
describe('Database Transaction Integrity', () => {
  let testDb: D1Database

  beforeEach(async () => {
    testDb = await createTestDatabase()
  })

  test('外部キー制約違反時はロールバックされる', async () => {
    // Given: 存在しない教科IDでの教師作成
    const invalidTeacher = {
      id: 'teacher_001',
      name: '教師A',
      subjects: JSON.stringify(['nonexistent_subject']),
      grades: JSON.stringify([1])
    }

    // When: 外部キー違反操作実行
    const operation = async () => {
      await testDb.batch([
        testDb.prepare('INSERT INTO teachers (id, name, subjects, grades) VALUES (?, ?, ?, ?)')
          .bind(invalidTeacher.id, invalidTeacher.name, invalidTeacher.subjects, invalidTeacher.grades),
        testDb.prepare('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)')
          .bind('teacher_001', 'nonexistent_subject')
      ])
    }

    // Then: エラーが発生し、データは挿入されない
    await expect(operation).rejects.toThrow()
    
    const teacherCount = await testDb.prepare('SELECT COUNT(*) as count FROM teachers').first()
    expect(teacherCount.count).toBe(0)
  })
})
```

## 4. E2E テスト仕様

### 4.1 ユーザーシナリオベーステスト

#### 4.1.1 時間割生成完全フロー
```typescript
// tests/e2e/timetable-generation-complete.spec.ts
describe('時間割生成完全フロー', () => {
  test('管理者が新規時間割を生成してプレビューまで確認する', async ({ page }) => {
    // Given: ログイン済み管理者
    await page.goto('/sign-in')
    await page.fill('[data-testid="email-input"]', process.env.E2E_ADMIN_EMAIL!)
    await page.fill('[data-testid="password-input"]', process.env.E2E_ADMIN_PASSWORD!)
    await page.click('[data-testid="sign-in-button"]')
    await page.waitForURL('/')

    // Step 1: データ管理画面で基本データ設定
    await page.click('[data-testid="sidebar-data-management"]')
    
    // 学校設定
    await page.click('[data-testid="school-settings-section"]')
    await page.fill('[data-testid="grade1-classes"]', '4')
    await page.fill('[data-testid="grade2-classes"]', '4')
    await page.fill('[data-testid="grade3-classes"]', '3')
    await page.click('[data-testid="save-school-settings"]')
    await page.waitForSelector('[data-testid="success-toast"]')

    // 教科追加
    await page.click('[data-testid="subjects-section"]')
    const subjects = [
      { name: '数学', grades: [1, 2, 3], hours: { 1: 5, 2: 4, 3: 4 } },
      { name: '国語', grades: [1, 2, 3], hours: { 1: 5, 2: 4, 3: 4 } },
      { name: '英語', grades: [1, 2, 3], hours: { 1: 3, 2: 4, 3: 4 } }
    ]

    for (const subject of subjects) {
      await page.click('[data-testid="add-subject-button"]')
      await page.fill('[data-testid="subject-name-input"]', subject.name)
      await page.selectOption('[data-testid="target-grades-select"]', 
        subject.grades.map(g => g.toString()))
      // 時間数設定...
      await page.click('[data-testid="save-subject-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
    }

    // 教師追加
    await page.click('[data-testid="teachers-section"]')
    const teachers = [
      { name: '田中太郎', subjects: ['数学'], grades: [1, 2] },
      { name: '佐藤花子', subjects: ['国語'], grades: [2, 3] },
      { name: '鈴木一郎', subjects: ['英語'], grades: [1, 3] }
    ]

    for (const teacher of teachers) {
      await page.click('[data-testid="add-teacher-button"]')
      await page.fill('[data-testid="teacher-name-input"]', teacher.name)
      // 教科・学年選択...
      await page.click('[data-testid="save-teacher-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
    }

    // Step 2: 時間割生成画面へ移動
    await page.click('[data-testid="sidebar-generate"]')
    await page.waitForSelector('[data-testid="generate-timetable-form"]')

    // Step 3: 生成オプション設定
    await page.check('[data-testid="use-optimization-checkbox"]')
    await page.check('[data-testid="tolerant-mode-checkbox"]')

    // Step 4: 時間割生成実行
    await page.click('[data-testid="generate-button"]')
    
    // 生成中の表示を確認
    await page.waitForSelector('[data-testid="generating-spinner"]')
    expect(await page.textContent('[data-testid="generation-status"]'))
      .toContain('時間割を生成中です...')

    // 生成完了を待機（最大60秒）
    await page.waitForSelector('[data-testid="generation-complete"]', { timeout: 60000 })

    // Step 5: 生成結果の確認
    const statistics = await page.textContent('[data-testid="generation-statistics"]')
    expect(statistics).toContain('割当率')
    expect(statistics).toContain('制約違反数')

    const assignmentRate = await page.textContent('[data-testid="assignment-rate"]')
    expect(parseFloat(assignmentRate!)).toBeGreaterThan(80) // 80%以上

    // Step 6: プレビュー表示
    await page.click('[data-testid="preview-timetable-button"]')
    await page.waitForSelector('[data-testid="timetable-preview-grid"]')

    // プレビュー内容確認
    const classHeaders = await page.locator('[data-testid="class-header"]').all()
    expect(classHeaders).toHaveLength(11) // 4+4+3クラス

    const timetableSlots = await page.locator('[data-testid="timetable-slot"]').all()
    expect(timetableSlots.length).toBeGreaterThan(300) // 期待されるスロット数

    // Step 7: 時間割保存
    await page.click('[data-testid="save-timetable-button"]')
    await page.fill('[data-testid="timetable-name-input"]', '2024年度1学期時間割')
    await page.click('[data-testid="confirm-save-button"]')
    await page.waitForSelector('[data-testid="save-success-message"]')

    // Step 8: 時間割一覧で確認
    await page.click('[data-testid="sidebar-view"]')
    await page.waitForSelector('[data-testid="timetable-list"]')
    
    const savedTimetable = page.locator('[data-testid="timetable-item"]').first()
    expect(await savedTimetable.textContent()).toContain('2024年度1学期時間割')
    expect(await savedTimetable.textContent()).toContain('アクティブ')
  })

  test('制約違反がある時間割でも寛容モードで生成できる', async ({ page }) => {
    // Given: 制約が厳しすぎるデータセット
    await setupStrictConstraintData(page)

    // When: 寛容モード有効で生成
    await page.goto('/generate')
    await page.check('[data-testid="tolerant-mode-checkbox"]')
    await page.click('[data-testid="generate-button"]')
    await page.waitForSelector('[data-testid="generation-complete"]', { timeout: 60000 })

    // Then: 制約違反ありでも生成成功
    const violationCount = await page.textContent('[data-testid="violation-count"]')
    expect(parseInt(violationCount!)).toBeGreaterThan(0)

    const successMessage = await page.textContent('[data-testid="generation-message"]')
    expect(successMessage).toContain('制約違反がありますが、時間割を生成しました')
  })
})
```

#### 4.1.2 時間割編集フロー
```typescript
describe('時間割編集フロー', () => {
  test('既存時間割をドラッグ&ドロップで編集する', async ({ page }) => {
    // Given: 既存の時間割データ
    await setupExistingTimetable(page)
    
    // Step 1: 時間割詳細画面を開く
    await page.goto('/view')
    await page.click('[data-testid="timetable-item"]:first-child')
    await page.waitForSelector('[data-testid="timetable-detail-grid"]')

    // Step 2: 編集モードに切り替え
    await page.click('[data-testid="edit-mode-toggle"]')
    expect(await page.textContent('[data-testid="mode-indicator"]')).toBe('編集モード')

    // Step 3: ドラッグ&ドロップで授業を移動
    const sourceSlot = page.locator('[data-testid="timetable-slot"][data-subject="数学"]').first()
    const targetSlot = page.locator('[data-testid="timetable-slot"][data-empty="true"]').first()

    // ドラッグ開始
    await sourceSlot.dragTo(targetSlot)

    // Step 4: 制約チェック結果の確認
    await page.waitForSelector('[data-testid="validation-result"]')
    const validationStatus = await page.textContent('[data-testid="validation-status"]')
    
    if (validationStatus === '制約違反なし') {
      // 正常な移動
      await page.click('[data-testid="confirm-move-button"]')
      await page.waitForSelector('[data-testid="move-success"]')
    } else {
      // 制約違反の場合
      const violations = await page.locator('[data-testid="violation-item"]').all()
      expect(violations.length).toBeGreaterThan(0)
      
      // 移動をキャンセル
      await page.click('[data-testid="cancel-move-button"]')
    }

    // Step 5: 変更保存
    await page.click('[data-testid="save-changes-button"]')
    await page.waitForSelector('[data-testid="save-success"]')

    // Step 6: 変更履歴確認
    await page.click('[data-testid="change-history-button"]')
    const changes = await page.locator('[data-testid="change-item"]').all()
    expect(changes.length).toBeGreaterThanOrEqual(1)
  })
})
```

### 4.2 パフォーマンステスト

#### 4.2.1 API応答時間テスト
```typescript
describe('API Performance Tests', () => {
  test('教師一覧API は 200ms 以内で応答する', async ({ request }) => {
    const startTime = Date.now()
    
    const response = await request.get('/api/frontend/school/teachers', {
      headers: { 'Authorization': `Bearer ${await getTestToken()}` }
    })
    
    const responseTime = Date.now() - startTime
    
    expect(response.status()).toBe(200)
    expect(responseTime).toBeLessThan(200)
  })

  test('時間割生成API は 30秒以内で完了する', async ({ request }) => {
    const startTime = Date.now()
    
    const response = await request.post('/api/timetable/program/generate', {
      headers: { 'Authorization': `Bearer ${await getTestToken()}` },
      data: { useOptimization: true, tolerantMode: true }
    })
    
    const responseTime = Date.now() - startTime
    
    expect(response.status()).toBe(200)
    expect(responseTime).toBeLessThan(30000) // 30秒
  })
})
```

#### 4.2.2 フロントエンドパフォーマンステスト
```typescript
describe('Frontend Performance Tests', () => {
  test('時間割グリッド表示は Core Web Vitals を満たす', async ({ page }) => {
    // ページロードのパフォーマンス計測
    await page.goto('/view/timetable-123')
    
    // First Contentful Paint (FCP) 測定
    const fcpMetric = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
          if (fcpEntry) resolve(fcpEntry.startTime)
        }).observe({ entryTypes: ['paint'] })
      })
    })
    expect(fcpMetric).toBeLessThan(2500) // 2.5秒以内

    // Largest Contentful Paint (LCP) 測定
    const lcpMetric = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.startTime)
        }).observe({ entryTypes: ['largest-contentful-paint'] })
      })
    })
    expect(lcpMetric).toBeLessThan(2500) // 2.5秒以内

    // Cumulative Layout Shift (CLS) 測定
    const clsMetric = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          resolve(clsValue)
        }).observe({ entryTypes: ['layout-shift'] })
        
        // タイムアウト設定
        setTimeout(() => resolve(clsValue), 5000)
      })
    })
    expect(clsMetric).toBeLessThan(0.1) // 0.1以内
  })
})
```

## 5. セキュリティテスト仕様

### 5.1 認証・認可テスト
```typescript
describe('Security Tests', () => {
  describe('認証セキュリティ', () => {
    test('JWTトークン改ざん検出', async ({ request }) => {
      // Given: 改ざんされたJWTトークン
      const tamperedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.TAMPERED.signature'
      
      // When: API呼び出し
      const response = await request.get('/api/frontend/school/settings', {
        headers: { 'Authorization': `Bearer ${tamperedToken}` }
      })
      
      // Then: 認証エラー
      expect(response.status()).toBe(401)
    })

    test('期限切れトークンは拒否される', async ({ request }) => {
      // Given: 期限切れトークン
      const expiredToken = await createExpiredJWT()
      
      // When: API呼び出し
      const response = await request.get('/api/frontend/school/settings', {
        headers: { 'Authorization': `Bearer ${expiredToken}` }
      })
      
      // Then: 認証エラー
      expect(response.status()).toBe(401)
    })
  })

  describe('CSRF保護', () => {
    test('CSRFトークン不正な場合は拒否される', async ({ request }) => {
      // Given: 有効なJWTだが不正なCSRFトークン
      const validToken = await getTestToken()
      
      // When: 不正CSRFトークンでPOST要求
      const response = await request.post('/api/frontend/school/teachers', {
        headers: { 
          'Authorization': `Bearer ${validToken}`,
          'X-CSRF-Token': 'invalid-csrf-token'
        },
        data: { name: 'テスト教師', subjects: ['math'], grades: [1] }
      })
      
      // Then: CSRF エラー
      expect(response.status()).toBe(403)
    })
  })

  describe('入力値検証', () => {
    test('SQLインジェクション攻撃は無効化される', async ({ request }) => {
      // Given: SQLインジェクション攻撃文字列
      const maliciousInput = {
        name: "'; DROP TABLE teachers; --",
        subjects: ['math'],
        grades: [1]
      }
      
      // When: 攻撃文字列で教師作成
      const response = await request.post('/api/frontend/school/teachers', {
        headers: { 
          'Authorization': `Bearer ${await getTestToken()}`,
          'X-CSRF-Token': await getValidCSRFToken()
        },
        data: maliciousInput
      })
      
      // Then: サニタイズされて正常処理される
      expect(response.status()).toBe(201)
      
      // テーブルが削除されていないことを確認
      const checkResponse = await request.get('/api/frontend/school/teachers', {
        headers: { 'Authorization': `Bearer ${await getTestToken()}` }
      })
      expect(checkResponse.status()).toBe(200)
    })

    test('XSSスクリプトはエスケープされる', async ({ page }) => {
      // Given: XSS攻撃スクリプト
      const xssScript = '<script>alert("XSS攻撃")</script>'
      
      // When: スクリプトを含む教師名で作成
      await createTeacherViaUI(page, { name: xssScript })
      
      // Then: スクリプトは実行されずエスケープ表示される
      await page.goto('/data')
      const teacherName = await page.textContent('[data-testid="teacher-name"]')
      expect(teacherName).toBe(xssScript) // エスケープされた文字列
      
      // スクリプトが実行されていないことを確認
      const alertCount = await page.evaluate(() => window.alertCount || 0)
      expect(alertCount).toBe(0)
    })
  })
})
```

## 6. テスト実行・監視仕様

### 6.1 CI/CD統合
```yaml
# .github/workflows/test.yml
name: Test Pipeline
on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-test:
    runs-on: ubuntu-latest
    services:
      database:
        image: sqlite:latest
    steps:
      - name: Run integration tests
        run: npm run test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### 6.2 テストレポート・品質管理
```typescript
// テスト設定 (vitest.config.ts)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      exclude: [
        'tests/**',
        '**/*.config.ts',
        '**/node_modules/**'
      ]
    },
    reporters: [
      'default',
      'html',
      'junit'
    ]
  }
})

// Playwright設定 (playwright.config.ts)
export default defineConfig({
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
```

---

**最終更新**: 2025年1月 | **バージョン**: 1.0.0 | **テストケース数**: 50+ | **カバレッジ目標**: 80%+