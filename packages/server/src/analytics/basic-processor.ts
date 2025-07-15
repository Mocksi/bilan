import { VoteEvent } from '@mocksi/bilan-sdk'
import { BilanDatabase } from '../database/schema.js'

export interface DashboardData {
  conversationStats: {
    totalConversations: number
    successRate: number
    averageMessages: number
    completionRate: number
  }
  journeyStats: {
    totalJourneys: number
    completionRate: number
    popularJourneys: { name: string; count: number }[]
  }
  feedbackStats: {
    totalFeedback: number
    positiveRate: number
    recentTrend: 'improving' | 'declining' | 'stable'
    topComments: string[]
  }
  recentActivity: {
    conversations: any[]
    totalEvents: number
  }
}

export class BasicAnalyticsProcessor {
  private db: BilanDatabase

  constructor(db: BilanDatabase) {
    this.db = db
  }

  /**
   * Calculate comprehensive dashboard analytics
   */
  async calculateDashboardData(): Promise<DashboardData> {
    const events = this.db.getEvents({ limit: 1000 })
    
    return {
      conversationStats: this.calculateConversationStats(events),
      journeyStats: this.calculateJourneyStats(events),
      feedbackStats: this.calculateFeedbackStats(events),
      recentActivity: this.calculateRecentActivity(events)
    }
  }

  /**
   * Calculate conversation success rates and metrics
   */
  private calculateConversationStats(events: VoteEvent[]): DashboardData['conversationStats'] {
    // For now, treat each unique promptId as a "conversation"
    // In a full implementation, we'd have separate conversation tracking
    const conversationMap = new Map<string, { messages: number; outcome: 'positive' | 'negative' | 'neutral' }>()
    
    events.forEach(event => {
      if (!conversationMap.has(event.promptId)) {
        conversationMap.set(event.promptId, { messages: 0, outcome: 'neutral' })
      }
      const conv = conversationMap.get(event.promptId)!
      conv.messages++
      
      // Determine outcome based on feedback
      if (event.value > 0) {
        conv.outcome = 'positive'
      } else if (event.value < 0 && conv.outcome === 'neutral') {
        conv.outcome = 'negative'
      }
    })

    const totalConversations = conversationMap.size
    const successfulConversations = Array.from(conversationMap.values()).filter(c => c.outcome === 'positive').length
    const averageMessages = totalConversations > 0 
      ? Array.from(conversationMap.values()).reduce((sum, c) => sum + c.messages, 0) / totalConversations
      : 0

    return {
      totalConversations,
      successRate: totalConversations > 0 ? successfulConversations / totalConversations : 0,
      averageMessages,
      completionRate: totalConversations > 0 ? successfulConversations / totalConversations : 0
    }
  }

  /**
   * Calculate journey completion rates
   */
  private calculateJourneyStats(events: VoteEvent[]): DashboardData['journeyStats'] {
    // For now, simulate journey data from event metadata
    // In a full implementation, we'd have separate journey tracking
    const journeyMap = new Map<string, number>()
    
    events.forEach(event => {
      const journeyName = event.metadata?.journeyName || 'default'
      journeyMap.set(journeyName, (journeyMap.get(journeyName) || 0) + 1)
    })

    const totalJourneys = journeyMap.size
    const completedJourneys = Array.from(journeyMap.values()).filter(count => count > 1).length
    const popularJourneys = Array.from(journeyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalJourneys,
      completionRate: totalJourneys > 0 ? completedJourneys / totalJourneys : 0,
      popularJourneys
    }
  }

  /**
   * Calculate feedback statistics and trends
   */
  private calculateFeedbackStats(events: VoteEvent[]): DashboardData['feedbackStats'] {
    if (events.length === 0) {
      return {
        totalFeedback: 0,
        positiveRate: 0,
        recentTrend: 'stable',
        topComments: []
      }
    }

    const totalFeedback = events.length
    const positiveEvents = events.filter(e => e.value > 0)
    const positiveRate = positiveEvents.length / totalFeedback

    // Calculate trend by comparing recent vs older events
    const recentTrend = this.calculateTrendDirection(events)

    // Get top comments
    const topComments = events
      .filter(e => e.comment && e.comment.length > 0)
      .map(e => e.comment!)
      .slice(0, 5)

    return {
      totalFeedback,
      positiveRate,
      recentTrend,
      topComments
    }
  }

  /**
   * Calculate recent activity summary
   */
  private calculateRecentActivity(events: VoteEvent[]): DashboardData['recentActivity'] {
    // Get recent conversations (last 50 events grouped by promptId)
    const recentConversations = events
      .slice(0, 50)
      .reduce((acc, event) => {
        const existing = acc.find(c => c.promptId === event.promptId)
        if (existing) {
          existing.lastActivity = Math.max(existing.lastActivity, event.timestamp)
          existing.feedbackCount++
        } else {
          acc.push({
            promptId: event.promptId,
            userId: event.userId,
            lastActivity: event.timestamp,
            feedbackCount: 1,
            outcome: event.value > 0 ? 'positive' : 'negative'
          })
        }
        return acc
      }, [] as any[])
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 10)

    return {
      conversations: recentConversations,
      totalEvents: events.length
    }
  }

  /**
   * Simple trend calculation
   */
  private calculateTrendDirection(events: VoteEvent[]): 'improving' | 'declining' | 'stable' {
    if (events.length < 10) return 'stable'

    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp)
    const midpoint = Math.floor(sortedEvents.length / 2)
    
    const olderEvents = sortedEvents.slice(0, midpoint)
    const recentEvents = sortedEvents.slice(midpoint)

    const olderPositiveRate = olderEvents.filter(e => e.value > 0).length / olderEvents.length
    const recentPositiveRate = recentEvents.filter(e => e.value > 0).length / recentEvents.length

    const difference = recentPositiveRate - olderPositiveRate

    if (difference > 0.1) return 'improving'
    if (difference < -0.1) return 'declining'
    return 'stable'
  }
} 