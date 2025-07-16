import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConversationDetailModal } from '../ConversationDetailModal'
import { ConversationSummary } from '../../lib/types'

// Mock the context utils
vi.mock('../../lib/context-utils', () => ({
  enrichConversationContext: vi.fn((conv) => ({
    promptId: conv.promptId,
    userId: conv.userId,
    timestamp: conv.lastActivity - 60000,
    lastActivity: conv.lastActivity,
    feedbackCount: conv.feedbackCount,
    outcome: conv.outcome,
    userActions: [],
    behaviorSignals: []
  })),
  getConversationInsights: vi.fn(() => ['Test insight']),
  categorizeConversationByPattern: vi.fn(() => 'test-pattern'),
  getPatternDescription: vi.fn(() => 'Test pattern description')
}))

const mockConversation: ConversationSummary = {
  promptId: 'test-prompt-123',
  userId: 'user-456',
  lastActivity: Date.now(),
  feedbackCount: 3,
  outcome: 'positive',
  promptText: 'Test prompt text',
  aiOutput: 'Test AI response',
  comment: 'Great response!',
  journeyName: 'checkout',
  journeyStep: 'payment',
  metadata: { page: '/checkout' }
}

describe('ConversationDetailModal', () => {
  const mockOnClose = vi.fn()
  const mockOnExport = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders null when conversation is null', () => {
    const { container } = render(
      <ConversationDetailModal
        conversation={null}
        onClose={mockOnClose}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with conversation data', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('Conversation Details')).toBeInTheDocument()
    expect(screen.getByText('test-prompt-123')).toBeInTheDocument()
    expect(screen.getByText('User: user-456')).toBeInTheDocument()
    expect(screen.getByText('Journey: checkout → payment')).toBeInTheDocument()
  })

  it('displays conversation outcome badge', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const positiveBadge = screen.getByText('positive')
    expect(positiveBadge).toHaveClass('badge-success')
  })

  it('displays negative outcome badge for negative conversations', () => {
    const negativeConversation = { ...mockConversation, outcome: 'negative' as const }
    
    render(
      <ConversationDetailModal
        conversation={negativeConversation}
        onClose={mockOnClose}
      />
    )
    
    const negativeBadge = screen.getByText('negative')
    expect(negativeBadge).toHaveClass('badge-danger')
  })

  it('shows feedback count and session duration', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('60s')).toBeInTheDocument()
  })

  it('displays pattern analysis when pattern exists', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('test-pattern')).toBeInTheDocument()
    expect(screen.getByText('Test pattern description')).toBeInTheDocument()
  })

  it('displays insights when available', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('Test insight')).toBeInTheDocument()
  })

  it('starts with Overview tab active', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const overviewTab = screen.getByText('Overview')
    expect(overviewTab).toHaveClass('active')
  })

  it('switches tabs when clicked', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const timelineTab = screen.getByText('Timeline')
    fireEvent.click(timelineTab)
    
    expect(timelineTab).toHaveClass('active')
  })

  it('displays conversation content in Overview tab', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('Test prompt text')).toBeInTheDocument()
    expect(screen.getByText('Test AI response')).toBeInTheDocument()
    expect(screen.getByText('"Great response!"')).toBeInTheDocument()
  })

  it('handles missing conversation content gracefully', () => {
    const incompleteConversation = {
      ...mockConversation,
      promptText: undefined,
      aiOutput: undefined,
      comment: undefined
    }
    
    render(
      <ConversationDetailModal
        conversation={incompleteConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('No prompt text available')).toBeInTheDocument()
    expect(screen.getByText('No AI response available')).toBeInTheDocument()
    expect(screen.getByText('No feedback comment provided')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const xButton = screen.getByRole('button', { name: '' })
    fireEvent.click(xButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls custom onExport when provided', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />
    )
    
    const exportButton = screen.getByText('Export Data')
    fireEvent.click(exportButton)
    
    expect(mockOnExport).toHaveBeenCalledWith(mockConversation)
  })

  it('handles default export when no custom onExport provided', () => {
    // Mock document.createElement and URL methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn()
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    
    const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
    const mockRevokeObjectURL = vi.fn()
    
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const exportButton = screen.getByText('Export Data')
    fireEvent.click(exportButton)
    
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('renders tags section', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('Tags')).toBeInTheDocument()
  })

  it('shows Context tab content when selected', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const contextTab = screen.getByText('Context')
    fireEvent.click(contextTab)
    
    expect(contextTab).toHaveClass('active')
  })

  it('shows Similar tab content when selected', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    const similarTab = screen.getByText('Similar')
    fireEvent.click(similarTab)
    
    expect(similarTab).toHaveClass('active')
  })

  it('displays journey information when available', () => {
    render(
      <ConversationDetailModal
        conversation={mockConversation}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.getByText('Journey: checkout → payment')).toBeInTheDocument()
  })

  it('handles conversation without journey information', () => {
    const conversationWithoutJourney = {
      ...mockConversation,
      journeyName: undefined,
      journeyStep: undefined
    }
    
    render(
      <ConversationDetailModal
        conversation={conversationWithoutJourney}
        onClose={mockOnClose}
      />
    )
    
    expect(screen.queryByText('Journey:')).not.toBeInTheDocument()
  })
}) 