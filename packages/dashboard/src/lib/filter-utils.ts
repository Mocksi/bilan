import { ConversationFilterState } from '@/components/ConversationFilter'
import { ConversationSummary } from './types'

export const filterConversations = (
  conversations: ConversationSummary[],
  filters: ConversationFilterState
): ConversationSummary[] => {
  return conversations.filter(conversation => {
    // Search filter (search in promptId, userId, or any context)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = 
        conversation.promptId.toLowerCase().includes(searchTerm) ||
        conversation.userId.toLowerCase().includes(searchTerm) ||
        // Add more searchable fields as needed
        (conversation as any).promptText?.toLowerCase().includes(searchTerm) ||
        (conversation as any).aiOutput?.toLowerCase().includes(searchTerm) ||
        (conversation as any).comment?.toLowerCase().includes(searchTerm)
      
      if (!matchesSearch) return false
    }

    // Outcome filter
    if (filters.outcome !== 'all') {
      if (conversation.outcome !== filters.outcome) return false
    }

    // Journey filter
    if (filters.journey) {
      const journeyTerm = filters.journey.toLowerCase()
      const matchesJourney = (conversation as any).journeyName?.toLowerCase().includes(journeyTerm)
      if (!matchesJourney) return false
    }

    // User filter
    if (filters.user) {
      const userTerm = filters.user.toLowerCase()
      if (!conversation.userId.toLowerCase().includes(userTerm)) return false
    }

    return true
  })
}

export const getFilterSummary = (
  totalCount: number,
  filteredCount: number,
  filters: ConversationFilterState
): string => {
  const activeFilters = []
  
  if (filters.search) activeFilters.push(`search: "${filters.search}"`)
  if (filters.outcome !== 'all') activeFilters.push(`outcome: ${filters.outcome}`)
  if (filters.journey) activeFilters.push(`journey: "${filters.journey}"`)
  if (filters.user) activeFilters.push(`user: "${filters.user}"`)
  
  if (activeFilters.length === 0) {
    return `Showing all ${totalCount} conversations`
  }
  
  return `Showing ${filteredCount} of ${totalCount} conversations (${activeFilters.join(', ')})`
}

export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm || !text) return text
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

export const extractSearchableContent = (conversation: ConversationSummary): string => {
  const searchableFields = [
    conversation.promptId,
    conversation.userId,
    (conversation as any).promptText,
    (conversation as any).aiOutput,
    (conversation as any).comment
  ]
  
  return searchableFields
    .filter(field => field)
    .join(' ')
    .toLowerCase()
}

export const sortConversations = (
  conversations: ConversationSummary[],
  sortBy: 'timestamp' | 'outcome' | 'user' | 'feedbackCount' = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc'
): ConversationSummary[] => {
  return [...conversations].sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortBy) {
      case 'timestamp':
        aValue = a.lastActivity
        bValue = b.lastActivity
        break
      case 'outcome':
        aValue = a.outcome
        bValue = b.outcome
        break
      case 'user':
        aValue = a.userId
        bValue = b.userId
        break
      case 'feedbackCount':
        aValue = a.feedbackCount
        bValue = b.feedbackCount
        break
      default:
        aValue = a.lastActivity
        bValue = b.lastActivity
    }
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    }
  })
}

export const getUniqueJourneys = (conversations: ConversationSummary[]): string[] => {
  const journeys = conversations
    .map(conv => (conv as any).journeyName)
    .filter(Boolean)
  
  return Array.from(new Set(journeys))
}

export const getUniqueUsers = (conversations: ConversationSummary[]): string[] => {
  const users = conversations
    .map(conv => conv.userId)
    .filter(Boolean)
  
  return Array.from(new Set(users))
} 