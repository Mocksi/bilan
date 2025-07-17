import Database from 'better-sqlite3'
import { V3VoteEvent, MigrationConfig, MigrationProgress, ValidationResult } from './types.js'

/**
 * Data extractor for v0.3.x Bilan database
 * Safely extracts vote events with batching and validation
 */
export class V3DataExtractor {
  private db: Database.Database
  private config: MigrationConfig

  constructor(config: MigrationConfig) {
    this.config = config
    this.db = new Database(config.sourceDbPath, { readonly: true })
  }

  /**
   * Extract all vote events from v0.3.x database with batching
   */
  async *extractVoteEvents(): AsyncGenerator<V3VoteEvent[], void, unknown> {
    const batchSize = this.config.batchSize || 1000
    let offset = 0
    
    while (true) {
      const batch = this.extractVoteBatch(offset, batchSize)
      
      if (batch.length === 0) {
        break
      }
      
      if (this.config.verbose) {
        console.log(`Extracted batch: ${offset} to ${offset + batch.length}`)
      }
      
      yield batch
      offset += batchSize
    }
  }

  /**
   * Extract a batch of vote events
   */
  private extractVoteBatch(offset: number, limit: number): V3VoteEvent[] {
    const query = `
      SELECT 
        id,
        user_id,
        prompt_id,
        value,
        comment,
        timestamp,
        metadata,
        prompt_text,
        ai_output,
        model_used,
        response_time
      FROM events
      ORDER BY timestamp ASC
      LIMIT ? OFFSET ?
    `
    
    const stmt = this.db.prepare(query)
    const rows = stmt.all(limit, offset)
    
    return rows.map(row => this.mapRowToV3Event(row))
  }

  /**
   * Map database row to V3VoteEvent
   */
  private mapRowToV3Event(row: any): V3VoteEvent {
    return {
      id: row.id,
      user_id: row.user_id,
      prompt_id: row.prompt_id,
      value: row.value,
      comment: row.comment,
      timestamp: row.timestamp,
      metadata: row.metadata || '{}',
      prompt_text: row.prompt_text,
      ai_output: row.ai_output,
      model_used: row.model_used,
      response_time: row.response_time
    }
  }

  /**
   * Get total count of events for progress tracking
   */
  getTotalEventCount(): number {
    const query = 'SELECT COUNT(*) as count FROM events'
    const result = this.db.prepare(query).get() as { count: number }
    return result.count
  }

  /**
   * Get basic statistics about the v0.3.x database
   */
  getV3Statistics(): {
    totalVotes: number
    uniqueUsers: number
    uniquePrompts: number
    dateRange: { start: number; end: number }
  } {
    const totalVotes = this.getTotalEventCount()
    
    const uniqueUsersResult = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM events').get() as { count: number }
    const uniquePromptsResult = this.db.prepare('SELECT COUNT(DISTINCT prompt_id) as count FROM events').get() as { count: number }
    
    const dateRangeResult = this.db.prepare(`
      SELECT 
        MIN(timestamp) as start,
        MAX(timestamp) as end
      FROM events
    `).get() as { start: number; end: number }
    
    return {
      totalVotes,
      uniqueUsers: uniqueUsersResult.count,
      uniquePrompts: uniquePromptsResult.count,
      dateRange: dateRangeResult || { start: 0, end: 0 }
    }
  }

  /**
   * Validate the integrity of the v0.3.x database
   */
  validateV3Database(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Check if events table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='events'
      `).get()
      
      if (!tableExists) {
        errors.push('Events table does not exist')
        return {
          isValid: false,
          errors,
          warnings,
          summary: { totalEvents: 0, eventTypes: {}, dateRange: { start: 0, end: 0 } }
        }
      }
      
      // Check for required columns
      const columns = this.db.prepare('PRAGMA table_info(events)').all() as Array<{
        name: string
        type: string
        notnull: number
        dflt_value: any
      }>
      
      const requiredColumns = ['id', 'user_id', 'prompt_id', 'value', 'timestamp']
      const existingColumns = columns.map(col => col.name)
      
      for (const required of requiredColumns) {
        if (!existingColumns.includes(required)) {
          errors.push(`Missing required column: ${required}`)
        }
      }
      
      // Check for data integrity issues
      const nullUserIds = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE user_id IS NULL').get() as { count: number }
      if (nullUserIds.count > 0) {
        errors.push(`Found ${nullUserIds.count} events with null user_id`)
      }
      
      const nullPromptIds = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE prompt_id IS NULL').get() as { count: number }
      if (nullPromptIds.count > 0) {
        errors.push(`Found ${nullPromptIds.count} events with null prompt_id`)
      }
      
      const invalidValues = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE value NOT IN (1, -1)').get() as { count: number }
      if (invalidValues.count > 0) {
        errors.push(`Found ${invalidValues.count} events with invalid vote values (not 1 or -1)`)
      }
      
      // Check for malformed metadata JSON
      const malformedMetadata = this.db.prepare(`
        SELECT COUNT(*) as count FROM events 
        WHERE metadata IS NOT NULL 
        AND metadata != ''
        AND json_valid(metadata) = 0
      `).get() as { count: number }
      
      if (malformedMetadata.count > 0) {
        warnings.push(`Found ${malformedMetadata.count} events with malformed metadata JSON`)
      }
      
      // Get summary statistics
      const stats = this.getV3Statistics()
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalEvents: stats.totalVotes,
          eventTypes: { 'vote_cast': stats.totalVotes }, // All current events will become vote_cast events
          dateRange: stats.dateRange
        }
      }
      
    } catch (error) {
      errors.push(`Database validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        isValid: false,
        errors,
        warnings,
        summary: { totalEvents: 0, eventTypes: {}, dateRange: { start: 0, end: 0 } }
      }
    }
  }

  /**
   * Create a progress tracker for the extraction process
   */
  createProgressTracker(): MigrationProgress {
    const total = this.getTotalEventCount()
    
    return {
      phase: 'extraction',
      total,
      processed: 0,
      errors: [],
      startTime: Date.now()
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close()
  }
} 