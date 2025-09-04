import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, vi } from 'vitest'

// Testing Libraryのマッチャーを追加
expect.extend(matchers)

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
})

// Reactコンポーネントのグローバルモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserverのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserverのモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// DOMRectのモック
global.DOMRect = {
  fromRect: vi.fn(() => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  })),
} as Record<string, unknown>

// scrollIntoViewのモック
Element.prototype.scrollIntoView = vi.fn()

// 環境変数のモック
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
  },
}))

// 統合APIのグローバルモック
vi.mock('@/lib/api', () => {
  const mockResponse = <T>(data: T) => Promise.resolve(data)
  const _mockError = (error: Record<string, unknown>) => Promise.reject(error)

  return {
    default: {
      teachers: {
        getTeachers: vi.fn(() => mockResponse({ teachers: [] })),
        getTeacher: vi.fn(() => mockResponse({ data: {} })),
        createTeacher: vi.fn(() => mockResponse({ data: {} })),
        updateTeacher: vi.fn(() => mockResponse({ data: {} })),
        deleteTeacher: vi.fn(() => mockResponse({ success: true })),
      },
      subjects: {
        getSubjects: vi.fn(() => mockResponse({ subjects: [] })),
        getSubject: vi.fn(() => mockResponse({ data: {} })),
        createSubject: vi.fn(() => mockResponse({ data: {} })),
        updateSubject: vi.fn(() => mockResponse({ data: {} })),
        deleteSubject: vi.fn(() => mockResponse({ success: true })),
      },
      classrooms: {
        getClassrooms: vi.fn(() => mockResponse({ classrooms: [] })),
        getClassroom: vi.fn(() => mockResponse({ data: {} })),
        createClassroom: vi.fn(() => mockResponse({ data: {} })),
        updateClassroom: vi.fn(() => mockResponse({ data: {} })),
        deleteClassroom: vi.fn(() => mockResponse({ success: true })),
      },
      schoolSettings: {
        getSettings: vi.fn(() =>
          mockResponse({
            grade1Classes: 4,
            grade2Classes: 3,
            grade3Classes: 3,
            dailyPeriods: 6,
            saturdayPeriods: 4,
          })
        ),
        updateSettings: vi.fn(() => mockResponse({})),
      },
      isValidationError: vi.fn((error: Record<string, unknown>) => {
        return error && error.name === 'ValidationError'
      }),
      isNotFoundError: vi.fn((error: Record<string, unknown>) => {
        return error && error.status === 404
      }),
    },
  }
})

// Toastのモック
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}))
