import { ConversationSummary } from './types'
import { type ConversationContext } from './context-utils'

/**
 * Utility functions for conversation data processing and analysis
 */

export const formatConversationDuration = (startTime: number, endTime: number): string => {
  const duration = endTime - startTime
  const minutes = Math.floor(duration / 60000)
  const seconds = Math.floor((duration % 60000) / 1000)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export const getConversationStatusColor = (outcome: 'positive' | 'negative'): string => {
  return outcome === 'positive' ? 'success' : 'danger'
}

export const getConversationStatusIcon = (outcome: 'positive' | 'negative'): string => {
  return outcome === 'positive' ? 'fa-thumbs-up' : 'fa-thumbs-down'
}

export const summarizeConversation = (conversation: ConversationSummary): string => {
  const parts = []
  
  if (conversation.promptText) {
    parts.push(`Prompt: ${conversation.promptText.substring(0, 100)}${conversation.promptText.length > 100 ? '...' : ''}`)
  }
  
  if (conversation.aiOutput) {
    parts.push(`Response: ${conversation.aiOutput.substring(0, 100)}${conversation.aiOutput.length > 100 ? '...' : ''}`)
  }
  
  if (conversation.comment) {
    parts.push(`Feedback: ${conversation.comment}`)
  }
  
  return parts.join(' | ')
}

export const generateConversationExport = (conversation: ConversationSummary, context?: ConversationContext): string => {
  const exportData = {
    conversation: {
      id: conversation.promptId,
      userId: conversation.userId,
      outcome: conversation.outcome,
      feedbackCount: conversation.feedbackCount,
      lastActivity: new Date(conversation.lastActivity).toISOString(),
      content: {
        prompt: conversation.promptText,
        response: conversation.aiOutput,
        feedback: conversation.comment
      },
      journey: {
        name: conversation.journeyName,
        step: conversation.journeyStep
      },
      metadata: conversation.metadata
    },
    context: context ? {
      sessionId: context.sessionId,
      page: context.page,
      referrer: context.referrer,
      userAgent: context.userAgent,
      behaviorSignals: context.behaviorSignals,
      userActions: context.userActions
    } : null,
    exportInfo: {
      timestamp: new Date().toISOString(),
      version: '1.0',
      format: 'bilan-conversation-export'
    }
  }
  
  return JSON.stringify(exportData, null, 2)
}

export const calculateConversationScore = (conversation: ConversationSummary): number => {
  // Base score from outcome
  let score = conversation.outcome === 'positive' ? 0.8 : 0.2
  
  // Adjust based on feedback count (more feedback = more engagement)
  if (conversation.feedbackCount > 1) {
    score += 0.1
  }
  
  // Adjust based on whether there's a comment (more detailed feedback)
  if (conversation.comment && conversation.comment.length > 10) {
    score += 0.1
  }
  
  return Math.max(0, Math.min(1, score))
}

export const groupConversationsByJourney = (conversations: ConversationSummary[]): Record<string, ConversationSummary[]> => {
  return conversations.reduce((groups, conversation) => {
    const journey = conversation.journeyName || 'Unknown'
    if (!groups[journey]) {
      groups[journey] = []
    }
    groups[journey].push(conversation)
    return groups
  }, {} as Record<string, ConversationSummary[]>)
}

export const getConversationMetrics = (conversations: ConversationSummary[]) => {
  const total = conversations.length
  
  // Guard against empty conversations array
  if (total === 0) {
    return {
      total: 0,
      positive: 0,
      negative: 0,
      withComments: 0,
      positiveRate: 0,
      negativeRate: 0,
      commentRate: 0,
      avgFeedbackCount: 0,
      avgScore: 0
    }
  }
  
  const positive = conversations.filter(c => c.outcome === 'positive').length
  const negative = conversations.filter(c => c.outcome === 'negative').length
  const withComments = conversations.filter(c => c.comment && c.comment.length > 0).length
  
  const avgFeedbackCount = conversations.reduce((sum, c) => sum + c.feedbackCount, 0) / total
  const avgScore = conversations.reduce((sum, c) => sum + calculateConversationScore(c), 0) / total
  
  return {
    total,
    positive,
    negative,
    withComments,
    positiveRate: positive / total,
    negativeRate: negative / total,
    commentRate: withComments / total,
    avgFeedbackCount,
    avgScore
  }
}

export const findSimilarConversations = (
  targetConversation: ConversationSummary,
  allConversations: ConversationSummary[],
  limit: number = 5
): ConversationSummary[] => {
  // Simple similarity based on journey, outcome, and text similarity
  const scoredConversations = allConversations
    .filter(c => c.promptId !== targetConversation.promptId)
    .map(c => ({
      conversation: c,
      score: calculateSimilarity(targetConversation, c)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.conversation)
  
  return scoredConversations
}

const calculateSimilarity = (a: ConversationSummary, b: ConversationSummary): number => {
  let score = 0
  
  // Same journey
  if (a.journeyName === b.journeyName) {
    score += 0.4
  }
  
  // Same outcome
  if (a.outcome === b.outcome) {
    score += 0.3
  }
  
  // Same user
  if (a.userId === b.userId) {
    score += 0.2
  }
  
  // Text similarity (very basic)
  if (a.promptText && b.promptText) {
    const similarity = simpleTextSimilarity(a.promptText, b.promptText)
    score += similarity * 0.1
  }
  
  return score
}

const simpleTextSimilarity = (text1: string, text2: string): number => {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const commonWords = words1.filter(word => words2.includes(word))
  const totalWords = new Set([...words1, ...words2])
  
  // Guard against division by zero
  if (totalWords.size === 0) {
    return 0
  }
  
  return commonWords.length / totalWords.size
}

export const getConversationTrend = (conversations: ConversationSummary[]): 'improving' | 'declining' | 'stable' => {
  if (conversations.length < 2) return 'stable'
  
  // Sort by timestamp
  const sorted = [...conversations].sort((a, b) => a.lastActivity - b.lastActivity)
  
  // Calculate positive rate for first and second half
  const midPoint = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midPoint)
  const secondHalf = sorted.slice(midPoint)
  
  const firstHalfPositiveRate = firstHalf.filter(c => c.outcome === 'positive').length / firstHalf.length
  const secondHalfPositiveRate = secondHalf.filter(c => c.outcome === 'positive').length / secondHalf.length
  
  const difference = secondHalfPositiveRate - firstHalfPositiveRate
  
  if (difference > 0.05) return 'improving'
  if (difference < -0.05) return 'declining'
  return 'stable'
} 