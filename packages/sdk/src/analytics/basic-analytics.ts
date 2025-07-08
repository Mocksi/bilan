import { VoteEvent, BasicStats, PromptStats, TrendConfig, PromptId } from '../types'

export class BasicAnalytics {
  static calculateBasicStats(events: VoteEvent[], trendConfig: TrendConfig = {}): BasicStats {
    if (events.length === 0) {
      return {
        totalVotes: 0,
        positiveRate: 0,
        recentTrend: 'stable',
        topFeedback: []
      }
    }

    const totalVotes = events.length
    const positiveVotes = events.filter(e => e.value > 0).length
    const positiveRate = positiveVotes / totalVotes

    // Calculate improved trend
    const recentTrend = this.calculateTrend(events, trendConfig)

    // Extract top feedback comments
    const topFeedback = events
      .filter(e => e.comment && e.comment.length > 0)
      .map(e => e.comment!)
      .slice(-5)

    return {
      totalVotes,
      positiveRate,
      recentTrend,
      topFeedback
    }
  }

  private static calculateTrend(events: VoteEvent[], config: TrendConfig = {}): 'improving' | 'declining' | 'stable' {
    const {
      sensitivity = 0.1,
      timeWeightHours = 24,
      minSampleSize = 5,
      recentWindowSize = 10
    } = config

    // Need minimum sample size for reliable trend
    if (events.length < minSampleSize) {
      return 'stable'
    }

    const now = Date.now()
    const timeDecayMs = timeWeightHours * 60 * 60 * 1000

    // Calculate time-weighted recent average
    const recentEvents = events.slice(-recentWindowSize)
    let recentWeightedSum = 0
    let recentTotalWeight = 0

    recentEvents.forEach(event => {
      const age = now - event.timestamp
      const weight = Math.exp(-age / timeDecayMs)
      recentWeightedSum += event.value * weight
      recentTotalWeight += weight
    })

    const recentAverage = recentTotalWeight > 0 ? recentWeightedSum / recentTotalWeight : 0

    // Calculate historical average (exclude recent window)
    const historicalEvents = events.slice(0, -recentWindowSize)
    if (historicalEvents.length === 0) {
      return 'stable'
    }

    const historicalAverage = historicalEvents.reduce((sum, e) => sum + e.value, 0) / historicalEvents.length

    // Calculate difference and check statistical significance
    const difference = recentAverage - historicalAverage
    const absThreshold = sensitivity

    // Simple statistical significance check
    // More samples = more confidence, so lower threshold
    const confidenceAdjustment = Math.max(0.5, Math.min(1.0, recentEvents.length / 20))
    const adjustedThreshold = absThreshold / confidenceAdjustment

    if (difference > adjustedThreshold) {
      return 'improving'
    } else if (difference < -adjustedThreshold) {
      return 'declining'
    }

    return 'stable'
  }

  static calculatePromptStats(events: VoteEvent[], promptId: PromptId): PromptStats {
    const promptEvents = events.filter(e => e.promptId === promptId)
    
    return {
      promptId,
      totalVotes: promptEvents.length,
      positiveRate: promptEvents.length > 0 
        ? promptEvents.filter(e => e.value > 0).length / promptEvents.length 
        : 0,
      comments: promptEvents
        .filter(e => e.comment && e.comment.length > 0)
        .map(e => e.comment!)
    }
  }
} 