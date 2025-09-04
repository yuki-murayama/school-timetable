# 型安全システム テスト実装ガイド

## 概要

型安全性の向上に伴う包括的なテスト実装戦略とカバレッジ100％達成のための実践的ガイドです。単体テスト、統合テスト、エンドツーエンドテストを体系的に実装し、品質保証を確実に行います。

## テスト実装アーキテクチャ

### テストピラミッド構成
```
     /\
    /  \  E2E Tests (5%)
   /____\
  /      \
 / Integration \ Tests (15%)  
/______________\
|              |
|  Unit Tests  | (80%)
|______________|
```

### カバレッジ目標
- **単体テスト**: 分岐カバレッジ 100％
- **統合テスト**: システム間連携 100％
- **E2Eテスト**: ユーザージャーニー 100％

---

## Phase 1: テスト環境構築

### 1.1 Vitest設定の拡張
```typescript
// vitest.config.ts の最適化設定
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./src/test/setup.ts'],
    
    // 詳細なカバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      
      // 100%カバレッジ要件
      thresholds: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      },
      
      // カバレッジ対象ファイル
      include: [
        'src/frontend/components/**/*.{ts,tsx}',
        'src/frontend/hooks/**/*.{ts,tsx}',
        'src/backend/routes/**/*.ts',
        'src/backend/services/**/*.ts',
        'src/backend/controllers/**/*.ts',
        'src/shared/**/*.ts'
      ],
      
      // カバレッジ除外ファイル
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/test/**/*',
        'src/frontend/main.tsx',
        'src/worker.ts',
        'node_modules'
      ],
      
      // 詳細設定
      skipFull: false,
      all: true,
      allowExternal: false
    },
    
    // 並列実行設定
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/frontend/components'),
      '@/hooks': path.resolve(__dirname, './src/frontend/hooks'),
      '@/lib': path.resolve(__dirname, './src/frontend/lib'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/backend': path.resolve(__dirname, './src/backend'),
      '@/test': path.resolve(__dirname, './src/test')
    }
  }
})
```

### 1.2 テストセットアップファイル
```typescript
// src/test/setup.ts - 統一テストセットアップ
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// MSW モックサーバー設定
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
})

// グローバルモック設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

### 1.3 MSW モックサーバー設定
```typescript
// src/test/mocks/server.ts - API モック
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { teachersHandlers } from './teachers-handlers'
import { schoolSettingsHandlers } from './school-settings-handlers'
import { timetableHandlers } from './timetable-handlers'

export const server = setupServer(
  ...teachersHandlers,
  ...schoolSettingsHandlers,
  ...timetableHandlers
)
```

```typescript
// src/test/mocks/teachers-handlers.ts - 教師API モック
import { rest } from 'msw'

export const teachersHandlers = [
  // 教師一覧取得
  rest.get('/api/school/teachers', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: 'teacher-1',
            name: 'モック先生1',
            subjects: ['数学'],
            grades: ['1'],
            assignmentRestrictions: [],
            order: 0
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        timestamp: new Date().toISOString(),
        version: 'v2'
      })
    )
  }),

  // 教師作成
  rest.post('/api/school/teachers', async (req, res, ctx) => {
    const body = await req.json()
    
    // バリデーションチェック
    if (!body.name || body.name.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'バリデーションエラーが発生しました',
            details: [
              { field: 'name', message: '教師名は必須です' }
            ]
          },
          timestamp: new Date().toISOString(),
          version: 'v2'
        })
      )
    }

    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: `teacher-${Date.now()}`,
          ...body,
          order: 0
        },
        timestamp: new Date().toISOString(),
        version: 'v2'
      })
    )
  }),

  // 教師削除
  rest.delete('/api/school/teachers/:id', (req, res, ctx) => {
    const { id } = req.params
    
    if (id === 'non-existent-id') {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: '教師が見つかりません'
          },
          timestamp: new Date().toISOString(),
          version: 'v2'
        })
      )
    }

    return res(
      ctx.status(204)
    )
  })
]
```

---

## Phase 2: 単体テスト実装

### 2.1 フロントエンドコンポーネントテスト
```typescript
// src/frontend/components/data-management/SubjectsSection.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubjectsSection } from './SubjectsSection'
import apiV2 from '../../lib/api/v2'

// モック設定
vi.mock('../../lib/api/v2')
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}))

describe('SubjectsSection - 100% Branch Coverage', () => {
  const mockSubjects = [
    { id: 'subject-1', name: '数学', description: '数学科目', order: 0 },
    { id: 'subject-2', name: '国語', description: '国語科目', order: 1 }
  ]

  const defaultProps = {
    subjects: mockSubjects,
    onSubjectsUpdate: vi.fn(),
    token: 'test-token',
    getFreshToken: vi.fn(),
    isLoading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * TC-FE-SJ-001: 初期レンダリング（正常データ）
   * 分岐: isLoading=false, subjects配列存在
   */
  it('教科一覧が正常に表示される', () => {
    render(<SubjectsSection {...defaultProps} />)
    
    expect(screen.getByText('教科情報管理')).toBeInTheDocument()
    expect(screen.getByText('数学')).toBeInTheDocument()
    expect(screen.getByText('国語')).toBeInTheDocument()
    expect(screen.getByText('教科を追加')).toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-002: ローディング状態
   * 分岐: isLoading=true
   */
  it('ローディング中はスピナーが表示される', () => {
    render(<SubjectsSection {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.queryByText('数学')).not.toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-003: 空データ状態
   * 分岐: subjects.length === 0
   */
  it('教科データが空の場合の表示', () => {
    render(<SubjectsSection {...defaultProps} subjects={[]} />)
    
    expect(screen.getByText('教科情報が登録されていません')).toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-004: 無効データ状態
   * 分岐: !Array.isArray(subjects)
   */
  it('無効なsubjectsデータの場合', () => {
    // @ts-ignore - テスト用に意図的に無効な型を渡す
    render(<SubjectsSection {...defaultProps} subjects={null} />)
    
    expect(screen.getByText('教科情報が登録されていません')).toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-005: 教科追加ダイアログ開閉
   * 分岐: handleAddSubject実行分岐
   */
  it('教科追加ダイアログが開く', async () => {
    const user = userEvent.setup()
    render(<SubjectsSection {...defaultProps} />)
    
    await user.click(screen.getByText('教科を追加'))
    
    // ダイアログ開閉の状態変化を検証
    expect(screen.getByText('教科を追加')).toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-006: 教科削除（成功）
   * 分岐: 削除成功、API成功レスポンス
   */
  it('教科削除が正常に動作する', async () => {
    const user = userEvent.setup()
    const mockOnUpdate = vi.fn()
    
    vi.mocked(apiV2.subjects.deleteSubject).mockResolvedValue({ success: true })
    
    render(<SubjectsSection {...defaultProps} onSubjectsUpdate={mockOnUpdate} />)
    
    const deleteButtons = screen.getAllByLabelText(/教科「.*」を削除/)
    await user.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(apiV2.subjects.deleteSubject).toHaveBeenCalledWith('subject-1')
      expect(mockOnUpdate).toHaveBeenCalledWith([mockSubjects[1]]) // 残り1件
    })
  })

  /**
   * TC-FE-SJ-007: 教科削除（バリデーションエラー）
   * 分岐: isValidationError(error) = true
   */
  it('教科削除時のバリデーションエラー処理', async () => {
    const user = userEvent.setup()
    
    const validationError = new Error('Validation failed')
    vi.mocked(apiV2.subjects.deleteSubject).mockRejectedValue(validationError)
    vi.mocked(apiV2.isValidationError).mockReturnValue(true)
    // @ts-ignore
    validationError.validationErrors = [{ message: 'Invalid subject ID' }]
    
    render(<SubjectsSection {...defaultProps} />)
    
    const deleteButtons = screen.getAllByLabelText(/教科「.*」を削除/)
    await user.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(apiV2.isValidationError).toHaveBeenCalledWith(validationError)
    })
  })

  /**
   * TC-FE-SJ-008: 教科削除（一般エラー）
   * 分岐: isValidationError(error) = false
   */
  it('教科削除時の一般エラー処理', async () => {
    const user = userEvent.setup()
    
    const generalError = new Error('Network error')
    vi.mocked(apiV2.subjects.deleteSubject).mockRejectedValue(generalError)
    vi.mocked(apiV2.isValidationError).mockReturnValue(false)
    
    render(<SubjectsSection {...defaultProps} />)
    
    const deleteButtons = screen.getAllByLabelText(/教科「.*」を削除/)
    await user.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(apiV2.isValidationError).toHaveBeenCalledWith(generalError)
    })
  })

  /**
   * TC-FE-SJ-009: token なしでの削除試行
   * 分岐: !token 分岐
   */
  it('token なしでは削除処理が実行されない', async () => {
    const user = userEvent.setup()
    
    render(<SubjectsSection {...defaultProps} token={null} />)
    
    const deleteButtons = screen.getAllByLabelText(/教科「.*」を削除/)
    await user.click(deleteButtons[0])
    
    expect(apiV2.subjects.deleteSubject).not.toHaveBeenCalled()
  })

  /**
   * TC-FE-SJ-010: ドラッグ&ドロップ順序変更
   * 分岐: ドラッグ&ドロップ処理成功
   */
  it('ドラッグ&ドロップで順序変更が動作する', async () => {
    const mockOnUpdate = vi.fn()
    
    vi.mocked(apiV2.subjects.updateSubject).mockResolvedValue({
      data: mockSubjects[0]
    })
    
    render(<SubjectsSection {...defaultProps} onSubjectsUpdate={mockOnUpdate} />)
    
    // DndContext のドラッグイベントをシミュレート
    // （実際の実装では dnd-kit のテストユーティリティを使用）
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  /**
   * TC-FE-SJ-011: 編集ボタンクリック
   * 分岐: handleEditSubject実行分岐
   */
  it('編集ボタンで教科編集ダイアログが開く', async () => {
    const user = userEvent.setup()
    render(<SubjectsSection {...defaultProps} />)
    
    const editButtons = screen.getAllByLabelText(/教科「.*」を編集/)
    await user.click(editButtons[0])
    
    // 編集ダイアログが開くことを検証
    expect(editButtons[0]).toBeInTheDocument()
  })

  /**
   * TC-FE-SJ-012: 一括保存（成功）
   * 分岐: 一括保存成功、全件更新成功
   */
  it('教科情報の一括保存が正常に動作する', async () => {
    const user = userEvent.setup()
    
    vi.mocked(apiV2.subjects.updateSubject)
      .mockResolvedValueOnce({ data: mockSubjects[0] })
      .mockResolvedValueOnce({ data: mockSubjects[1] })
    
    render(<SubjectsSection {...defaultProps} />)
    
    await user.click(screen.getByText('教科情報を保存'))
    
    await waitFor(() => {
      expect(apiV2.subjects.updateSubject).toHaveBeenCalledTimes(2)
    })
  })

  /**
   * TC-FE-SJ-013: 一括保存（部分失敗）
   * 分岐: 一部更新失敗、failCount > 0
   */
  it('一括保存で一部失敗した場合の処理', async () => {
    const user = userEvent.setup()
    
    vi.mocked(apiV2.subjects.updateSubject)
      .mockResolvedValueOnce({ data: mockSubjects[0] })
      .mockRejectedValueOnce(new Error('Update failed'))
    
    render(<SubjectsSection {...defaultProps} />)
    
    await user.click(screen.getByText('教科情報を保存'))
    
    await waitFor(() => {
      expect(apiV2.subjects.updateSubject).toHaveBeenCalledTimes(2)
    })
  })

  /**
   * TC-FE-SJ-014: token なしでの一括保存
   * 分岐: !token 分岐（一括保存）
   */
  it('token なしでは一括保存処理が実行されない', async () => {
    const user = userEvent.setup()
    
    render(<SubjectsSection {...defaultProps} token={null} />)
    
    await user.click(screen.getByText('教科情報を保存'))
    
    expect(apiV2.subjects.updateSubject).not.toHaveBeenCalled()
  })

  /**
   * TC-FE-SJ-015: 無効な subjects での一括保存
   * 分岐: !Array.isArray(subjects) 分岐（一括保存）
   */
  it('無効な subjects データでは一括保存が実行されない', async () => {
    const user = userEvent.setup()
    
    // @ts-ignore
    render(<SubjectsSection {...defaultProps} subjects={null} />)
    
    await user.click(screen.getByText('教科情報を保存'))
    
    expect(apiV2.subjects.updateSubject).not.toHaveBeenCalled()
  })
})
```

### 2.2 カスタムフックテスト
```typescript
// src/frontend/hooks/use-subject-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSubjectApi } from './use-subject-api'
import apiV2 from '../lib/api/v2'

vi.mock('../lib/api/v2')

describe('useSubjectApi - 100% Branch Coverage', () => {
  const mockToken = 'test-token'
  const mockGetFreshToken = vi.fn().mockResolvedValue('fresh-token')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * TC-HOOK-SJ-001: saveSubject 新規作成（成功）
   * 分岐: isNewSubject=true, API成功
   */
  it('新規教科の作成が正常に動作する', async () => {
    const mockSubjectData = {
      name: '新規教科',
      description: '新規教科の説明'
    }

    const mockCreatedSubject = {
      id: 'subject-new',
      ...mockSubjectData,
      order: 0
    }

    vi.mocked(apiV2.subjects.createSubject).mockResolvedValue({
      data: mockCreatedSubject
    })

    const { result } = renderHook(() => 
      useSubjectApi(mockToken, mockGetFreshToken)
    )

    const savedSubject = await result.current.saveSubject(mockSubjectData, true)

    expect(apiV2.subjects.createSubject).toHaveBeenCalledWith(mockSubjectData)
    expect(savedSubject).toEqual(mockCreatedSubject)
  })

  /**
   * TC-HOOK-SJ-002: saveSubject 更新（成功）
   * 分岐: isNewSubject=false, API成功
   */
  it('既存教科の更新が正常に動作する', async () => {
    const mockSubjectData = {
      id: 'subject-123',
      name: '更新教科',
      description: '更新された説明'
    }

    const mockUpdatedSubject = { ...mockSubjectData }

    vi.mocked(apiV2.subjects.updateSubject).mockResolvedValue({
      data: mockUpdatedSubject
    })

    const { result } = renderHook(() => 
      useSubjectApi(mockToken, mockGetFreshToken)
    )

    const savedSubject = await result.current.saveSubject(mockSubjectData, false)

    expect(apiV2.subjects.updateSubject).toHaveBeenCalledWith(
      'subject-123', 
      mockSubjectData
    )
    expect(savedSubject).toEqual(mockUpdatedSubject)
  })

  /**
   * TC-HOOK-SJ-003: saveSubject バリデーションエラー
   * 分岐: API バリデーションエラー, isValidationError=true
   */
  it('バリデーションエラーを適切に処理する', async () => {
    const invalidSubjectData = {
      name: '', // 空文字（無効）
      description: ''
    }

    const validationError = new Error('Validation failed')
    vi.mocked(apiV2.subjects.createSubject).mockRejectedValue(validationError)
    vi.mocked(apiV2.isValidationError).mockReturnValue(true)
    // @ts-ignore
    validationError.validationErrors = [
      { field: 'name', message: '教科名は必須です' }
    ]

    const { result } = renderHook(() => 
      useSubjectApi(mockToken, mockGetFreshToken)
    )

    await expect(
      result.current.saveSubject(invalidSubjectData, true)
    ).rejects.toThrow('Validation failed')

    expect(apiV2.isValidationError).toHaveBeenCalledWith(validationError)
  })

  /**
   * TC-HOOK-SJ-004: saveSubject 一般エラー
   * 分岐: API 一般エラー, isValidationError=false
   */
  it('一般エラーを適切に処理する', async () => {
    const subjectData = {
      name: '教科名',
      description: '説明'
    }

    const generalError = new Error('Network error')
    vi.mocked(apiV2.subjects.createSubject).mockRejectedValue(generalError)
    vi.mocked(apiV2.isValidationError).mockReturnValue(false)

    const { result } = renderHook(() => 
      useSubjectApi(mockToken, mockGetFreshToken)
    )

    await expect(
      result.current.saveSubject(subjectData, true)
    ).rejects.toThrow('Network error')
  })

  /**
   * TC-HOOK-SJ-005: saveSubject token なし
   * 分岐: !token 分岐
   */
  it('token がない場合はエラーを投げる', async () => {
    const { result } = renderHook(() => 
      useSubjectApi(null, mockGetFreshToken)
    )

    await expect(
      result.current.saveSubject({ name: '教科' }, true)
    ).rejects.toThrow('認証が必要です')

    expect(apiV2.subjects.createSubject).not.toHaveBeenCalled()
  })

  /**
   * TC-HOOK-SJ-006: saveSubject ID なし更新試行
   * 分岐: isNewSubject=false かつ subjectData.id なし
   */
  it('ID なしでの更新試行はエラー', async () => {
    const subjectDataWithoutId = {
      name: '教科名',
      description: '説明'
      // id なし
    }

    const { result } = renderHook(() => 
      useSubjectApi(mockToken, mockGetFreshToken)
    )

    await expect(
      result.current.saveSubject(subjectDataWithoutId, false)
    ).rejects.toThrow('更新には教科IDが必要です')

    expect(apiV2.subjects.updateSubject).not.toHaveBeenCalled()
  })
})
```

---

## Phase 3: バックエンドテスト実装

### 3.1 型安全コントローラーテスト
```typescript
// src/backend/controllers/type-safe-controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TypeSafeController } from './type-safe-controller'
import { ZodError } from 'zod'

describe('TypeSafeController - 100% Branch Coverage', () => {
  let controller: TypeSafeController

  beforeEach(() => {
    controller = new TypeSafeController()
  })

  /**
   * TC-BE-CTRL-001: createSuccessResponse データあり
   * 分岐: data 引数存在
   */
  it('データ付き成功レスポンスを生成する', () => {
    const testData = { id: '1', name: 'test' }
    const response = controller.createSuccessResponse(testData)

    expect(response).toEqual({
      success: true,
      data: testData,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      version: 'v2'
    })
  })

  /**
   * TC-BE-CTRL-002: createSuccessResponse データなし
   * 分岐: data 引数なし（undefined）
   */
  it('データなし成功レスポンスを生成する', () => {
    const response = controller.createSuccessResponse()

    expect(response).toEqual({
      success: true,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      version: 'v2'
    })
    expect(response.data).toBeUndefined()
  })

  /**
   * TC-BE-CTRL-003: createErrorResponse ZodError
   * 分岐: error instanceof ZodError
   */
  it('Zodバリデーションエラーを適切に処理する', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number'
      },
      {
        code: 'too_small',
        minimum: 1,
        type: 'array',
        path: ['subjects'],
        message: 'Array must contain at least 1 element(s)'
      }
    ])

    const response = controller.createErrorResponse(zodError)

    expect(response).toEqual({
      status: 400,
      body: {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: [
            {
              field: 'name',
              message: 'Expected string, received number'
            },
            {
              field: 'subjects',
              message: 'Array must contain at least 1 element(s)'
            }
          ]
        },
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        version: 'v2'
      }
    })
  })

  /**
   * TC-BE-CTRL-004: createErrorResponse 認証エラー
   * 分岐: error.name === 'AuthenticationError'
   */
  it('認証エラーを適切に処理する', () => {
    const authError = new Error('Invalid token')
    authError.name = 'AuthenticationError'

    const response = controller.createErrorResponse(authError)

    expect(response).toEqual({
      status: 401,
      body: {
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid token'
        },
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        version: 'v2'
      }
    })
  })

  /**
   * TC-BE-CTRL-005: createErrorResponse 認可エラー
   * 分岐: error.name === 'AuthorizationError'
   */
  it('認可エラーを適切に処理する', () => {
    const authzError = new Error('Insufficient permissions')
    authzError.name = 'AuthorizationError'

    const response = controller.createErrorResponse(authzError)

    expect(response.status).toBe(403)
    expect(response.body.error.type).toBe('AUTHORIZATION_ERROR')
  })

  /**
   * TC-BE-CTRL-006: createErrorResponse データベースエラー
   * 分岐: error.name === 'DatabaseError'
   */
  it('データベースエラーを適切に処理する', () => {
    const dbError = new Error('Connection timeout')
    dbError.name = 'DatabaseError'

    const response = controller.createErrorResponse(dbError)

    expect(response.status).toBe(500)
    expect(response.body.error.type).toBe('DATABASE_ERROR')
    expect(response.body.error.message).toContain('データベース')
  })

  /**
   * TC-BE-CTRL-007: createErrorResponse 一般エラー
   * 分岐: 上記以外の一般エラー
   */
  it('一般エラーを適切に処理する', () => {
    const generalError = new Error('Something went wrong')

    const response = controller.createErrorResponse(generalError)

    expect(response).toEqual({
      status: 500,
      body: {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Something went wrong'
        },
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        version: 'v2'
      }
    })
  })

  /**
   * TC-BE-CTRL-008: createErrorResponse タイムアウトエラー
   * 分岐: error.name === 'TimeoutError'
   */
  it('タイムアウトエラーを適切に処理する', () => {
    const timeoutError = new Error('Request timeout')
    timeoutError.name = 'TimeoutError'

    const response = controller.createErrorResponse(timeoutError)

    expect(response.status).toBe(408)
    expect(response.body.error.type).toBe('TIMEOUT_ERROR')
  })

  /**
   * TC-BE-CTRL-009: createErrorResponse 競合エラー
   * 分岐: error.name === 'ConflictError'
   */
  it('競合エラーを適切に処理する', () => {
    const conflictError = new Error('Data was modified by another user')
    conflictError.name = 'ConflictError'

    const response = controller.createErrorResponse(conflictError)

    expect(response.status).toBe(409)
    expect(response.body.error.type).toBe('CONFLICT_ERROR')
  })

  /**
   * TC-BE-CTRL-010: createErrorResponse 不正な入力エラー
   * 分岐: error.name === 'BadRequestError'
   */
  it('不正な入力エラーを適切に処理する', () => {
    const badRequestError = new Error('Invalid request format')
    badRequestError.name = 'BadRequestError'

    const response = controller.createErrorResponse(badRequestError)

    expect(response.status).toBe(400)
    expect(response.body.error.type).toBe('BAD_REQUEST_ERROR')
  })
})
```

### 3.2 型安全サービステスト
```typescript
// src/backend/services/type-safe-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TypeSafeTeacherService } from './type-safe-service'
import { TypeSafeDbHelper } from '../db/type-safe-db-helper'

vi.mock('../db/type-safe-db-helper')

describe('TypeSafeTeacherService - 100% Branch Coverage', () => {
  let service: TypeSafeTeacherService
  let mockDbHelper: TypeSafeDbHelper

  beforeEach(() => {
    mockDbHelper = new TypeSafeDbHelper(null as any)
    service = new TypeSafeTeacherService(mockDbHelper)
    vi.clearAllMocks()
  })

  /**
   * TC-BE-SVC-001: getTeachers フィルタなし
   * 分岐: フィルタ条件なし
   */
  it('全教師一覧を取得する', async () => {
    const mockResult = {
      data: [
        { id: '1', name: '田中先生', subjects: ['数学'], grades: ['1'] }
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
    }

    vi.mocked(mockDbHelper.findMany).mockResolvedValue(mockResult)

    const result = await service.getTeachers({})

    expect(result).toEqual(mockResult)
    expect(mockDbHelper.findMany).toHaveBeenCalledWith(
      'teachers',
      {},
      expect.any(Object)
    )
  })

  /**
   * TC-BE-SVC-002: getTeachers 複合フィルタ
   * 分岐: search, subject, grade, hasRestrictions 条件あり
   */
  it('複合フィルタで教師一覧を取得する', async () => {
    const filters = {
      search: '田中',
      subject: '数学',
      grade: '1',
      hasRestrictions: true,
      page: 2,
      limit: 5
    }

    const mockResult = {
      data: [
        { 
          id: '1', 
          name: '田中先生', 
          subjects: ['数学'], 
          grades: ['1'],
          assignmentRestrictions: ['午前のみ']
        }
      ],
      pagination: { total: 1, page: 2, limit: 5, totalPages: 1 }
    }

    vi.mocked(mockDbHelper.findMany).mockResolvedValue(mockResult)

    const result = await service.getTeachers(filters)

    expect(result).toEqual(mockResult)
    expect(mockDbHelper.findMany).toHaveBeenCalledWith(
      'teachers',
      expect.objectContaining({
        search: '田中',
        subject: '数学',
        grade: '1',
        hasRestrictions: true,
        page: 2,
        limit: 5
      }),
      expect.any(Object)
    )
  })

  /**
   * TC-BE-SVC-003: createTeacher 自動順序付け
   * 分岐: order自動設定分岐
   */
  it('新しい教師を自動順序付けで作成する', async () => {
    const newTeacherData = {
      name: '新規先生',
      subjects: ['英語'],
      grades: ['3'],
      assignmentRestrictions: []
    }

    // 既存教師の最大order値取得をモック
    vi.mocked(mockDbHelper.findMany).mockResolvedValueOnce({
      data: [{ order: 5 }],
      pagination: { total: 1, page: 1, limit: 1, totalPages: 1 }
    })

    const createdTeacher = {
      id: 'new-id',
      ...newTeacherData,
      order: 6
    }

    vi.mocked(mockDbHelper.create).mockResolvedValue(createdTeacher)

    const result = await service.createTeacher(newTeacherData)

    expect(result).toEqual(createdTeacher)
    expect(mockDbHelper.create).toHaveBeenCalledWith(
      'teachers',
      expect.objectContaining({
        ...newTeacherData,
        order: 6
      }),
      expect.any(Object)
    )
  })

  /**
   * TC-BE-SVC-004: createTeacher 初回作成（order=0）
   * 分岐: 既存教師なし、order=0設定
   */
  it('初回教師作成時はorder=0を設定する', async () => {
    const newTeacherData = {
      name: '初回先生',
      subjects: ['数学'],
      grades: ['1'],
      assignmentRestrictions: []
    }

    // 既存教師なし
    vi.mocked(mockDbHelper.findMany).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, limit: 1, totalPages: 0 }
    })

    const createdTeacher = {
      id: 'first-id',
      ...newTeacherData,
      order: 0
    }

    vi.mocked(mockDbHelper.create).mockResolvedValue(createdTeacher)

    const result = await service.createTeacher(newTeacherData)

    expect(result.order).toBe(0)
  })

  /**
   * TC-BE-SVC-005: deleteTeacher 依存関係なし
   * 分岐: 時間割での使用なし、削除成功
   */
  it('依存関係のない教師を削除する', async () => {
    const teacherId = 'teacher-123'

    // 依存関係チェック：時間割で使用されていない
    vi.mocked(mockDbHelper.findMany).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, limit: 1, totalPages: 0 }
    })

    vi.mocked(mockDbHelper.delete).mockResolvedValue(true)

    const result = await service.deleteTeacher(teacherId)

    expect(result).toBe(true)
    expect(mockDbHelper.delete).toHaveBeenCalledWith('teachers', teacherId)
  })

  /**
   * TC-BE-SVC-006: deleteTeacher 依存関係あり
   * 分岐: 時間割での使用あり、削除エラー
   */
  it('依存関係のある教師の削除時はエラー', async () => {
    const teacherId = 'teacher-123'

    // 依存関係チェック：時間割で使用中
    vi.mocked(mockDbHelper.findMany).mockResolvedValueOnce({
      data: [{ id: 'timetable-1', teacherId }],
      pagination: { total: 1, page: 1, limit: 1, totalPages: 1 }
    })

    await expect(service.deleteTeacher(teacherId))
      .rejects.toThrow('この教師は時間割で使用されているため削除できません')

    expect(mockDbHelper.delete).not.toHaveBeenCalled()
  })

  /**
   * TC-BE-SVC-007: updateTeacher 部分更新
   * 分岐: 一部フィールドのみ更新
   */
  it('教師情報の部分更新を行う', async () => {
    const teacherId = 'teacher-123'
    const partialUpdate = {
      subjects: ['数学', '理科'],
      assignmentRestrictions: ['午後のみ']
    }

    const updatedTeacher = {
      id: teacherId,
      name: '田中先生',
      subjects: ['数学', '理科'],
      grades: ['1', '2'],
      assignmentRestrictions: ['午後のみ'],
      order: 1
    }

    vi.mocked(mockDbHelper.update).mockResolvedValue(updatedTeacher)

    const result = await service.updateTeacher(teacherId, partialUpdate)

    expect(result).toEqual(updatedTeacher)
    expect(mockDbHelper.update).toHaveBeenCalledWith(
      'teachers',
      teacherId,
      partialUpdate,
      expect.any(Object)
    )
  })

  /**
   * TC-BE-SVC-008: updateTeacher 存在しないID
   * 分岐: 更新対象なし、null返却
   */
  it('存在しないIDの更新時はnullを返す', async () => {
    const nonExistentId = 'non-existent-id'
    const updateData = { name: '更新データ' }

    vi.mocked(mockDbHelper.update).mockResolvedValue(null)

    const result = await service.updateTeacher(nonExistentId, updateData)

    expect(result).toBeNull()
  })

  /**
   * TC-BE-SVC-009: getTeacherById 存在するID
   * 分岐: 教師データ存在
   */
  it('指定IDの教師詳細を取得する', async () => {
    const teacherId = 'teacher-123'
    const mockTeacher = {
      id: teacherId,
      name: '田中先生',
      subjects: ['数学'],
      grades: ['1'],
      assignmentRestrictions: [],
      order: 0
    }

    vi.mocked(mockDbHelper.findById).mockResolvedValue(mockTeacher)

    const result = await service.getTeacherById(teacherId)

    expect(result).toEqual(mockTeacher)
    expect(mockDbHelper.findById).toHaveBeenCalledWith(
      'teachers',
      teacherId,
      expect.any(Object)
    )
  })

  /**
   * TC-BE-SVC-010: getTeacherById 存在しないID
   * 分岐: 教師データ不存在
   */
  it('存在しないIDの場合はnullを返す', async () => {
    const nonExistentId = 'non-existent-id'

    vi.mocked(mockDbHelper.findById).mockResolvedValue(null)

    const result = await service.getTeacherById(nonExistentId)

    expect(result).toBeNull()
  })
})
```

---

## Phase 4: 統合テスト実装

### 4.1 API統合テスト
```typescript
// src/test/integration/api-integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestApp, cleanupTestApp, resetTestDatabase } from '../utils/test-setup'
import request from 'supertest'

describe('API Integration Tests - 100% Coverage', () => {
  let app: any
  let authToken: string

  beforeAll(async () => {
    app = await setupTestApp()
    
    // テスト用認証トークン取得
    const authResponse = await request(app)
      .post('/auth/test-login')
      .send({
        email: 'test@example.com',
        password: 'test123'
      })
    
    authToken = authResponse.body.token
  })

  afterAll(async () => {
    await cleanupTestApp(app)
  })

  beforeEach(async () => {
    await resetTestDatabase()
  })

  /**
   * TC-INT-API-001: 教師CRUD完全フロー
   * 分岐: 作成→読取→更新→削除の完全サイクル
   */
  it('教師CRUD操作の完全フローが正常に動作する', async () => {
    // 1. 教師作成
    const createResponse = await request(app)
      .post('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '統合テスト先生',
        subjects: ['数学', '物理'],
        grades: ['1', '2'],
        assignmentRestrictions: ['午前のみ']
      })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        name: '統合テスト先生',
        subjects: ['数学', '物理'],
        grades: ['1', '2'],
        assignmentRestrictions: ['午前のみ'],
        order: expect.any(Number)
      }),
      timestamp: expect.any(String),
      version: 'v2'
    })

    const teacherId = createResponse.body.data.id

    // 2. 教師詳細取得
    const getResponse = await request(app)
      .get(`/api/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(getResponse.status).toBe(200)
    expect(getResponse.body.data).toEqual(createResponse.body.data)

    // 3. 教師更新
    const updateResponse = await request(app)
      .put(`/api/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '統合テスト先生（更新）',
        subjects: ['数学', '化学', '生物'],
        assignmentRestrictions: ['午後のみ']
      })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data.name).toBe('統合テスト先生（更新）')
    expect(updateResponse.body.data.subjects).toEqual(['数学', '化学', '生物'])

    // 4. 教師一覧で確認
    const listResponse = await request(app)
      .get('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toContainEqual(
      expect.objectContaining({
        id: teacherId,
        name: '統合テスト先生（更新）'
      })
    )

    // 5. 教師削除
    const deleteResponse = await request(app)
      .delete(`/api/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(deleteResponse.status).toBe(204)

    // 6. 削除確認
    const getDeletedResponse = await request(app)
      .get(`/api/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(getDeletedResponse.status).toBe(404)
  })

  /**
   * TC-INT-API-002: 三層API互換性テスト
   * 分岐: v2→Safe→Legacy APIの相互運用
   */
  it('三層API間での相互運用性が保たれる', async () => {
    // 1. 統合APIで教師作成
    const v2CreateResponse = await request(app)
      .post('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '互換性テスト先生',
        subjects: ['数学', '物理'],
        grades: ['1', '2'],
        assignmentRestrictions: ['午前のみ']
      })

    expect(v2CreateResponse.status).toBe(201)
    const teacherId = v2CreateResponse.body.data.id

    // 2. レガシーAPIで同じ教師を取得
    const legacyGetResponse = await request(app)
      .get(`/api/frontend/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(legacyGetResponse.status).toBe(200)
    expect(legacyGetResponse.body).toEqual({
      success: true,
      teacher: expect.objectContaining({
        id: teacherId,
        name: '互換性テスト先生',
        subjects: 'mathematical,physics', // レガシー形式
        grades: '1,2',
        restrictions: 'morning_only'
      })
    })

    // 3. レガシーAPIで更新
    const legacyUpdateResponse = await request(app)
      .put(`/api/frontend/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '互換性テスト先生（レガシー更新）',
        subjects: 'chemistry,biology',
        grades: '2,3',
        restrictions: 'afternoon_only'
      })

    expect(legacyUpdateResponse.status).toBe(200)

    // 4. 統合APIで読み取り、データ一貫性確認
    const v2GetResponse = await request(app)
      .get(`/api/school/teachers/${teacherId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(v2GetResponse.status).toBe(200)
    expect(v2GetResponse.body.data).toEqual(expect.objectContaining({
      id: teacherId,
      name: '互換性テスト先生（レガシー更新）',
      subjects: ['化学', '生物'], // 正規化済み
      grades: ['2', '3'],
      assignmentRestrictions: ['午後のみ']
    }))
  })

  /**
   * TC-INT-API-003: エラーハンドリング統合テスト
   * 分岐: 各種エラーシナリオの統合処理
   */
  it('各種エラーシナリオが適切に処理される', async () => {
    // 1. バリデーションエラー
    const validationErrorResponse = await request(app)
      .post('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '', // 空文字（無効）
        subjects: [], // 空配列（無効）
        grades: 'invalid' // 無効な型
      })

    expect(validationErrorResponse.status).toBe(400)
    expect(validationErrorResponse.body).toEqual({
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

    // 2. 認証エラー
    const authErrorResponse = await request(app)
      .get('/api/school/teachers')
      // Authorization ヘッダーなし

    expect(authErrorResponse.status).toBe(401)

    // 3. 存在しないリソースエラー
    const notFoundResponse = await request(app)
      .get('/api/school/teachers/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`)

    expect(notFoundResponse.status).toBe(404)
    expect(notFoundResponse.body.error.type).toBe('NOT_FOUND')

    // 4. 重複エラー（同じ名前の教師を作成）
    await request(app)
      .post('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '重複テスト先生',
        subjects: ['数学'],
        grades: ['1']
      })

    const duplicateResponse = await request(app)
      .post('/api/school/teachers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '重複テスト先生', // 同じ名前
        subjects: ['国語'],
        grades: ['2']
      })

    expect(duplicateResponse.status).toBe(409)
    expect(duplicateResponse.body.error.type).toBe('CONFLICT_ERROR')
  })

  /**
   * TC-INT-API-004: 大量データ処理性能テスト
   * 分岐: パフォーマンス要件確認
   */
  it('大量データ処理でも性能要件を満たす', async () => {
    // 100件の教師データを作成
    const createPromises = Array.from({ length: 100 }, (_, index) =>
      request(app)
        .post('/api/school/teachers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `パフォーマンステスト先生${index + 1}`,
          subjects: ['数学'],
          grades: ['1'],
          assignmentRestrictions: []
        })
    )

    const startTime = Date.now()
    await Promise.all(createPromises)
    const createTime = Date.now() - startTime

    // 作成処理は10秒以内に完了する
    expect(createTime).toBeLessThan(10000)

    // 一覧取得性能テスト
    const listStartTime = Date.now()
    const listResponse = await request(app)
      .get('/api/school/teachers?limit=100')
      .set('Authorization', `Bearer ${authToken}`)
    const listTime = Date.now() - listStartTime

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(100)
    expect(listTime).toBeLessThan(3000) // 3秒以内

    // 検索性能テスト
    const searchStartTime = Date.now()
    const searchResponse = await request(app)
      .get('/api/school/teachers?search=パフォーマンス')
      .set('Authorization', `Bearer ${authToken}`)
    const searchTime = Date.now() - searchStartTime

    expect(searchResponse.status).toBe(200)
    expect(searchTime).toBeLessThan(1000) // 1秒以内
  })
})
```

---

## Phase 5: カバレッジ測定と最適化

### 5.1 カバレッジレポート生成
```bash
# カバレッジ測定コマンド
npm run test:coverage

# 詳細HTMLレポート生成
npm run test:coverage:ui

# カバレッジ閾値チェック
npm run test:coverage:check
```

### 5.2 カバレッジ不足箇所の特定と修正
```typescript
// coverage/coverage-analysis.ts - カバレッジ分析スクリプト
import fs from 'fs'
import path from 'path'

interface CoverageReport {
  total: {
    lines: { total: number; covered: number; pct: number }
    functions: { total: number; covered: number; pct: number }
    statements: { total: number; covered: number; pct: number }
    branches: { total: number; covered: number; pct: number }
  }
  files: Record<string, any>
}

export function analyzeCoverage() {
  const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-final.json')
  const coverage: CoverageReport = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))

  console.log('📊 カバレッジ分析結果:')
  console.log(`📈 総合カバレッジ:`)
  console.log(`  Lines: ${coverage.total.lines.pct}%`)
  console.log(`  Functions: ${coverage.total.functions.pct}%`)
  console.log(`  Statements: ${coverage.total.statements.pct}%`)
  console.log(`  Branches: ${coverage.total.branches.pct}%`)

  // 100%未満のファイルを特定
  const incompletFiles = Object.entries(coverage.files)
    .filter(([_, fileCoverage]: [string, any]) => 
      fileCoverage.lines.pct < 100 || 
      fileCoverage.functions.pct < 100 || 
      fileCoverage.statements.pct < 100 || 
      fileCoverage.branches.pct < 100
    )
    .map(([filePath, fileCoverage]: [string, any]) => ({
      file: filePath.replace(process.cwd(), ''),
      lines: fileCoverage.lines.pct,
      functions: fileCoverage.functions.pct,
      statements: fileCoverage.statements.pct,
      branches: fileCoverage.branches.pct,
      uncoveredLines: Object.keys(fileCoverage.statementMap)
        .filter(line => !fileCoverage.s[line])
    }))

  if (incompletFiles.length > 0) {
    console.log('\n⚠️  カバレッジ不足ファイル:')
    incompletFiles.forEach(file => {
      console.log(`📄 ${file.file}`)
      console.log(`  Lines: ${file.lines}%, Functions: ${file.functions}%, Statements: ${file.statements}%, Branches: ${file.branches}%`)
      if (file.uncoveredLines.length > 0) {
        console.log(`  未カバー行: ${file.uncoveredLines.join(', ')}`)
      }
    })
  } else {
    console.log('\n✅ 全ファイルで100%カバレッジを達成!')
  }

  return incompletFiles
}

// 実行時チェック
if (require.main === module) {
  analyzeCoverage()
}
```

### 5.3 CI/CDパイプライン統合
```yaml
# .github/workflows/test-coverage.yml
name: Test Coverage

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-coverage:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: school_timetable_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests with coverage
      run: npm run test:coverage
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/school_timetable_test

    - name: Check coverage thresholds
      run: |
        npm run test:coverage:check
        if [ $? -ne 0 ]; then
          echo "❌ カバレッジが要件を満たしていません"
          exit 1
        fi

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        directory: ./coverage/
        flags: unittests
        name: codecov-umbrella

    - name: Generate coverage badge
      run: |
        npm run coverage:badge
        
    - name: Comment coverage on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
          
          const comment = `
          ## 📊 テストカバレッジレポート
          
          | メトリック | カバレッジ | 状態 |
          |-----------|----------|------|
          | Lines | ${coverage.total.lines.pct}% | ${coverage.total.lines.pct >= 100 ? '✅' : '❌'} |
          | Functions | ${coverage.total.functions.pct}% | ${coverage.total.functions.pct >= 100 ? '✅' : '❌'} |
          | Statements | ${coverage.total.statements.pct}% | ${coverage.total.statements.pct >= 100 ? '✅' : '❌'} |
          | Branches | ${coverage.total.branches.pct}% | ${coverage.total.branches.pct >= 100 ? '✅' : '❌'} |
          
          📋 [詳細レポート](https://codecov.io/gh/${{ github.repository }}/pull/${{ github.event.number }})
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

---

## 実装スケジュール

### Week 1-2: 基盤構築
- [x] Vitest設定最適化
- [x] MSWモックサーバーセットアップ
- [x] テストユーティリティ作成
- [x] CI/CD パイプライン構築

### Week 3-4: 単体テスト実装
- [ ] フロントエンドコンポーネント（全25ファイル）
- [ ] カスタムフック（全8ファイル）
- [ ] 型安全APIクライアント（全コントローラー）

### Week 5-6: サービス層テスト
- [ ] 型安全サービス層（全12サービス）
- [ ] データベースヘルパー
- [ ] ビジネスロジック検証

### Week 7-8: 統合テスト
- [ ] API統合テスト（全エンドポイント）
- [ ] エンドツーエンドフロー
- [ ] パフォーマンステスト

### Week 9-10: 品質保証
- [ ] 100%カバレッジ達成
- [ ] パフォーマンス最適化
- [ ] セキュリティテスト完成

## 成功指標

### 定量的指標
- **カバレッジ**: 分岐100%、機能100%、行100%、ステートメント100%
- **パフォーマンス**: API応答時間<3秒、フロントエンド読み込み<2秒
- **信頼性**: テスト成功率99.9%以上、フレーキーテスト0%

### 定性的指標
- **型安全性**: 型エラー0件、ランタイムエラー最小化
- **保守性**: テストコードの可読性とメンテナンス容易性
- **開発効率**: テスト駆動開発による品質向上

---

## 継続的改善

### 定期レビュー
- **週次**: カバレッジレポート確認、テスト追加
- **月次**: パフォーマンス分析、最適化実施
- **四半期**: テスト戦略見直し、ツール更新

### 品質メトリクス監視
- **Codecov**: カバレッジトレンド分析
- **SonarQube**: 技術的負債とコード品質
- **Lighthouse CI**: パフォーマンス継続監視

型安全システムの包括的なテスト実装により、高品質で信頼性の高いアプリケーションの継続的な提供を実現します。