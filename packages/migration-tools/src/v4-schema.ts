import Database from 'better-sqlite3'
import { V4Event, MigrationConfig } from './types.js'

/**
 * Creates and manages the v0.4.0 database schema
 * Handles event table creation, indexing, and data insertion
 */
export class V4DatabaseManager {
  private db: Database.Database
  private config: MigrationConfig

  constructor(config: MigrationConfig) {
    this.config = config
    this.db = new Database(config.targetDbPath)
    this.initializeSchema()
  }

  /**
   * Initialize the v0.4.0 database schema
   */
  private initializeSchema(): void {
    // Create the events table with JSONB properties
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        properties TEXT, -- JSON stored as TEXT (SQLite doesn't have native JSONB)
        prompt_text TEXT,
        ai_response TEXT,
        
        -- Metadata for migration tracking
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `)
    
    // Create performance indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_user_id 
      ON events(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_events_event_type 
      ON events(event_type);
      
      CREATE INDEX IF NOT EXISTS idx_events_timestamp 
      ON events(timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_events_user_timestamp 
      ON events(user_id, timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_events_type_timestamp 
      ON events(event_type, timestamp);
    `)
    
    // Create indexes for common property queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_properties_prompt_id 
      ON events(json_extract(properties, '$.prompt_id'));
      
      CREATE INDEX IF NOT EXISTS idx_events_properties_value 
      ON events(json_extract(properties, '$.value'));
      
      CREATE INDEX IF NOT EXISTS idx_events_properties_model_used 
      ON events(json_extract(properties, '$.model_used'));
    `)
    
    if (this.config.verbose) {
      console.log('✅ v0.4.0 database schema initialized')
    }
  }

  /**
   * Insert a batch of v0.4.0 events into the database
   */
  insertEventBatch(events: V4Event[]): void {
    const insertStmt = this.db.prepare(`
      INSERT INTO events (
        event_id, 
        user_id, 
        event_type, 
        timestamp, 
        properties, 
        prompt_text, 
        ai_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((events: V4Event[]) => {
      for (const event of events) {
        insertStmt.run(
          event.event_id,
          event.user_id,
          event.event_type,
          event.timestamp,
          JSON.stringify(event.properties),
          event.prompt_text || null,
          event.ai_response || null
        )
      }
    })
    
    transaction(events)
    
    if (this.config.verbose) {
      console.log(`✅ Inserted batch of ${events.length} events`)
    }
  }

  /**
   * Get count of events by type
   */
  getEventCounts(): Record<string, number> {
    const query = `
      SELECT event_type, COUNT(*) as count
      FROM events
      GROUP BY event_type
      ORDER BY count DESC
    `
    
    const rows = this.db.prepare(query).all() as Array<{ event_type: string; count: number }>
    const counts: Record<string, number> = {}
    
    rows.forEach(row => {
      counts[row.event_type] = row.count
    })
    
    return counts
  }

  /**
   * Get total event count
   */
  getTotalEventCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
    return result.count
  }

  /**
   * Get basic statistics about the v0.4.0 database
   */
  getV4Statistics(): {
    totalEvents: number
    eventTypes: Record<string, number>
    uniqueUsers: number
    dateRange: { start: number; end: number }
  } {
    const totalEvents = this.getTotalEventCount()
    const eventTypes = this.getEventCounts()
    
    const uniqueUsersResult = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM events').get() as { count: number }
    
    const dateRangeResult = this.db.prepare(`
      SELECT 
        MIN(timestamp) as start,
        MAX(timestamp) as end
      FROM events
    `).get() as { start: number; end: number }
    
    return {
      totalEvents,
      eventTypes,
      uniqueUsers: uniqueUsersResult.count,
      dateRange: dateRangeResult || { start: 0, end: 0 }
    }
  }

  /**
   * Validate the v0.4.0 database integrity
   */
  validateV4Database(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Check table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='events'
      `).get()
      
      if (!tableExists) {
        errors.push('Events table does not exist')
        return { isValid: false, errors, warnings }
      }
      
      // Check for required columns
      const columns = this.db.prepare('PRAGMA table_info(events)').all() as Array<{
        name: string
        type: string
        notnull: number
      }>
      
      const requiredColumns = ['event_id', 'user_id', 'event_type', 'timestamp', 'properties']
      const existingColumns = columns.map(col => col.name)
      
      for (const required of requiredColumns) {
        if (!existingColumns.includes(required)) {
          errors.push(`Missing required column: ${required}`)
        }
      }
      
      // Check for data integrity
      const nullUserIds = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE user_id IS NULL').get() as { count: number }
      if (nullUserIds.count > 0) {
        errors.push(`Found ${nullUserIds.count} events with null user_id`)
      }
      
      const nullEventTypes = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE event_type IS NULL').get() as { count: number }
      if (nullEventTypes.count > 0) {
        errors.push(`Found ${nullEventTypes.count} events with null event_type`)
      }
      
      // Check for malformed JSON in properties
      const malformedProperties = this.db.prepare(`
        SELECT COUNT(*) as count FROM events 
        WHERE properties IS NOT NULL 
        AND json_valid(properties) = 0
      `).get() as { count: number }
      
      if (malformedProperties.count > 0) {
        errors.push(`Found ${malformedProperties.count} events with malformed properties JSON`)
      }
      
      // Check for missing migration metadata
      const missingMigrationData = this.db.prepare(`
        SELECT COUNT(*) as count FROM events 
        WHERE json_extract(properties, '$.migrated_from') IS NULL
      `).get() as { count: number }
      
      if (missingMigrationData.count > 0) {
        warnings.push(`Found ${missingMigrationData.count} events without migration metadata`)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
      
    } catch (error) {
      errors.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { isValid: false, errors, warnings }
    }
  }

  /**
   * Get sample events for validation
   */
  getSampleEvents(limit: number = 5): V4Event[] {
    const query = `
      SELECT * FROM events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `
    
    const rows = this.db.prepare(query).all(limit) as Array<{
      event_id: string
      user_id: string
      event_type: string
      timestamp: number
      properties: string
      prompt_text: string | null
      ai_response: string | null
    }>
    
    return rows.map(row => ({
      event_id: row.event_id,
      user_id: row.user_id,
      event_type: row.event_type,
      timestamp: row.timestamp,
      properties: JSON.parse(row.properties || '{}'),
      prompt_text: row.prompt_text,
      ai_response: row.ai_response
    }))
  }

  /**
   * Clear all events (for testing or rollback)
   */
  clearAllEvents(): void {
    this.db.prepare('DELETE FROM events').run()
    
    if (this.config.verbose) {
      console.log('🗑️  All events cleared from database')
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close()
  }
} 