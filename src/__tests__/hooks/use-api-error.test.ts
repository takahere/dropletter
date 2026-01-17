import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useApiError, fetchApi } from '@/hooks/use-api-error'
import { ErrorCodes } from '@/lib/errors'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock window.location
const mockLocation = {
  pathname: '/test-page',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('useApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with no error', () => {
    const { result } = renderHook(() => useApiError())

    expect(result.current.error).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('should handle API error object', () => {
    const { result } = renderHook(() => useApiError())

    act(() => {
      result.current.handleError({
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
      })
    })

    expect(result.current.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'バリデーションエラー',
    })
    expect(result.current.isError).toBe(true)
  })

  it('should handle Error instance', () => {
    const { result } = renderHook(() => useApiError())

    act(() => {
      result.current.handleError(new Error('Network failed'))
    })

    expect(result.current.error?.code).toBe('NETWORK_ERROR')
    expect(result.current.isError).toBe(true)
  })

  it('should handle unknown error', () => {
    const { result } = renderHook(() => useApiError())

    act(() => {
      result.current.handleError('string error')
    })

    expect(result.current.error?.code).toBe('INTERNAL_ERROR')
  })

  it('should redirect on auth error when redirectOnAuth is true', () => {
    const { result } = renderHook(() => useApiError({ redirectOnAuth: true }))

    act(() => {
      result.current.handleError({
        code: ErrorCodes.AUTH_REQUIRED,
        message: 'ログインが必要です',
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Ftest-page')
  })

  it('should redirect on auth expired', () => {
    const { result } = renderHook(() => useApiError({ redirectOnAuth: true }))

    act(() => {
      result.current.handleError({
        code: ErrorCodes.AUTH_EXPIRED,
        message: 'セッション期限切れ',
      })
    })

    expect(mockPush).toHaveBeenCalled()
  })

  it('should not redirect when redirectOnAuth is false', () => {
    const { result } = renderHook(() => useApiError({ redirectOnAuth: false }))

    act(() => {
      result.current.handleError({
        code: ErrorCodes.AUTH_REQUIRED,
        message: 'ログインが必要です',
      })
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useApiError())

    act(() => {
      result.current.handleError({
        code: 'VALIDATION_ERROR',
        message: 'エラー',
      })
    })

    expect(result.current.isError).toBe(true)

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('should return the error from handleError', () => {
    const { result } = renderHook(() => useApiError())

    let returnedError: unknown
    act(() => {
      returnedError = result.current.handleError({
        code: 'NOT_FOUND',
        message: '見つかりません',
      })
    })

    expect(returnedError).toEqual({
      code: 'NOT_FOUND',
      message: '見つかりません',
    })
  })
})

describe('fetchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, id: '123', name: 'Test' }),
    })

    const result = await fetchApi<{ id: string; name: string }>('/api/test')

    expect(result.data).toEqual({ success: true, id: '123', name: 'Test' })
    expect(result.error).toBeNull()
  })

  it('should return error on failure response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'リソースが見つかりません',
          },
        }),
    })

    const result = await fetchApi('/api/test')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'NOT_FOUND',
      message: 'リソースが見つかりません',
    })
  })

  it('should return error when success is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
          },
        }),
    })

    const result = await fetchApi('/api/test')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return network error on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchApi('/api/test')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NETWORK_ERROR')
  })

  it('should send JSON content type header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    await fetchApi('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('should merge custom headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    await fetchApi('/api/test', {
      headers: {
        Authorization: 'Bearer token123',
      },
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        }),
      })
    )
  })
})
