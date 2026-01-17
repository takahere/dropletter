import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonListItem,
  SkeletonTableRow,
  BillingViewSkeleton,
  HistoryViewSkeleton,
  ReportViewSkeleton,
} from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('should render with default classes', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement

    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('rounded-md')
  })

  it('should apply custom className', () => {
    const { container } = render(<Skeleton className="w-full h-10" />)
    const skeleton = container.firstChild as HTMLElement

    expect(skeleton).toHaveClass('w-full')
    expect(skeleton).toHaveClass('h-10')
  })
})

describe('SkeletonText', () => {
  it('should render default 3 lines', () => {
    const { container } = render(<SkeletonText />)
    const lines = container.querySelectorAll('.animate-pulse')

    expect(lines).toHaveLength(3)
  })

  it('should render custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const lines = container.querySelectorAll('.animate-pulse')

    expect(lines).toHaveLength(5)
  })

  it('should make last line shorter', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const lines = container.querySelectorAll('.animate-pulse')
    const lastLine = lines[lines.length - 1] as HTMLElement

    expect(lastLine).toHaveClass('w-3/4')
  })
})

describe('SkeletonCard', () => {
  it('should render card structure', () => {
    const { container } = render(<SkeletonCard />)

    expect(container.querySelector('.bg-card')).toBeTruthy()
    expect(container.querySelector('.rounded-xl')).toBeTruthy()
  })

  it('should render image placeholder when hasImage is true', () => {
    const { container } = render(<SkeletonCard hasImage />)
    const imageSlot = container.querySelector('.h-40')

    expect(imageSlot).toBeTruthy()
  })

  it('should not render image placeholder by default', () => {
    const { container } = render(<SkeletonCard />)
    const imageSlot = container.querySelector('.h-40')

    expect(imageSlot).toBeFalsy()
  })
})

describe('SkeletonListItem', () => {
  it('should render avatar and text placeholders', () => {
    const { container } = render(<SkeletonListItem />)

    expect(container.querySelector('.rounded-full')).toBeTruthy()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(1)
  })
})

describe('SkeletonTableRow', () => {
  it('should render default 4 columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>
    )
    const cells = container.querySelectorAll('td')

    expect(cells).toHaveLength(4)
  })

  it('should render custom number of columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow columns={6} />
        </tbody>
      </table>
    )
    const cells = container.querySelectorAll('td')

    expect(cells).toHaveLength(6)
  })
})

describe('BillingViewSkeleton', () => {
  it('should render billing skeleton structure', () => {
    const { container } = render(<BillingViewSkeleton />)

    // Should have plan section and comparison section
    expect(container.querySelectorAll('.bg-card').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})

describe('HistoryViewSkeleton', () => {
  it('should render history skeleton with list items', () => {
    const { container } = render(<HistoryViewSkeleton />)

    // Should have filter skeletons and list items
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5)
  })
})

describe('ReportViewSkeleton', () => {
  it('should render report skeleton with summary cards', () => {
    const { container } = render(<ReportViewSkeleton />)

    // Should have header and summary card sections
    expect(container.querySelectorAll('.bg-card').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.bg-muted\\/50').length).toBe(4)
  })
})
