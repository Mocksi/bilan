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
        // Use optional chaining instead of type assertions
        conversation.promptText?.toLowerCase().includes(searchTerm) ||
        conversation.aiOutput?.toLowerCase().includes(searchTerm) ||
        conversation.comment?.toLowerCase().includes(searchTerm)
      
      if (!matchesSearch) return false
    }

    // Outcome filter
    if (filters.outcome !== 'all') {
      if (conversation.outcome !== filters.outcome) return false
    }

    // Journey filter
    if (filters.journey) {
      const journeyTerm = filters.journey.toLowerCase()
      // Use optional chaining instead of type assertion
      if (!conversation.journeyName?.toLowerCase().includes(journeyTerm)) {
        return false
      }
    }

    // User filter
    if (filters.user) {
      const userTerm = filters.user.toLowerCase()
      if (!conversation.userId.toLowerCase().includes(userTerm)) {
        return false
      }
    }

    return true
  })
}

/**
 * Escapes special regex characters in a string
 */
const escapeRegexCharacters = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm || !text) return text
  
  // Escape special regex characters in search term
  const escapedSearchTerm = escapeRegexCharacters(searchTerm)
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

export const extractSearchableContent = (conversation: ConversationSummary): string => {
  const searchableFields = [
    conversation.promptId,
    conversation.userId,
    conversation.promptText,
    conversation.aiOutput,
    conversation.comment,
    conversation.journeyName
  ]
  
  return searchableFields
    .filter(field => field != null)
    .join(' ')
    .toLowerCase()
}

export const getUniqueJourneys = (conversations: ConversationSummary[]): string[] => {
  const journeys = conversations
    .map(conv => conv.journeyName)
    .filter((journey): journey is string => journey != null)
  
  return Array.from(new Set(journeys)).sort()
}

export const getUniqueUsers = (conversations: ConversationSummary[]): string[] => {
  const users = conversations.map(conv => conv.userId)
  return Array.from(new Set(users)).sort()
}

export const sortConversations = (
  conversations: ConversationSummary[],
  sortBy: 'timestamp' | 'outcome' | 'feedback' | 'user' = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc'
): ConversationSummary[] => {
  return [...conversations].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'timestamp':
        comparison = a.lastActivity - b.lastActivity
        break
      case 'outcome':
        comparison = a.outcome.localeCompare(b.outcome)
        break
      case 'feedback':
        comparison = a.feedbackCount - b.feedbackCount
        break
      case 'user':
        comparison = a.userId.localeCompare(b.userId)
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

export const getFilterSummary = (
  originalCount: number,
  filteredCount: number,
  filters: ConversationFilterState
): string => {
  const activeFilters = []
  
  if (filters.search) activeFilters.push(`search: "${filters.search}"`)
  if (filters.outcome !== 'all') activeFilters.push(`outcome: ${filters.outcome}`)
  if (filters.journey) activeFilters.push(`journey: "${filters.journey}"`)
  if (filters.user) activeFilters.push(`user: "${filters.user}"`)
  
  if (activeFilters.length === 0) {
    return `Showing all ${originalCount} conversations`
  }
  
  return `Showing ${filteredCount} of ${originalCount} conversations (${activeFilters.join(', ')})`
} 