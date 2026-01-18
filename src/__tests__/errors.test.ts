import { describe, it, expect, vi } from 'vitest'
import {
  AppError,
  ErrorCodes,
  successResponse,
  errorResponse,
  toAppError,
  logError,
  requireAuth,
  requireResource,
} from '@/lib/errors'

describe('AppError', () => {
  it('should create an error with default message', () => {
    const error = new AppError('AUTH_REQUIRED')

    expect(error.code).toBe('AUTH_REQUIRED')
    expect(error.userMessage).toBe('ログインが必要です')
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe('AppError')
  })

  it('should create an error with custom message', () => {
    const error = new AppError('VALIDATION_ERROR', {
      message: 'Custom message',
      userMessage: 'カスタムメッセージ',
    })

    expect(error.message).toBe('Custom message')
    expect(error.userMessage).toBe('カスタムメッセージ')
  })

  it('should include details when provided', () => {
    const error = new AppError('INVALID_INPUT', {
      details: { field: 'email', reason: 'invalid format' },
    })

    expect(error.details).toEqual({ field: 'email', reason: 'invalid format' })
  })

  it('should serialize to JSON correctly', () => {
    const error = new AppError('NOT_FOUND', {
      details: { id: '123' },
    })

    const json = error.toJSON()

    expect(json).toEqual({
      code: 'NOT_FOUND',
      message: '指定されたリソースが見つかりません',
      details: { id: '123' },
    })
  })
})

describe('successResponse', () => {
  it('should create a success response with data', () => {
    const data = { id: '1', name: 'Test' }
    const response = successResponse(data)

    expect(response).toEqual({
      success: true,
      data: { id: '1', name: 'Test' },
    })
  })
})

describe('errorResponse', () => {
  it('should create an error response with default message', () => {
    const response = errorResponse('AUTH_REQUIRED')

    expect(response).toEqual({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'ログインが必要です',
        details: undefined,
      },
    })
  })

  it('should create an error response with custom message', () => {
    const response = errorResponse('VALIDATION_ERROR', 'メールアドレスが不正です')

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.message).toBe('メールアドレスが不正です')
    }
  })
})

describe('toAppError', () => {
  it('should return the same error if already AppError', () => {
    const original = new AppError('AUTH_REQUIRED')
    const result = toAppError(original)

    expect(result).toBe(original)
  })

  it('should convert auth-related errors', () => {
    const error = new Error('Auth session expired')
    const result = toAppError(error)

    expect(result.code).toBe('AUTH_INVALID')
  })

  it('should convert JWT errors', () => {
    const error = new Error('JWT token invalid')
    const result = toAppError(error)

    expect(result.code).toBe('AUTH_INVALID')
  })

  it('should convert network errors', () => {
    const error = new Error('fetch failed')
    const result = toAppError(error)

    expect(result.code).toBe('NETWORK_ERROR')
  })

  it('should default to INTERNAL_ERROR for unknown errors', () => {
    const error = new Error('Something went wrong')
    const result = toAppError(error)

    expect(result.code).toBe('INTERNAL_ERROR')
  })

  it('should handle non-Error objects', () => {
    const result = toAppError('string error')

    expect(result.code).toBe('INTERNAL_ERROR')
    expect(result.message).toBe('string error')
  })
})

describe('logError', () => {
  it('should log error with context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('TestContext', new Error('Test error'))

    expect(consoleSpy).toHaveBeenCalledWith(
      '[TestContext] INTERNAL_ERROR:',
      expect.objectContaining({
        message: 'Test error',
      })
    )

    consoleSpy.mockRestore()
  })

  it('should include additional info', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logError('TestContext', new Error('Test'), { userId: '123' })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        userId: '123',
      })
    )

    consoleSpy.mockRestore()
  })
})

describe('requireAuth', () => {
  it('should not throw for valid user', () => {
    const user = { id: '123' }

    expect(() => requireAuth(user)).not.toThrow()
  })

  it('should throw AUTH_REQUIRED for null', () => {
    expect(() => requireAuth(null)).toThrow(AppError)

    try {
      requireAuth(null)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('AUTH_REQUIRED')
    }
  })

  it('should throw AUTH_REQUIRED for undefined', () => {
    expect(() => requireAuth(undefined)).toThrow(AppError)
  })
})

describe('requireResource', () => {
  it('should not throw for valid resource', () => {
    const resource = { id: '123', name: 'Test' }

    expect(() => requireResource(resource)).not.toThrow()
  })

  it('should throw NOT_FOUND for null', () => {
    expect(() => requireResource(null)).toThrow(AppError)

    try {
      requireResource(null)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('NOT_FOUND')
    }
  })

  it('should include resource name in message', () => {
    try {
      requireResource(null, 'レポート')
    } catch (error) {
      expect((error as AppError).userMessage).toBe('レポートが見つかりません')
    }
  })
})

describe('ErrorCodes', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED')
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCodes.PAYMENT_REQUIRED).toBe('PAYMENT_REQUIRED')
    expect(ErrorCodes.RATE_LIMIT).toBe('RATE_LIMIT')
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
  })
})
