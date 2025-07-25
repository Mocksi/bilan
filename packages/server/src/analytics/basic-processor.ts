import { VoteEvent, Event, EVENT_TYPES } from '../database/schema.js'
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
    responseQuality: number
    userSatisfaction: number
    trustScore: number
    responseTime: number | null
  }
  timeSeriesData: {
    dailyVotes: { date: string; positive: number; negative: number }[]
    weeklyTrends: { week: string; score: number }[]
  }
  recentActivity: {
    timestamp: number
    type: 'vote' | 'comment' | 'journey' | 'turn'
    summary: string
    sentiment: 'positive' | 'negative' | 'neutral'
  }[]
}

export class BasicAnalyticsProcessor {
  private db: BilanDatabase

  constructor(db: BilanDatabase) {
    this.db = db
  }

  async calculateDashboardData(startDate?: Date, endDate?: Date): Promise<DashboardData> {
    try {
      // Get all events for the date range
      const events = await this.getFilteredEvents(startDate, endDate)
      
      // Filter for vote events for backward compatibility
      const voteEvents = events.filter(e => e.event_type === EVENT_TYPES.VOTE_CAST)
      const voteCastEvents = voteEvents.map(this.eventToVoteCast)
      
      return {
        conversationStats: this.calculateConversationStats(events),
        journeyStats: this.calculateJourneyStats(events),
        feedbackStats: this.calculateFeedbackStats(voteCastEvents),
        qualitySignals: this.calculateQualitySignals(voteCastEvents),
        timeSeriesData: this.calculateTimeSeriesData(voteCastEvents),
        recentActivity: this.calculateRecentActivity(events)
      }
    } catch (error) {
      console.error('Dashboard calculation error:', error)
      throw error
    }
  }

  /**
   * Process events and store them in the database using batch inserts
   */
  async processEvents(events: Event[]): Promise<void> {
    if (events.length === 0) return
    
    // Use batch insert for better performance
    this.db.insertEvents(events)
  }

  /**
   * Get filtered events based on date range
   */
  private async getFilteredEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    const filters: any = { limit: 10000 }
    
    if (startDate && endDate) {
      filters.startTimestamp = startDate.getTime()
      filters.endTimestamp = endDate.getTime()
    }

    return this.db.getEvents(filters)
  }

  /**
   * Convert unified Event to VoteCast format for backward compatibility
   */
  private eventToVoteCast(event: Event): VoteCastEvent {
    // Convert string vote values to numbers for consistency
    let numericValue = event.properties.value
    if (typeof numericValue === 'string') {
      if (numericValue === 'up' || numericValue === 'positive' || numericValue === '1') {
        numericValue = 1
      } else if (numericValue === 'down' || numericValue === 'negative' || numericValue === '-1') {
        numericValue = -1
      } else {
        // Try to parse as number, default to 0 if invalid
        numericValue = parseInt(numericValue, 10) || 0
      }
    }

    return {
      eventId: event.event_id,
      eventType: 'vote_cast',
      timestamp: event.timestamp,
      userId: event.user_id,
      properties: {
        promptId: event.properties.turn_id || event.properties.prompt_id || event.properties.promptId, // Prioritize turn_id
        value: numericValue,
        comment: event.properties.comment,
        ...event.properties
      },
      promptText: event.prompt_text || undefined,
      aiResponse: event.ai_response || undefined
    }
  }

  /**
   * Calculate conversation stats - fixed for proper conversation metrics
   */
  private calculateConversationStats(events: Event[]): DashboardData['conversationStats'] {
    const conversationStarted = events.filter(e => e.event_type === EVENT_TYPES.CONVERSATION_STARTED)
    const conversationEnded = events.filter(e => e.event_type === EVENT_TYPES.CONVERSATION_ENDED)
    const turnCompleted = events.filter(e => e.event_type === EVENT_TYPES.TURN_COMPLETED)
    const turnFailed = events.filter(e => e.event_type === EVENT_TYPES.TURN_FAILED)

    // Count unique conversations by conversationId, not all events
    const uniqueConversationIds = new Set(
      conversationStarted
        .filter(e => e.properties.conversationId)
        .map(e => e.properties.conversationId)
    )
    const totalConversations = uniqueConversationIds.size
    
    // Count unique completed conversations
    const uniqueCompletedConversationIds = new Set(
      conversationEnded
        .filter(e => e.properties.conversationId)
        .map(e => e.properties.conversationId)
    )
    const completedConversations = uniqueCompletedConversationIds.size
    
    // Turn success rate within conversations (not conversation completion rate)
    const totalTurns = turnCompleted.length + turnFailed.length
    const turnSuccessRate = totalTurns > 0 ? (turnCompleted.length / totalTurns) * 100 : null

    // Calculate average messages per conversation from conversation_ended events
    const averageMessages = conversationEnded.length > 0 ? 
      conversationEnded.reduce((sum, event) => sum + (event.properties.messageCount || 0), 0) / conversationEnded.length : null

    return {
      totalConversations,
      successRate: turnSuccessRate, // This is turn success rate, not conversation completion rate
      averageMessages,
      completionRate: totalConversations > 0 ? (completedConversations / totalConversations) * 100 : null
    }
  }

  /**
   * Calculate journey stats - enhanced for v0.4.0
   */
  private calculateJourneyStats(events: Event[]): DashboardData['journeyStats'] {
    const journeyEvents = events.filter(e => e.event_type === EVENT_TYPES.JOURNEY_STEP)
    
    if (journeyEvents.length === 0) {
      return {
        totalJourneys: null,
        completionRate: null,
        popularJourneys: []
      }
    }

    const journeyMap = new Map<string, { count: number; completedCount: number }>()
    
    journeyEvents.forEach(event => {
      const journeyName = event.properties.journeyName || event.properties.journey_name
      const isCompleted = event.properties.completed || event.properties.status === 'completed'
      
      if (journeyName) {
        if (!journeyMap.has(journeyName)) {
          journeyMap.set(journeyName, { count: 0, completedCount: 0 })
        }
        const journey = journeyMap.get(journeyName)!
        journey.count++
        if (isCompleted) {
          journey.completedCount++
        }
      }
    })

    const popularJourneys = Array.from(journeyMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        completionRate: data.count > 0 ? (data.completedCount / data.count) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalJourneys: journeyMap.size,
      completionRate: popularJourneys.length > 0 
        ? popularJourneys.reduce((sum, j) => sum + j.completionRate, 0) / popularJourneys.length
        : null,
      popularJourneys
    }
  }

  /**
   * Calculate feedback stats from vote events
   */
  private calculateFeedbackStats(voteCastEvents: VoteCastEvent[]): DashboardData['feedbackStats'] {
    const totalFeedback = voteCastEvents.length
    const positiveEvents = voteCastEvents.filter(e => e.properties.value > 0)
    const positiveRate = totalFeedback > 0 ? (positiveEvents.length / totalFeedback) * 100 : 0

    // Get recent comments
    const topComments = voteCastEvents
      .filter(e => {
        if (!e.properties.comment) return false
        // Handle both string and object comments
        if (typeof e.properties.comment === 'string') {
          return e.properties.comment.trim().length > 0
        } else {
          // If it's an object, convert to string and check length
          return JSON.stringify(e.properties.comment).length > 2 // More than just "{}"
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(e => {
        // Convert comment to string if it's an object
        return typeof e.properties.comment === 'string' 
          ? e.properties.comment 
          : JSON.stringify(e.properties.comment)
      })

    return {
      totalFeedback,
      positiveRate,
      recentTrend: this.calculateTrendDirection(voteCastEvents),
      topComments
    }
  }

  /**
   * Calculate quality signals from available data
   */
  private calculateQualitySignals(voteCastEvents: VoteCastEvent[]): DashboardData['qualitySignals'] {
    if (voteCastEvents.length === 0) {
      return {
        responseQuality: 0,
        userSatisfaction: 0,
        trustScore: 0,
        responseTime: null
      }
    }

    const positiveEvents = voteCastEvents.filter(e => e.properties.value > 0)
    const positiveRate = positiveEvents.length / voteCastEvents.length

    // Calculate average response time if available
    const eventsWithResponseTime = voteCastEvents.filter(e => e.properties.responseTime)
    const avgResponseTime = eventsWithResponseTime.length > 0 
      ? eventsWithResponseTime.reduce((sum, e) => sum + (e.properties.responseTime || 0), 0) / eventsWithResponseTime.length
      : null

    // Calculate weighted trust score with decay functions for historical data
    const trustScore = this.calculateWeightedTrustScore(voteCastEvents)

    return {
      responseQuality: positiveRate * 100,
      userSatisfaction: positiveRate * 100,
      trustScore: trustScore * 100,
      responseTime: avgResponseTime
    }
  }

  /**
   * Calculate weighted trust score with decay functions for historical data
   */
  private calculateWeightedTrustScore(voteCastEvents: VoteCastEvent[]): number {
    if (voteCastEvents.length === 0) return 0

    const now = Date.now()
    const DECAY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    
    let totalWeight = 0
    let weightedScore = 0
    
    voteCastEvents.forEach(event => {
      const age = now - event.timestamp
      
      // Calculate decay factor using exponential decay
      // weight = 0.5^(age / half_life)
      const decayFactor = Math.pow(0.5, age / DECAY_HALF_LIFE)
      
      // Recent events have higher weight
      const weight = Math.max(0.01, decayFactor) // Minimum weight to avoid complete decay
      
      // Convert vote value to score (1 = positive, -1 = negative)
      const score = event.properties.value > 0 ? 1 : 0
      
      weightedScore += score * weight
      totalWeight += weight
    })
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0
  }

  /**
   * Calculate time series data for charts
   */
  private calculateTimeSeriesData(voteCastEvents: VoteCastEvent[]): DashboardData['timeSeriesData'] {
    // Group events by day
    const dailyData = new Map<string, { positive: number; negative: number }>()
    
    voteCastEvents.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0]
      if (!dailyData.has(date)) {
        dailyData.set(date, { positive: 0, negative: 0 })
      }
      const dayData = dailyData.get(date)!
      if (event.properties.value > 0) {
        dayData.positive++
      } else {
        dayData.negative++
      }
    })

    const dailyVotes = Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate weekly trends with proper weighting
    const weeklyData = new Map<string, { totalScore: number; dayCount: number }>()
    
    dailyVotes.forEach(day => {
      const weekStart = new Date(day.date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekString = weekStart.toISOString().split('T')[0]
      
      const dayScore = day.positive + day.negative > 0 ? (day.positive / (day.positive + day.negative)) * 100 : 0
      
      if (!weeklyData.has(weekString)) {
        weeklyData.set(weekString, { totalScore: 0, dayCount: 0 })
      }
      
      const weekData = weeklyData.get(weekString)!
      weekData.totalScore += dayScore
      weekData.dayCount += 1
    })
    
    const weeklyTrends = Array.from(weeklyData.entries())
      .map(([week, data]) => ({
        week,
        score: data.dayCount > 0 ? data.totalScore / data.dayCount : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week))

    return {
      dailyVotes,
      weeklyTrends
    }
  }

  /**
   * Calculate recent activity feed from all event types
   */
  private calculateRecentActivity(events: Event[]): DashboardData['recentActivity'] {
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(event => {
        let type: 'vote' | 'comment' | 'journey' | 'turn' = 'vote'
        let summary = ''
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'

        switch (event.event_type) {
          case EVENT_TYPES.VOTE_CAST:
            type = 'vote'
            if (event.properties.comment) {
              type = 'comment'
              // Handle both string and object comments
              const commentStr = typeof event.properties.comment === 'string' 
                ? event.properties.comment 
                : JSON.stringify(event.properties.comment)
              summary = `User commented: "${commentStr.substring(0, 50)}${commentStr.length > 50 ? '...' : ''}"`
            } else {
              summary = `User ${event.properties.value > 0 ? 'upvoted' : 'downvoted'} a prompt`
            }
            sentiment = event.properties.value > 0 ? 'positive' : 'negative'
            break
          
          case EVENT_TYPES.TURN_COMPLETED:
            type = 'turn'
            summary = `AI turn completed successfully`
            sentiment = 'positive'
            break
          
          case EVENT_TYPES.TURN_FAILED:
            type = 'turn'
            summary = `AI turn failed: ${event.properties.errorMessage || 'Unknown error'}`
            sentiment = 'negative'
            break
          
          case EVENT_TYPES.JOURNEY_STEP:
            type = 'journey'
            summary = `Journey step: ${event.properties.journeyName || 'Unknown journey'}`
            sentiment = 'neutral'
            break
          
          default:
            summary = `${event.event_type} event`
            sentiment = 'neutral'
        }

        return {
          timestamp: event.timestamp,
          type,
          summary,
          sentiment
        }
      })
  }

  /**
   * Calculate trend direction based on recent events
   */
  private calculateTrendDirection(voteCastEvents: VoteCastEvent[]): 'improving' | 'declining' | 'stable' {
    if (voteCastEvents.length < 10) return 'stable'

    // Sort by timestamp
    const sortedEvents = voteCastEvents.sort((a, b) => a.timestamp - b.timestamp)
    
    // Split into two halves
    const midpoint = Math.floor(sortedEvents.length / 2)
    const firstHalf = sortedEvents.slice(0, midpoint)
    const secondHalf = sortedEvents.slice(midpoint)

    const firstHalfPositive = firstHalf.filter(e => e.properties.value > 0).length / firstHalf.length
    const secondHalfPositive = secondHalf.filter(e => e.properties.value > 0).length / secondHalf.length

    const difference = secondHalfPositive - firstHalfPositive

    if (difference > 0.1) return 'improving'
    if (difference < -0.1) return 'declining'
    return 'stable'
  }
}

// VoteCastEvent interface for backward compatibility
interface VoteCastEvent {
  eventId: string
  eventType: 'vote_cast'
  timestamp: number
  userId: string
  properties: {
    promptId: string
    value: 1 | -1
    comment?: string
    responseTime?: number
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
} 