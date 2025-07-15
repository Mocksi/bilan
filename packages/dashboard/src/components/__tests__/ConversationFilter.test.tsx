import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConversationFilter } from '../ConversationFilter'

// Mock Next.js router
const mockPush = vi.fn()
const mockSearchParams = new Map()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
    toString: () => 'test=value'
  })
}))

describe('ConversationFilter', () => {
  const mockOnFilterChange = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
  })

  it('renders with default collapsed state', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    expect(screen.getByText('Filter Conversations')).toBeInTheDocument()
    expect(screen.getByText('Expand')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search prompt text, AI responses, or comments...')).not.toBeInTheDocument()
  })

  it('expands when expand button is clicked', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    expect(screen.getByText('Collapse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search prompt text, AI responses, or comments...')).toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', () => {
    mockSearchParams.set('search', 'test query')
    
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    expect(screen.getByText('Clear filters')).toBeInTheDocument()
  })

  it('calls onFilterChange when search input changes', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const searchInput = screen.getByPlaceholderText('Search prompt text, AI responses, or comments...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: 'test search',
      outcome: 'all',
      journey: '',
      user: ''
    })
  })

  it('calls onFilterChange when outcome filter changes', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const outcomeSelect = screen.getByDisplayValue('All outcomes')
    fireEvent.change(outcomeSelect, { target: { value: 'positive' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: '',
      outcome: 'positive',
      journey: '',
      user: ''
    })
  })

  it('calls onFilterChange when journey filter changes', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const journeyInput = screen.getByPlaceholderText('e.g., checkout, onboarding, support...')
    fireEvent.change(journeyInput, { target: { value: 'checkout' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: '',
      outcome: 'all',
      journey: 'checkout',
      user: ''
    })
  })

  it('calls onFilterChange when user filter changes', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const userInput = screen.getByPlaceholderText('Filter by user ID...')
    fireEvent.change(userInput, { target: { value: 'user123' } })
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: '',
      outcome: 'all',
      journey: '',
      user: 'user123'
    })
  })

  it('clears all filters when clear button is clicked', () => {
    mockSearchParams.set('search', 'test')
    mockSearchParams.set('outcome', 'positive')
    
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const clearButton = screen.getByText('Clear filters')
    fireEvent.click(clearButton)
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: '',
      outcome: 'all',
      journey: '',
      user: ''
    })
  })

  it('updates URL when filters change', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const searchInput = screen.getByPlaceholderText('Search prompt text, AI responses, or comments...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })
    
    expect(mockPush).toHaveBeenCalledWith('?search=test+search')
  })

  it('removes empty filters from URL', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    const outcomeSelect = screen.getByDisplayValue('All outcomes')
    fireEvent.change(outcomeSelect, { target: { value: 'all' } })
    
    expect(mockPush).toHaveBeenCalledWith('?')
  })

  it('loads initial state from URL parameters', () => {
    mockSearchParams.set('search', 'initial search')
    mockSearchParams.set('outcome', 'negative')
    mockSearchParams.set('journey', 'onboarding')
    mockSearchParams.set('user', 'user456')
    
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: 'initial search',
      outcome: 'negative',
      journey: 'onboarding',
      user: 'user456'
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <ConversationFilter onFilterChange={mockOnFilterChange} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('card', 'custom-class')
  })

  it('has proper form labels and accessibility', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    expect(screen.getByLabelText('Search conversations')).toBeInTheDocument()
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument()
    expect(screen.getByLabelText('Journey')).toBeInTheDocument()
    expect(screen.getByLabelText('User')).toBeInTheDocument()
  })

  it('shows no clear filters button when no filters are active', () => {
    render(<ConversationFilter onFilterChange={mockOnFilterChange} />)
    
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)
    
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument()
  })
}) 