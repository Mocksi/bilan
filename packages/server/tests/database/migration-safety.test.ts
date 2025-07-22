import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanDatabase } from '../../src/database/schema'
import { EVENT_TYPES, type Event } from '../../src/database/schema'

describe('Migration Safety - Safe Integer Casting', () => {
  let db: BilanDatabase

  beforeEach(() => {
    db = new BilanDatabase(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('Safe turn_sequence casting with invalid data', () => {
    it('should handle empty strings gracefully', () => {
      const eventWithEmptyString: Event = {
        event_id: 'turn_empty_string',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '' }
      }
      
      db.insertEvent(eventWithEmptyString)
      
      // Test SQLite-style safe casting logic
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') IS NOT NULL
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_empty_string'])

      expect(result.safe_turn_sequence).toBeNull()
    })

    it('should handle non-numeric strings gracefully', () => {
      const eventWithInvalidString: Event = {
        event_id: 'turn_invalid_string',
        user_id: 'user_123', 
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: 'abc123' }
      }
      
      db.insertEvent(eventWithInvalidString)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_invalid_string'])

      expect(result.safe_turn_sequence).toBeNull()
    })

    it('should handle whitespace-only strings gracefully', () => {
      const eventWithWhitespace: Event = {
        event_id: 'turn_whitespace',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '   ' }
      }
      
      db.insertEvent(eventWithWhitespace)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_whitespace'])

      expect(result.safe_turn_sequence).toBeNull()
    })

    it('should handle zero values gracefully', () => {
      const eventWithZero: Event = {
        event_id: 'turn_zero',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '0' }
      }
      
      db.insertEvent(eventWithZero)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_zero'])

      // Zero should be null because condition requires > 0
      expect(result.safe_turn_sequence).toBeNull()
    })

    it('should handle negative numbers gracefully', () => {
      const eventWithNegative: Event = {
        event_id: 'turn_negative',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '-5' }
      }
      
      db.insertEvent(eventWithNegative)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_negative'])

              // Negative numbers should be null (GLOB '[0-9]* matches digits-only; condition requires > 0)
      expect(result.safe_turn_sequence).toBeNull()
    })

    it('should successfully cast valid positive integers', () => {
      const eventWithValidInteger: Event = {
        event_id: 'turn_valid',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '42' }
      }
      
      db.insertEvent(eventWithValidInteger)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_valid'])

      expect(result.safe_turn_sequence).toBe(42)
    })

    it('should handle padded valid integers', () => {
      const eventWithPaddedInteger: Event = {
        event_id: 'turn_padded',
        user_id: 'user_123',
        event_type: EVENT_TYPES.TURN_COMPLETED,
        timestamp: Date.now(),
        properties: { turn_sequence: '  123  ' }
      }
      
      db.insertEvent(eventWithPaddedInteger)
      
      const result = db.queryOne(`
        SELECT 
          CASE 
            WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
             AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
             AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
            THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
            ELSE NULL
          END as safe_turn_sequence
        FROM events WHERE event_id = ?
      `, ['turn_padded'])

      expect(result.safe_turn_sequence).toBe(123)
    })
  })

  describe('Migration-style bulk update safety', () => {
    it('should safely update only valid turn_sequence values', () => {
      // Insert events with mixed valid/invalid turn_sequence values
      const testEvents: Event[] = [
        {
          event_id: 'turn_valid_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: '1' }
        },
        {
          event_id: 'turn_invalid_1', 
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: 'invalid' }
        },
        {
          event_id: 'turn_valid_2',
          user_id: 'user_123', 
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { turn_sequence: '  2  ' }
        },
        {
          event_id: 'turn_empty',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED, 
          timestamp: Date.now(),
          properties: { turn_sequence: '' }
        }
      ]

      db.insertEvents(testEvents)

      // Apply the migration-style safe update
      const rowsAffected = db.executeRaw(`
        UPDATE events
        SET turn_sequence = CASE 
          WHEN NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
           AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
           AND CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER) > 0
          THEN CAST(NULLIF(TRIM(properties->>'turn_sequence'), '') AS INTEGER)
          ELSE NULL
        END
        WHERE event_type IN ('turn_created', 'turn_completed', 'turn_failed')
          AND JSON_EXTRACT(properties, '$.turn_sequence') IS NOT NULL
          AND NULLIF(TRIM(properties->>'turn_sequence'), '') IS NOT NULL
          AND NULLIF(TRIM(properties->>'turn_sequence'), '') GLOB '[0-9]*'
          AND LENGTH(NULLIF(TRIM(properties->>'turn_sequence'), '')) > 0
      `)

      // Verify results
      const results = db.query(`
        SELECT event_id, turn_sequence, properties->>'turn_sequence' as original_value
        FROM events 
        WHERE event_id LIKE 'turn_%'
        ORDER BY event_id
      `)

      expect(results).toEqual([
        { event_id: 'turn_empty', turn_sequence: null, original_value: '' },
        { event_id: 'turn_invalid_1', turn_sequence: null, original_value: 'invalid' },
        { event_id: 'turn_valid_1', turn_sequence: 1, original_value: '1' },
        { event_id: 'turn_valid_2', turn_sequence: 2, original_value: '  2  ' }
      ])
    })
  })
}) 