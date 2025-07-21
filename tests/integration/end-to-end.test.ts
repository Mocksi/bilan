import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanServer } from '../../packages/server/src/server.js'
import { BilanDatabase } from '../../packages/server/src/database/schema.js'

describe('End-to-End System Tests', () => {
  let server: BilanServer
  let db: BilanDatabase
  let serverUrl: string
  let testPort: number

  beforeEach(async () => {
    testPort = Math.floor(Math.random() * 10000) + 40000
    
    db = new BilanDatabase(':memory:')
    
    server = new BilanServer({
      port: testPort,
      dbPath: ':memory:',
      cors: true,
      apiKey: 'test-e2e-key-abc123',
      rateLimitMax: 5000,
      rateLimitTimeWindow: '1 minute'
    })

    await server.start(testPort)
    serverUrl = `http://127.0.0.1:${testPort}`
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
    if (db) {
      db.close()
    }
  })

  describe('Complete User Journey Tracking', () => {
    it('should track a complete AI conversation journey', async () => {
      const userId = 'user-journey-001'
      const conversationId = 'conv-journey-001'
      const baseTimestamp = Date.now()

      // Step 1: Start conversation
      const startEvent = {
        eventId: 'conv-start-001',
        eventType: 'conversation_started',
        timestamp: baseTimestamp,
        userId,
        properties: { conversationId, sessionId: 'sess-001' }
      }

      let response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-e2e-key-abc123'
        },
        body: JSON.stringify(startEvent)
      })

      expect(response.status).toBe(200)

      // Step 2: First AI turn
      const turn1Events = [
        {
          eventId: 'turn-1-start',
          eventType: 'turn_created',
          timestamp: baseTimestamp + 1000,
          userId,
          properties: { conversationId, turnId: 'turn-1' },
          promptText: 'What is machine learning?'
        },
        {
          eventId: 'turn-1-complete',
          eventType: 'turn_completed',
          timestamp: baseTimestamp + 2500,
          userId,
          properties: { conversationId, turnId: 'turn-1', responseTime: 1500 },
          aiResponse: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data...'
        }
      ]

      for (const event of turn1Events) {
        response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })
        expect(response.status).toBe(200)
      }

      // Step 3: User provides feedback
      const voteEvent = {
        eventId: 'vote-turn-1',
        eventType: 'vote_cast',
        timestamp: baseTimestamp + 10000,
        userId,
        properties: {
          promptId: 'turn-1',
          value: 1,
          comment: 'Very clear explanation!',
          conversationId
        }
      }

      response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-e2e-key-abc123'
        },
        body: JSON.stringify(voteEvent)
      })

      expect(response.status).toBe(200)

      // Step 4: Follow-up question
      const turn2Events = [
        {
          eventId: 'turn-2-start',
          eventType: 'turn_created',
          timestamp: baseTimestamp + 15000,
          userId,
          properties: { conversationId, turnId: 'turn-2' },
          promptText: 'Can you give me some examples?'
        },
        {
          eventId: 'turn-2-complete',
          eventType: 'turn_completed',
          timestamp: baseTimestamp + 17000,
          userId,
          properties: { conversationId, turnId: 'turn-2', responseTime: 2000 },
          aiResponse: 'Here are some examples: image recognition, recommendation systems, fraud detection...'
        }
      ]

      for (const event of turn2Events) {
        response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })
        expect(response.status).toBe(200)
      }

      // Step 5: End conversation
      const endEvent = {
        eventId: 'conv-end-001',
        eventType: 'conversation_ended',
        timestamp: baseTimestamp + 25000,
        userId,
        properties: { 
          conversationId, 
          messageCount: 4, // 2 prompts + 2 responses
          totalDuration: 25000,
          satisfactionScore: 85
        }
      }

      response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-e2e-key-abc123'
        },
        body: JSON.stringify(endEvent)
      })

      expect(response.status).toBe(200)

      // Wait for all events to be fully processed
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verification: Check all events were tracked
      const eventsResponse = await fetch(`${serverUrl}/api/events?timeRange=30d&limit=20`)
      const eventsData = await eventsResponse.json()

      expect(eventsData.events.length).toBeGreaterThanOrEqual(6) // 1 start + 2 turn_created + 2 turn_completed + 1 vote + 1 end (may have extra events from other tests)
      
      // Verify conversation flow
      const conversationEvents = eventsData.events
        .filter(e => e.properties.conversationId === conversationId)
        .sort((a, b) => a.timestamp - b.timestamp)

      expect(conversationEvents[0].event_type).toBe('conversation_started')
      expect(conversationEvents[1].event_type).toBe('turn_created')
      expect(conversationEvents[2].event_type).toBe('turn_completed')
      expect(conversationEvents[5].event_type).toBe('conversation_ended')

      // Verification: Check analytics reflect the journey
      const analyticsResponse = await fetch(`${serverUrl}/api/analytics/overview?timeRange=30d`)
      const analyticsData = await analyticsResponse.json()

      expect(analyticsData.totalEvents).toBe(6)
      expect(analyticsData.totalUsers).toBe(1)
      expect(analyticsData.eventTypes.some(et => et.type === 'conversation_started')).toBe(true)
      expect(analyticsData.eventTypes.some(et => et.type === 'turn_completed')).toBe(true)
      expect(analyticsData.eventTypes.some(et => et.type === 'vote_cast')).toBe(true)
    })

    it('should track failed turns and recovery', async () => {
      const userId = 'user-failure-recovery'
      const conversationId = 'conv-failure-001'
      const baseTimestamp = Date.now()

      // Failed turn attempt
      const failureEvents = [
        {
          eventId: 'turn-fail-start',
          eventType: 'turn_created',
          timestamp: baseTimestamp,
          userId,
          properties: { conversationId, turnId: 'turn-fail' },
          promptText: 'Complex query that will fail'
        },
        {
          eventId: 'turn-fail-end',
          eventType: 'turn_failed',
          timestamp: baseTimestamp + 5000,
          userId,
          properties: { 
            conversationId, 
            turnId: 'turn-fail', 
            errorType: 'api_timeout',
            errorMessage: 'Request timeout after 5 seconds'
          }
        },
        // User regenerates request
        {
          eventId: 'regeneration-request',
          eventType: 'regeneration_requested',
          timestamp: baseTimestamp + 8000,
          userId,
          properties: { conversationId, originalTurnId: 'turn-fail' }
        },
        // Successful retry
        {
          eventId: 'turn-retry-start',
          eventType: 'turn_created',
          timestamp: baseTimestamp + 10000,
          userId,
          properties: { conversationId, turnId: 'turn-retry' },
          promptText: 'Simplified version of the query'
        },
        {
          eventId: 'turn-retry-complete',
          eventType: 'turn_completed',
          timestamp: baseTimestamp + 12000,
          userId,
          properties: { conversationId, turnId: 'turn-retry', responseTime: 2000 },
          aiResponse: 'Here is the simplified response...'
        }
      ]

      for (const event of failureEvents) {
        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })
        expect(response.status).toBe(200)
      }

      // Verify turn analytics account for failures
      const turnsResponse = await fetch(`${serverUrl}/api/analytics/turns?timeRange=30d`)
      const turnsData = await turnsResponse.json()

      expect(turnsData.overview.totalTurns).toBe(3) // 1 failed + 2 successful (start + complete)
      expect(turnsData.overview.failedTurns).toBe(1)
      expect(turnsData.overview.completedTurns).toBe(1) // Only the retry completed
      expect(turnsData.overview.successRate).toBe(33.33) // 1 success out of 3 total
    })
  })

  describe('Journey Workflow Tracking', () => {
    it('should track multi-step user journey', async () => {
      const userId = 'user-journey-workflow'
      const journeyId = 'onboarding-journey-001'
      const baseTimestamp = Date.now()

      const journeySteps = [
        {
          eventId: 'journey-step-1',
          eventType: 'journey_step',
          timestamp: baseTimestamp,
          userId,
          properties: { 
            journeyId, 
            journeyName: 'User Onboarding',
            stepName: 'Welcome Screen',
            stepIndex: 1,
            totalSteps: 5,
            isCompleted: true
          }
        },
        {
          eventId: 'journey-step-2',
          eventType: 'journey_step',
          timestamp: baseTimestamp + 5000,
          userId,
          properties: { 
            journeyId, 
            journeyName: 'User Onboarding',
            stepName: 'Profile Setup',
            stepIndex: 2,
            totalSteps: 5,
            isCompleted: true
          }
        },
        // User gets help during step 3
        {
          eventId: 'help-turn-start',
          eventType: 'turn_created',
          timestamp: baseTimestamp + 10000,
          userId,
          properties: { journeyId, stepIndex: 3 },
          promptText: 'How do I configure my preferences?'
        },
        {
          eventId: 'help-turn-complete',
          eventType: 'turn_completed',
          timestamp: baseTimestamp + 12000,
          userId,
          properties: { journeyId, stepIndex: 3, responseTime: 2000 },
          aiResponse: 'To configure your preferences, go to Settings...'
        },
        {
          eventId: 'journey-step-3',
          eventType: 'journey_step',
          timestamp: baseTimestamp + 20000,
          userId,
          properties: { 
            journeyId, 
            journeyName: 'User Onboarding',
            stepName: 'Preference Configuration',
            stepIndex: 3,
            totalSteps: 5,
            isCompleted: true,
            assistanceRequired: true
          }
        },
        // User abandons journey at step 4
        {
          eventId: 'journey-step-4-abandon',
          eventType: 'journey_step',
          timestamp: baseTimestamp + 25000,
          userId,
          properties: { 
            journeyId, 
            journeyName: 'User Onboarding',
            stepName: 'Integration Setup',
            stepIndex: 4,
            totalSteps: 5,
            isCompleted: false,
            abandonedAt: baseTimestamp + 25000,
            timeSpentOnStep: 5000
          }
        }
      ]

      for (const event of journeySteps) {
        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })
        expect(response.status).toBe(200)
      }

      // Verify journey tracking via events API
      const eventsResponse = await fetch(`${serverUrl}/api/events?eventType=journey_step&timeRange=30d`)
      const eventsData = await eventsResponse.json()

      const journeyEvents = eventsData.events
        .filter(e => e.properties.journeyId === journeyId)
        .sort((a, b) => a.properties.stepIndex - b.properties.stepIndex)

      expect(journeyEvents.length).toBe(4) // 4 journey steps
      expect(journeyEvents[0].properties.stepName).toBe('Welcome Screen')
      expect(journeyEvents[0].properties.isCompleted).toBe(true)
      expect(journeyEvents[3].properties.stepName).toBe('Integration Setup')
      expect(journeyEvents[3].properties.isCompleted).toBe(false)

      // Verify related AI assistance was tracked
      const allEvents = await fetch(`${serverUrl}/api/events?timeRange=30d&limit=20`)
      const allEventsData = await allEvents.json()
      
      const aiAssistanceEvents = allEventsData.events.filter(e => 
        e.properties.journeyId === journeyId && 
        (e.event_type === 'turn_created' || e.event_type === 'turn_completed')
      )
      
      expect(aiAssistanceEvents.length).toBe(2) // help request + response
    })
  })

  describe('Vote → Analytics → Dashboard Pipeline', () => {
    it('should reflect votes in analytics immediately', async () => {
      const baseTimestamp = Date.now()
      
      // Create vote events
      const votes = [
        {
          eventId: 'pipeline-vote-1',
          eventType: 'vote_cast',
          timestamp: baseTimestamp,
          userId: 'user-pipeline-1',
          properties: { 
            promptId: 'prompt-pipeline-1', 
            value: 1, 
            comment: 'Great response!' 
          },
          promptText: 'What is AI?',
          aiResponse: 'AI stands for Artificial Intelligence...'
        },
        {
          eventId: 'pipeline-vote-2',
          eventType: 'vote_cast',
          timestamp: baseTimestamp + 1000,
          userId: 'user-pipeline-2',
          properties: { 
            promptId: 'prompt-pipeline-1', 
            value: 1 
          }
        },
        {
          eventId: 'pipeline-vote-3',
          eventType: 'vote_cast',
          timestamp: baseTimestamp + 2000,
          userId: 'user-pipeline-3',
          properties: { 
            promptId: 'prompt-pipeline-2', 
            value: -1, 
            comment: 'Not helpful' 
          }
        }
      ]

      for (const vote of votes) {
        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(vote)
        })
        expect(response.status).toBe(200)
      }

      // Wait for events to be fully processed
      await new Promise(resolve => setTimeout(resolve, 150))

      // Verify analytics immediately reflect the votes
      const analyticsResponse = await fetch(`${serverUrl}/api/analytics/votes?timeRange=30d`)
      const analytics = await analyticsResponse.json()

      expect(analytics.overview.totalVotes).toBe(3)
      expect(analytics.overview.positiveVotes).toBe(2)
      expect(analytics.overview.negativeVotes).toBe(1)
      expect(analytics.overview.positiveRate).toBeCloseTo(66.67, 1) // 2/3 * 100, allow 1 decimal tolerance
      expect(analytics.overview.commentsCount).toBe(2)
      expect(analytics.overview.uniqueUsers).toBe(3)
      expect(analytics.overview.uniquePrompts).toBe(2)

      // Verify prompt-specific analytics
      const prompt1Performance = analytics.promptPerformance.topPrompts.find(
        p => p.promptId === 'prompt-pipeline-1'
      )
      expect(prompt1Performance).toBeDefined()
      expect(prompt1Performance.totalVotes).toBe(2)
      expect(prompt1Performance.positiveVotes).toBe(2)
      expect(prompt1Performance.positiveRate).toBe(100)

      // Verify comments are tracked
      expect(analytics.commentAnalysis.topComments.length).toBe(2)
      expect(analytics.commentAnalysis.topComments.some(c => c.comment === 'Great response!')).toBe(true)
      expect(analytics.commentAnalysis.topComments.some(c => c.comment === 'Not helpful')).toBe(true)
    })

    it('should show vote trends over time', async () => {
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000

      // Create votes spread across multiple days
      const timeBasedVotes = [
        // 3 days ago - mixed feedback
        { eventId: 'trend-1', timestamp: now - (3 * dayMs), value: 1 },
        { eventId: 'trend-2', timestamp: now - (3 * dayMs), value: -1 },
        { eventId: 'trend-3', timestamp: now - (3 * dayMs), value: 1 },
        
        // 2 days ago - mostly positive
        { eventId: 'trend-4', timestamp: now - (2 * dayMs), value: 1 },
        { eventId: 'trend-5', timestamp: now - (2 * dayMs), value: 1 },
        { eventId: 'trend-6', timestamp: now - (2 * dayMs), value: 1 },
        
        // 1 day ago - declining
        { eventId: 'trend-7', timestamp: now - (1 * dayMs), value: -1 },
        { eventId: 'trend-8', timestamp: now - (1 * dayMs), value: -1 },
        
        // Today - recovery
        { eventId: 'trend-9', timestamp: now - 3600000, value: 1 },
        { eventId: 'trend-10', timestamp: now - 1800000, value: 1 }
      ]

      for (const vote of timeBasedVotes) {
        const voteEvent = {
          eventId: vote.eventId,
          eventType: 'vote_cast',
          timestamp: vote.timestamp,
          userId: `user-${vote.eventId}`,
          properties: { 
            promptId: 'trend-prompt', 
            value: vote.value 
          }
        }

        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(voteEvent)
        })
        expect(response.status).toBe(200)
      }

      // Check trends analytics
      const trendsResponse = await fetch(`${serverUrl}/api/analytics/votes?timeRange=7d`)
      const trends = await trendsResponse.json()

      expect(trends.trends.daily).toBeDefined()
      expect(trends.trends.daily.length).toBeGreaterThan(0)

      // Verify trend calculation accuracy
      const dailyTrends = trends.trends.daily.sort((a, b) => a.date.localeCompare(b.date))
      
      // Find the day with mixed feedback (should be ~67% positive)
      const mixedDay = dailyTrends.find(day => day.totalVotes === 3)
      expect(mixedDay).toBeDefined()
      expect(mixedDay.positiveRate).toBeCloseTo(66.67, 1) // 2 positive out of 3, allow 1 decimal tolerance

      // Find the highly positive day (should be 100% positive)
      const positiveDay = dailyTrends.find(day => day.positiveVotes === 3)
      expect(positiveDay).toBeDefined()
      expect(positiveDay.positiveRate).toBe(100)
    })
  })

  describe('System Resilience and Recovery', () => {
    it('should handle mixed success/failure scenarios gracefully', async () => {
      const userId = 'resilience-user'
      const mixedScenarios = [
        // Successful flow
        { eventId: 'success-1', eventType: 'turn_created', success: true },
        { eventId: 'success-2', eventType: 'turn_completed', success: true },
        
        // Failed flow
        { eventId: 'fail-1', eventType: 'turn_created', success: true },
        { eventId: 'fail-2', eventType: 'turn_failed', success: true },
        
        // Malformed event (should be handled gracefully)
        { eventId: 'malformed-1', eventType: 'invalid_type', success: false },
        
        // Recovery after failure
        { eventId: 'recovery-1', eventType: 'turn_created', success: true },
        { eventId: 'recovery-2', eventType: 'turn_completed', success: true }
      ]

      let successCount = 0
      let failureCount = 0

      for (const scenario of mixedScenarios) {
        const event = {
          eventId: scenario.eventId,
          eventType: scenario.eventType,
          timestamp: Date.now(),
          userId,
          properties: { testScenario: true }
        }

        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })

        expect(response.status).toBe(200) // API should always return 200
        const result = await response.json()
        
        if (scenario.success) {
          expect(result.stats.processed).toBe(1)
          successCount++
        } else {
          expect(result.stats.errors).toBe(1)
          failureCount++
        }
      }

      expect(successCount).toBe(6) // 6 valid events
      expect(failureCount).toBe(1) // 1 invalid event

      // Verify system continues to function after errors
      const healthResponse = await fetch(`${serverUrl}/health`)
      expect(healthResponse.status).toBe(200)

      const analyticsResponse = await fetch(`${serverUrl}/api/analytics/overview`)
      expect(analyticsResponse.status).toBe(200)
    })

    it('should maintain data consistency under load', async () => {
      // Simulate high-load scenario with many concurrent users
      const userCount = 10
      const eventsPerUser = 5
      const allEvents: any[] = []

      for (let userId = 0; userId < userCount; userId++) {
        for (let eventIndex = 0; eventIndex < eventsPerUser; eventIndex++) {
          allEvents.push({
            eventId: `load-${userId}-${eventIndex}`,
            eventType: 'user_action',
            timestamp: Date.now() + (userId * 1000) + eventIndex,
            userId: `load-user-${userId}`,
            properties: { 
              action: 'click',
              userId,
              eventIndex,
              loadTest: true
            }
          })
        }
      }

      // Send all events concurrently
      const promises = allEvents.map(event =>
        fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-e2e-key-abc123'
          },
          body: JSON.stringify(event)
        })
      )

      const responses = await Promise.all(promises)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Verify all events were stored correctly
      const verificationResponse = await fetch(`${serverUrl}/api/events?eventType=user_action&limit=100&timeRange=30d`)
      const verification = await verificationResponse.json()
      
      const loadTestEvents = verification.events.filter(e => e.properties.loadTest === true)
      expect(loadTestEvents.length).toBe(userCount * eventsPerUser)

      // Verify unique users
      const uniqueUserIds = new Set(loadTestEvents.map(e => e.user_id))
      expect(uniqueUserIds.size).toBe(userCount)

      // Verify analytics still work correctly after load
      const analyticsResponse = await fetch(`${serverUrl}/api/analytics/overview?timeRange=30d`)
      const analytics = await analyticsResponse.json()
      
      expect(analytics.totalEvents).toBeGreaterThanOrEqual(userCount * eventsPerUser)
      expect(analytics.totalUsers).toBeGreaterThanOrEqual(userCount)
    })
  })
}) 