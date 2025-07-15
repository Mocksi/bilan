import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BasicAnalyticsProcessor } from '../src/analytics/basic-processor.js'
import { BilanDatabase } from '../src/database/schema.js'
import { VoteEvent, createPromptId, createUserId } from '@mocksi/bilan-sdk'
import { unlink } from 'fs/promises'

describe('BasicAnalyticsProcessor', () => {
  let processor: BasicAnalyticsProcessor
  let db: BilanDatabase
  const testDbPath = './test-analytics.db'

  beforeEach(() => {
    db = new BilanDatabase(testDbPath)
    processor = new BasicAnalyticsProcessor(db)
  })

  afterEach(async () => {
    db.close()
    try {
      await unlink(testDbPath)
    } catch (error) {
      // File might not exist, ignore
    }
  })

  describe('calculateDashboardData', () => {
    it('should return empty stats for no events', async () => {
      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(0)
      expect(result.journeyStats.totalJourneys).toBe(0)
      expect(result.feedbackStats.totalFeedback).toBe(0)
      expect(result.recentActivity.totalEvents).toBe(0)
    })

    it('should calculate conversation success rates correctly', async () => {
      // Insert test events
      const events: VoteEvent[] = [
        {
          promptId: createPromptId('prompt-1'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 3000,
          comment: 'Great!'
        },
        {
          promptId: createPromptId('prompt-1'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 2000,
          comment: 'Perfect!'
        },
        {
          promptId: createPromptId('prompt-2'),
          userId: createUserId('user-1'),
          value: -1,
          timestamp: Date.now() - 1000,
          comment: 'Not helpful'
        }
      ]

      events.forEach(event => db.insertEvent(event))

      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(2)
      expect(result.conversationStats.successRate).toBe(0.5) // 1 out of 2 conversations positive
      expect(result.conversationStats.averageMessages).toBe(1.5) // (2 + 1) / 2
      expect(result.feedbackStats.totalFeedback).toBe(3)
      expect(result.feedbackStats.positiveRate).toBe(2/3) // 2 positive out of 3 total
    })

    it('should calculate journey completion rates', async () => {
      // Insert events with journey metadata
      const events: VoteEvent[] = [
        {
          promptId: createPromptId('prompt-1'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 3000,
          metadata: { journeyName: 'email-agent' }
        },
        {
          promptId: createPromptId('prompt-2'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 2000,
          metadata: { journeyName: 'email-agent' }
        },
        {
          promptId: createPromptId('prompt-3'),
          userId: createUserId('user-1'),
          value: -1,
          timestamp: Date.now() - 1000,
          metadata: { journeyName: 'code-assistant' }
        }
      ]

      events.forEach(event => db.insertEvent(event))

      const result = await processor.calculateDashboardData()
      
      expect(result.journeyStats.totalJourneys).toBe(2)
      expect(result.journeyStats.completionRate).toBe(0.5) // 1 out of 2 journeys completed (>1 event)
      expect(result.journeyStats.popularJourneys).toHaveLength(2)
      expect(result.journeyStats.popularJourneys[0].name).toBe('email-agent')
      expect(result.journeyStats.popularJourneys[0].count).toBe(2)
    })

    it('should handle edge cases', async () => {
      // Test with minimal data
      const event: VoteEvent = {
        promptId: createPromptId('prompt-1'),
        userId: createUserId('user-1'),
        value: 1,
        timestamp: Date.now()
      }

      db.insertEvent(event)

      const result = await processor.calculateDashboardData()
      
      expect(result.conversationStats.totalConversations).toBe(1)
      expect(result.conversationStats.successRate).toBe(1)
      expect(result.feedbackStats.recentTrend).toBe('stable') // < 10 events
    })

    it('should extract top comments correctly', async () => {
      const events: VoteEvent[] = [
        {
          promptId: createPromptId('prompt-1'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 3000,
          comment: 'Great response!'
        },
        {
          promptId: createPromptId('prompt-2'),
          userId: createUserId('user-1'),
          value: -1,
          timestamp: Date.now() - 2000,
          comment: 'Not helpful'
        },
        {
          promptId: createPromptId('prompt-3'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 1000,
          comment: 'Perfect!'
        }
      ]

      events.forEach(event => db.insertEvent(event))

      const result = await processor.calculateDashboardData()
      
      expect(result.feedbackStats.topComments).toHaveLength(3)
      expect(result.feedbackStats.topComments).toContain('Great response!')
      expect(result.feedbackStats.topComments).toContain('Not helpful')
      expect(result.feedbackStats.topComments).toContain('Perfect!')
    })

    it('should handle performance with sample data', async () => {
      // Insert sample events for performance test
      const events: VoteEvent[] = [
        {
          promptId: createPromptId('prompt-1'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 5000,
          metadata: { journeyName: 'journey-1' }
        },
        {
          promptId: createPromptId('prompt-2'),
          userId: createUserId('user-2'),
          value: -1,
          timestamp: Date.now() - 4000,
          metadata: { journeyName: 'journey-1' }
        },
        {
          promptId: createPromptId('prompt-3'),
          userId: createUserId('user-1'),
          value: 1,
          timestamp: Date.now() - 3000,
          metadata: { journeyName: 'journey-2' }
        }
      ]

      events.forEach(event => db.insertEvent(event))

      const startTime = Date.now()
      const result = await processor.calculateDashboardData()
      const processingTime = Date.now() - startTime

      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.conversationStats.totalConversations).toBe(3)
      expect(result.journeyStats.totalJourneys).toBe(2)
      expect(result.feedbackStats.totalFeedback).toBe(3)
    })
  })
}) 