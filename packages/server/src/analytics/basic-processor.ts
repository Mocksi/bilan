import { VoteEvent } from '@mocksi/bilan-sdk'
import { BilanDatabase } from '../database/schema.js'

export interface DashboardData {
  conversationStats: {
    totalConversations: number
    successRate: number | null // null when we don't have real conversation data
    averageMessages: number | null
    completionRate: number | null
  }
  journeyStats: {
    totalJourneys: number | null // null when we don't have real journey data
    completionRate: number | null
    popularJourneys: { name: string; count: number; completionRate: number }[]
  }
  feedbackStats: {
    totalFeedback: number
    positiveRate: number
    recentTrend: 'improving' | 'declining' | 'stable'
    topComments: string[]
  }
  qualitySignals: {
    positive: number
    negative: number
    regenerations: number // We don't have this data yet
    frustration: number // We don't have this data yet
  }
  timeSeriesData: {
    date: string
    trustScore: number
    totalVotes: number
    positiveVotes: number
  }[]
  recentActivity: {
    conversations: any[] // empty when we don't have real conversations
    recentVotes: { 
      promptId: string; 
      userId: string; 
      value: number; 
      timestamp: number;
      comment?: string;
      metadata?: any;
    }[]
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
  async calculateDashboardData(startDate?: Date, endDate?: Date): Promise<DashboardData> {
    const events = this.getFilteredEvents(startDate, endDate)
    
    return {
      conversationStats: this.calculateConversationStats(events),
      journeyStats: this.calculateJourneyStats(events),
      feedbackStats: this.calculateFeedbackStats(events),
      qualitySignals: this.calculateQualitySignals(events),
      timeSeriesData: this.calculateTimeSeriesData(events),
      recentActivity: this.calculateRecentActivity(events)
    }
  }

  /**
   * Get filtered events based on date range
   */
  private getFilteredEvents(startDate?: Date, endDate?: Date): VoteEvent[] {
    if (!startDate || !endDate) {
      // If no date range specified, return all events
      return this.db.getEvents({ limit: 10000 })
    }

    // Convert dates to timestamps
    const startTimestamp = startDate.getTime()
    const endTimestamp = endDate.getTime()

    // Use database-level filtering for better performance
    return this.db.getEvents({ 
      limit: 10000, 
      startTimestamp, 
      endTimestamp 
    })
  }

  /**
   * Calculate conversation stats - but be honest about what we actually have
   */
  private calculateConversationStats(events: VoteEvent[]): DashboardData['conversationStats'] {
    // We don't actually have conversation tracking, just individual votes
    // Conversations are real objects that need to be tracked separately
    // We should NOT count prompts as conversations
    
    return {
      totalConversations: 0, // We don't have real conversation tracking
      successRate: null, // We don't have real conversation outcomes
      averageMessages: null, // We don't track messages per conversation
      completionRate: null // We don't track conversation completion
    }
  }

  /**
   * Calculate journey stats - show what we can detect from metadata
   */
  private calculateJourneyStats(events: VoteEvent[]): DashboardData['journeyStats'] {
    // Extract journey data from metadata where available
    const journeyMap = new Map<string, { count: number; positiveCount: number }>()
    
    events.forEach(event => {
      const journeyName = event.metadata?.journeyName
      // Only track journeys that have explicit journey names, not default fallback
      if (journeyName) {
        if (!journeyMap.has(journeyName)) {
          journeyMap.set(journeyName, { count: 0, positiveCount: 0 })
        }
        const journey = journeyMap.get(journeyName)!
        journey.count++
        if (event.value > 0) {
          journey.positiveCount++
        }
      }
    })

    // Only return journey data if we have actual named journeys
    if (journeyMap.size === 0) {
      return {
        totalJourneys: null,
        completionRate: null,
        popularJourneys: []
      }
    }

    const popularJourneys = Array.from(journeyMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        completionRate: data.count > 0 ? data.positiveCount / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalJourneys: popularJourneys.length,
      completionRate: popularJourneys.reduce((sum, j) => sum + j.completionRate, 0) / popularJourneys.length,
      popularJourneys
    }
  }

  /**
   * Calculate feedback stats - this is what we actually have
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

    // Get top comments (most are null in our current data)
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
   * Calculate quality signals from our vote data
   */
  private calculateQualitySignals(events: VoteEvent[]): DashboardData['qualitySignals'] {
    const positive = events.filter(e => e.value > 0).length
    const negative = events.filter(e => e.value < 0).length
    
    // We don't have regeneration or frustration data yet, so we'll show 0
    // In the future, these could come from different event types or metadata
    const regenerations = events.filter(e => e.metadata?.action === 'regenerate').length
    const frustration = events.filter(e => e.metadata?.sentiment === 'frustrated').length

    return {
      positive,
      negative,
      regenerations,
      frustration
    }
  }

  /**
   * Calculate time-series data for trust score trends
   */
  private calculateTimeSeriesData(events: VoteEvent[]): DashboardData['timeSeriesData'] {
    if (events.length === 0) return []

    // Group events by date
    const dateMap = new Map<string, { total: number; positive: number }>()
    
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { total: 0, positive: 0 })
      }
      const dayData = dateMap.get(date)!
      dayData.total++
      if (event.value > 0) {
        dayData.positive++
      }
    })

    // Convert to array and calculate trust scores
    const timeSeriesData = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        trustScore: data.total > 0 ? data.positive / data.total : 0,
        totalVotes: data.total,
        positiveVotes: data.positive
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return timeSeriesData
  }

  /**
   * Calculate recent activity - show what we actually have
   */
  private calculateRecentActivity(events: VoteEvent[]): DashboardData['recentActivity'] {
    // We don't have real conversations, just individual votes
    // So let's show recent votes instead of fabricated conversations
    const recentVotes = events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(event => ({
        promptId: event.promptId,
        userId: event.userId,
        value: event.value,
        timestamp: event.timestamp,
        comment: event.comment,
        metadata: {
          ...event.metadata,
          promptText: event.promptText
        }
      }))

    return {
      conversations: [], // No real conversations to show
      recentVotes,
      totalEvents: events.length
    }
  }

  /**
   * Simple trend calculation - this is accurate
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