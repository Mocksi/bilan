import Database from 'better-sqlite3'
import { VoteEvent } from '@bilan/sdk'

export class BilanDatabase {
  private db: Database.Database

  constructor(dbPath: string = './bilan.db') {
    this.db = new Database(dbPath)
    this.init()
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
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
      
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_prompt_id ON events(prompt_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `)
  }

  // Simple query method for direct SQL access
  query(sql: string, params: any[] = []): any[] {
    return this.db.prepare(sql).all(...params)
  }

  // Single row query
  queryOne(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).get(...params)
  }

  insertEvent(event: VoteEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (id, user_id, prompt_id, value, comment, timestamp, metadata, prompt_text, ai_output, model_used, response_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      crypto.randomUUID(),
      event.userId,
      event.promptId,
      event.value,
      event.comment || null,
      event.timestamp,
      JSON.stringify(event.metadata || {}),
      event.promptText || null,
      event.aiOutput || null,
      event.modelUsed || null,
      event.responseTime || null
    )
  }

  // Get events with simple filtering
  getEvents(filters: { userId?: string; promptId?: string; limit?: number; offset?: number } = {}): VoteEvent[] {
    const { userId, promptId, limit = 100, offset = 0 } = filters
    
    let sql = 'SELECT * FROM events WHERE 1=1'
    const params: any[] = []
    
    if (userId) {
      sql += ' AND user_id = ?'
      params.push(userId)
    }
    
    if (promptId) {
      sql += ' AND prompt_id = ?'
      params.push(promptId)
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const rows = this.query(sql, params)
    return rows.map(this.mapRowToEvent)
  }

  // Get total count
  getEventsCount(filters: { userId?: string; promptId?: string } = {}): number {
    const { userId, promptId } = filters
    
    let sql = 'SELECT COUNT(*) as count FROM events WHERE 1=1'
    const params: any[] = []
    
    if (userId) {
      sql += ' AND user_id = ?'
      params.push(userId)
    }
    
    if (promptId) {
      sql += ' AND prompt_id = ?'
      params.push(promptId)
    }
    
    const result = this.queryOne(sql, params)
    return result?.count || 0
  }

  private mapRowToEvent(row: any): VoteEvent {
    let metadata = {}
    try {
      metadata = JSON.parse(row.metadata || '{}')
    } catch (error) {
      // Log the error in development but don't crash the application
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to parse event metadata:', error)
      }
      metadata = {}
    }

    return {
      promptId: row.prompt_id,
      value: row.value,
      comment: row.comment,
      timestamp: row.timestamp,
      userId: row.user_id,
      metadata,
      promptText: row.prompt_text,
      aiOutput: row.ai_output,
      modelUsed: row.model_used,
      responseTime: row.response_time
    }
  }

  close(): void {
    this.db.close()
  }
} 