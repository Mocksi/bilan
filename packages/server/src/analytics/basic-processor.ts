import { VoteCastEvent } from '@mocksi/bilan-sdk'
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
    type: 'vote' | 'comment' | 'journey'
    summary: string
    sentiment: 'positive' | 'negative' | 'neutral'
  }[]
}

export class BasicAnalyticsProcessor {
  private db: BilanDatabase

  constructor(db: BilanDatabase) {
    this.db = db
  }

  async getDashboardData(startDate?: Date, endDate?: Date): Promise<DashboardData> {
    const events = await this.getFilteredEvents(startDate, endDate)
    
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
   * Process vote events and store them in the database
   */
  async processVoteEvents(events: VoteCastEvent[]): Promise<void> {
    for (const event of events) {
      this.db.insertEvent(event)
    }
  }

  /**
   * Get filtered events based on date range
   */
  private async getFilteredEvents(startDate?: Date, endDate?: Date): Promise<VoteCastEvent[]> {
    if (!startDate || !endDate) {
      // If no date range specified, return all events
      return await this.db.getEvents({ limit: 10000 })
    }

    // Convert dates to timestamps
    const startTimestamp = startDate.getTime()
    const endTimestamp = endDate.getTime()

    return await this.db.getEvents({
      startTimestamp,
      endTimestamp,
      limit: 10000
    })
  }

  /**
   * Calculate conversation stats - but be honest about what we actually have
   */
  private calculateConversationStats(events: VoteCastEvent[]): DashboardData['conversationStats'] {
    // We don't actually have conversation tracking, just individual votes
    // Conversations are real objects that need to be tracked separately
    // We should NOT count prompts as conversations
    
    return {
      totalConversations: 0, // We don't have real conversation data
      successRate: null, // Can't calculate without conversation boundaries
      averageMessages: null, // Can't calculate without conversation boundaries
      completionRate: null // Can't calculate without conversation boundaries
    }
  }

  /**
   * Calculate journey stats - show what we can detect from metadata
   */
  private calculateJourneyStats(events: VoteCastEvent[]): DashboardData['journeyStats'] {
    // Extract journey data from metadata where available
    const journeyMap = new Map<string, { count: number; positiveCount: number }>()
    
    events.forEach(event => {
      const journeyName = event.properties?.journeyName
      // Only track journeys that have explicit journey names, not default fallback
      if (journeyName) {
        if (!journeyMap.has(journeyName)) {
          journeyMap.set(journeyName, { count: 0, positiveCount: 0 })
        }
        const journey = journeyMap.get(journeyName)!
        journey.count++
        if (event.properties.value > 0) {
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
        completionRate: data.count > 0 ? (data.positiveCount / data.count) * 100 : 0
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
   * Calculate feedback stats from the events we have
   */
  private calculateFeedbackStats(events: VoteCastEvent[]): DashboardData['feedbackStats'] {
    const totalFeedback = events.length
    const positiveEvents = events.filter(e => e.properties.value > 0)
    const positiveRate = totalFeedback > 0 ? (positiveEvents.length / totalFeedback) * 100 : 0

    // Get recent comments
    const topComments = events
      .filter(e => e.properties.comment && e.properties.comment.trim().length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(e => e.properties.comment!)

    return {
      totalFeedback,
      positiveRate,
      recentTrend: this.calculateTrendDirection(events),
      topComments
    }
  }

  /**
   * Calculate quality signals from available data
   */
  private calculateQualitySignals(events: VoteCastEvent[]): DashboardData['qualitySignals'] {
    if (events.length === 0) {
      return {
        responseQuality: 0,
        userSatisfaction: 0,
        trustScore: 0,
        responseTime: null
      }
    }

    const positiveEvents = events.filter(e => e.properties.value > 0)
    const positiveRate = positiveEvents.length / events.length

    return {
      responseQuality: positiveRate * 100,
      userSatisfaction: positiveRate * 100,
      trustScore: positiveRate * 100,
      responseTime: null // We don't have response time data in vote events
    }
  }

  /**
   * Calculate time series data for charts
   */
  private calculateTimeSeriesData(events: VoteCastEvent[]): DashboardData['timeSeriesData'] {
    // Group events by day
    const dailyData = new Map<string, { positive: number; negative: number }>()
    
    events.forEach(event => {
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

    // Calculate weekly trends
    const weeklyTrends = dailyVotes.reduce((weeks: { week: string; score: number }[], day) => {
      const weekStart = new Date(day.date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekString = weekStart.toISOString().split('T')[0]
      
      const existingWeek = weeks.find(w => w.week === weekString)
      const dayScore = day.positive + day.negative > 0 ? (day.positive / (day.positive + day.negative)) * 100 : 0
      
      if (existingWeek) {
        existingWeek.score = (existingWeek.score + dayScore) / 2
      } else {
        weeks.push({ week: weekString, score: dayScore })
      }
      
      return weeks
    }, [])

    return {
      dailyVotes,
      weeklyTrends
    }
  }

  /**
   * Calculate recent activity feed
   */
  private calculateRecentActivity(events: VoteCastEvent[]): DashboardData['recentActivity'] {
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(event => ({
        timestamp: event.timestamp,
        type: 'vote' as const,
        summary: event.properties.comment 
          ? `User commented: "${event.properties.comment.substring(0, 50)}${event.properties.comment.length > 50 ? '...' : ''}"`
          : `User ${event.properties.value > 0 ? 'upvoted' : 'downvoted'} a prompt`,
        sentiment: event.properties.value > 0 ? 'positive' as const : 'negative' as const
      }))
  }

  /**
   * Calculate trend direction based on recent events
   */
  private calculateTrendDirection(events: VoteCastEvent[]): 'improving' | 'declining' | 'stable' {
    if (events.length < 10) return 'stable'

    // Sort by timestamp
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp)
    
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