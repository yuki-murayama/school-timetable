/**
 * use-auth追加テスト - カバレッジ向上用
 */

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAuth } from '../../../../src/frontend/hooks/use-auth'

describe('useAuth - Additional Coverage', () => {
  it('should return auth object with proper structure', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('token')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
    expect(result.current).toHaveProperty('clearAuth')
  })

  it('should have proper function types', () => {
    const { result } = renderHook(() => useAuth())

    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.clearAuth).toBe('function')
    expect(typeof result.current.isAuthenticated).toBe('boolean')
    expect(typeof result.current.isLoading).toBe('boolean')
  })
})
