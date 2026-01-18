/**
 * API エラーハンドリング用フック
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ErrorCode } from '@/lib/errors'
import { ErrorCodes } from '@/lib/errors'

interface ApiError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

interface UseApiErrorOptions {
  redirectOnAuth?: boolean
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const { redirectOnAuth = true } = options
  const router = useRouter()
  const [error, setError] = useState<ApiError | null>(null)
  const [isError, setIsError] = useState(false)

  const handleError = useCallback(
    (err: unknown) => {
      // APIレスポンスのエラー形式
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const apiError = err as ApiError
        setError(apiError)
        setIsError(true)

        // 認証エラーの場合はリダイレクト
        if (
          redirectOnAuth &&
          (apiError.code === ErrorCodes.AUTH_REQUIRED ||
            apiError.code === ErrorCodes.AUTH_EXPIRED)
        ) {
          const currentPath = window.location.pathname
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        }

        return apiError
      }

      // fetch失敗などの場合
      if (err instanceof Error) {
        const networkError: ApiError = {
          code: ErrorCodes.NETWORK_ERROR,
          message: 'ネットワークエラーが発生しました',
        }
        setError(networkError)
        setIsError(true)
        return networkError
      }

      // その他
      const unknownError: ApiError = {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'エラーが発生しました',
      }
      setError(unknownError)
      setIsError(true)
      return unknownError
    },
    [redirectOnAuth, router]
  )

  const clearError = useCallback(() => {
    setError(null)
    setIsError(false)
  }, [])

  return {
    error,
    isError,
    handleError,
    clearError,
  }
}

/**
 * APIフェッチ用ラッパー
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const json = await response.json()

    if (!response.ok || json.success === false) {
      return {
        data: null,
        error: json.error || {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'リクエストに失敗しました',
        },
      }
    }

    return { data: json as T, error: null }
  } catch (err) {
    console.error('Fetch error:', err)
    return {
      data: null,
      error: {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'ネットワークエラーが発生しました',
      },
    }
  }
}
