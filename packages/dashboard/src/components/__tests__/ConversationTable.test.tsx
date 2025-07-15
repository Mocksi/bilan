import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversationTable } from '../ConversationTable'
import { ConversationSummary } from '@/lib/types'

describe('ConversationTable', () => {
  const mockConversations: ConversationSummary[] = [
    {
      promptId: 'prompt-123',
      userId: 'user-456',
      lastActivity: 1640995200000, // 2022-01-01 00:00:00
      feedbackCount: 5,
      outcome: 'positive'
    },
    {
      promptId: 'prompt-789',
      userId: 'user-101',
      lastActivity: 1641081600000, // 2022-01-02 00:00:00
      feedbackCount: 1,
      outcome: 'negative'
    },
    {
      promptId: 'prompt-456',
      userId: 'user-789',
      lastActivity: 1641168000000, // 2022-01-03 00:00:00
      feedbackCount: 3,
      outcome: 'positive'
    }
  ]

  it('renders with conversation data', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check title
    expect(screen.getByText('Recent Conversations')).toBeInTheDocument()
    
    // Check table headers
    expect(screen.getByText('Conversation')).toBeInTheDocument()
    expect(screen.getByText('Feedback')).toBeInTheDocument()
    expect(screen.getByText('Outcome')).toBeInTheDocument()
    expect(screen.getByText('Last Activity')).toBeInTheDocument()
    
    // Check conversation data
    expect(screen.getByText('prompt-123')).toBeInTheDocument()
    expect(screen.getByText('user-456')).toBeInTheDocument()
    expect(screen.getByText('prompt-789')).toBeInTheDocument()
    expect(screen.getByText('user-101')).toBeInTheDocument()
    expect(screen.getByText('prompt-456')).toBeInTheDocument()
    expect(screen.getByText('user-789')).toBeInTheDocument()
  })

  it('displays feedback counts correctly', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check feedback counts with proper singular/plural
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getAllByText('responses')).toHaveLength(2) // 5 responses and 3 responses
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('response')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays outcome badges correctly', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check outcome text
    const positiveOutcomes = screen.getAllByText('positive')
    const negativeOutcomes = screen.getAllByText('negative')
    
    expect(positiveOutcomes).toHaveLength(2)
    expect(negativeOutcomes).toHaveLength(1)
    
    // Check badge styling classes
    positiveOutcomes.forEach(badge => {
      expect(badge).toHaveClass('bg-green-100', 'text-green-800')
    })
    
    negativeOutcomes.forEach(badge => {
      expect(badge).toHaveClass('bg-red-100', 'text-red-800')
    })
  })

  it('formats timestamps correctly', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check that timestamps are formatted as locale strings
    // The exact format will depend on the locale, but it should contain date parts
    const timestamps = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i)
    expect(timestamps.length).toBeGreaterThan(0)
  })

  it('shows empty state when no conversations', () => {
    render(<ConversationTable conversations={[]} />)
    
    expect(screen.getByText('Recent Conversations')).toBeInTheDocument()
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
    
    // Should not show table headers or data
    expect(screen.queryByText('Conversation')).not.toBeInTheDocument()
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument()
    expect(screen.queryByText('Outcome')).not.toBeInTheDocument()
    expect(screen.queryByText('Last Activity')).not.toBeInTheDocument()
  })

  it('handles single conversation correctly', () => {
    const singleConversation = [mockConversations[0]]
    render(<ConversationTable conversations={singleConversation} />)
    
    expect(screen.getByText('prompt-123')).toBeInTheDocument()
    expect(screen.getByText('user-456')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('responses')).toBeInTheDocument()
    expect(screen.getByText('positive')).toBeInTheDocument()
    
    // Should not show other conversations
    expect(screen.queryByText('prompt-789')).not.toBeInTheDocument()
    expect(screen.queryByText('user-101')).not.toBeInTheDocument()
  })

  it('handles conversation with single feedback', () => {
    const conversationWithSingleFeedback = [mockConversations[1]]
    render(<ConversationTable conversations={conversationWithSingleFeedback} />)
    
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('response')).toBeInTheDocument()
    expect(screen.queryByText('responses')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ConversationTable conversations={mockConversations} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper table structure', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check table structure
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Check headers
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(4)
    
    // Check rows (header + data rows)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4) // 1 header + 3 data rows
  })

  it('truncates long prompt IDs', () => {
    const longPromptIdConversation: ConversationSummary = {
      promptId: 'very-long-prompt-id-that-should-be-truncated-in-the-display',
      userId: 'user-123',
      lastActivity: 1640995200000,
      feedbackCount: 2,
      outcome: 'positive'
    }
    
    render(<ConversationTable conversations={[longPromptIdConversation]} />)
    
    const promptElement = screen.getByText('very-long-prompt-id-that-should-be-truncated-in-the-display')
    expect(promptElement).toBeInTheDocument()
    expect(promptElement).toHaveClass('truncate', 'max-w-xs')
  })

  it('handles hover effects on table rows', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check that table rows have hover classes
    const rows = screen.getAllByRole('row')
    const dataRows = rows.slice(1) // Skip header row
    
    dataRows.forEach(row => {
      expect(row).toHaveClass('hover:bg-gray-50')
    })
  })

  it('maintains accessibility attributes', () => {
    render(<ConversationTable conversations={mockConversations} />)
    
    // Check table accessibility
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Check headers are properly associated
    const headers = screen.getAllByRole('columnheader')
    headers.forEach(header => {
      expect(header).toBeInTheDocument()
    })
    
    // Check row structure
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('handles zero feedback count', () => {
    const zeroFeedbackConversation: ConversationSummary = {
      promptId: 'prompt-zero',
      userId: 'user-zero',
      lastActivity: 1640995200000,
      feedbackCount: 0,
      outcome: 'positive'
    }
    
    render(<ConversationTable conversations={[zeroFeedbackConversation]} />)
    
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('responses')).toBeInTheDocument()
  })

  it('handles different outcome types', () => {
    const positiveConversation: ConversationSummary = {
      promptId: 'prompt-pos',
      userId: 'user-pos',
      lastActivity: 1640995200000,
      feedbackCount: 1,
      outcome: 'positive'
    }
    
    const negativeConversation: ConversationSummary = {
      promptId: 'prompt-neg',
      userId: 'user-neg',
      lastActivity: 1640995200000,
      feedbackCount: 1,
      outcome: 'negative'
    }
    
    render(<ConversationTable conversations={[positiveConversation, negativeConversation]} />)
    
    const positiveBadge = screen.getByText('positive')
    const negativeBadge = screen.getByText('negative')
    
    expect(positiveBadge).toHaveClass('bg-green-100', 'text-green-800')
    expect(negativeBadge).toHaveClass('bg-red-100', 'text-red-800')
  })
}) 