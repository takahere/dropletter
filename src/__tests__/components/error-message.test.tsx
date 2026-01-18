import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ErrorMessage,
  InlineError,
  ErrorPage,
  ErrorBanner,
} from '@/components/ui/error-message'

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="エラーが発生しました" />)

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
  })

  it('should render with error code', () => {
    render(<ErrorMessage message="詳細メッセージ" code="AUTH_REQUIRED" />)

    expect(screen.getByText('詳細メッセージ')).toBeInTheDocument()
    expect(screen.getByText(/AUTH_REQUIRED/)).toBeInTheDocument()
  })

  it('should call onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    render(<ErrorMessage message="エラー" onDismiss={onDismiss} />)

    const dismissButton = screen.getByRole('button', { name: '閉じる' })
    fireEvent.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should not show dismiss button when onDismiss is not provided', () => {
    render(<ErrorMessage message="エラー" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should apply different severity styles', () => {
    const { rerender, container } = render(
      <ErrorMessage message="エラー" severity="error" />
    )
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument()

    rerender(<ErrorMessage message="警告" severity="warning" />)
    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument()

    rerender(<ErrorMessage message="情報" severity="info" />)
    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument()
  })

  it('should have role="alert"', () => {
    render(<ErrorMessage message="エラー" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('InlineError', () => {
  it('should render inline error message', () => {
    render(<InlineError message="フィールドエラー" />)

    expect(screen.getByText('フィールドエラー')).toBeInTheDocument()
  })

  it('should have correct styling', () => {
    const { container } = render(<InlineError message="エラー" />)

    expect(container.querySelector('.text-red-600')).toBeInTheDocument()
    expect(container.querySelector('.text-sm')).toBeInTheDocument()
  })

  it('should have role="alert"', () => {
    render(<InlineError message="エラー" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('ErrorPage', () => {
  it('should render full page error with default title', () => {
    render(<ErrorPage message="ページエラー" />)

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText('ページエラー')).toBeInTheDocument()
  })

  it('should render with custom title', () => {
    render(<ErrorPage title="404" message="ページが見つかりません" />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('ページが見つかりません')).toBeInTheDocument()
  })

  it('should render action button when onAction is provided', () => {
    const onAction = vi.fn()
    render(<ErrorPage message="エラー" onAction={onAction} actionLabel="ホームに戻る" />)

    const button = screen.getByText('ホームに戻る')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('should show default action label', () => {
    const onAction = vi.fn()
    render(<ErrorPage message="エラー" onAction={onAction} />)

    expect(screen.getByText('再試行')).toBeInTheDocument()
  })

  it('should render error code when provided', () => {
    render(<ErrorPage message="エラー" code="NOT_FOUND" />)

    expect(screen.getByText(/NOT_FOUND/)).toBeInTheDocument()
  })
})

describe('ErrorBanner', () => {
  it('should render banner message', () => {
    render(<ErrorBanner message="バナーエラー" />)

    expect(screen.getByText('バナーエラー')).toBeInTheDocument()
  })

  it('should render dismissible banner', () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="バナーエラー" onDismiss={onDismiss} />)

    const dismissButton = screen.getByRole('button', { name: '閉じる' })
    fireEvent.click(dismissButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should not show dismiss button when not dismissible', () => {
    render(<ErrorBanner message="固定バナー" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
