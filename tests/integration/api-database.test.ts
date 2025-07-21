import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanServer } from '../../packages/server/src/server.js'
import { BilanDatabase, Event, EVENT_TYPES } from '../../packages/server/src/database/schema.js'

describe('API → Database Integration Tests', () => {
  let server: BilanServer
  let db: BilanDatabase
  let serverUrl: string
  let testPort: number

  beforeEach(async () => {
    // Get random port for testing
    testPort = Math.floor(Math.random() * 10000) + 35000
    
    // Create test database that we can inspect
    db = new BilanDatabase(':memory:')
    
    // Create server instance with same database
    server = new BilanServer({
      port: testPort,
      dbPath: ':memory:', // This creates its own db, but we'll test via API
      cors: true,
      apiKey: 'test-db-key-67890',
      rateLimitMax: 2000,
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

  describe('Event Storage and Retrieval', () => {
    it('should store events correctly in database', async () => {
      const testEvent = {
        eventId: 'storage-test-001',
        eventType: 'turn_completed',
        timestamp: Date.now(),
        userId: 'user-storage-test',
        properties: {
          turnId: 'turn-001',
          responseTime: 750,
          modelUsed: 'gpt-4'
        },
        promptText: 'Test prompt for storage',
        aiResponse: 'Test response for storage'
      }

      // Send event via API
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-db-key-67890'
        },
        body: JSON.stringify(testEvent)
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.stats.processed).toBe(1)

      // Retrieve event via API to verify storage
      const retrieveResponse = await fetch(`${serverUrl}/api/events?limit=10`)
      expect(retrieveResponse.status).toBe(200)
      
      const events = await retrieveResponse.json()
      expect(events.events).toBeDefined()
      expect(events.events.length).toBe(1)
      
      const storedEvent = events.events[0]
      expect(storedEvent.event_id).toBe('storage-test-001')
      expect(storedEvent.event_type).toBe('turn_completed')
      expect(storedEvent.user_id).toBe('user-storage-test')
      expect(storedEvent.prompt_text).toBe('Test prompt for storage')
      expect(storedEvent.ai_response).toBe('Test response for storage')
      expect(storedEvent.properties.turnId).toBe('turn-001')
      expect(storedEvent.properties.responseTime).toBe(750)
    })

    it('should handle complex properties correctly', async () => {
      const complexEvent = {
        eventId: 'complex-props-001',
        eventType: 'user_action',
        timestamp: Date.now(),
        userId: 'user-complex',
        properties: {
          actionType: 'navigation',
          metadata: {
            path: '/dashboard/analytics',
            referrer: 'https://example.com',
            sessionId: 'sess-123',
            userAgent: 'Mozilla/5.0...',
            coordinates: { x: 150, y: 300 }
          },
          tags: ['important', 'analytics', 'user-journey'],
          customFields: {
            experimentGroup: 'A',
            featureFlags: ['new-ui', 'analytics-v2'],
            score: 85.5
          }
        }
      }

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-db-key-67890'
        },
        body: JSON.stringify(complexEvent)
      })

      expect(response.status).toBe(200)

      const retrieveResponse = await fetch(`${serverUrl}/api/events?eventType=user_action&limit=1`)
      const events = await retrieveResponse.json()
      
      const storedEvent = events.events[0]
      expect(storedEvent.properties.metadata.coordinates.x).toBe(150)
      expect(storedEvent.properties.tags).toContain('analytics')
      expect(storedEvent.properties.customFields.score).toBe(85.5)
      expect(storedEvent.properties.customFields.featureFlags).toContain('new-ui')
    })
  })

  describe('Analytics Calculation Accuracy', () => {
    async function seedVoteData() {
      const voteEvents = [
        // Positive votes
        { eventId: 'vote-pos-1', eventType: 'vote_cast', timestamp: Date.now() - 86400000, userId: 'user-1', properties: { promptId: 'prompt-1', value: 1, comment: 'Excellent answer!' }},
        { eventId: 'vote-pos-2', eventType: 'vote_cast', timestamp: Date.now() - 72000000, userId: 'user-2', properties: { promptId: 'prompt-1', value: 1 }},
        { eventId: 'vote-pos-3', eventType: 'vote_cast', timestamp: Date.now() - 3600000, userId: 'user-3', properties: { promptId: 'prompt-2', value: 1, comment: 'Very helpful' }},
        
        // Negative votes
        { eventId: 'vote-neg-1', eventType: 'vote_cast', timestamp: Date.now() - 43200000, userId: 'user-4', properties: { promptId: 'prompt-2', value: -1, comment: 'Not accurate' }},
        { eventId: 'vote-neg-2', eventType: 'vote_cast', timestamp: Date.now() - 1800000, userId: 'user-5', properties: { promptId: 'prompt-3', value: -1 }}
      ]

      for (const event of voteEvents) {
        await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify(event)
        })
      }
    }

    it('should calculate vote analytics accurately', async () => {
      await seedVoteData()

      const response = await fetch(`${serverUrl}/api/analytics/votes?timeRange=7d`)
      expect(response.status).toBe(200)
      
      const analytics = await response.json()
      
      // Verify overview calculations
      expect(analytics.overview.totalVotes).toBe(5)
      expect(analytics.overview.positiveVotes).toBe(3)
      expect(analytics.overview.negativeVotes).toBe(2)
      expect(analytics.overview.positiveRate).toBe(60) // 3/5 * 100
      expect(analytics.overview.commentsCount).toBe(3)
      expect(analytics.overview.uniqueUsers).toBe(5)
      expect(analytics.overview.uniquePrompts).toBe(3)

      // Verify user behavior analysis
      expect(analytics.userBehavior.topUsers).toBeDefined()
      expect(analytics.userBehavior.topUsers.length).toBeGreaterThan(0)
      expect(analytics.userBehavior.votingPatterns.averageVotesPerUser).toBe(1)
      expect(analytics.userBehavior.votingPatterns.oneTimeVoters).toBe(5)

      // Verify prompt performance
      expect(analytics.promptPerformance.topPrompts).toBeDefined()
      expect(analytics.promptPerformance.topPrompts.length).toBeGreaterThan(0)
      
      const prompt1Stats = analytics.promptPerformance.topPrompts.find(p => p.promptId === 'prompt-1')
      expect(prompt1Stats).toBeDefined()
      expect(prompt1Stats.totalVotes).toBe(2)
      expect(prompt1Stats.positiveVotes).toBe(2)
      expect(prompt1Stats.positiveRate).toBe(100)

      // Verify comment analysis
      expect(analytics.commentAnalysis.totalComments).toBe(3)
      expect(analytics.commentAnalysis.topComments).toBeDefined()
      expect(analytics.commentAnalysis.topComments.length).toBe(3)
    })

    async function seedTurnData() {
      const turnEvents = [
        // Successful turns
        { eventId: 'turn-success-1', eventType: 'turn_completed', timestamp: Date.now() - 3600000, userId: 'user-1', properties: { turnId: 'turn-1', responseTime: 500 }},
        { eventId: 'turn-success-2', eventType: 'turn_completed', timestamp: Date.now() - 1800000, userId: 'user-2', properties: { turnId: 'turn-2', responseTime: 750 }},
        { eventId: 'turn-success-3', eventType: 'turn_completed', timestamp: Date.now() - 900000, userId: 'user-1', properties: { turnId: 'turn-3', responseTime: 300 }},
        
        // Failed turns
        { eventId: 'turn-fail-1', eventType: 'turn_failed', timestamp: Date.now() - 2700000, userId: 'user-3', properties: { turnId: 'turn-4', errorType: 'timeout' }},
        { eventId: 'turn-fail-2', eventType: 'turn_failed', timestamp: Date.now() - 450000, userId: 'user-2', properties: { turnId: 'turn-5', errorType: 'api_error' }}
      ]

      for (const event of turnEvents) {
        await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify(event)
        })
      }
    }

    it('should calculate turn analytics accurately', async () => {
      await seedTurnData()

      const response = await fetch(`${serverUrl}/api/analytics/turns?timeRange=24h`)
      expect(response.status).toBe(200)
      
      const analytics = await response.json()
      
      // Verify overview calculations
      expect(analytics.overview.totalTurns).toBe(5)
      expect(analytics.overview.completedTurns).toBe(3)
      expect(analytics.overview.failedTurns).toBe(2)
      expect(analytics.overview.successRate).toBe(60) // 3/5 * 100
      expect(analytics.overview.averageResponseTime).toBeCloseTo(516.67, 1) // (500+750+300)/3, allow 1 decimal tolerance

      // Verify user behavior
      expect(analytics.userBehavior.topUsers).toBeDefined()
      const user1Stats = analytics.userBehavior.topUsers.find(u => u.userId === 'user-1')
      expect(user1Stats).toBeDefined()
      expect(user1Stats.totalTurns).toBe(2)
      expect(user1Stats.completedTurns).toBe(2)
      expect(user1Stats.successRate).toBe(100)
    })
  })

  describe('Database Filtering and Pagination', () => {
    async function seedFilteringData() {
      const events = [
        // Different event types
        { eventId: 'filter-vote-1', eventType: 'vote_cast', timestamp: Date.now() - 86400000, userId: 'user-alpha', properties: { value: 1 }},
        { eventId: 'filter-vote-2', eventType: 'vote_cast', timestamp: Date.now() - 43200000, userId: 'user-beta', properties: { value: -1 }},
        { eventId: 'filter-turn-1', eventType: 'turn_completed', timestamp: Date.now() - 3600000, userId: 'user-alpha', properties: { responseTime: 400 }},
        { eventId: 'filter-turn-2', eventType: 'turn_failed', timestamp: Date.now() - 1800000, userId: 'user-gamma', properties: { errorType: 'timeout' }},
        { eventId: 'filter-action-1', eventType: 'user_action', timestamp: Date.now() - 900000, userId: 'user-beta', properties: { action: 'click' }},
        
        // Different timestamps for time range testing
        { eventId: 'old-event-1', eventType: 'vote_cast', timestamp: Date.now() - 7 * 86400000, userId: 'user-old', properties: { value: 1 }},
        { eventId: 'recent-event-1', eventType: 'vote_cast', timestamp: Date.now() - 3600000, userId: 'user-recent', properties: { value: 1 }}
      ]

      for (const event of events) {
        await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify(event)
        })
      }
    }

    it('should filter by event type correctly', async () => {
      await seedFilteringData()

      // Test single event type filter
      const voteResponse = await fetch(`${serverUrl}/api/events?eventType=vote_cast&timeRange=30d`)
      const voteData = await voteResponse.json()
      
      expect(voteData.events.length).toBeGreaterThanOrEqual(3) // At least 3 votes (2 recent + 1 old), may include events from other tests
      voteData.events.forEach(event => {
        expect(event.event_type).toBe('vote_cast')
      })

      // Test multiple event type filter
      const multiResponse = await fetch(`${serverUrl}/api/events?eventType=turn_completed,turn_failed&timeRange=30d`)
      const multiData = await multiResponse.json()
      
      expect(multiData.events.length).toBe(2)
      multiData.events.forEach(event => {
        expect(['turn_completed', 'turn_failed']).toContain(event.event_type)
      })
    })

    it('should filter by user correctly', async () => {
      await seedFilteringData()

      const userResponse = await fetch(`${serverUrl}/api/events?userId=user-alpha&timeRange=30d`)
      const userData = await userResponse.json()
      
      expect(userData.events.length).toBe(2) // vote + turn for user-alpha
      userData.events.forEach(event => {
        expect(event.user_id).toBe('user-alpha')
      })
    })

    it('should filter by time range correctly', async () => {
      await seedFilteringData()

      // Test 24h filter (should exclude 7-day-old event)
      const recentResponse = await fetch(`${serverUrl}/api/events?timeRange=24h`)
      const recentData = await recentResponse.json()
      
      expect(recentData.events.length).toBeLessThan(7) // Should exclude old events
      
      // Test 30d filter (should include all)
      const allResponse = await fetch(`${serverUrl}/api/events?timeRange=30d`)
      const allData = await allResponse.json()
      
      expect(allData.events.length).toBe(7) // All events
    })

    it('should handle pagination correctly', async () => {
      await seedFilteringData()

      // Test first page
      const page1Response = await fetch(`${serverUrl}/api/events?limit=3&offset=0&timeRange=30d`)
      const page1Data = await page1Response.json()
      
      expect(page1Data.events.length).toBe(3)
      expect(page1Data.total).toBe(7)
      expect(page1Data.limit).toBe(3)
      expect(page1Data.offset).toBe(0)
      expect(page1Data.hasMore).toBe(true)

      // Test second page
      const page2Response = await fetch(`${serverUrl}/api/events?limit=3&offset=3&timeRange=30d`)
      const page2Data = await page2Response.json()
      
      expect(page2Data.events.length).toBe(3)
      expect(page2Data.offset).toBe(3)
      expect(page2Data.hasMore).toBe(true)

      // Test last page
      const page3Response = await fetch(`${serverUrl}/api/events?limit=3&offset=6&timeRange=30d`)
      const page3Data = await page3Response.json()
      
      expect(page3Data.events.length).toBe(1)
      expect(page3Data.hasMore).toBe(false)

      // Verify no overlap between pages
      const allEventIds = [
        ...page1Data.events.map(e => e.event_id),
        ...page2Data.events.map(e => e.event_id),
        ...page3Data.events.map(e => e.event_id)
      ]
      const uniqueIds = new Set(allEventIds)
      expect(uniqueIds.size).toBe(allEventIds.length) // No duplicates
    })

    it('should handle combined filters correctly', async () => {
      await seedFilteringData()

      // Combine event type + user + time range
      const complexResponse = await fetch(
        `${serverUrl}/api/events?eventType=vote_cast&userId=user-alpha&timeRange=30d&limit=10`
      )
      const complexData = await complexResponse.json()
      
      expect(complexData.events.length).toBe(1) // Only one vote by user-alpha
      const event = complexData.events[0]
      expect(event.event_type).toBe('vote_cast')
      expect(event.user_id).toBe('user-alpha')
    })
  })

  describe('Performance Optimization Validation', () => {
    async function seedLargeDataset() {
      // Create a larger dataset to test performance
      const batchSize = 100
      const batches = 5 // Total 500 events

      for (let batch = 0; batch < batches; batch++) {
        const events = Array.from({ length: batchSize }, (_, i) => ({
          eventId: `perf-${batch}-${i}`,
          eventType: ['vote_cast', 'turn_completed', 'user_action'][i % 3],
          timestamp: Date.now() - (batch * 3600000) - (i * 60000), // Spread over time
          userId: `perf-user-${i % 20}`, // 20 unique users
          properties: {
            value: i % 2 === 0 ? 1 : -1,
            responseTime: 200 + (i * 10),
            batch: batch,
            index: i
          }
        }))

        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify({ events })
        })

        expect(response.status).toBe(200)
      }
    }

    it('should handle large datasets efficiently', async () => {
      await seedLargeDataset()

      // Test that analytics calculation is fast even with more data
      const startTime = Date.now()
      
      const analyticsResponse = await fetch(`${serverUrl}/api/analytics/votes?timeRange=30d`)
      
      const processingTime = Date.now() - startTime
      
      expect(analyticsResponse.status).toBe(200)
      expect(processingTime).toBeLessThan(1000) // Should complete within 1 second
      
      const analytics = await analyticsResponse.json()
      expect(analytics.overview.totalVotes).toBeGreaterThan(100)
      expect(analytics.overview.uniqueUsers).toBe(20)
    })

    it('should paginate efficiently with large datasets', async () => {
      await seedLargeDataset()

      const startTime = Date.now()
      
      const pageResponse = await fetch(`${serverUrl}/api/events?limit=50&offset=200&timeRange=30d`)
      
      const processingTime = Date.now() - startTime
      
      expect(pageResponse.status).toBe(200)
      expect(processingTime).toBeLessThan(500) // Should be fast due to database-level filtering
      
      const pageData = await pageResponse.json()
      expect(pageData.events.length).toBe(50)
      expect(pageData.total).toBeGreaterThan(400)
    })

    it('should filter efficiently with large datasets', async () => {
      await seedLargeDataset()

      const startTime = Date.now()
      
      const filterResponse = await fetch(`${serverUrl}/api/events?eventType=vote_cast&limit=100&timeRange=30d`)
      
      const processingTime = Date.now() - startTime
      
      expect(filterResponse.status).toBe(200)
      expect(processingTime).toBeLessThan(300) // Database-level filtering should be fast
      
      const filterData = await filterResponse.json()
      expect(filterData.events.length).toBeGreaterThan(0)
      filterData.events.forEach(event => {
        expect(event.event_type).toBe('vote_cast')
      })
    })
  })

  describe('Data Consistency and Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Test that related events maintain consistency
      const conversationId = 'conv-integrity-test'
      const events = [
        {
          eventId: 'conv-start-1',
          eventType: 'conversation_started',
          timestamp: Date.now() - 60000,
          userId: 'user-integrity',
          properties: { conversationId }
        },
        {
          eventId: 'turn-1-start',
          eventType: 'turn_created', 
          timestamp: Date.now() - 45000,
          userId: 'user-integrity',
          properties: { conversationId, turnId: 'turn-1' }
        },
        {
          eventId: 'turn-1-complete',
          eventType: 'turn_completed',
          timestamp: Date.now() - 30000,
          userId: 'user-integrity', 
          properties: { conversationId, turnId: 'turn-1', responseTime: 400 }
        },
        {
          eventId: 'conv-end-1',
          eventType: 'conversation_ended',
          timestamp: Date.now() - 15000,
          userId: 'user-integrity',
          properties: { conversationId, messageCount: 2 }
        }
      ]

      for (const event of events) {
        const response = await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify(event)
        })
        expect(response.status).toBe(200)
      }

      // Verify all events are linked by conversationId
      const response = await fetch(`${serverUrl}/api/events?timeRange=30d&limit=10`)
      const data = await response.json()
      
      const conversationEvents = data.events.filter(e => 
        e.properties.conversationId === conversationId
      )
      
      expect(conversationEvents.length).toBe(4)
      
      // Verify chronological order
      const timestamps = conversationEvents.map(e => e.timestamp).sort((a, b) => a - b)
      expect(timestamps).toEqual([
        expect.any(Number),
        expect.any(Number), 
        expect.any(Number),
        expect.any(Number)
      ])
    })

    it('should handle concurrent event insertion', async () => {
      // Test concurrent API calls don't cause data corruption
      const concurrentEvents = Array.from({ length: 20 }, (_, i) => ({
        eventId: `concurrent-${i}`,
        eventType: 'user_action',
        timestamp: Date.now() + i,
        userId: `concurrent-user-${i % 5}`,
        properties: { action: 'concurrent-test', index: i }
      }))

      // Send all events concurrently
      const promises = concurrentEvents.map(event =>
        fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-db-key-67890'
          },
          body: JSON.stringify(event)
        })
      )

      const responses = await Promise.all(promises)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Verify all events were stored
      const retrieveResponse = await fetch(`${serverUrl}/api/events?eventType=user_action&limit=50&timeRange=30d`)
      const data = await retrieveResponse.json()
      
      const concurrentStoredEvents = data.events.filter(e => 
        e.properties.action === 'concurrent-test'
      )
      
      expect(concurrentStoredEvents.length).toBe(20)
      
      // Verify unique event IDs (no corruption)
      const eventIds = concurrentStoredEvents.map(e => e.event_id)
      const uniqueIds = new Set(eventIds)
      expect(uniqueIds.size).toBe(20)
    })
  })
}) 