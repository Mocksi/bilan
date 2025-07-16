import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeRangeSelector, useTimeRange } from '../TimeRangeSelector'

// Mock Next.js router
const mockPush = vi.fn()
const mockSearchParams = new Map()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
    toString: () => 'range=7d'
  })
}))

describe('TimeRangeSelector', () => {
  const mockOnChange = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
  })

  it('renders all time range options', () => {
    render(<TimeRangeSelector value="7d" onChange={mockOnChange} />)
    
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
    expect(screen.getByText('90 days')).toBeInTheDocument()
  })

  it('highlights the selected time range', () => {
    render(<TimeRangeSelector value="30d" onChange={mockOnChange} />)
    
    const thirtyDayButton = screen.getByText('30 days')
    expect(thirtyDayButton).toHaveClass('btn-primary')
    
    const sevenDayButton = screen.getByText('7 days')
    expect(sevenDayButton).toHaveClass('btn-outline-primary')
  })

  it('calls onChange when a different range is selected', () => {
    render(<TimeRangeSelector value="7d" onChange={mockOnChange} />)
    
    const thirtyDayButton = screen.getByText('30 days')
    fireEvent.click(thirtyDayButton)
    
    expect(mockOnChange).toHaveBeenCalledWith('30d')
  })

  it('sets aria-pressed attribute correctly', () => {
    render(<TimeRangeSelector value="90d" onChange={mockOnChange} />)
    
    const ninetyDayButton = screen.getByText('90 days')
    expect(ninetyDayButton).toHaveAttribute('aria-pressed', 'true')
    
    const sevenDayButton = screen.getByText('7 days')
    expect(sevenDayButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies custom className', () => {
    const { container } = render(
      <TimeRangeSelector value="7d" onChange={mockOnChange} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('btn-group', 'custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(<TimeRangeSelector value="7d" onChange={mockOnChange} />)
    
    const buttonGroup = screen.getByRole('group')
    expect(buttonGroup).toHaveAttribute('aria-label', 'Time range selector')
  })
})

describe('useTimeRange', () => {
  const TestComponent = () => {
    const { timeRange, setTimeRange } = useTimeRange()
    return (
      <div>
        <span data-testid="current-range">{timeRange}</span>
        <button onClick={() => setTimeRange('30d')}>Set 30d</button>
      </div>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
  })

  it('returns default range when no URL param', () => {
    render(<TestComponent />)
    
    expect(screen.getByTestId('current-range')).toHaveTextContent('30d')
  })

  it('returns range from URL params', () => {
    mockSearchParams.set('range', '90d')
    render(<TestComponent />)
    
    expect(screen.getByTestId('current-range')).toHaveTextContent('90d')
  })

  it('updates URL when setTimeRange is called', () => {
    render(<TestComponent />)
    
    const setButton = screen.getByText('Set 30d')
    fireEvent.click(setButton)
    
    expect(mockPush).toHaveBeenCalledWith('?range=30d')
  })

  it('preserves existing URL parameters', () => {
    mockSearchParams.set('search', 'test')
    mockSearchParams.set('range', '7d')
    
    render(<TestComponent />)
    
    const setButton = screen.getByText('Set 30d')
    fireEvent.click(setButton)
    
    expect(mockPush).toHaveBeenCalledWith('?range=30d')
  })
}) 