import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanDatabase, Event, EVENT_TYPES } from '../../src/database/schema.js'
import fs from 'fs'
import path from 'path'

/**
 * Comprehensive tests for v0.4.1 database migrations and enhancements
 */
describe('v0.4.1 Database Migrations', () => {
  let db: BilanDatabase
  const testDbPath = './test-v041-migrations.db'

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    db = new BilanDatabase(testDbPath)
  })

  afterEach(() => {
    db.close()
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Flexible Relationship Fields', () => {
    it('should support inserting events with relationship fields', () => {
      const event: Event = {
        event_id: 'test_event_001',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { model: 'gpt-4', responseTime: 1500 },
        journey_id: 'email-workflow',
        conversation_id: 'conv_abc123',
        turn_sequence: 2
      }

      expect(() => db.insertEvent(event)).not.toThrow()

      const events = db.getEvents({ eventType: EVENT_TYPES.TURN_COMPLETED })
      expect(events).toHaveLength(1)
      expect(events[0].journey_id).toBe('email-workflow')
      expect(events[0].conversation_id).toBe('conv_abc123')
      expect(events[0].turn_sequence).toBe(2)
    })

    it('should support inserting events without relationship fields', () => {
      const event: Event = {
        event_id: 'test_event_002',
        user_id: 'user_456',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now(),
        properties: { turn_id: 'turn_xyz', value: 1 }
      }

      expect(() => db.insertEvent(event)).not.toThrow()

      const events = db.getEvents({ eventType: EVENT_TYPES.VOTE_CAST })
      expect(events).toHaveLength(1)
      expect(events[0].journey_id).toBeNull()
      expect(events[0].conversation_id).toBeNull()
      expect(events[0].turn_sequence).toBeNull()
    })

    it('should support batch inserts with mixed relationship data', () => {
      const events: Event[] = [
        {
          event_id: 'batch_001',
          user_id: 'user_1',
          event_type: EVENT_TYPES.TURN_CREATED,
          timestamp: Date.now(),
          properties: { prompt: 'test' },
          journey_id: 'journey_1'
        },
        {
          event_id: 'batch_002',
          user_id: 'user_2',
          event_type: EVENT_TYPES.CONVERSATION_STARTED,
          timestamp: Date.now(),
          properties: {},
          conversation_id: 'conv_1'
        },
        {
          event_id: 'batch_003',
          user_id: 'user_3',
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: Date.now(),
          properties: { step: 'review' },
          journey_id: 'journey_2',
          conversation_id: 'conv_2',
          turn_sequence: 3
        }
      ]

      expect(() => db.insertEvents(events)).not.toThrow()

      const allEvents = db.getEvents({ limit: 10 })
      expect(allEvents).toHaveLength(3)
      
      const journeyEvent = allEvents.find(e => e.event_id === 'batch_001')
      expect(journeyEvent?.journey_id).toBe('journey_1')
      expect(journeyEvent?.conversation_id).toBeNull()
      
      const convEvent = allEvents.find(e => e.event_id === 'batch_002')
      expect(convEvent?.conversation_id).toBe('conv_1')
      expect(convEvent?.journey_id).toBeNull()
      
      const complexEvent = allEvents.find(e => e.event_id === 'batch_003')
      expect(complexEvent?.journey_id).toBe('journey_2')
      expect(complexEvent?.conversation_id).toBe('conv_2')
      expect(complexEvent?.turn_sequence).toBe(3)
    })
  })

  describe('Turn ID Migration Validation', () => {
    it('should detect successful turn_id migration', () => {
      // Insert vote events with turn_id (migrated format)
      const migratedVote: Event = {
        event_id: 'vote_migrated',
        user_id: 'user_123',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now(),
        properties: { turn_id: 'turn_abc123', value: 1, comment: 'Good' }
      }
      
      db.insertEvent(migratedVote)

      const validation = db.validateTurnIdMigration()
      
      expect(validation.success).toBe(true)
      expect(validation.details.totalVotes).toBe(1)
      expect(validation.details.votesWithTurnId).toBe(1)
      expect(validation.details.votesWithPromptIdRemaining).toBe(0)
      expect(validation.details.migrationComplete).toBe(true)
    })

    it('should detect incomplete migration with remaining promptId', () => {
      // Insert vote with old promptId format using raw SQL to bypass validation
      db.executeRaw(`
        INSERT INTO events (event_id, user_id, event_type, timestamp, properties)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'vote_unmigrated',
        'user_123', 
        EVENT_TYPES.VOTE_CAST,
        Date.now(),
        JSON.stringify({ promptId: 'old_prompt_123', value: 1 })
      ])

      const validation = db.validateTurnIdMigration()
      
      expect(validation.success).toBe(false)
      expect(validation.details.totalVotes).toBe(1)
      expect(validation.details.votesWithTurnId).toBe(0)
      expect(validation.details.votesWithPromptIdRemaining).toBe(1)
      expect(validation.details.migrationComplete).toBe(false)
    })

    it('should handle empty database gracefully', () => {
      const validation = db.validateTurnIdMigration()
      
      expect(validation.success).toBe(false) // No votes = failed state
      expect(validation.details.totalVotes).toBe(0)
      expect(validation.details.votesWithTurnId).toBe(0)
      expect(validation.details.votesWithPromptIdRemaining).toBe(0)
    })
  })

  describe('Relationship Data Capture Validation', () => {
    it('should calculate relationship capture rates correctly', () => {
      const now = Date.now()
      
      // Insert events with different relationship patterns
      const events: Event[] = [
        {
          event_id: 'rel_001',
          user_id: 'user_1',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: now - (1000 * 60 * 10), // 10 minutes ago
          properties: {},
          journey_id: 'journey_1'
        },
        {
          event_id: 'rel_002',
          user_id: 'user_2',
          event_type: EVENT_TYPES.CONVERSATION_STARTED,
          timestamp: now - (1000 * 60 * 5), // 5 minutes ago
          properties: {},
          conversation_id: 'conv_1'
        },
        {
          event_id: 'rel_003',
          user_id: 'user_3',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: now,
          properties: { turn_id: 'turn_123', value: 1 }
          // No relationship fields
        }
      ]
      
      db.insertEvents(events)

      const validation = db.validateRelationshipCapture(1) // Last 1 hour
      
      expect(validation.success).toBe(true)
      expect(validation.details.totalEvents).toBe(3)
      expect(validation.details.eventsWithRelationships).toBe(2) // journey + conversation
      expect(validation.details.relationshipCaptureRate).toBeCloseTo(66.67, 1) // ~66.7%
      expect(validation.details.byEventType).toHaveLength(3)
    })

    it('should handle time range filtering correctly', () => {
      const now = Date.now()
      const twoHoursAgo = now - (2 * 60 * 60 * 1000)
      
      // Insert old event (outside range)
      const oldEvent: Event = {
        event_id: 'old_001',
        user_id: 'user_1',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: twoHoursAgo,
        properties: {},
        journey_id: 'old_journey'
      }
      
      // Insert recent event (inside range)
      const recentEvent: Event = {
        event_id: 'recent_001',
        user_id: 'user_2',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: now - (30 * 60 * 1000), // 30 minutes ago
        properties: { turn_id: 'turn_123', value: 1 }
      }
      
      db.insertEvents([oldEvent, recentEvent])

      const validation = db.validateRelationshipCapture(1) // Last 1 hour only
      
      expect(validation.success).toBe(true)
      expect(validation.details.totalEvents).toBe(1) // Only recent event
      expect(validation.details.eventsWithRelationships).toBe(0) // Recent event has no relationships
      expect(validation.details.relationshipCaptureRate).toBe(0)
    })
  })

  describe('Turn-Vote Correlation', () => {
    it('should correlate turns and votes correctly', () => {
      const turnId = 'turn_correlation_test'
      
      // Insert turn event
      const turnEvent: Event = {
        event_id: 'turn_001',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turnId, model: 'gpt-4', responseTime: 1200 },
        journey_id: 'test_journey',
        conversation_id: 'test_conv',
        turn_sequence: 1
      }
      
      // Insert corresponding vote event
      const voteEvent: Event = {
        event_id: 'vote_001',
        user_id: 'user_123',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now() + 1000,
        properties: { turn_id: turnId, value: 1, comment: 'Excellent response!' }
      }
      
      db.insertEvents([turnEvent, voteEvent])

      const correlation = db.getTurnVoteCorrelation(turnId)
      
      expect(correlation).not.toBeNull()
      expect(correlation.turn_event_id).toBe('turn_001')
      expect(correlation.vote_event_id).toBe('vote_001')
      expect(correlation.vote_value).toBe(1)
      expect(correlation.vote_comment).toBe('Excellent response!')
      expect(correlation.journey_id).toBe('test_journey')
      expect(correlation.conversation_id).toBe('test_conv')
      expect(correlation.turn_sequence).toBe(1)
    })

    it('should handle turns without votes', () => {
      const turnId = 'turn_no_vote'
      
      // Insert turn event without corresponding vote
      const turnEvent: Event = {
        event_id: 'turn_002',
        user_id: 'user_456',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turnId, model: 'gpt-3.5' }
      }
      
      db.insertEvent(turnEvent)

      const correlation = db.getTurnVoteCorrelation(turnId)
      
      expect(correlation).not.toBeNull()
      expect(correlation.turn_event_id).toBe('turn_002')
      expect(correlation.vote_event_id).toBeNull()
      expect(correlation.vote_value).toBeNull()
      expect(correlation.vote_comment).toBeNull()
    })

    it('should handle non-existent turn IDs', () => {
      const correlation = db.getTurnVoteCorrelation('non_existent_turn')
      expect(correlation).toBeNull()
    })

    it('should support both legacy turnId and new turn_id formats', () => {
      const turnId = 'turn_legacy_test'
      
      // Insert turn with legacy turnId property format
      const turnEvent: Event = {
        event_id: 'turn_003',
        user_id: 'user_789',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turnId } // Legacy format
      }
      
      // Insert vote with new turn_id format
      const voteEvent: Event = {
        event_id: 'vote_003',
        user_id: 'user_789',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now() + 1000,
        properties: { turn_id: turnId, value: -1 } // New format
      }
      
      db.insertEvents([turnEvent, voteEvent])

      const correlation = db.getTurnVoteCorrelation(turnId)
      
      expect(correlation).not.toBeNull()
      expect(correlation.turn_event_id).toBe('turn_003')
      expect(correlation.vote_event_id).toBe('vote_003')
      expect(correlation.vote_value).toBe(-1)
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Close database to force error
      db.close()
      
      const validation = db.validateTurnIdMigration()
      expect(validation.success).toBe(false)
      expect(validation.details.error).toBeDefined()
    })

    it('should handle correlation query errors gracefully', () => {
      // Close database to force error  
      db.close()
      
      const correlation = db.getTurnVoteCorrelation('any_turn')
      expect(correlation).toBeNull()
    })
  })

  describe('Security - executeRaw Protection', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      // Restore original environment variables
      process.env = { ...originalEnv }
    })

    it('should allow executeRaw in development environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).not.toThrow()
    })

    it('should allow executeRaw in test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).not.toThrow()
    })

    it('should block executeRaw in production environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).toThrow('executeRaw() is disabled in production for security')
    })

    it('should block executeRaw on Vercel deployment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        configurable: true,
        writable: true,
        enumerable: true
      })
      Object.defineProperty(process.env, 'VERCEL', {
        value: '1',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).toThrow('executeRaw() is disabled in hosted environments')
    })

    it('should block executeRaw on Railway deployment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        configurable: true,
        writable: true,
        enumerable: true
      })
      Object.defineProperty(process.env, 'RAILWAY_ENVIRONMENT', {
        value: 'production',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).toThrow('executeRaw() is disabled in hosted environments')
    })

    it('should block executeRaw on Fly.io deployment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        configurable: true,
        writable: true,
        enumerable: true
      })
      Object.defineProperty(process.env, 'FLY_APP_NAME', {
        value: 'bilan-server',
        configurable: true,
        writable: true,
        enumerable: true
      })
      
      expect(() => {
        db.executeRaw('SELECT 1')
      }).toThrow('executeRaw() is disabled in hosted environments')
    })
  })
}) 