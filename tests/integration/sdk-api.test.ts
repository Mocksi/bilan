import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanServer } from '../../packages/server/src/server.js'
import { BilanDatabase } from '../../packages/server/src/database/schema.js'

// For now, we'll test without the SDK until we can verify its interface
// import { BilanSDK } from '../../packages/sdk/src/index.js'

describe('SDK → API Integration Tests', () => {
  let server: BilanServer
  let db: BilanDatabase
  let serverUrl: string
  let testPort: number

  beforeEach(async () => {
    // Get random port for testing
    testPort = Math.floor(Math.random() * 10000) + 30000
    
    // Create server instance with test configuration
    server = new BilanServer({
      port: testPort,
      dbPath: ':memory:',
      cors: true,
      apiKey: 'test-api-key-12345',
      rateLimitMax: 1000, // High limit for testing
      rateLimitTimeWindow: '1 minute'
    })

    // Start server
    await server.start(testPort)
    serverUrl = `http://127.0.0.1:${testPort}`

    // Create direct database reference for test validation
    db = new BilanDatabase(':memory:')
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
    if (db) {
      db.close()
    }
  })

  describe('Direct API Integration', () => {
    it('should accept valid turn events via API', async () => {
      const turnEvent = {
        eventId: 'turn-test-123',
        eventType: 'turn_completed',
        timestamp: Date.now(),
        userId: 'user-test-456',
        properties: {
          turnId: 'turn-123',
          conversationId: 'conv-test-123',
          responseTime: 500,
          status: 'success'
        },
        promptText: 'What is artificial intelligence?',
        aiResponse: 'AI is a field of computer science...'
      }

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(turnEvent)
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(1)
      expect(result.stats.errors).toBe(0)
    })

    it('should handle turn failure events', async () => {
      const failureEvent = {
        eventId: 'turn-fail-123',
        eventType: 'turn_failed',
        timestamp: Date.now(),
        userId: 'user-test-456',
        properties: {
          turnId: 'turn-fail-123',
          errorMessage: 'Simulated API failure',
          errorType: 'api_error'
        },
        promptText: 'This will fail'
      }

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(failureEvent)
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(1)
    })
  })

  describe('Event Validation and Deduplication', () => {
    it('should prevent duplicate event IDs', async () => {
      const eventData = {
        eventId: 'duplicate-test-event-123',
        eventType: 'vote_cast',
        timestamp: Date.now(),
        userId: 'user-test-789',
        properties: {
          promptId: 'prompt-123',
          value: 1,
          comment: 'Great response!'
        }
      }

      // Send the same event twice
      const response1 = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(eventData)
      })

      const response2 = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(eventData)
      })

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const result1 = await response1.json()
      const result2 = await response2.json()

      // First should be processed, second should be skipped
      expect(result1.stats.processed).toBe(1)
      expect(result1.stats.skipped).toBe(0)
      
      expect(result2.stats.processed).toBe(0)
      expect(result2.stats.skipped).toBe(1)
    })

    it('should validate required event fields', async () => {
      const invalidEvent = {
        // Missing eventId, eventType, userId
        timestamp: Date.now(),
        properties: { value: 1 }
      }

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(invalidEvent)
      })

      expect(response.status).toBe(200) // Doesn't fail, but reports errors
      const result = await response.json()
      expect(result.stats.processed).toBe(0)
      expect(result.stats.errors).toBe(1)
    })
  })

  describe('Batch Processing', () => {
    it('should handle small batches correctly', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        eventId: `batch-event-${i}`,
        eventType: 'user_action',
        timestamp: Date.now() + i,
        userId: `user-${i}`,
        properties: {
          action: 'click',
          element: `button-${i}`
        }
      }))

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({ events })
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.stats.processed).toBe(10)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(0)
    })

    it('should handle large batches up to 1000 events', async () => {
      const events = Array.from({ length: 1000 }, (_, i) => ({
        eventId: `large-batch-${i}`,
        eventType: 'user_action',
        timestamp: Date.now() + i,
        userId: `user-${i % 100}`, // 100 unique users
        properties: {
          action: 'view',
          page: `page-${i % 10}`
        }
      }))

      const startTime = Date.now()
      
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({ events })
      })

      const processingTime = Date.now() - startTime

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.stats.processed).toBe(1000)
      expect(result.stats.errors).toBe(0)
      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should reject batches over 1000 events', async () => {
      const events = Array.from({ length: 1001 }, (_, i) => ({
        eventId: `oversized-${i}`,
        eventType: 'user_action',
        timestamp: Date.now(),
        userId: 'user-test',
        properties: { action: 'test' }
      }))

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({ events })
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Batch size too large')
    })
  })

  describe('Authentication and Security', () => {
    it('should require valid API key', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        },
        body: JSON.stringify({
          eventId: 'test',
          eventType: 'user_action',
          timestamp: Date.now(),
          userId: 'user',
          properties: {}
        })
      })

      expect(response.status).toBe(401)
      const result = await response.json()
      expect(result.error).toBe('Missing API key')
    })

    it('should reject invalid API key', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key'
        },
        body: JSON.stringify({
          eventId: 'test',
          eventType: 'user_action',
          timestamp: Date.now(),
          userId: 'user',
          properties: {}
        })
      })

      expect(response.status).toBe(401)
      const result = await response.json()
      expect(result.error).toBe('Invalid API key')
    })

    it('should accept valid API key', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({
          eventId: 'test-auth',
          eventType: 'user_action',
          timestamp: Date.now(),
          userId: 'user-auth-test',
          properties: { action: 'test' }
        })
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(1)
    })
  })

  describe('Rate Limiting', () => {
    it('should handle requests within rate limit', async () => {
      const requests = Array.from({ length: 10 }, () =>
        fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345'
          },
          body: JSON.stringify({
            eventId: `rate-test-${Date.now()}-${Math.random()}`,
            eventType: 'user_action',
            timestamp: Date.now(),
            userId: 'rate-test-user',
            properties: { action: 'test' }
          })
        })
      )

      const responses = await Promise.all(requests)
      
      // All should succeed (we set high limit for testing)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Health Check Integration', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${serverUrl}/health`)
      
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.status).toBe('ok')
      expect(result.timestamp).toBeDefined()
    })
  })

  describe('CORS Integration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      })

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toContain('localhost:3000')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })
  })

  describe('Analytics API Integration', () => {
    it('should return vote analytics', async () => {
      // First, add some vote events
      const voteEvents = [
        {
          eventId: 'vote-1',
          eventType: 'vote_cast',
          timestamp: Date.now(),
          userId: 'user-1',
          properties: { promptId: 'prompt-1', value: 1, comment: 'Great!' }
        },
        {
          eventId: 'vote-2',
          eventType: 'vote_cast',
          timestamp: Date.now() + 1000,
          userId: 'user-2',
          properties: { promptId: 'prompt-2', value: -1, comment: 'Not helpful' }
        }
      ]

      // Add events
      for (const event of voteEvents) {
        await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345'
          },
          body: JSON.stringify(event)
        })
      }

      // Test analytics endpoint
      const response = await fetch(`${serverUrl}/api/analytics/votes?timeRange=30d`)
      expect(response.status).toBe(200)
      
      const analytics = await response.json()
      expect(analytics.overview).toBeDefined()
      expect(analytics.overview.totalVotes).toBe(2)
      expect(analytics.overview.positiveVotes).toBe(1)
      expect(analytics.overview.negativeVotes).toBe(1)
      expect(analytics.overview.positiveRate).toBe(50)
    })

    it('should return turn analytics', async () => {
      // Add turn events
      const turnEvents = [
        {
          eventId: 'turn-1-start',
          eventType: 'turn_created',
          timestamp: Date.now(),
          userId: 'user-1',
          properties: { turnId: 'turn-1' },
          promptText: 'Test prompt'
        },
        {
          eventId: 'turn-1-complete',
          eventType: 'turn_completed',
          timestamp: Date.now() + 500,
          userId: 'user-1',
          properties: { turnId: 'turn-1', responseTime: 500 },
          aiResponse: 'Test response'
        }
      ]

      for (const event of turnEvents) {
        await fetch(`${serverUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345'
          },
          body: JSON.stringify(event)
        })
      }

      const response = await fetch(`${serverUrl}/api/analytics/turns?timeRange=30d`)
      expect(response.status).toBe(200)
      
      const analytics = await response.json()
      expect(analytics.overview).toBeDefined()
      expect(analytics.overview.totalTurns).toBeGreaterThan(0)
    })

    it('should return overview analytics', async () => {
      const response = await fetch(`${serverUrl}/api/analytics/overview?timeRange=30d`)
      expect(response.status).toBe(200)
      
      const overview = await response.json()
      expect(overview.totalEvents).toBeDefined()
      expect(overview.totalUsers).toBeDefined()
      expect(overview.eventTypes).toBeDefined()
      expect(Array.isArray(overview.eventTypes)).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: '{"invalid": json}'
      })

      // Should return 400 for malformed JSON
      expect(response.status).toBe(400)
    })

    it('should handle empty batch requests', async () => {
      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({ events: [] })
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.stats.processed).toBe(0)
      expect(result.stats.errors).toBe(0)
    })

    it('should handle events with extra properties gracefully', async () => {
      const eventWithExtraProps = {
        eventId: 'extra-props-test',
        eventType: 'user_action',
        timestamp: Date.now(),
        userId: 'user-extra-test',
        properties: {
          action: 'click',
          extraProp1: 'should be preserved',
          extraProp2: { nested: 'object', should: 'work' },
          extraProp3: [1, 2, 3, 'array', 'should', 'work']
        },
        // Extra root level properties
        extraRoot: 'should be ignored safely',
        anotherExtra: 123
      }

      const response = await fetch(`${serverUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify(eventWithExtraProps)
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.stats.processed).toBe(1)
      expect(result.stats.errors).toBe(0)

      // Verify the event was stored with extra properties preserved
      const eventsResponse = await fetch(`${serverUrl}/api/events?eventType=user_action&limit=5`)
      const events = await eventsResponse.json()
      
      const storedEvent = events.events.find(e => e.event_id === 'extra-props-test')
      expect(storedEvent).toBeDefined()
      expect(storedEvent.properties.extraProp1).toBe('should be preserved')
      expect(storedEvent.properties.extraProp2.nested).toBe('object')
      expect(storedEvent.properties.extraProp3).toEqual([1, 2, 3, 'array', 'should', 'work'])
    })
  })
}) 