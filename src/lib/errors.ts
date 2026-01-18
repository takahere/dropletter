/**
 * 共通エラーハンドリング基盤
 */

// エラーコード定義
export const ErrorCodes = {
  // 認証関連
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',

  // 権限関連
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',

  // バリデーション
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // 決済関連
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',

  // リソース制限
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // サーバーエラー
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // ネットワーク
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// ユーザー向けメッセージマッピング
const errorMessages: Record<ErrorCode, string> = {
  AUTH_REQUIRED: 'ログインが必要です',
  AUTH_INVALID: '認証情報が無効です',
  AUTH_EXPIRED: 'セッションが期限切れです。再度ログインしてください',
  FORBIDDEN: 'この操作を行う権限がありません',
  NOT_FOUND: '指定されたリソースが見つかりません',
  VALIDATION_ERROR: '入力内容に誤りがあります',
  INVALID_INPUT: '入力内容が不正です',
  PAYMENT_REQUIRED: 'お支払いが必要です',
  PAYMENT_FAILED: '決済に失敗しました',
  SUBSCRIPTION_EXPIRED: 'サブスクリプションが期限切れです',
  RATE_LIMIT: 'リクエスト回数の上限に達しました。しばらく待ってから再試行してください',
  QUOTA_EXCEEDED: '利用可能な回数を超えました。プランをアップグレードしてください',
  INTERNAL_ERROR: 'システムエラーが発生しました',
  SERVICE_UNAVAILABLE: 'サービスが一時的に利用できません',
  EXTERNAL_SERVICE_ERROR: '外部サービスとの通信に失敗しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  TIMEOUT: 'リクエストがタイムアウトしました',
}

// HTTPステータスコードマッピング
const errorStatusCodes: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  AUTH_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INVALID_INPUT: 400,
  PAYMENT_REQUIRED: 402,
  PAYMENT_FAILED: 402,
  SUBSCRIPTION_EXPIRED: 402,
  RATE_LIMIT: 429,
  QUOTA_EXCEEDED: 403,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  EXTERNAL_SERVICE_ERROR: 502,
  NETWORK_ERROR: 503,
  TIMEOUT: 504,
}

/**
 * アプリケーション共通エラークラス
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly userMessage: string
  readonly statusCode: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    options?: {
      message?: string
      userMessage?: string
      details?: Record<string, unknown>
    }
  ) {
    const userMessage = options?.userMessage || errorMessages[code]
    super(options?.message || userMessage)

    this.name = 'AppError'
    this.code = code
    this.userMessage = userMessage
    this.statusCode = errorStatusCodes[code]
    this.details = options?.details

    // Error.captureStackTraceが利用可能な環境での対応
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      details: this.details,
    }
  }
}

/**
 * 統一APIレスポンス型
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorResponse }

export interface ApiErrorResponse {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

/**
 * 成功レスポンスを生成
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

/**
 * エラーレスポンスを生成
 */
export function errorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message: message || errorMessages[code],
      details,
    },
  }
}

/**
 * エラーをAppErrorに変換
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    // Supabase認証エラーの判定
    if (error.message.includes('Auth') || error.message.includes('JWT')) {
      return new AppError('AUTH_INVALID', { message: error.message })
    }

    // ネットワークエラーの判定
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AppError('NETWORK_ERROR', { message: error.message })
    }

    return new AppError('INTERNAL_ERROR', { message: error.message })
  }

  return new AppError('INTERNAL_ERROR', { message: String(error) })
}

/**
 * エラーログ出力（統一フォーマット）
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  const appError = toAppError(error)

  console.error(`[${context}] ${appError.code}:`, {
    message: appError.message,
    userMessage: appError.userMessage,
    details: appError.details,
    ...additionalInfo,
    stack: appError.stack,
  })
}

/**
 * 認証必須のチェックヘルパー
 */
export function requireAuth<T>(user: T | null | undefined): asserts user is T {
  if (!user) {
    throw new AppError('AUTH_REQUIRED')
  }
}

/**
 * リソース存在チェックヘルパー
 */
export function requireResource<T>(
  resource: T | null | undefined,
  resourceName = 'リソース'
): asserts resource is T {
  if (!resource) {
    throw new AppError('NOT_FOUND', {
      userMessage: `${resourceName}が見つかりません`,
    })
  }
}
