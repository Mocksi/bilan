import { describe, it, expect, beforeEach } from 'vitest'
import { BasicAnalyticsProcessor } from '../src/analytics/basic-processor.js'
import { BilanDatabase, Event, EVENT_TYPES } from '../src/database/schema.js'
import { createPromptId, createUserId } from '@mocksi/bilan-sdk'

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
      expect(result.conversationStats.successRate).toBe(null)
      expect(result.conversationStats.averageMessages).toBe(null)
      expect(result.conversationStats.completionRate).toBe(null)
      expect(result.journeyStats.totalJourneys).toBe(null)
      expect(result.journeyStats.completionRate).toBe(null)
      expect(result.journeyStats.popularJourneys).toEqual([])
      expect(result.feedbackStats.totalFeedback).toBe(0)
      expect(result.qualitySignals.responseQuality).toBe(0)
      expect(result.qualitySignals.userSatisfaction).toBe(0)
      expect(result.qualitySignals.trustScore).toBe(0)
      expect(result.qualitySignals.responseTime).toBe(null)
      expect(result.timeSeriesData.dailyVotes).toEqual([])
      expect(result.timeSeriesData.weeklyTrends).toEqual([])
      expect(result.recentActivity).toEqual([])
    })

    it('should calculate feedback stats and quality signals accurately', async () => {
      // Add test events using unified Event structure
      const events: Event[] = [
        {
          event_id: 'evt_1',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 1000,
          properties: { promptId: createPromptId('prompt-1'), value: 1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_2',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 2000,
          properties: { promptId: createPromptId('prompt-1'), value: -1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_3',
          user_id: createUserId('user-2'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 3000,
          properties: { promptId: createPromptId('prompt-2'), value: 1 },
          prompt_text: null,
          ai_response: null
        }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.feedbackStats.totalFeedback).toBe(3)
      expect(result.feedbackStats.positiveRate).toBeCloseTo(66.67, 1) // 2/3 * 100
      expect(result.qualitySignals.responseQuality).toBeCloseTo(66.67, 1)
      expect(result.qualitySignals.userSatisfaction).toBeCloseTo(66.67, 1)
      expect(result.qualitySignals.trustScore).toBeGreaterThan(0) // Should have some weighted score
      expect(result.recentActivity).toHaveLength(3)
    })

    it('should calculate journey stats from metadata', async () => {
      const events: Event[] = [
        {
          event_id: 'evt_1',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: 1000,
          properties: { journeyName: 'onboarding', completed: false },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_2',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: 2000,
          properties: { journeyName: 'onboarding', completed: true },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_3',
          user_id: createUserId('user-2'),
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: 3000,
          properties: { journeyName: 'checkout', completed: true },
          prompt_text: null,
          ai_response: null
        }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.journeyStats.totalJourneys).toBe(2)
      expect(result.journeyStats.popularJourneys).toHaveLength(2)
      expect(result.journeyStats.popularJourneys[0].name).toBe('onboarding')
      expect(result.journeyStats.popularJourneys[0].count).toBe(2)
      expect(result.journeyStats.popularJourneys[1].name).toBe('checkout')
      expect(result.journeyStats.popularJourneys[1].count).toBe(1)
    })

    it('should calculate time-series data correctly', async () => {
      const events: Event[] = [
        {
          event_id: 'evt_1',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: new Date('2023-01-01').getTime(),
          properties: { promptId: createPromptId('prompt-1'), value: 1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_2',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: new Date('2023-01-01').getTime(),
          properties: { promptId: createPromptId('prompt-2'), value: -1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_3',
          user_id: createUserId('user-2'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: new Date('2023-01-02').getTime(),
          properties: { promptId: createPromptId('prompt-3'), value: 1 },
          prompt_text: null,
          ai_response: null
        }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.timeSeriesData.dailyVotes).toHaveLength(2)
      expect(result.timeSeriesData.dailyVotes[0].date).toBe('2023-01-01')
      expect(result.timeSeriesData.dailyVotes[0].positive).toBe(1)
      expect(result.timeSeriesData.dailyVotes[0].negative).toBe(1)
      expect(result.timeSeriesData.dailyVotes[1].date).toBe('2023-01-02')
      expect(result.timeSeriesData.dailyVotes[1].positive).toBe(1)
      expect(result.timeSeriesData.dailyVotes[1].negative).toBe(0)
    })

    it('should handle edge cases honestly', async () => {
      const event: Event = {
        event_id: 'evt_1',
        user_id: createUserId('user-1'),
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: 1000,
        properties: { promptId: createPromptId('prompt-1'), value: 1 },
        prompt_text: null,
        ai_response: null
      }
      
      db.insertEvent(event)
      
      const result = await processor.calculateDashboardData()
      
      expect(result.feedbackStats.totalFeedback).toBe(1)
      expect(result.feedbackStats.positiveRate).toBe(100)
      expect(result.feedbackStats.recentTrend).toBe('stable') // < 10 events
      expect(result.qualitySignals.responseQuality).toBe(100)
      expect(result.qualitySignals.userSatisfaction).toBe(100)
      expect(result.timeSeriesData.dailyVotes).toHaveLength(1)
    })

    it('should extract top comments correctly', async () => {
      const events: Event[] = [
        {
          event_id: 'evt_1',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 1000,
          properties: { promptId: createPromptId('prompt-1'), value: 1, comment: 'Great response!' },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_2',
          user_id: createUserId('user-2'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 2000,
          properties: { promptId: createPromptId('prompt-2'), value: -1, comment: 'Could be better' },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_3',
          user_id: createUserId('user-3'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 3000,
          properties: { promptId: createPromptId('prompt-3'), value: 1 },
          prompt_text: null,
          ai_response: null
        }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const result = await processor.calculateDashboardData()
      
      expect(result.feedbackStats.topComments).toHaveLength(2)
      expect(result.feedbackStats.topComments).toContain('Great response!')
      expect(result.feedbackStats.topComments).toContain('Could be better')
      expect(result.feedbackStats.totalFeedback).toBe(3)
      expect(result.feedbackStats.positiveRate).toBeCloseTo(66.67, 1)
    })

    it('should handle performance with enhanced data structure', async () => {
      const events: Event[] = [
        {
          event_id: 'evt_1',
          user_id: createUserId('user-1'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 1000,
          properties: { promptId: createPromptId('prompt-1'), value: 1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_2',
          user_id: createUserId('user-2'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 2000,
          properties: { promptId: createPromptId('prompt-2'), value: -1 },
          prompt_text: null,
          ai_response: null
        },
        {
          event_id: 'evt_3',
          user_id: createUserId('user-3'),
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: 3000,
          properties: { promptId: createPromptId('prompt-3'), value: 1 },
          prompt_text: null,
          ai_response: null
        }
      ]
      
      events.forEach(event => db.insertEvent(event))
      
      const startTime = Date.now()
      const result = await processor.calculateDashboardData()
      const processingTime = Date.now() - startTime
      
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.feedbackStats.totalFeedback).toBe(3)
      expect(result.qualitySignals.responseQuality).toBeCloseTo(66.67, 1)
      expect(result.timeSeriesData.dailyVotes).toHaveLength(1) // All events on same day
      expect(result.recentActivity).toHaveLength(3)
    })
  })
}) 