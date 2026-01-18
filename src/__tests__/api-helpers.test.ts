import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      body,
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}))

import {
  apiSuccess,
  apiError,
  handleApiError,
  withErrorHandler,
  authRequiredResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api-helpers'
import { AppError, ErrorCodes } from '@/lib/errors'

describe('apiSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a success response with data', () => {
    const data = { id: '123', name: 'Test' }
    apiSuccess(data)

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: true, id: '123', name: 'Test' },
      { status: 200 }
    )
  })

  it('should use custom status code', () => {
    apiSuccess({ created: true }, 201)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.any(Object),
      { status: 201 }
    )
  })
})

describe('apiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create an error response with default message', () => {
    apiError('AUTH_REQUIRED')

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'AUTH_REQUIRED',
        }),
      }),
      { status: 401 }
    )
  })

  it('should use custom message', () => {
    apiError('VALIDATION_ERROR', 'カスタムエラー')

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'カスタムエラー',
        }),
      }),
      expect.any(Object)
    )
  })

  it('should use custom status code', () => {
    apiError('INTERNAL_ERROR', undefined, 503)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.any(Object),
      { status: 503 }
    )
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should handle AppError', () => {
    const error = new AppError('NOT_FOUND')
    handleApiError(error, 'TestContext')

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      }),
      { status: 404 }
    )
  })

  it('should convert generic Error to AppError', () => {
    handleApiError(new Error('Something failed'), 'TestContext')

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      }),
      { status: 500 }
    )
  })

  it('should log the error', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    handleApiError(new Error('Test'), 'TestContext')

    expect(consoleSpy).toHaveBeenCalled()
  })
})

describe('withErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should call handler and return result on success', async () => {
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ data: 'test' })
    )

    const wrapped = withErrorHandler(mockHandler, 'TestContext')
    await wrapped('arg1', 'arg2')

    expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should catch errors and return error response', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Handler failed'))

    const wrapped = withErrorHandler(mockHandler, 'TestContext')
    await wrapped()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      }),
      expect.any(Object)
    )
  })

  it('should handle AppError correctly', async () => {
    const mockHandler = vi.fn().mockRejectedValue(
      new AppError('FORBIDDEN')
    )

    const wrapped = withErrorHandler(mockHandler, 'TestContext')
    await wrapped()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      }),
      { status: 403 }
    )
  })
})

describe('Convenience response functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authRequiredResponse', () => {
    it('should return 401 response', () => {
      authRequiredResponse()

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_REQUIRED',
          }),
        }),
        { status: 401 }
      )
    })
  })

  describe('forbiddenResponse', () => {
    it('should return 403 response with default message', () => {
      forbiddenResponse()

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'この操作を行う権限がありません',
          }),
        }),
        { status: 403 }
      )
    })

    it('should use custom message', () => {
      forbiddenResponse('アクセスが拒否されました')

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'アクセスが拒否されました',
          }),
        }),
        expect.any(Object)
      )
    })
  })

  describe('notFoundResponse', () => {
    it('should return 404 response with default resource name', () => {
      notFoundResponse()

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'リソースが見つかりません',
          }),
        }),
        { status: 404 }
      )
    })

    it('should use custom resource name', () => {
      notFoundResponse('レポート')

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'レポートが見つかりません',
          }),
        }),
        expect.any(Object)
      )
    })
  })

  describe('validationErrorResponse', () => {
    it('should return 400 response', () => {
      validationErrorResponse('メールアドレスが不正です')

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'メールアドレスが不正です',
          }),
        }),
        { status: 400 }
      )
    })
  })

  describe('internalErrorResponse', () => {
    it('should return 500 response', () => {
      internalErrorResponse()

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        }),
        { status: 500 }
      )
    })

    it('should log context if provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      internalErrorResponse('Database connection failed')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Internal Error] Database connection failed'
      )
    })
  })
})
