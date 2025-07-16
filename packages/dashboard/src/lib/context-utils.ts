import { ConversationSummary } from './types'

export interface ConversationContext {
  promptId: string
  userId: string
  promptText?: string
  aiOutput?: string
  comment?: string
  journeyName?: string
  journeyStep?: string
  page?: string
  sessionId?: string
  userAgent?: string
  referrer?: string
  metadata?: Record<string, any>
  timestamp: number
  lastActivity: number
  feedbackCount: number
  outcome: 'positive' | 'negative'
  responseTime?: number // AI response duration in milliseconds
  userActions?: UserAction[]
  behaviorSignals?: BehaviorSignal[]
}

export interface UserAction {
  type: 'regenerate' | 'copy' | 'share' | 'escalate' | 'exit'
  timestamp: number
  details?: Record<string, any>
}

export interface BehaviorSignal {
  type: 'frustration' | 'satisfaction' | 'confusion' | 'success'
  intensity: 'low' | 'medium' | 'high'
  timestamp: number
  indicators: string[]
}

export const enrichConversationContext = (
  conversation: ConversationSummary,
  additionalContext?: Partial<ConversationContext>
): ConversationContext => {
  return {
    promptId: conversation.promptId,
    userId: conversation.userId,
    timestamp: conversation.lastActivity,
    lastActivity: conversation.lastActivity,
    feedbackCount: conversation.feedbackCount,
    outcome: conversation.outcome,
    userActions: [],
    behaviorSignals: [],
    ...additionalContext
  }
}

export const detectFrustrationSignals = (context: ConversationContext): BehaviorSignal[] => {
  const signals: BehaviorSignal[] = []
  
  // Check for regeneration attempts
  const regenerations = context.userActions?.filter(action => action.type === 'regenerate') || []
  if (regenerations.length > 2) {
    signals.push({
      type: 'frustration',
      intensity: 'high',
      timestamp: regenerations[regenerations.length - 1].timestamp,
      indicators: ['Multiple regenerations', `${regenerations.length} attempts`]
    })
  }
  
  // Check for negative feedback with short session
  const sessionDuration = context.lastActivity - context.timestamp
  if (context.outcome === 'negative' && sessionDuration < 30000) { // Less than 30 seconds
    signals.push({
      type: 'frustration',
      intensity: 'medium',
      timestamp: context.lastActivity,
      indicators: ['Quick negative feedback', 'Short session duration']
    })
  }
  
  // Check for escalation
  const escalations = context.userActions?.filter(action => action.type === 'escalate') || []
  if (escalations.length > 0) {
    signals.push({
      type: 'frustration',
      intensity: 'high',
      timestamp: escalations[0].timestamp,
      indicators: ['Escalated to human', 'AI solution insufficient']
    })
  }
  
  // Check for immediate exit
  const exits = context.userActions?.filter(action => action.type === 'exit') || []
  if (exits.length > 0 && exits[0].timestamp - context.timestamp < 10000) { // Less than 10 seconds
    signals.push({
      type: 'frustration',
      intensity: 'medium',
      timestamp: exits[0].timestamp,
      indicators: ['Immediate exit', 'No engagement']
    })
  }
  
  return signals
}

export const detectSuccessSignals = (context: ConversationContext): BehaviorSignal[] => {
  const signals: BehaviorSignal[] = []
  
  // Check for positive feedback with engagement
  const sessionDuration = context.lastActivity - context.timestamp
  if (context.outcome === 'positive' && sessionDuration > 60000) { // More than 1 minute
    signals.push({
      type: 'satisfaction',
      intensity: 'high',
      timestamp: context.lastActivity,
      indicators: ['Positive feedback', 'Good engagement duration']
    })
  }
  
  // Check for sharing behavior
  const shares = context.userActions?.filter(action => action.type === 'share') || []
  if (shares.length > 0) {
    signals.push({
      type: 'success',
      intensity: 'high',
      timestamp: shares[0].timestamp,
      indicators: ['Shared response', 'Found value in AI output']
    })
  }
  
  // Check for copying behavior
  const copies = context.userActions?.filter(action => action.type === 'copy') || []
  if (copies.length > 0) {
    signals.push({
      type: 'success',
      intensity: 'medium',
      timestamp: copies[0].timestamp,
      indicators: ['Copied response', 'Found useful content']
    })
  }
  
  return signals
}

export const getConversationInsights = (context: ConversationContext): string[] => {
  const insights: string[] = []
  
  const frustrationSignals = detectFrustrationSignals(context)
  const successSignals = detectSuccessSignals(context)
  
  // Add frustration insights
  frustrationSignals.forEach(signal => {
    insights.push(`⚠️ ${signal.type} detected: ${signal.indicators.join(', ')}`)
  })
  
  // Add success insights
  successSignals.forEach(signal => {
    insights.push(`✅ ${signal.type} detected: ${signal.indicators.join(', ')}`)
  })
  
  // Add journey insights
  if (context.journeyName && context.journeyStep) {
    insights.push(`📍 Journey: ${context.journeyName} → ${context.journeyStep}`)
  }
  
  // Add session insights
  const sessionDuration = context.lastActivity - context.timestamp
  if (sessionDuration > 300000) { // More than 5 minutes
    insights.push(`⏱️ Long session: ${Math.round(sessionDuration / 60000)} minutes`)
  }
  
  return insights
}

export const categorizeConversationByPattern = (context: ConversationContext): string | null => {
  const frustrationSignals = detectFrustrationSignals(context)
  const successSignals = detectSuccessSignals(context)
  
  // Pattern: Quick frustration
  if (frustrationSignals.some(s => s.intensity === 'high' && s.type === 'frustration')) {
    return 'high-frustration'
  }
  
  // Pattern: Successful engagement
  if (successSignals.some(s => s.intensity === 'high' && s.type === 'success')) {
    return 'high-success'
  }
  
  // Pattern: Confusion (multiple regenerations but no clear outcome)
  const regenerations = context.userActions?.filter(action => action.type === 'regenerate') || []
  if (regenerations.length > 1 && context.outcome === 'negative') {
    return 'confusion-pattern'
  }
  
  // Pattern: Silent success (positive but no engagement)
  if (context.outcome === 'positive' && (context.userActions?.length || 0) === 0) {
    return 'silent-success'
  }
  
  return null
}

export const getPatternDescription = (pattern: string): string => {
  switch (pattern) {
    case 'high-frustration':
      return 'User showed strong frustration signals (multiple regenerations, escalation, or quick exit)'
    case 'high-success':
      return 'User showed strong success signals (sharing, copying, or positive engagement)'
    case 'confusion-pattern':
      return 'User appeared confused (multiple attempts but negative outcome)'
    case 'silent-success':
      return 'User was satisfied but showed minimal engagement'
    default:
      return 'Unknown pattern'
  }
} 