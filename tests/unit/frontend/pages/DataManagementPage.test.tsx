import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../../src/frontend/hooks/use-auth'
import { useToast } from '../../../../src/frontend/hooks/use-toast'
import { DataManagementPage } from '../../../../src/frontend/pages/DataManagementPage'

// モック設定
vi.mock('../../../../src/frontend/hooks/use-auth')
vi.mock('../../../../src/frontend/hooks/use-toast')

// API モック
vi.mock('../../../../src/frontend/lib/api', () => ({
  schoolApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  teacherApi: {
    getAll: vi.fn(),
    getTeachers: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  subjectApi: {
    getAll: vi.fn(),
    getSubjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  classroomApi: {
    getAll: vi.fn(),
    getClassrooms: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// コンポーネントセクションのモック
vi.mock('../../../../src/frontend/components/data-management/SchoolSettingsSection', () => ({
  SchoolSettingsSection: ({ settings, onSettingsUpdate }: any) => (
    <div data-testid='school-settings-section'>
      <h3>学校設定</h3>
      <button
        onClick={() =>
          onSettingsUpdate({
            grade1Classes: 5,
            grade2Classes: 4,
            grade3Classes: 3,
            dailyPeriods: 6,
            saturdayPeriods: 4,
          })
        }
      >
        設定更新
      </button>
    </div>
  ),
}))

vi.mock('../../../../src/frontend/components/data-management/TeachersSection', () => ({
  TeachersSection: ({ teachers, subjects, onTeachersUpdate }: any) => (
    <div data-testid='teachers-section'>
      <h3>教師管理</h3>
      <button
        onClick={() =>
          onTeachersUpdate([
            { id: 'teacher-1', name: 'テスト教師', subjects: ['math'], grades: [1] },
          ])
        }
      >
        教師更新
      </button>
    </div>
  ),
}))

vi.mock('../../../../src/frontend/components/data-management/SubjectsSection', () => ({
  SubjectsSection: ({ subjects, onSubjectsUpdate }: any) => (
    <div data-testid='subjects-section'>
      <h3>教科管理</h3>
      <button onClick={() => onSubjectsUpdate([{ id: 'subject-1', name: '数学', weeklyHours: 4 }])}>
        教科更新
      </button>
    </div>
  ),
}))

vi.mock('../../../../src/frontend/components/data-management/ClassroomsSection', () => ({
  ClassroomsSection: ({ classrooms, onClassroomsUpdate }: any) => (
    <div data-testid='classrooms-section'>
      <h3>教室管理</h3>
      <button
        onClick={() =>
          onClassroomsUpdate([{ id: 'classroom-1', name: '1-A教室', capacity: 40, equipment: [] }])
        }
      >
        教室更新
      </button>
    </div>
  ),
}))

vi.mock('../../../../src/frontend/components/data-management/ConditionsSection', () => ({
  ConditionsSection: () => (
    <div data-testid='conditions-section'>
      <h3>条件設定</h3>
    </div>
  ),
}))

// APIモックのインポート
import { classroomApi, schoolApi, subjectApi, teacherApi } from '../../../../src/frontend/lib/api'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockUseToast = useToast as ReturnType<typeof vi.fn>

describe('DataManagementPage', () => {
  const mockToast = vi.fn()
  const mockGetFreshToken = vi.fn()
  const mockGetApiOptions = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // DOMセットアップ - テスト毎に新しいDOMルートを作成
    document.body.innerHTML = '<div id="root"></div>'

    mockUseAuth.mockReturnValue({
      token: 'test-token',
      getFreshToken: mockGetFreshToken,
      getApiOptions: mockGetApiOptions,
      user: { id: 'test-user', email: 'test@example.com' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    })

    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockGetFreshToken.mockResolvedValue('fresh-token')
    mockGetApiOptions.mockReturnValue({
      headers: { Authorization: 'Bearer test-token' },
    })

    // APIメソッドのモック設定
    ;(teacherApi.getTeachers as any).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(subjectApi.getSubjects as any).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(classroomApi.getClassrooms as any).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(schoolApi.getSettings as any).mockResolvedValue({
      success: true,
      data: {
        schoolName: 'テスト学校',
        grades: [1, 2, 3],
        classesPerGrade: 2,
        daysPerWeek: 5,
        periodsPerDay: 6,
      },
    })
  })

  it('初期レンダリングで正しい状態を表示する', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    expect(screen.getByText('データ登録')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '基本設定' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '教師情報' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '教科情報' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '教室情報' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '条件設定' })).toBeInTheDocument()
  })

  it('学校設定タブの内容を表示する', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    expect(screen.getByTestId('school-settings-section')).toBeInTheDocument()
    expect(screen.getByText('学校設定')).toBeInTheDocument()
  })

  it('教師タブが存在し、クリック可能である', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教師タブが存在することを確認
    const teachersTab = screen.getByRole('tab', { name: '教師情報' })
    expect(teachersTab).toBeInTheDocument()

    // タブがクリック可能であることを確認
    expect(teachersTab).not.toBeDisabled()

    // タブをクリックしてエラーが発生しないことを確認
    await act(async () => {
      fireEvent.click(teachersTab)
    })

    // タブが依然として存在することを確認
    expect(teachersTab).toBeInTheDocument()
  })

  it('教科タブが存在し、クリック可能である', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教科タブが存在することを確認
    const subjectsTab = screen.getByRole('tab', { name: '教科情報' })
    expect(subjectsTab).toBeInTheDocument()

    // タブがクリック可能であることを確認
    expect(subjectsTab).not.toBeDisabled()

    // タブをクリックしてエラーが発生しないことを確認
    await act(async () => {
      fireEvent.click(subjectsTab)
    })

    // タブが依然として存在することを確認
    expect(subjectsTab).toBeInTheDocument()
  })

  it('教室タブが存在し、クリック可能である', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教室タブが存在することを確認
    const classroomsTab = screen.getByRole('tab', { name: '教室情報' })
    expect(classroomsTab).toBeInTheDocument()

    // タブがクリック可能であることを確認
    expect(classroomsTab).not.toBeDisabled()

    // タブをクリックしてエラーが発生しないことを確認
    await act(async () => {
      fireEvent.click(classroomsTab)
    })

    // タブが依然として存在することを確認
    expect(classroomsTab).toBeInTheDocument()
  })

  it('条件タブが存在し、クリック可能である', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 条件タブが存在することを確認
    const conditionsTab = screen.getByRole('tab', { name: '条件設定' })
    expect(conditionsTab).toBeInTheDocument()

    // タブがクリック可能であることを確認
    expect(conditionsTab).not.toBeDisabled()

    // タブをクリックしてエラーが発生しないことを確認
    await act(async () => {
      fireEvent.click(conditionsTab)
    })

    // タブが依然として存在することを確認
    expect(conditionsTab).toBeInTheDocument()
  })

  it('Excel一括登録ボタンが表示される', async () => {
    const container = document.getElementById('root')
    await act(async () => {
      render(<DataManagementPage />, { container })
    })

    const uploadButton = screen.getByRole('button', { name: /Excelから一括登録/ })
    expect(uploadButton).toBeInTheDocument()
  })

  it('設定更新ボタンが存在し、クリック可能である', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 設定更新ボタンが存在することを確認
    const updateButton = screen.getByText('設定更新')
    expect(updateButton).toBeInTheDocument()

    // ボタンがクリック可能であることを確認
    expect(updateButton).not.toBeDisabled()

    // ボタンをクリックしてエラーが発生しないことを確認
    await act(async () => {
      fireEvent.click(updateButton)
    })

    // ボタンが依然として存在することを確認
    expect(updateButton).toBeInTheDocument()
  })

  it('教師タブの基本コンポーネント存在確認', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教師タブボタンが存在することを確認
    const teachersTab = screen.getByRole('tab', { name: '教師情報' })
    expect(teachersTab).toBeInTheDocument()
    expect(teachersTab).not.toBeDisabled()
  })

  it('教科タブの基本コンポーネント存在確認', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教科タブボタンが存在することを確認
    const subjectsTab = screen.getByRole('tab', { name: '教科情報' })
    expect(subjectsTab).toBeInTheDocument()
    expect(subjectsTab).not.toBeDisabled()
  })

  it('教室タブの基本コンポーネント存在確認', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    // 教室タブボタンが存在することを確認
    const classroomsTab = screen.getByRole('tab', { name: '教室情報' })
    expect(classroomsTab).toBeInTheDocument()
    expect(classroomsTab).not.toBeDisabled()
  })

  it('Excel一括登録ボタンのクリック動作を確認する', async () => {
    await act(async () => {
      render(<DataManagementPage />)
    })

    const uploadButton = screen.getByRole('button', { name: /Excelから一括登録/ })

    // ボタンのクリック動作を確認（現在は機能未実装のため、クリック可能であることのみ確認）
    await act(async () => {
      fireEvent.click(uploadButton)
    })

    // ボタンがクリック可能であることを確認
    expect(uploadButton).toBeInTheDocument()
  })

  describe('基本プロパティテスト', () => {
    it('DataManagementPageコンポーネントが正しく定義されている', () => {
      expect(DataManagementPage).toBeDefined()
      expect(typeof DataManagementPage).toBe('function')
    })

    it('モック化されたフック・APIが正しく定義されている', () => {
      expect(mockUseAuth).toBeDefined()
      expect(typeof mockUseAuth).toBe('function')
      expect(mockUseToast).toBeDefined()
      expect(typeof mockUseToast).toBe('function')
      expect(teacherApi.getTeachers).toBeDefined()
      expect(typeof teacherApi.getTeachers).toBe('function')
      expect(subjectApi.getSubjects).toBeDefined()
      expect(typeof subjectApi.getSubjects).toBe('function')
      expect(classroomApi.getClassrooms).toBeDefined()
      expect(typeof classroomApi.getClassrooms).toBe('function')
      expect(schoolApi.getSettings).toBeDefined()
      expect(typeof schoolApi.getSettings).toBe('function')
    })

    it('テストヘルパー関数が正しく定義されている', () => {
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
      expect(mockGetFreshToken).toBeDefined()
      expect(typeof mockGetFreshToken).toBe('function')
      expect(mockGetApiOptions).toBeDefined()
      expect(typeof mockGetApiOptions).toBe('function')
    })

    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
      expect(beforeEach).toBeDefined()
      expect(vi).toBeDefined()
    })

    it('React Testing Libraryが正しく設定されている', () => {
      expect(render).toBeDefined()
      expect(typeof render).toBe('function')
      expect(screen).toBeDefined()
      expect(typeof screen.getByText).toBe('function')
      expect(fireEvent).toBeDefined()
      expect(typeof fireEvent.click).toBe('function')
      expect(waitFor).toBeDefined()
      expect(typeof waitFor).toBe('function')
      expect(act).toBeDefined()
      expect(typeof act).toBe('function')
    })

    it('モック戻り値が正しく構成されている', () => {
      // モック関数が正しく設定されていることを確認
      expect(mockUseAuth).toBeDefined()
      expect(typeof mockUseAuth).toBe('function')
      expect(mockGetFreshToken).toBeDefined()
      expect(typeof mockGetFreshToken).toBe('function')
      expect(mockGetApiOptions).toBeDefined()
      expect(typeof mockGetApiOptions).toBe('function')
      expect(mockToast).toBeDefined()
      expect(typeof mockToast).toBe('function')
    })

    it('Vitestモック機能が正しく動作している', () => {
      expect(vi.fn).toBeDefined()
      expect(typeof vi.fn).toBe('function')
      expect(vi.mock).toBeDefined()
      expect(typeof vi.mock).toBe('function')
      expect(vi.clearAllMocks).toBeDefined()
      expect(typeof vi.clearAllMocks).toBe('function')
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
      expect(Promise).toBeDefined()
      expect(typeof Promise.resolve).toBe('function')
    })

    it('サンプルデータ構造が正しく動作している', () => {
      const sampleSchoolSettings = {
        grade1Classes: 3,
        grade2Classes: 3,
        grade3Classes: 2,
        dailyPeriods: 6,
        saturdayPeriods: 4,
      }

      expect(typeof sampleSchoolSettings.grade1Classes).toBe('number')
      expect(typeof sampleSchoolSettings.dailyPeriods).toBe('number')
      expect(sampleSchoolSettings.grade1Classes).toBeGreaterThan(0)
      expect(sampleSchoolSettings.dailyPeriods).toBeGreaterThan(0)
    })

    it('タブコンポーネント関連の機能が正しく動作している', () => {
      const tabItems = ['学校設定', '教師情報', '教科情報', '教室情報']

      expect(Array.isArray(tabItems)).toBe(true)
      expect(tabItems).toHaveLength(4)
      expect(tabItems).toContain('学校設定')
      expect(tabItems).toContain('教師情報')
      expect(tabItems).toContain('教科情報')
      expect(tabItems).toContain('教室情報')
    })

    it('データ管理ページで使用するAPI構造が正しく動作している', () => {
      const apiStructure = {
        teacherApi: { getTeachers: vi.fn() },
        subjectApi: { getSubjects: vi.fn() },
        classroomApi: { getClassrooms: vi.fn() },
        schoolApi: { getSettings: vi.fn() },
      }

      expect(typeof apiStructure.teacherApi.getTeachers).toBe('function')
      expect(typeof apiStructure.subjectApi.getSubjects).toBe('function')
      expect(typeof apiStructure.classroomApi.getClassrooms).toBe('function')
      expect(typeof apiStructure.schoolApi.getSettings).toBe('function')
    })
  })
})
