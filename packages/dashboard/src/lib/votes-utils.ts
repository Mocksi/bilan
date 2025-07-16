import { VoteData, VoteFilterState, VoteExport } from './types'

/**
 * Filter votes based on filter state
 */
export function filterVotes(votes: VoteData[], filters: VoteFilterState): VoteData[] {
  return votes.filter(vote => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = 
        vote.promptId.toLowerCase().includes(searchTerm) ||
        vote.userId.toLowerCase().includes(searchTerm) ||
        vote.comment?.toLowerCase().includes(searchTerm) ||
        vote.metadata?.promptText?.toLowerCase().includes(searchTerm)
      
      if (!matchesSearch) return false
    }

    // Rating filter
    if (filters.rating !== 'all') {
      if (filters.rating === 'positive' && vote.value <= 0) return false
      if (filters.rating === 'negative' && vote.value >= 0) return false
    }

    // User filter
    if (filters.user && !vote.userId.toLowerCase().includes(filters.user.toLowerCase())) {
      return false
    }

    // Prompt filter
    if (filters.prompt && !vote.promptId.toLowerCase().includes(filters.prompt.toLowerCase())) {
      return false
    }

    // Comment filter
    if (filters.hasComment !== null) {
      if (filters.hasComment && !vote.comment) return false
      if (!filters.hasComment && vote.comment) return false
    }

    return true
  })
}

/**
 * Sort votes based on sort criteria
 */
export function sortVotes(votes: VoteData[], sortBy: string, sortOrder: 'asc' | 'desc'): VoteData[] {
  const sorted = [...votes].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'timestamp':
        aValue = a.timestamp
        bValue = b.timestamp
        break
      case 'rating':
        aValue = a.value
        bValue = b.value
        break
      case 'user':
        aValue = a.userId
        bValue = b.userId
        break
      case 'prompt':
        aValue = a.promptId
        bValue = b.promptId
        break
      default:
        aValue = a.timestamp
        bValue = b.timestamp
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

/**
 * Get vote rating display text
 */
export function getVoteRatingText(value: number): string {
  if (value > 0) return 'Positive'
  if (value < 0) return 'Negative'
  return 'Neutral'
}

/**
 * Get vote rating emoji
 */
export function getVoteRatingEmoji(value: number): string {
  if (value > 0) return '👍'
  if (value < 0) return '👎'
  return '🤷'
}

/**
 * Get vote rating color class
 */
export function getVoteRatingColor(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-muted'
}

/**
 * Get vote rating badge class
 */
export function getVoteRatingBadgeClass(value: number): string {
  if (value > 0) return 'badge bg-success'
  if (value < 0) return 'badge bg-danger'
  return 'badge bg-secondary'
}

/**
 * Calculate vote statistics
 */
export function calculateVoteStats(votes: VoteData[]) {
  const totalVotes = votes.length
  const positiveVotes = votes.filter(v => v.value > 0).length
  const negativeVotes = votes.filter(v => v.value < 0).length
  const neutralVotes = votes.filter(v => v.value === 0).length
  
  const positiveRate = totalVotes > 0 ? positiveVotes / totalVotes : 0
  const negativeRate = totalVotes > 0 ? negativeVotes / totalVotes : 0
  const neutralRate = totalVotes > 0 ? neutralVotes / totalVotes : 0
  
  const averageRating = totalVotes > 0 ? votes.reduce((sum, v) => sum + v.value, 0) / totalVotes : 0
  
  const commentsCount = votes.filter(v => v.comment && v.comment.trim().length > 0).length
  const uniqueUsers = new Set(votes.map(v => v.userId)).size
  const uniquePrompts = new Set(votes.map(v => v.promptId)).size

  return {
    totalVotes,
    positiveVotes,
    negativeVotes,
    neutralVotes,
    positiveRate,
    negativeRate,
    neutralRate,
    averageRating,
    commentsCount,
    uniqueUsers,
    uniquePrompts
  }
}

/**
 * Group votes by time period
 */
export function groupVotesByTime(votes: VoteData[], period: 'hour' | 'day' | 'week' | 'month') {
  const groups: { [key: string]: VoteData[] } = {}
  
  votes.forEach(vote => {
    const date = new Date(vote.timestamp)
    let key: string
    
    switch (period) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`
        break
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`
        break
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth() + 1}`
        break
      default:
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(vote)
  })
  
  return groups
}

/**
 * Calculate trend for vote metrics
 */
export function calculateVoteTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
  const threshold = 0.05 // 5% threshold for considering change significant
  const change = previous > 0 ? (current - previous) / previous : 0
  
  if (Math.abs(change) < threshold) return 'stable'
  return change > 0 ? 'improving' : 'declining'
}

/**
 * Format vote data for export
 */
export function formatVoteForExport(vote: VoteData): VoteExport {
  return {
    id: vote.id,
    promptId: vote.promptId,
    userId: vote.userId,
    rating: vote.value > 0 ? 'positive' : vote.value < 0 ? 'negative' : 'neutral' as 'positive' | 'negative',
    value: vote.value,
    comment: vote.comment,
    timestamp: new Date(vote.timestamp).toISOString(),
    date: new Date(vote.timestamp).toLocaleDateString(),
    promptText: vote.metadata?.promptText,
    aiOutput: vote.metadata?.aiOutput,
    responseTime: vote.metadata?.responseTime,
    model: vote.metadata?.model,
    journey: vote.metadata?.journey,
    step: vote.metadata?.step,
    sessionId: vote.metadata?.sessionId
  }
}

/**
 * Convert votes to CSV format
 */
export function votesToCSV(votes: VoteData[]): string {
  const headers = [
    'ID',
    'Prompt ID',
    'User ID',
    'Rating',
    'Value',
    'Comment',
    'Timestamp',
    'Date',
    'Prompt Text',
    'AI Output',
    'Response Time',
    'Model',
    'Journey',
    'Step',
    'Session ID'
  ]
  
  const rows = votes.map(vote => {
    const exported = formatVoteForExport(vote)
    return [
      exported.id,
      exported.promptId,
      exported.userId,
      exported.rating,
      exported.value,
      exported.comment || '',
      exported.timestamp,
      exported.date,
      exported.promptText || '',
      exported.aiOutput || '',
      exported.responseTime || '',
      exported.model || '',
      exported.journey || '',
      exported.step || '',
      exported.sessionId || ''
    ]
  })
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  return csvContent
}

/**
 * Download data as file
 */
export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
} 