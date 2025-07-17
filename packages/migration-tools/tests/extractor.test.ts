import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { V3DataExtractor } from '../src/extractor.js'
import { MigrationConfig } from '../src/types.js'
import { unlinkSync, existsSync } from 'fs'

describe('V3DataExtractor', () => {
  let testDb: Database.Database
  let extractor: V3DataExtractor
  let config: MigrationConfig
  const testDbPath = './test-source.db'

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
    
    // Create file-based test database
    testDb = new Database(testDbPath)
    
    // Create the v0.3.x events table
    testDb.exec(`
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prompt_id TEXT NOT NULL,
        value INTEGER NOT NULL,
        comment TEXT,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        prompt_text TEXT,
        ai_output TEXT,
        model_used TEXT,
        response_time REAL
      );
      
      CREATE INDEX idx_events_user_id ON events(user_id);
      CREATE INDEX idx_events_prompt_id ON events(prompt_id);
      CREATE INDEX idx_events_timestamp ON events(timestamp);
    `)
    
    // Insert sample data
    const insertStmt = testDb.prepare(`
      INSERT INTO events (id, user_id, prompt_id, value, comment, timestamp, metadata, prompt_text, ai_output, model_used, response_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    // Sample vote events
    insertStmt.run('vote-1', 'user-1', 'prompt-1', 1, 'Great response!', 1000, '{"journeyName": "onboarding"}', 'Help me write code', 'Here is some code', 'gpt-4', 2.5)
    insertStmt.run('vote-2', 'user-1', 'prompt-2', -1, 'Not helpful', 2000, '{}', 'Fix this bug', 'Try this solution', 'gpt-3.5-turbo', 1.2)
    insertStmt.run('vote-3', 'user-2', 'prompt-3', 1, null, 3000, '{"context": "debugging"}', 'Explain this error', 'This error means...', 'gpt-4', 3.1)
    
    testDb.close()
    
    // Create extractor with test database
    config = {
      sourceDbPath: testDbPath,
      targetDbPath: './test-target.db',
      batchSize: 10,
      verbose: false
    }
    
    extractor = new V3DataExtractor(config)
  })

  afterEach(() => {
    extractor?.close()
    
    // Clean up test database files
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
    if (existsSync('./test-target.db')) {
      unlinkSync('./test-target.db')
    }
  })

  describe('validateV3Database', () => {
    it('should validate database schema correctly', async () => {
      // Database is already created in beforeEach
      
      const result = extractor.validateV3Database()
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalEvents).toBe(3)
      expect(result.summary.eventTypes['vote_cast']).toBe(3)
      
      // Clean up
      const fs = await import('fs')
      fs.unlinkSync('./test-source.db')
    })

    it('should detect missing table', async () => {
      // Create empty database
      const testDbFile = new Database('./test-empty.db')
      testDbFile.close()
      
      const emptyExtractor = new V3DataExtractor({
        ...config,
        sourceDbPath: './test-empty.db'
      })
      
      const result = emptyExtractor.validateV3Database()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Events table does not exist')
      
      emptyExtractor.close()
      
      // Clean up
      const fs = await import('fs')
      fs.unlinkSync('./test-empty.db')
    })

    it('should detect invalid vote values', async () => {
      // Create database with invalid data
      const testDbFile = new Database('./test-invalid.db')
      
      testDbFile.exec(`
        CREATE TABLE events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          prompt_id TEXT NOT NULL,
          value INTEGER NOT NULL,
          comment TEXT,
          timestamp INTEGER NOT NULL,
          metadata TEXT,
          prompt_text TEXT,
          ai_output TEXT,
          model_used TEXT,
          response_time REAL
        );
      `)
      
      // Insert invalid data
      const insertStmt = testDbFile.prepare(`
        INSERT INTO events (id, user_id, prompt_id, value, comment, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      
      insertStmt.run('vote-1', 'user-1', 'prompt-1', 5, 'Invalid value', 1000, '{}') // Invalid value
      insertStmt.run('vote-2', 'user-2', 'prompt-2', 1, 'Valid value', 2000, '{}') // Valid value
      
      testDbFile.close()
      
      const invalidExtractor = new V3DataExtractor({
        ...config,
        sourceDbPath: './test-invalid.db'
      })
      
      const result = invalidExtractor.validateV3Database()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Found 1 events with invalid vote values (not 1 or -1)')
      
      invalidExtractor.close()
      
      // Clean up
      const fs = await import('fs')
      fs.unlinkSync('./test-invalid.db')
    })
  })

  describe('getTotalEventCount', () => {
    it('should return correct count for empty database', async () => {
      const testDbFile = new Database('./test-count.db')
      
      testDbFile.exec(`
        CREATE TABLE events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          prompt_id TEXT NOT NULL,
          value INTEGER NOT NULL,
          comment TEXT,
          timestamp INTEGER NOT NULL,
          metadata TEXT,
          prompt_text TEXT,
          ai_output TEXT,
          model_used TEXT,
          response_time REAL
        );
      `)
      
      testDbFile.close()
      
      const countExtractor = new V3DataExtractor({
        ...config,
        sourceDbPath: './test-count.db'
      })
      
      const count = countExtractor.getTotalEventCount()
      expect(count).toBe(0)
      
      countExtractor.close()
      
      // Clean up
      const fs = await import('fs')
      fs.unlinkSync('./test-count.db')
    })
  })

  describe('getV3Statistics', () => {
    it('should return correct statistics', async () => {
      const testDbFile = new Database('./test-stats.db')
      
      testDbFile.exec(`
        CREATE TABLE events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          prompt_id TEXT NOT NULL,
          value INTEGER NOT NULL,
          comment TEXT,
          timestamp INTEGER NOT NULL,
          metadata TEXT,
          prompt_text TEXT,
          ai_output TEXT,
          model_used TEXT,
          response_time REAL
        );
      `)
      
      // Insert test data
      const insertStmt = testDbFile.prepare(`
        INSERT INTO events (id, user_id, prompt_id, value, comment, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      
      insertStmt.run('vote-1', 'user-1', 'prompt-1', 1, 'Test', 1000, '{}')
      insertStmt.run('vote-2', 'user-1', 'prompt-2', -1, 'Test', 2000, '{}')
      insertStmt.run('vote-3', 'user-2', 'prompt-1', 1, 'Test', 3000, '{}')
      
      testDbFile.close()
      
      const statsExtractor = new V3DataExtractor({
        ...config,
        sourceDbPath: './test-stats.db'
      })
      
      const stats = statsExtractor.getV3Statistics()
      
      expect(stats.totalVotes).toBe(3)
      expect(stats.uniqueUsers).toBe(2)
      expect(stats.uniquePrompts).toBe(2)
      expect(stats.dateRange.start).toBe(1000)
      expect(stats.dateRange.end).toBe(3000)
      
      statsExtractor.close()
      
      // Clean up
      const fs = await import('fs')
      fs.unlinkSync('./test-stats.db')
    })
  })
}) 