import { ConversationData, ConversationFilterState, ConversationExport } from './types'

/**
 * Filter conversations based on filter state
 */
export function filterConversations(
  conversations: ConversationData[],
  filters: Partial<ConversationFilterState>
): ConversationData[] {
  return conversations.filter(conversation => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = 
        conversation.id.toLowerCase().includes(searchTerm) ||
        conversation.userId.toLowerCase().includes(searchTerm) ||
        conversation.messages.some(msg => 
          msg.content.toLowerCase().includes(searchTerm)
        ) ||
        conversation.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )
      
      if (!matchesSearch) return false
    }

    // User filter
    if (filters.userId && conversation.userId !== filters.userId) {
      return false
    }

    // Message count filters
    if (filters.minMessages !== null && filters.minMessages !== undefined && conversation.totalMessages < filters.minMessages) {
      return false
    }
    if (filters.maxMessages !== null && filters.maxMessages !== undefined && conversation.totalMessages > filters.maxMessages) {
      return false
    }

    // Satisfaction score filter
    if (filters.satisfactionScore !== null && filters.satisfactionScore !== undefined && conversation.satisfactionScore !== undefined) {
      if (conversation.satisfactionScore < filters.satisfactionScore) {
        return false
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        conversation.tags.includes(tag)
      )
      if (!hasMatchingTag) return false
    }

    // Date range filters
    if (filters.startDate) {
      if (conversation.startTime < filters.startDate.getTime()) {
        return false
      }
    }
    if (filters.endDate) {
      if (conversation.startTime > filters.endDate.getTime()) {
        return false
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      const isCompleted = conversation.endTime !== undefined
      if (filters.status === 'completed' && !isCompleted) {
        return false
      }
      if (filters.status === 'active' && isCompleted) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort conversations based on sort criteria
 */
export function sortConversations(
  conversations: ConversationData[],
  sortBy: ConversationFilterState['sortBy'],
  sortOrder: ConversationFilterState['sortOrder']
): ConversationData[] {
  return [...conversations].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'startTime':
        comparison = a.startTime - b.startTime
        break
      case 'endTime':
        const aEndTime = a.endTime || Date.now()
        const bEndTime = b.endTime || Date.now()
        comparison = aEndTime - bEndTime
        break
      case 'totalMessages':
        comparison = a.totalMessages - b.totalMessages
        break
      case 'averageResponseTime':
        comparison = a.averageResponseTime - b.averageResponseTime
        break
      case 'satisfactionScore':
        const aScore = a.satisfactionScore || 0
        const bScore = b.satisfactionScore || 0
        comparison = aScore - bScore
        break
      default:
        comparison = a.startTime - b.startTime
    }

    return sortOrder === 'desc' ? -comparison : comparison
  })
}

/**
 * Calculate conversation statistics
 */
export function calculateConversationStats(conversations: ConversationData[]) {
  if (conversations.length === 0) {
    return {
      totalConversations: 0,
      activeConversations: 0,
      completedConversations: 0,
      averageLength: 0,
      averageResponseTime: 0,
      averageSatisfactionScore: 0,
      completionRate: 0,
      totalMessages: 0,
      uniqueUsers: 0
    }
  }

  const activeConversations = conversations.filter(c => !c.endTime).length
  const completedConversations = conversations.filter(c => c.endTime).length
  const totalMessages = conversations.reduce((sum, c) => sum + c.totalMessages, 0)
  const averageLength = totalMessages / conversations.length
  const averageResponseTime = conversations.reduce((sum, c) => sum + c.averageResponseTime, 0) / conversations.length
  
  const conversationsWithSatisfaction = conversations.filter(c => c.satisfactionScore !== undefined)
  const averageSatisfactionScore = conversationsWithSatisfaction.length > 0
    ? conversationsWithSatisfaction.reduce((sum, c) => sum + (c.satisfactionScore || 0), 0) / conversationsWithSatisfaction.length
    : 0

  const completionRate = conversations.length > 0 ? completedConversations / conversations.length : 0
  const uniqueUsers = new Set(conversations.map(c => c.userId)).size

  return {
    totalConversations: conversations.length,
    activeConversations,
    completedConversations,
    averageLength,
    averageResponseTime,
    averageSatisfactionScore,
    completionRate,
    totalMessages,
    uniqueUsers
  }
}

/**
 * Get conversation duration in milliseconds
 */
export function getConversationDuration(conversation: ConversationData): number {
  if (!conversation.endTime) {
    return Date.now() - conversation.startTime
  }
  return conversation.endTime - conversation.startTime
}

/**
 * Format conversation duration for display
 */
export function formatConversationDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Get conversation status
 */
export function getConversationStatus(conversation: ConversationData): 'active' | 'completed' {
  return conversation.endTime ? 'completed' : 'active'
}

/**
 * Get conversation satisfaction level
 */
export function getSatisfactionLevel(score?: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (score === undefined) return 'unknown'
  if (score >= 0.8) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

/**
 * Get satisfaction color class
 */
export function getSatisfactionColorClass(score?: number): string {
  const level = getSatisfactionLevel(score)
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-100'
    case 'medium':
      return 'text-yellow-600 bg-yellow-100'
    case 'low':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: 'active' | 'completed'): string {
  switch (status) {
    case 'active':
      return 'text-blue-600 bg-blue-100'
    case 'completed':
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Extract topics from conversation messages
 */
export function extractTopics(conversation: ConversationData): string[] {
  // Simple topic extraction based on message content
  const topics: string[] = []
  const content = conversation.messages.map(m => m.content).join(' ').toLowerCase()
  
  // Common AI/tech topics
  const topicKeywords = {
    'authentication': ['login', 'auth', 'password', 'signin', 'signup'],
    'payment': ['payment', 'billing', 'subscription', 'charge', 'invoice'],
    'support': ['help', 'support', 'issue', 'problem', 'error'],
    'feature': ['feature', 'functionality', 'capability', 'option'],
    'integration': ['integration', 'api', 'connect', 'sync', 'webhook'],
    'data': ['data', 'export', 'import', 'backup', 'database'],
    'security': ['security', 'privacy', 'encryption', 'secure', 'protection'],
    'performance': ['slow', 'fast', 'performance', 'speed', 'optimization']
  }

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => content.includes(keyword))) {
      topics.push(topic)
    }
  })

  return topics.length > 0 ? topics : ['general']
}

/**
 * Export conversations to CSV format
 */
export function exportConversationsToCSV(conversations: ConversationData[]): string {
  const headers = [
    'ID',
    'User ID',
    'Start Time',
    'End Time',
    'Duration',
    'Total Messages',
    'Average Response Time',
    'Satisfaction Score',
    'Status',
    'Tags',
    'Topics'
  ]

  const csvData = conversations.map(conversation => {
    const duration = getConversationDuration(conversation)
    const status = getConversationStatus(conversation)
    const topics = extractTopics(conversation)

    return [
      conversation.id,
      conversation.userId,
      new Date(conversation.startTime).toISOString(),
      conversation.endTime ? new Date(conversation.endTime).toISOString() : '',
      formatConversationDuration(duration),
      conversation.totalMessages.toString(),
      `${conversation.averageResponseTime}ms`,
      conversation.satisfactionScore?.toFixed(2) || '',
      status,
      conversation.tags.join('; '),
      topics.join('; ')
    ]
  })

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  return csvContent
}

/**
 * Export conversations to JSON format
 */
export function exportConversationsToJSON(conversations: ConversationData[]): string {
  const exportData: ConversationExport[] = conversations.map(conversation => ({
    id: conversation.id,
    userId: conversation.userId,
    startTime: new Date(conversation.startTime).toISOString(),
    endTime: conversation.endTime ? new Date(conversation.endTime).toISOString() : undefined,
    totalMessages: conversation.totalMessages,
    averageResponseTime: conversation.averageResponseTime,
    satisfactionScore: conversation.satisfactionScore,
    tags: conversation.tags,
    status: getConversationStatus(conversation),
    messages: conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString()
    }))
  }))

  return JSON.stringify(exportData, null, 2)
}

/**
 * Get unique values for filter options
 */
export function getUniqueFilterValues(conversations: ConversationData[]) {
  const users = Array.from(new Set(conversations.map(c => c.userId))).sort()
  const tags = Array.from(new Set(conversations.flatMap(c => c.tags))).sort()
  const topics = Array.from(new Set(conversations.flatMap(c => extractTopics(c)))).sort()

  return { users, tags, topics }
}

/**
 * Get conversation message preview
 */
export function getMessagePreview(conversation: ConversationData, maxLength: number = 100): string {
  const firstUserMessage = conversation.messages.find(m => m.role === 'user')
  if (!firstUserMessage) return 'No messages'
  
  const preview = firstUserMessage.content
  return preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview
} 