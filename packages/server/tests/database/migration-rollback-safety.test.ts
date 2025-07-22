import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BilanDatabase } from '../../src/database/schema'
import { EVENT_TYPES, type Event } from '../../src/database/schema'

describe('Migration Rollback Safety', () => {
  let db: BilanDatabase

  beforeEach(() => {
    db = new BilanDatabase(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('Turn ID Unification Rollback (003)', () => {
    it('should rollback vote_cast events without primary key violations', () => {
      // Set up initial data - simulate the original state before migration
      const originalVoteEvents: Event[] = [
        {
          event_id: 'vote_original_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now() - 1000,
          properties: { promptId: 'prompt_123', value: 1, comment: 'Good response' }
        },
        {
          event_id: 'vote_original_2', 
          user_id: 'user_456',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now() - 500,
          properties: { promptId: 'prompt_456', value: -1 }
        }
      ]

      const nonVoteEvents: Event[] = [
        {
          event_id: 'turn_event_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now() - 2000,
          properties: { model: 'gpt-4', responseTime: 1200 }
        },
        {
          event_id: 'journey_event_1',
          user_id: 'user_123', 
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: Date.now() - 3000,
          properties: { step: 'onboarding_complete' }
        }
      ]

      // Insert original events
      db.insertEvents([...originalVoteEvents, ...nonVoteEvents])

      // Create backup table (simulating forward migration setup)
      db.executeRaw(`
        CREATE TABLE vote_events_backup AS 
        SELECT * FROM events WHERE event_type = 'vote_cast'
      `)

      // Simulate forward migration: convert promptId to turn_id
      db.executeRaw(`
        UPDATE events 
        SET properties = json_set(
          json_remove(properties, '$.promptId'),
          '$.turn_id',
          properties->>'promptId'
        )
        WHERE event_type = 'vote_cast' 
          AND JSON_EXTRACT(properties, '$.promptId') IS NOT NULL
      `)

      // Verify forward migration worked
      const migratedVotes = db.query(`
        SELECT event_id, properties->>'turn_id' as turn_id, properties->>'promptId' as promptId
        FROM events WHERE event_type = 'vote_cast'
        ORDER BY event_id
      `)
      
      expect(migratedVotes).toEqual([
        { event_id: 'vote_original_1', turn_id: 'prompt_123', promptId: null },
        { event_id: 'vote_original_2', turn_id: 'prompt_456', promptId: null }
      ])

      // Verify non-vote events are unchanged
      const nonVoteCount = db.queryOne(`
        SELECT COUNT(*) as count FROM events WHERE event_type != 'vote_cast'
      `)
      expect(nonVoteCount.count).toBe(2)

      // Now test the rollback migration (the fixed version)
      // Step 1: Delete current vote events
      db.executeRaw(`DELETE FROM events WHERE event_type = 'vote_cast'`)

      // Step 2: Restore vote events from backup  
      db.executeRaw(`
        INSERT INTO events 
        SELECT * FROM vote_events_backup 
        WHERE event_type = 'vote_cast'
      `)
      
      // Step 3: Verify rollback worked without errors
      const rolledBackVotes = db.query(`
        SELECT event_id, properties->>'promptId' as promptId, properties->>'turn_id' as turn_id
        FROM events WHERE event_type = 'vote_cast'
        ORDER BY event_id
      `)
      
      expect(rolledBackVotes).toEqual([
        { event_id: 'vote_original_1', promptId: 'prompt_123', turn_id: null },
        { event_id: 'vote_original_2', promptId: 'prompt_456', turn_id: null }
      ])

      // Step 4: Verify non-vote events are still there and unchanged
      const finalNonVoteEvents = db.query(`
        SELECT event_id, event_type 
        FROM events WHERE event_type != 'vote_cast'
        ORDER BY event_id
      `)
      
      expect(finalNonVoteEvents).toEqual([
        { event_id: 'journey_event_1', event_type: 'journey_step' },
        { event_id: 'turn_event_1', event_type: 'turn_completed' }
      ])

      // Step 5: Verify total event count is correct (no duplicates)
      const finalCount = db.queryOne(`SELECT COUNT(*) as count FROM events`)
      expect(finalCount.count).toBe(4) // 2 vote events + 2 non-vote events
    })

    it('should demonstrate the old rollback approach would cause primary key violations', () => {
      // Set up the same scenario
      const originalEvents: Event[] = [
        {
          event_id: 'vote_pk_test_1',
          user_id: 'user_123', 
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_123', value: 1 }
        },
        {
          event_id: 'turn_pk_test_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { model: 'gpt-4' }
        }
      ]

      db.insertEvents(originalEvents)

      // Create backup table
      db.executeRaw(`
        CREATE TABLE vote_events_backup AS 
        SELECT * FROM events WHERE event_type = 'vote_cast'
      `)

      // Simulate what the OLD (broken) rollback code would try to do:
      // 1. Create temp table with all current events
      db.executeRaw(`
        CREATE TABLE events_temp AS SELECT * FROM events
      `)

      // 2. Delete only vote events
      db.executeRaw(`DELETE FROM events WHERE event_type = 'vote_cast'`)

      // 3. Restore vote events from backup
      db.executeRaw(`
        INSERT INTO events 
        SELECT * FROM vote_events_backup 
        WHERE event_type = 'vote_cast'
      `)

      // 4. The broken approach would try to restore non-vote events
      // This SHOULD fail with primary key violation because non-vote events are still there
      expect(() => {
        db.executeRaw(`
          INSERT INTO events 
          SELECT * FROM events_temp 
          WHERE event_type != 'vote_cast' 
            AND event_id NOT IN (SELECT event_id FROM vote_events_backup)
        `)
      }).toThrow(/UNIQUE constraint failed|PRIMARY KEY constraint failed/)

      // Cleanup
      db.executeRaw(`DROP TABLE events_temp`)
    })

    it('should handle ON CONFLICT DO NOTHING safely (PostgreSQL-style)', () => {
      // Test the PostgreSQL-specific ON CONFLICT (event_id) DO NOTHING logic
      // using SQLite's INSERT OR IGNORE equivalent
      
      const voteEvents: Event[] = [
        {
          event_id: 'conflict_test_vote_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_original', value: 1 }
        }
      ]

      db.insertEvents(voteEvents)

      // Create backup table
      db.executeRaw(`
        CREATE TABLE vote_events_backup AS 
        SELECT * FROM events WHERE event_type = 'vote_cast'
      `)

      // Simulate PostgreSQL ON CONFLICT behavior using SQLite's INSERT OR IGNORE
      // This should not cause errors even if the event_id already exists
      
      // First, try to insert the same event (should be ignored)
      expect(() => {
        db.executeRaw(`
          INSERT OR IGNORE INTO events 
          SELECT * FROM vote_events_backup 
          WHERE event_type = 'vote_cast'
        `)
      }).not.toThrow()

      // Verify only one row exists (no duplicates)
      const voteCount = db.queryOne(`
        SELECT COUNT(*) as count FROM events WHERE event_type = 'vote_cast'
      `)
      expect(voteCount.count).toBe(1)

      // Try inserting again - should still be safe
      expect(() => {
        db.executeRaw(`
          INSERT OR IGNORE INTO events 
          SELECT * FROM vote_events_backup 
          WHERE event_type = 'vote_cast'
        `)
      }).not.toThrow()

      // Verify still only one row (ON CONFLICT DO NOTHING behavior)
      const finalCount = db.queryOne(`
        SELECT COUNT(*) as count FROM events WHERE event_type = 'vote_cast'
      `)
      expect(finalCount.count).toBe(1)

      // Verify the original data is preserved
      const preservedEvent = db.queryOne(`
        SELECT properties->>'promptId' as promptId, JSON_EXTRACT(properties, '$.value') as value
        FROM events WHERE event_type = 'vote_cast' AND event_id = 'conflict_test_vote_1'
      `)
      expect(preservedEvent.promptId).toBe('prompt_original')
      expect(preservedEvent.value).toBe(1)
    })

    it('should ensure transaction atomicity in PostgreSQL-style migrations', () => {
      // Test that migration transactions are atomic using SQLite's transaction equivalent
      // This simulates the PostgreSQL BEGIN/COMMIT behavior
      
      const initialEvents: Event[] = [
        {
          event_id: 'atomic_test_vote_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_atomic_test', value: 1 }
        },
        {
          event_id: 'atomic_test_turn_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now(),
          properties: { model: 'gpt-4', responseTime: 1000 }
        }
      ]

      db.insertEvents(initialEvents)

      // Verify initial state
      const initialCount = db.queryOne('SELECT COUNT(*) as count FROM events')
      expect(initialCount.count).toBe(2)

      // Simulate a transaction that should succeed (all operations work)
      expect(() => {
        db.executeRaw('BEGIN')
        
                 // Create backup
         db.executeRaw('CREATE TABLE test_backup AS SELECT * FROM events WHERE event_type = \'vote_cast\'')
        
        // Update vote event (simulating migration)
        db.executeRaw(`
          UPDATE events 
          SET properties = json_set(
            json_remove(properties, '$.promptId'),
            '$.turn_id', 
            properties->>'promptId'
          )
          WHERE event_type = 'vote_cast' AND event_id = 'atomic_test_vote_1'
        `)
        
        // Insert log entry
        db.executeRaw(`
          INSERT INTO events (event_id, user_id, event_type, timestamp, properties)
          VALUES ('atomic_transaction_log', 'system', 'user_action', ${Date.now()}, '{"test": "success"}')
        `)
        
        db.executeRaw('COMMIT')
      }).not.toThrow()

      // Verify all changes were applied
      const finalCount = db.queryOne('SELECT COUNT(*) as count FROM events')
      expect(finalCount.count).toBe(3) // 2 original + 1 log

      const migratedVote = db.queryOne(`
        SELECT properties->>'turn_id' as turn_id, properties->>'promptId' as promptId
        FROM events WHERE event_id = 'atomic_test_vote_1'
      `)
      expect(migratedVote.turn_id).toBe('prompt_atomic_test')
      expect(migratedVote.promptId).toBeNull()

      // Cleanup
      db.executeRaw('DROP TABLE test_backup')
    })

    it('should rollback all changes if any step fails in transaction', () => {
      // Test transaction rollback behavior when an error occurs
      
      const testEvents: Event[] = [
        {
          event_id: 'rollback_test_vote_1',
          user_id: 'user_456',
          event_type: EVENT_TYPES.VOTE_CAST,
          timestamp: Date.now(),
          properties: { promptId: 'prompt_rollback_test', value: -1 }
        }
      ]

      db.insertEvents(testEvents)

      const initialCount = db.queryOne('SELECT COUNT(*) as count FROM events')
      const initialVote = db.queryOne(`
        SELECT properties->>'promptId' as promptId, properties->>'turn_id' as turn_id
        FROM events WHERE event_id = 'rollback_test_vote_1'
      `)

      // Simulate a transaction that fails (one operation will cause an error)
      // In SQLite, we need to explicitly handle the rollback
      let errorOccurred = false
      try {
        db.executeRaw('BEGIN')
         
         // First operation succeeds
         db.executeRaw(`
           UPDATE events 
           SET properties = json_set(properties, '$.temp_marker', 'modified')
           WHERE event_id = 'rollback_test_vote_1'
         `)
         
         // Second operation will fail due to invalid SQL (simulate migration failure)
         db.executeRaw('INSERT INTO nonexistent_table VALUES (1)') // This will cause an error
         
         // This COMMIT will never be reached
         db.executeRaw('COMMIT')
       } catch (error) {
         errorOccurred = true
         // Explicitly rollback on error (simulating what PostgreSQL does automatically)
         try {
           db.executeRaw('ROLLBACK')
         } catch {
           // Ignore rollback errors if transaction is already rolled back
         }
       }
       
       expect(errorOccurred).toBe(true)

      // Verify NO changes were applied due to automatic rollback
      const finalCount = db.queryOne('SELECT COUNT(*) as count FROM events')
      expect(finalCount.count).toBe(initialCount.count) // Same count

      const finalVote = db.queryOne(`
        SELECT properties->>'promptId' as promptId, properties->>'turn_id' as turn_id, properties->>'temp_marker' as temp_marker
        FROM events WHERE event_id = 'rollback_test_vote_1'
      `)
      
      // Original data should be unchanged (transaction rolled back)
      expect(finalVote.promptId).toBe(initialVote.promptId)
      expect(finalVote.turn_id).toBe(initialVote.turn_id)
      expect(finalVote.temp_marker).toBeNull() // Update was rolled back
    })

    it('should generate unique event IDs using hash-based approach', () => {
      // Test the PostgreSQL-style hash-based UUID generation using SQLite equivalent
      // This simulates md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text)
      
      const generatedIds = new Set<string>()
      const iterations = 100
      
      // Generate multiple IDs in rapid succession to test for collisions
      for (let i = 0; i < iterations; i++) {
        // Simulate PostgreSQL's approach using SQLite available functions
        const timestamp = Date.now() + i // Add variation
        const randomValue = Math.random()
        const processId = process.pid || 12345
        const combinedString = `${randomValue}${timestamp}${processId}${i}`
        
        // Simple hash function for testing (simulating md5)
        let hash = 0
        for (let j = 0; j < combinedString.length; j++) {
          const char = combinedString.charCodeAt(j)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash // Convert to 32bit integer
        }
        
        const eventId = `migration_003_start_${Math.abs(hash).toString(16)}`
        generatedIds.add(eventId)
      }
      
      // Verify all IDs are unique (no collisions)
      expect(generatedIds.size).toBe(iterations)
      
      // Verify all IDs have the expected prefix
      generatedIds.forEach(id => {
        expect(id).toMatch(/^migration_003_start_[0-9a-f]+$/)
        expect(id.length).toBeGreaterThan(20) // Should be reasonably long
      })
    })

         it('should generate robust UUID-like event IDs with maximum entropy', () => {
       // Test the enhanced SQLite UUID-like generation approach
       // Simulates: hex(randomblob(4))+'-'+hex(randomblob(2))+'-'+hex(randomblob(2))+'-'+hex(randomblob(2))+'-'+hex(randomblob(6))+'_'+timestamp+random
       
       const generatedIds = new Set<string>()
       const iterations = 10000 // Stress test with higher iterations
       
       for (let i = 0; i < iterations; i++) {
         // Generate UUID-like format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX_timestamp_XXX
         const part1 = Math.random().toString(16).substr(2, 8).padStart(8, '0')
         const part2 = Math.random().toString(16).substr(2, 4).padStart(4, '0')
         const part3 = Math.random().toString(16).substr(2, 4).padStart(4, '0')
         const part4 = Math.random().toString(16).substr(2, 4).padStart(4, '0')
         const part5 = Math.random().toString(16).substr(2, 12).padStart(12, '0')
         const timestamp = (Date.now() * 1000000 + i).toString() // Microsecond precision simulation
         const suffix = Math.random().toString(16).substr(2, 3)
         
         const eventId = `migration_003_start_${part1}-${part2}-${part3}-${part4}-${part5}_${timestamp}${suffix}`
         generatedIds.add(eventId)
       }
       
       // Verify absolutely no collisions even with 10K iterations
       expect(generatedIds.size).toBe(iterations)
       
       // Verify UUID-like format structure
       generatedIds.forEach(id => {
         expect(id).toMatch(/^migration_003_start_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_\d+[0-9a-f]{3}$/)
         expect(id.length).toBeGreaterThan(70) // Should be quite long for uniqueness
       })
       
       if (process.env.DEBUG_TESTS) {
        console.log(`Enhanced UUID-like approach: ${generatedIds.size}/${iterations} unique IDs (${iterations - generatedIds.size} collisions)`)
      }
     })

     it('should demonstrate the old collision-prone approach vs new approach', () => {
      // Demonstrate why the old approach was problematic
      const oldStyleIds = new Set<string>()
      const newStyleIds = new Set<string>()
      const iterations = 1000
      
      // Old approach simulation (collision-prone)
      for (let i = 0; i < iterations; i++) {
        const timestamp = Math.floor(Date.now() / 1000) // Same timestamp for many iterations
        const randomSuffix = Math.floor(Math.random() * 1000) // Only 1000 possible values!
        const oldId = `migration_003_start_${timestamp}_${randomSuffix}`
        oldStyleIds.add(oldId)
      }
      
      // New approach simulation (collision-resistant)
      for (let i = 0; i < iterations; i++) {
        const timestamp = Date.now() + i
        const randomValue = Math.random()
        const processId = process.pid || 12345
        const combinedString = `${randomValue}${timestamp}${processId}${i}`
        
        let hash = 0
        for (let j = 0; j < combinedString.length; j++) {
          const char = combinedString.charCodeAt(j)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash
        }
        
        const newId = `migration_003_start_${Math.abs(hash).toString(16)}`
        newStyleIds.add(newId)
      }
      
      // Old approach will have collisions, new approach should have none
      expect(oldStyleIds.size).toBeLessThan(iterations) // Collisions occurred
      expect(newStyleIds.size).toBe(iterations) // No collisions
      
      if (process.env.DEBUG_TESTS) {
        console.log(`Old approach: ${oldStyleIds.size}/${iterations} unique IDs (${iterations - oldStyleIds.size} collisions)`)
        console.log(`New approach: ${newStyleIds.size}/${iterations} unique IDs (${iterations - newStyleIds.size} collisions)`)
      }
    })
  })

  describe('Rollback Data Integrity', () => {
    it('should preserve all non-vote event data during rollback', () => {
      // Create complex non-vote events with relationship fields
      const complexNonVoteEvents: Event[] = [
        {
          event_id: 'complex_turn_1',
          user_id: 'user_123',
          event_type: EVENT_TYPES.TURN_COMPLETED,
          timestamp: Date.now() - 1000,
          properties: { model: 'gpt-4', tokens: 150 },
          journey_id: 'onboarding',
          conversation_id: 'conv_123',
          turn_sequence: 1,
          turn_id: 'turn_123'
        },
        {
          event_id: 'complex_journey_1', 
          user_id: 'user_456',
          event_type: EVENT_TYPES.JOURNEY_STEP,
          timestamp: Date.now() - 2000,
          properties: { step: 'welcome_complete', duration: 5000 },
          journey_id: 'welcome_flow'
        }
      ]

      const voteEvent: Event = {
        event_id: 'vote_integrity_test',
        user_id: 'user_123',
        event_type: EVENT_TYPES.VOTE_CAST,
        timestamp: Date.now(),
        properties: { turn_id: 'turn_migrated_123', value: 1 }
      }

      db.insertEvents([...complexNonVoteEvents, voteEvent])

      // Create backup (simulate it had promptId originally)
      db.executeRaw(`
        CREATE TABLE vote_events_backup (
          event_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          properties TEXT NOT NULL,
          prompt_text TEXT,
          ai_response TEXT,
          journey_id TEXT,
          conversation_id TEXT,
          turn_sequence INTEGER,
          turn_id TEXT
        )
      `)
      
      db.executeRaw(`
        INSERT INTO vote_events_backup VALUES (
          'vote_integrity_test',
          'user_123',
          'vote_cast',
          ${voteEvent.timestamp},
          '{"promptId": "prompt_original_123", "value": 1}',
          NULL, NULL, NULL, NULL, NULL, NULL
        )
      `)

      // Perform rollback
      db.executeRaw(`DELETE FROM events WHERE event_type = 'vote_cast'`)
      db.executeRaw(`
        INSERT INTO events 
        SELECT * FROM vote_events_backup 
        WHERE event_type = 'vote_cast'
      `)

      // Verify non-vote events are completely intact
      const preservedEvents = db.query(`
        SELECT 
          event_id, event_type, journey_id, conversation_id, 
          turn_sequence, turn_id, properties
        FROM events 
        WHERE event_type != 'vote_cast'
        ORDER BY event_id
      `)

      expect(preservedEvents).toEqual([
        {
          event_id: 'complex_journey_1',
          event_type: 'journey_step', 
          journey_id: 'welcome_flow',
          conversation_id: null,
          turn_sequence: null,
          turn_id: null,
          properties: '{"step":"welcome_complete","duration":5000}'
        },
        {
          event_id: 'complex_turn_1',
          event_type: 'turn_completed',
          journey_id: 'onboarding', 
          conversation_id: 'conv_123',
          turn_sequence: 1,
          turn_id: 'turn_123',
          properties: '{"model":"gpt-4","tokens":150}'
        }
      ])

      // Verify vote event was properly restored  
      const restoredVote = db.queryOne(`
        SELECT properties->>'promptId' as promptId, properties->>'turn_id' as turn_id
        FROM events WHERE event_type = 'vote_cast'
      `)
      
      expect(restoredVote.promptId).toBe('prompt_original_123')
      expect(restoredVote.turn_id).toBeNull()
    })
  })
}) 