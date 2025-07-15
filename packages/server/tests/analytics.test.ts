import { describe, it, expect, beforeEach } from 'vitest'
import { BasicAnalyticsProcessor } from '../src/analytics/basic-processor.js'
import { BilanDatabase } from '../src/database/schema.js'
import { VoteEvent, createPromptId, createUserId } from '@mocksi/bilan-sdk'

describe('BasicAnalyticsProcessor', () => {
  let processor: BasicAnalyticsProcessor
  let db: BilanDatabase

  beforeEach(() => {
    db = new BilanDatabase(':memory:')
    processor = new BasicAnalyticsProcessor(db)
  })

  describe('calculateDashboardData', () => {
    it('should return empty stats for no events', async () => {
      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(0)
      expect(result.conversationStats.successRate).toBe(null) // No real conversation data
      expect(result.conversationStats.averageMessages).toBe(null) // No real conversation data
      expect(result.conversationStats.completionRate).toBe(null) // No real conversation data
      expect(result.journeyStats.totalJourneys).toBe(null) // No real journey data
      expect(result.journeyStats.completionRate).toBe(null) // No real journey data
      expect(result.journeyStats.popularJourneys).toEqual([]) // No real journey data
      expect(result.feedbackStats.totalFeedback).toBe(0)
      expect(result.qualitySignals.positive).toBe(0)
      expect(result.qualitySignals.negative).toBe(0)
      expect(result.qualitySignals.regenerations).toBe(0)
      expect(result.qualitySignals.frustration).toBe(0)
      expect(result.timeSeriesData).toEqual([])
      expect(result.recentActivity.totalEvents).toBe(0)
      expect(result.recentActivity.conversations).toEqual([]) // No real conversations
      expect(result.recentActivity.recentVotes).toEqual([]) // No votes yet
    })

    it('should calculate feedback stats and quality signals accurately', async () => {
      // Add test events - these are individual votes, not conversations
      const events: VoteEvent[] = [
        { promptId: createPromptId('prompt-1'), value: 1, comment: undefined, timestamp: 1000, userId: createUserId('user-1'), metadata: {} },
        { promptId: createPromptId('prompt-1'), value: -1, comment: undefined, timestamp: 2000, userId: createUserId('user-1'), metadata: {} },
        { promptId: createPromptId('prompt-2'), value: 1, comment: undefined, timestamp: 3000, userId: createUserId('user-2'), metadata: {} }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(2) // 2 unique promptIds
      expect(result.conversationStats.successRate).toBe(null) // We don't have real conversation outcomes
      expect(result.conversationStats.averageMessages).toBe(null) // We don't track messages per conversation
      expect(result.conversationStats.completionRate).toBe(null) // We don't track conversation completion
      expect(result.journeyStats.totalJourneys).toBe(null) // No explicit journey names
      expect(result.journeyStats.completionRate).toBe(null) // No explicit journey names
      expect(result.journeyStats.popularJourneys).toEqual([]) // No explicit journey names
      expect(result.feedbackStats.totalFeedback).toBe(3) // 3 total votes
      expect(result.feedbackStats.positiveRate).toBe(2/3) // 2 positive out of 3 votes
      expect(result.qualitySignals.positive).toBe(2) // 2 positive votes
      expect(result.qualitySignals.negative).toBe(1) // 1 negative vote
      expect(result.qualitySignals.regenerations).toBe(0) // No regeneration data
      expect(result.qualitySignals.frustration).toBe(0) // No frustration data
      expect(result.recentActivity.recentVotes).toHaveLength(3) // All 3 votes shown
      expect(result.recentActivity.conversations).toEqual([]) // No real conversations
    })

    it('should calculate journey stats from metadata', async () => {
      // Add test events with journey metadata
      const events: VoteEvent[] = [
        { promptId: createPromptId('prompt-1'), value: 1, comment: undefined, timestamp: 1000, userId: createUserId('user-1'), metadata: { journeyName: 'onboarding' } },
        { promptId: createPromptId('prompt-1'), value: -1, comment: undefined, timestamp: 2000, userId: createUserId('user-1'), metadata: { journeyName: 'onboarding' } },
        { promptId: createPromptId('prompt-2'), value: 1, comment: undefined, timestamp: 3000, userId: createUserId('user-2'), metadata: { journeyName: 'checkout' } }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.journeyStats.totalJourneys).toBe(2) // 2 unique journeys
      expect(result.journeyStats.completionRate).toBe(0.75) // (0.5 + 1.0) / 2 = 0.75
      expect(result.journeyStats.popularJourneys).toHaveLength(2)
      expect(result.journeyStats.popularJourneys[0].name).toBe('onboarding') // Should be first (more events)
      expect(result.journeyStats.popularJourneys[0].count).toBe(2)
      expect(result.journeyStats.popularJourneys[0].completionRate).toBe(0.5) // 1/2 positive
      expect(result.journeyStats.popularJourneys[1].name).toBe('checkout')
      expect(result.journeyStats.popularJourneys[1].count).toBe(1)
      expect(result.journeyStats.popularJourneys[1].completionRate).toBe(1.0) // 1/1 positive
    })

    it('should calculate time-series data correctly', async () => {
      // Add events across multiple days
      const events: VoteEvent[] = [
        { promptId: createPromptId('prompt-1'), value: 1, comment: undefined, timestamp: new Date('2023-01-01').getTime(), userId: createUserId('user-1'), metadata: {} },
        { promptId: createPromptId('prompt-2'), value: -1, comment: undefined, timestamp: new Date('2023-01-01').getTime(), userId: createUserId('user-1'), metadata: {} },
        { promptId: createPromptId('prompt-3'), value: 1, comment: undefined, timestamp: new Date('2023-01-02').getTime(), userId: createUserId('user-2'), metadata: {} },
        { promptId: createPromptId('prompt-4'), value: 1, comment: undefined, timestamp: new Date('2023-01-02').getTime(), userId: createUserId('user-2'), metadata: {} }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.timeSeriesData).toHaveLength(2) // 2 days
      expect(result.timeSeriesData[0].date).toBe('2023-01-01')
      expect(result.timeSeriesData[0].trustScore).toBe(0.5) // 1/2 positive
      expect(result.timeSeriesData[0].totalVotes).toBe(2)
      expect(result.timeSeriesData[0].positiveVotes).toBe(1)
      expect(result.timeSeriesData[1].date).toBe('2023-01-02')
      expect(result.timeSeriesData[1].trustScore).toBe(1.0) // 2/2 positive
      expect(result.timeSeriesData[1].totalVotes).toBe(2)
      expect(result.timeSeriesData[1].positiveVotes).toBe(2)
    })

    it('should handle edge cases honestly', async () => {
      const event: VoteEvent = { promptId: createPromptId('prompt-1'), value: 1, comment: undefined, timestamp: 1000, userId: createUserId('user-1'), metadata: {} }
      db.insertEvent(event)
      
      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(1) // 1 unique promptId
      expect(result.conversationStats.successRate).toBe(null) // No real conversation outcomes
      expect(result.journeyStats.totalJourneys).toBe(null) // No explicit journey names
      expect(result.journeyStats.completionRate).toBe(null) // No explicit journey names
      expect(result.journeyStats.popularJourneys).toEqual([]) // No explicit journey names
      expect(result.feedbackStats.recentTrend).toBe('stable') // < 10 events
      expect(result.feedbackStats.positiveRate).toBe(1.0) // 1 positive out of 1 vote
      expect(result.qualitySignals.positive).toBe(1)
      expect(result.qualitySignals.negative).toBe(0)
      expect(result.timeSeriesData).toHaveLength(1) // 1 day
    })

    it('should extract top comments correctly', async () => {
      const events: VoteEvent[] = [
        { promptId: createPromptId('prompt-1'), value: 1, comment: 'Great response!', timestamp: 1000, userId: createUserId('user-1'), metadata: {} },
        { promptId: createPromptId('prompt-2'), value: -1, comment: 'Could be better', timestamp: 2000, userId: createUserId('user-2'), metadata: {} },
        { promptId: createPromptId('prompt-3'), value: 1, comment: undefined, timestamp: 3000, userId: createUserId('user-3'), metadata: {} }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.feedbackStats.topComments).toHaveLength(2)
      expect(result.feedbackStats.topComments).toContain('Great response!')
      expect(result.feedbackStats.topComments).toContain('Could be better')
      expect(result.feedbackStats.totalFeedback).toBe(3)
      expect(result.feedbackStats.positiveRate).toBe(2/3)
      expect(result.recentActivity.recentVotes[0].comment).toBeFalsy() // Most recent has no comment
      expect(result.recentActivity.recentVotes[1].comment).toBe('Could be better') // Second most recent has comment
    })

    it('should handle performance with enhanced data structure', async () => {
      // Add sample events with various metadata
      const events: VoteEvent[] = [
        { promptId: createPromptId('prompt-1'), value: 1, comment: undefined, timestamp: 1000, userId: createUserId('user-1'), metadata: { journeyName: 'onboarding' } },
        { promptId: createPromptId('prompt-2'), value: -1, comment: undefined, timestamp: 2000, userId: createUserId('user-2'), metadata: { journeyName: 'checkout' } },
        { promptId: createPromptId('prompt-3'), value: 1, comment: undefined, timestamp: 3000, userId: createUserId('user-3'), metadata: { journeyName: 'onboarding' } }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const startTime = Date.now()
      const result = await processor.calculateDashboardData()
      const processingTime = Date.now() - startTime
      
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.conversationStats.totalConversations).toBe(3) // 3 unique promptIds
      expect(result.journeyStats.totalJourneys).toBe(2) // 2 unique journeys
      expect(result.journeyStats.popularJourneys).toHaveLength(2)
      expect(result.feedbackStats.totalFeedback).toBe(3) // 3 total votes
      expect(result.qualitySignals.positive).toBe(2) // 2 positive votes
      expect(result.qualitySignals.negative).toBe(1) // 1 negative vote
      expect(result.timeSeriesData).toHaveLength(1) // All events on same day
      expect(result.recentActivity.recentVotes).toHaveLength(3) // All 3 votes shown
    })
  })
}) 