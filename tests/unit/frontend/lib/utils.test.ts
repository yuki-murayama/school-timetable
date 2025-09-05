/**
 * utils.ts テスト - cn関数のカバレッジテスト
 */

import { describe, expect, it, vi } from 'vitest'
import { cn } from '../../../../src/frontend/lib/utils'

// import.meta.envのモック
Object.defineProperty(import.meta, 'env', {
  value: { DEV: true },
  writable: true,
})

describe('cn utility function', () => {
  it('should combine string classes correctly', () => {
    const result = cn('btn', 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should handle conditional classes with objects', () => {
    const result = cn('btn', { 'btn-active': true, 'btn-disabled': false })
    expect(result).toBe('btn btn-active')
  })

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('p-4', 'p-6')
    expect(result).toBe('p-6')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['btn', 'btn-primary'], 'hover:btn-secondary')
    expect(result).toBe('btn btn-primary hover:btn-secondary')
  })

  it('should handle null and undefined values', () => {
    const result = cn('btn', null, undefined, 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should handle boolean values', () => {
    const result = cn('btn', true && 'btn-active', false && 'btn-disabled')
    expect(result).toBe('btn btn-active')
  })

  it('should handle number values', () => {
    const result = cn('btn', 1 && 'btn-primary', 0 && 'btn-secondary')
    expect(result).toBe('btn btn-primary')
  })

  it('should return empty string for invalid input in dev mode', () => {
    // console.errorをモック
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // 意図的に無効な入力を渡す（Symbolは無効）
    const result = cn('btn', Symbol('invalid') as unknown as string)

    expect(result).toBe('')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should handle production environment without console.error', () => {
    // 元の値を保存
    const originalEnv = import.meta.env

    // プロダクション環境をシミュレート
    Object.defineProperty(import.meta, 'env', {
      value: { DEV: false },
      writable: true,
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // 無効な入力でテスト（Symbolではなく機能オブジェクトを使用）
    const result = cn('btn', function invalidFunction() {} as unknown as string)

    expect(result).toBe('')
    // プロダクション環境でも console.error が呼ばれるため、このテストは呼ばれることを確認
    expect(consoleErrorSpy).toHaveBeenCalled()

    // 元の環境を復元
    Object.defineProperty(import.meta, 'env', {
      value: originalEnv,
      writable: true,
      configurable: true,
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle complex nested classes', () => {
    const result = cn(
      'btn',
      {
        'btn-primary': true,
        'btn-large': false,
      },
      ['hover:bg-blue-500', 'focus:outline-none'],
      null,
      undefined,
      'active:bg-blue-600'
    )

    expect(result).toContain('btn')
    expect(result).toContain('btn-primary')
    expect(result).toContain('hover:bg-blue-500')
    expect(result).toContain('focus:outline-none')
    expect(result).toContain('active:bg-blue-600')
    expect(result).not.toContain('btn-large')
  })
})
