/**
 * API Route ヘルパー関数
 */

import { NextResponse } from 'next/server'
import {
  AppError,
  ErrorCode,
  ErrorCodes,
  logError,
  toAppError,
  type ApiErrorResponse,
} from './errors'

/**
 * 成功レスポンスを返す
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status })
}

/**
 * エラーレスポンスを返す
 */
export function apiError(
  code: ErrorCode,
  message?: string,
  status?: number
): NextResponse {
  const appError = new AppError(code, { userMessage: message })

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.userMessage,
      } as ApiErrorResponse,
    },
    { status: status || appError.statusCode }
  )
}

/**
 * エラーをレスポンスに変換
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse {
  const appError = toAppError(error)

  logError(context, appError)

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.userMessage,
        details: appError.details,
      } as ApiErrorResponse,
    },
    { status: appError.statusCode }
  )
}

/**
 * APIルートをラップしてエラーハンドリングを統一
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}

/**
 * 認証チェック結果型
 */
export interface AuthResult {
  user: {
    id: string
    email: string | undefined
  }
}

/**
 * 認証エラーレスポンス
 */
export function authRequiredResponse(): NextResponse {
  return apiError(ErrorCodes.AUTH_REQUIRED, 'ログインが必要です', 401)
}

/**
 * 権限エラーレスポンス
 */
export function forbiddenResponse(message?: string): NextResponse {
  return apiError(ErrorCodes.FORBIDDEN, message || 'この操作を行う権限がありません', 403)
}

/**
 * Not Foundレスポンス
 */
export function notFoundResponse(resource = 'リソース'): NextResponse {
  return apiError(ErrorCodes.NOT_FOUND, `${resource}が見つかりません`, 404)
}

/**
 * バリデーションエラーレスポンス
 */
export function validationErrorResponse(message: string): NextResponse {
  return apiError(ErrorCodes.VALIDATION_ERROR, message, 400)
}

/**
 * 内部エラーレスポンス
 */
export function internalErrorResponse(context?: string): NextResponse {
  if (context) {
    console.error(`[Internal Error] ${context}`)
  }
  return apiError(ErrorCodes.INTERNAL_ERROR, 'システムエラーが発生しました', 500)
}
