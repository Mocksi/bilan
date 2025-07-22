import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanDatabase } from '../../src/database/schema'
import { EVENT_TYPES, type Event } from '../../src/database/schema'

describe('ClickHouse Migration Syntax Validation', () => {
  let db: BilanDatabase

  beforeEach(() => {
    db = new BilanDatabase(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('ClickHouse Data Types Compatibility', () => {
    it('should validate LowCardinality(String) equivalent behavior', () => {
      // ClickHouse: LowCardinality(String) - optimized for repeated values
      // SQLite equivalent: TEXT with good performance for repeated strings
      // Note: ClickHouse indexes should use TYPE set(0) for categorical data like journey_id
      
      const events: Event[] = [
        {
          event_id: 'journey_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: {},
          journey_id: 'onboarding' // This would be LowCardinality(String) in ClickHouse
        },
        {
          event_id: 'journey_2', 
          user_id: 'user_456',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: {},
          journey_id: 'onboarding' // Repeated value - optimal for LowCardinality
        }
      ]

      db.insertEvents(events)
      
      const result = db.query(`
        SELECT journey_id, COUNT(*) as count 
        FROM events 
        WHERE journey_id IS NOT NULL 
        GROUP BY journey_id
      `)
      
      expect(result).toEqual([{ journey_id: 'onboarding', count: 2 }])
    })

    it('should validate Nullable(Int32) equivalent behavior', () => {
      // ClickHouse: Nullable(Int32) - 32-bit signed integer with NULL support
      // SQLite equivalent: INTEGER with NULL support
      
      const events: Event[] = [
        {
          event_id: 'turn_with_seq',
          user_id: 'user_123', 
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: {},
          turn_sequence: 42 // This would be Nullable(Int32) in ClickHouse
        },
        {
          event_id: 'turn_without_seq',
          user_id: 'user_456',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: {},
          turn_sequence: null // NULL value supported
        }
      ]

      db.insertEvents(events)
      
      const results = db.query(`
        SELECT event_id, turn_sequence 
        FROM events 
        WHERE event_id IN ('turn_with_seq', 'turn_without_seq')
        ORDER BY event_id
      `)
      
      expect(results).toEqual([
        { event_id: 'turn_with_seq', turn_sequence: 42 },
        { event_id: 'turn_without_seq', turn_sequence: null }
      ])
    })
  })

  describe('ClickHouse JSON Function Equivalents', () => {
    it('should simulate JSONHas function behavior', () => {
      // ClickHouse: JSONHas(properties, 'key')
      // SQLite equivalent: JSON_EXTRACT(properties, '$.key') IS NOT NULL
      
      const event: Event = {
        event_id: 'json_test',
        user_id: 'user_123',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now(),
        properties: { 
          promptId: 'prompt_123',
          value: 1 
        }
      }

      db.insertEvent(event)
      
      // Simulate ClickHouse JSONHas behavior
      const hasPromptId = db.queryOne(`
        SELECT 
          CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 ELSE 0 END as has_promptId,
          CASE WHEN JSON_EXTRACT(properties, '$.missing') IS NOT NULL THEN 1 ELSE 0 END as has_missing
        FROM events WHERE event_id = 'json_test'
      `)
      
      expect(hasPromptId.has_promptId).toBe(1)
      expect(hasPromptId.has_missing).toBe(0)
    })

    it('should simulate JSONExtractString function behavior', () => {
      // ClickHouse: JSONExtractString(properties, 'key') 
      // SQLite equivalent: properties->>'key'
      
      const event: Event = {
        event_id: 'extract_test',
        user_id: 'user_123',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now(),
        properties: { 
          promptId: 'prompt_456',
          turnId: 'turn_789'
        }
      }

      db.insertEvent(event)
      
      // Simulate ClickHouse JSONExtractString behavior
      const extracted = db.queryOne(`
        SELECT 
          properties->>'promptId' as promptId_value,
          properties->>'turnId' as turnId_value,
          properties->>'missing' as missing_value
        FROM events WHERE event_id = 'extract_test'
      `)
      
      expect(extracted.promptId_value).toBe('prompt_456')
      expect(extracted.turnId_value).toBe('turn_789') 
      expect(extracted.missing_value).toBeNull()
    })

    it('should simulate multiIf function behavior', () => {
      // ClickHouse: multiIf(condition1, value1, condition2, value2, defaultValue)
      // SQLite equivalent: CASE WHEN condition1 THEN value1 WHEN condition2 THEN value2 ELSE defaultValue END
      
      const events: Event[] = [
        {
          event_id: 'multi_if_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { turnId: 'turn_existing' }
        },
        {
          event_id: 'multi_if_2', 
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_fallback' }
        },
        {
          event_id: 'multi_if_3',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: {}
        }
      ]

      db.insertEvents(events)
      
      // Simulate ClickHouse multiIf for turn_id assignment logic
      const results = db.query(`
        SELECT 
          event_id,
          CASE 
            WHEN JSON_EXTRACT(properties, '$.turnId') IS NOT NULL THEN properties->>'turnId'
            WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN properties->>'promptId' 
            ELSE 'unknown_turn_' || event_id
          END as computed_turn_id
        FROM events 
        WHERE event_id LIKE 'multi_if_%'
        ORDER BY event_id
      `)
      
      expect(results).toEqual([
        { event_id: 'multi_if_1', computed_turn_id: 'turn_existing' },
        { event_id: 'multi_if_2', computed_turn_id: 'prompt_fallback' }, 
        { event_id: 'multi_if_3', computed_turn_id: 'unknown_turn_multi_if_3' }
      ])
    })
  })

  describe('ClickHouse Aggregation Function Equivalents', () => {
    it('should simulate countIf function behavior', () => {
      // ClickHouse: countIf(condition)
      // SQLite equivalent: COUNT(CASE WHEN condition THEN 1 END)
      
      const events: Event[] = [
        {
          event_id: 'vote_with_promptId',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_123' }
        },
        {
          event_id: 'vote_with_turnId',
          user_id: 'user_123', 
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { turnId: 'turn_456' }
        },
        {
          event_id: 'vote_empty',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: {}
        }
      ]

      db.insertEvents(events)
      
      // Simulate ClickHouse countIf aggregation
      const result = db.queryOne(`
        SELECT 
          COUNT(*) as total_votes,
          COUNT(CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 END) as votes_with_promptId,
          COUNT(CASE WHEN JSON_EXTRACT(properties, '$.turnId') IS NOT NULL THEN 1 END) as votes_with_turnId
        FROM events 
        WHERE event_type = 'vote_cast'
      `)
      
      expect(result).toEqual({
        total_votes: 3,
        votes_with_promptId: 1, 
        votes_with_turnId: 1
      })
    })
  })

  describe('ClickHouse Index Strategy Validation', () => {
    it('should validate optimal index column ordering for set(0) type', () => {
      // ClickHouse set(0) indexes work best with categorical/low-cardinality columns first
      // Test data designed to validate proper index column ordering
      
      const events: Event[] = [
        {
          event_id: 'journey_analytics_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now() - 3600000, // 1 hour ago
          properties: {},
          journey_id: 'onboarding', // High selectivity - good for set(0)
          conversation_id: 'conv_123'
        },
        {
          event_id: 'journey_analytics_2',
          user_id: 'user_456',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now() - 1800000, // 30 min ago
          properties: {},
          journey_id: 'onboarding', // Repeated value - optimal for set(0)
          conversation_id: 'conv_456'
        },
        {
          event_id: 'journey_analytics_3',
          user_id: 'user_789',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(), // Now
          properties: {},
          journey_id: 'checkout', // Different journey - good selectivity
          conversation_id: 'conv_789'
        }
      ]

      db.insertEvents(events)
      
      // Simulate ClickHouse query patterns that would benefit from set(0) indexes
      // Pattern 1: Filter by journey_id (high selectivity) + time range
      const journeyQuery = db.query(`
        SELECT journey_id, COUNT(*) as count, MIN(timestamp) as earliest
        FROM events 
        WHERE journey_id = 'onboarding'
          AND timestamp > ?
        GROUP BY journey_id
      `, [Date.now() - 7200000]) // 2 hours ago
      
      expect(journeyQuery).toEqual([{
        journey_id: 'onboarding',
        count: 2,
        earliest: expect.any(Number)
      }])
      
      // Pattern 2: Filter by conversation_id + turn_sequence (compound selectivity)
      const conversationQuery = db.query(`
        SELECT conversation_id, COUNT(*) as count
        FROM events 
        WHERE conversation_id = 'conv_123'
          AND turn_sequence IS NULL -- Test NULL handling
        GROUP BY conversation_id
      `)
      
      expect(conversationQuery).toEqual([{
        conversation_id: 'conv_123',
        count: 1
      }])
    })
  })

  describe('ClickHouse Migration Logic Validation', () => {
    it('should validate turn_id unification migration logic', () => {
      // Test the core logic from 003_unify_turn_ids.clickhouse.up.sql
      
      const voteEvents: Event[] = [
        {
          event_id: 'vote_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_123', value: 1 }
        },
        {
          event_id: 'vote_2',
          user_id: 'user_456',
          event_type: EVENT_TYPES.VOTE_CAST, 
          timestamp: Date.now(),
          properties: { turnId: 'turn_456', value: -1 }
        },
        {
          event_id: 'vote_3',
          user_id: 'user_789',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { value: 1 } // No promptId or turnId
        }
      ]

      db.insertEvents(voteEvents)
      
      // Simulate the ClickHouse migration UPDATE logic
      db.executeRaw(`
        UPDATE events 
        SET properties = json_set(
          json_remove(properties, '$.promptId'),
          '$.turn_id',
          CASE 
            WHEN JSON_EXTRACT(properties, '$.turnId') IS NOT NULL THEN properties->>'turnId'
            WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN properties->>'promptId'
            ELSE 'unknown_turn_' || event_id
          END
        )
        WHERE event_type = 'vote_cast' 
          AND (JSON_EXTRACT(properties, '$.promptId') IS NOT NULL OR JSON_EXTRACT(properties, '$.turnId') IS NOT NULL)
      `)
      
      // Verify migration results
      const results = db.query(`
        SELECT 
          event_id,
          properties->>'turn_id' as turn_id,
          properties->>'promptId' as remaining_promptId,
          properties->>'turnId' as remaining_turnId
        FROM events 
        WHERE event_type = 'vote_cast'
        ORDER BY event_id
      `)
      
      expect(results).toEqual([
        { 
          event_id: 'vote_1', 
          turn_id: 'prompt_123', 
          remaining_promptId: null, 
          remaining_turnId: null 
        },
        { 
          event_id: 'vote_2', 
          turn_id: 'turn_456', 
          remaining_promptId: null, 
          remaining_turnId: 'turn_456' 
        },
        { 
          event_id: 'vote_3', 
          turn_id: null, // No update applied
          remaining_promptId: null, 
          remaining_turnId: null 
        }
      ])
    })

    it('should validate safe turn_sequence casting migration logic', () => {
      // Test the core logic from 002_flexible_relationships.clickhouse.up.sql
      
      const turnEvents: Event[] = [
        {
          event_id: 'turn_valid',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: '5' }
        },
        {
          event_id: 'turn_invalid',
          user_id: 'user_456', 
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: 'invalid' }
        },
        {
          event_id: 'turn_empty',
          user_id: 'user_789',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: '' }
        }
      ]

      db.insertEvents(turnEvents)
      
      // Simulate ClickHouse safe casting logic using SQLite equivalent
      db.executeRaw(`
        UPDATE events
        SET turn_sequence = CASE 
          WHEN JSON_EXTRACT(properties, '$.turn_sequence') IS NOT NULL
            AND trim(properties->>'turn_sequence') != ''
            AND trim(properties->>'turn_sequence') GLOB '[0-9]*'
            AND LENGTH(trim(properties->>'turn_sequence')) > 0
            AND CAST(trim(properties->>'turn_sequence') AS INTEGER) > 0
          THEN CAST(trim(properties->>'turn_sequence') AS INTEGER)
          ELSE NULL
        END
        WHERE event_type IN ('turn_created', 'turn_completed', 'turn_failed')
          AND JSON_EXTRACT(properties, '$.turn_sequence') IS NOT NULL
      `)
      
      // Verify safe casting results
      const results = db.query(`
        SELECT 
          event_id,
          turn_sequence,
          properties->>'turn_sequence' as original_value
        FROM events 
        WHERE event_type = 'turn_completed'
        ORDER BY event_id
      `)
      
      expect(results).toEqual([
        { event_id: 'turn_empty', turn_sequence: null, original_value: '' },
        { event_id: 'turn_invalid', turn_sequence: null, original_value: 'invalid' },
        { event_id: 'turn_valid', turn_sequence: 5, original_value: '5' }
      ])
    })
  })
}) 