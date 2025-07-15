import { ConversationSummary } from './types'
import { type ConversationContext, type BehaviorSignal, type UserAction } from './context-utils'

/**
 * Advanced behavior analysis utilities for detecting user patterns
 */

export interface BehaviorPattern {
  type: 'success' | 'frustration' | 'confusion' | 'abandonment' | 'engagement'
  confidence: number
  indicators: string[]
  impact: 'high' | 'medium' | 'low'
  timestamp: number
}

export interface UserBehaviorProfile {
  userId: string
  sessionCount: number
  averageSessionDuration: number
  engagementLevel: 'high' | 'medium' | 'low'
  patterns: BehaviorPattern[]
  frustrationTriggers: string[]
  successFactors: string[]
  preferredJourneys: string[]
}

export const analyzeUserBehavior = (conversations: ConversationSummary[]): UserBehaviorProfile[] => {
  const userGroups = groupConversationsByUser(conversations)
  
  return Object.entries(userGroups).map(([userId, userConversations]) => {
    const patterns = detectBehaviorPatterns(userConversations)
    
    return {
      userId,
      sessionCount: userConversations.length,
      averageSessionDuration: calculateAverageSessionDuration(userConversations),
      engagementLevel: calculateEngagementLevel(userConversations),
      patterns,
      frustrationTriggers: extractFrustrationTriggers(patterns),
      successFactors: extractSuccessFactors(patterns),
      preferredJourneys: extractPreferredJourneys(userConversations)
    }
  })
}

export const detectBehaviorPatterns = (conversations: ConversationSummary[]): BehaviorPattern[] => {
  const patterns: BehaviorPattern[] = []
  
  // Analyze each conversation for patterns
  conversations.forEach(conversation => {
    const conversationPatterns = analyzeConversationPatterns(conversation)
    patterns.push(...conversationPatterns)
  })
  
  // Detect cross-conversation patterns
  const crossPatterns = detectCrossConversationPatterns(conversations)
  patterns.push(...crossPatterns)
  
  return patterns.sort((a, b) => b.confidence - a.confidence)
}

const analyzeConversationPatterns = (conversation: ConversationSummary): BehaviorPattern[] => {
  const patterns: BehaviorPattern[] = []
  const sessionDuration = conversation.lastActivity - conversation.lastActivity // This would be from context
  
  // Quick success pattern
  if (conversation.outcome === 'positive' && conversation.feedbackCount === 1) {
    patterns.push({
      type: 'success',
      confidence: 0.8,
      indicators: ['Immediate positive feedback', 'Single interaction'],
      impact: 'high',
      timestamp: conversation.lastActivity
    })
  }
  
  // Frustration pattern
  if (conversation.outcome === 'negative' && conversation.comment) {
    const frustrationWords = ['confusing', 'wrong', 'terrible', 'useless', 'bad', 'awful']
    const hasFrustrationWords = frustrationWords.some(word => 
      conversation.comment!.toLowerCase().includes(word)
    )
    
    if (hasFrustrationWords) {
      patterns.push({
        type: 'frustration',
        confidence: 0.9,
        indicators: ['Negative feedback', 'Frustration keywords in comment'],
        impact: 'high',
        timestamp: conversation.lastActivity
      })
    }
  }
  
  // Confusion pattern
  if (conversation.comment) {
    const confusionWords = ['unclear', 'confusing', 'don\'t understand', 'what', 'how']
    const hasConfusionWords = confusionWords.some(word => 
      conversation.comment!.toLowerCase().includes(word)
    )
    
    if (hasConfusionWords) {
      patterns.push({
        type: 'confusion',
        confidence: 0.7,
        indicators: ['Confusion keywords in comment'],
        impact: 'medium',
        timestamp: conversation.lastActivity
      })
    }
  }
  
  // Engagement pattern
  if (conversation.feedbackCount > 1) {
    patterns.push({
      type: 'engagement',
      confidence: 0.6,
      indicators: ['Multiple feedback interactions'],
      impact: 'medium',
      timestamp: conversation.lastActivity
    })
  }
  
  return patterns
}

const detectCrossConversationPatterns = (conversations: ConversationSummary[]): BehaviorPattern[] => {
  const patterns: BehaviorPattern[] = []
  
  // Sort conversations by timestamp
  const sorted = [...conversations].sort((a, b) => a.lastActivity - b.lastActivity)
  
  // Detect abandonment pattern
  if (sorted.length >= 3) {
    const recentNegative = sorted.slice(-3).filter(c => c.outcome === 'negative').length
    if (recentNegative >= 2) {
      patterns.push({
        type: 'abandonment',
        confidence: 0.8,
        indicators: ['Multiple recent negative interactions', 'Declining engagement'],
        impact: 'high',
        timestamp: sorted[sorted.length - 1].lastActivity
      })
    }
  }
  
  // Detect improvement pattern
  if (sorted.length >= 5) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))
    
    const firstHalfPositive = firstHalf.filter(c => c.outcome === 'positive').length / firstHalf.length
    const secondHalfPositive = secondHalf.filter(c => c.outcome === 'positive').length / secondHalf.length
    
    if (secondHalfPositive > firstHalfPositive + 0.3) {
      patterns.push({
        type: 'success',
        confidence: 0.7,
        indicators: ['Improving satisfaction over time', 'Learning curve success'],
        impact: 'high',
        timestamp: sorted[sorted.length - 1].lastActivity
      })
    }
  }
  
  return patterns
}

const groupConversationsByUser = (conversations: ConversationSummary[]): Record<string, ConversationSummary[]> => {
  return conversations.reduce((groups, conversation) => {
    if (!groups[conversation.userId]) {
      groups[conversation.userId] = []
    }
    groups[conversation.userId].push(conversation)
    return groups
  }, {} as Record<string, ConversationSummary[]>)
}

const calculateAverageSessionDuration = (conversations: ConversationSummary[]): number => {
  // This would ideally use actual session duration from context
  // For now, we'll estimate based on feedback count and timestamps
  return conversations.reduce((sum, c) => sum + (c.feedbackCount * 30000), 0) / conversations.length
}

const calculateEngagementLevel = (conversations: ConversationSummary[]): 'high' | 'medium' | 'low' => {
  const avgFeedbackCount = conversations.reduce((sum, c) => sum + c.feedbackCount, 0) / conversations.length
  const positiveRate = conversations.filter(c => c.outcome === 'positive').length / conversations.length
  const commentRate = conversations.filter(c => c.comment && c.comment.length > 0).length / conversations.length
  
  const engagementScore = (avgFeedbackCount * 0.3) + (positiveRate * 0.4) + (commentRate * 0.3)
  
  if (engagementScore > 0.7) return 'high'
  if (engagementScore > 0.4) return 'medium'
  return 'low'
}

const extractFrustrationTriggers = (patterns: BehaviorPattern[]): string[] => {
  const triggers: string[] = []
  
  patterns
    .filter(p => p.type === 'frustration')
    .forEach(pattern => {
      triggers.push(...pattern.indicators)
    })
  
  return Array.from(new Set(triggers))
}

const extractSuccessFactors = (patterns: BehaviorPattern[]): string[] => {
  const factors: string[] = []
  
  patterns
    .filter(p => p.type === 'success')
    .forEach(pattern => {
      factors.push(...pattern.indicators)
    })
  
  return Array.from(new Set(factors))
}

const extractPreferredJourneys = (conversations: ConversationSummary[]): string[] => {
  const journeyCount: Record<string, number> = {}
  
  conversations.forEach(conversation => {
    if (conversation.journeyName) {
      journeyCount[conversation.journeyName] = (journeyCount[conversation.journeyName] || 0) + 1
    }
  })
  
  return Object.entries(journeyCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([journey]) => journey)
}

export const generateBehaviorReport = (profile: UserBehaviorProfile): string => {
  const report = {
    userId: profile.userId,
    summary: {
      sessionCount: profile.sessionCount,
      averageSessionDuration: `${Math.round(profile.averageSessionDuration / 1000)}s`,
      engagementLevel: profile.engagementLevel
    },
    patterns: profile.patterns.map(p => ({
      type: p.type,
      confidence: `${Math.round(p.confidence * 100)}%`,
      impact: p.impact,
      indicators: p.indicators
    })),
    insights: {
      frustrationTriggers: profile.frustrationTriggers,
      successFactors: profile.successFactors,
      preferredJourneys: profile.preferredJourneys
    },
    recommendations: generateRecommendations(profile)
  }
  
  return JSON.stringify(report, null, 2)
}

const generateRecommendations = (profile: UserBehaviorProfile): string[] => {
  const recommendations: string[] = []
  
  // Based on engagement level
  if (profile.engagementLevel === 'low') {
    recommendations.push('Consider providing more interactive elements to increase engagement')
    recommendations.push('Implement proactive help suggestions based on user behavior')
  }
  
  // Based on frustration triggers
  if (profile.frustrationTriggers.length > 0) {
    recommendations.push('Address common frustration triggers through UI improvements')
    recommendations.push('Implement better error handling and user guidance')
  }
  
  // Based on success factors
  if (profile.successFactors.length > 0) {
    recommendations.push('Amplify successful interaction patterns in similar contexts')
    recommendations.push('Use successful patterns as templates for new features')
  }
  
  // Based on preferred journeys
  if (profile.preferredJourneys.length > 0) {
    recommendations.push(`Focus on optimizing ${profile.preferredJourneys[0]} journey experience`)
    recommendations.push('Cross-promote similar journeys to increase user exploration')
  }
  
  return recommendations
}

export const predictUserBehavior = (profile: UserBehaviorProfile): {
  likelyNextAction: string
  churnRisk: 'high' | 'medium' | 'low'
  recommendations: string[]
} => {
  const recentPatterns = profile.patterns.slice(0, 3)
  const frustrationCount = recentPatterns.filter(p => p.type === 'frustration').length
  const successCount = recentPatterns.filter(p => p.type === 'success').length
  
  let churnRisk: 'high' | 'medium' | 'low' = 'low'
  let likelyNextAction = 'Continue normal usage'
  
  if (frustrationCount >= 2) {
    churnRisk = 'high'
    likelyNextAction = 'Likely to abandon or seek alternatives'
  } else if (frustrationCount === 1 && successCount === 0) {
    churnRisk = 'medium'
    likelyNextAction = 'May reduce usage or need support'
  } else if (successCount >= 2) {
    likelyNextAction = 'Likely to increase usage and engagement'
  }
  
  return {
    likelyNextAction,
    churnRisk,
    recommendations: generateRecommendations(profile)
  }
} 