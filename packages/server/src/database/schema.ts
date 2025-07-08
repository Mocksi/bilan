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
      CREATE INDEX IF NOT EXISTS idx_events_model_used ON events(model_used);
    `)
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

  getEventsByUser(userId: string, limit: number = 1000): VoteEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
    
    const rows = stmt.all(userId, limit) as any[]
    return rows.map(row => ({
      promptId: row.prompt_id,
      value: row.value,
      comment: row.comment,
      timestamp: row.timestamp,
      userId: row.user_id,
      metadata: JSON.parse(row.metadata || '{}'),
      promptText: row.prompt_text,
      aiOutput: row.ai_output,
      modelUsed: row.model_used,
      responseTime: row.response_time
    }))
  }

  getEventsByPrompt(promptId: string, limit: number = 1000): VoteEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      WHERE prompt_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
    
    const rows = stmt.all(promptId, limit) as any[]
    return rows.map(row => ({
      promptId: row.prompt_id,
      value: row.value,
      comment: row.comment,
      timestamp: row.timestamp,
      userId: row.user_id,
      metadata: JSON.parse(row.metadata || '{}'),
      promptText: row.prompt_text,
      aiOutput: row.ai_output,
      modelUsed: row.model_used,
      responseTime: row.response_time
    }))
  }

  getAllEvents(limit: number = 100, offset: number = 0): VoteEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `)
    
    const rows = stmt.all(limit, offset) as any[]
    return rows.map(row => ({
      promptId: row.prompt_id,
      value: row.value,
      comment: row.comment,
      timestamp: row.timestamp,
      userId: row.user_id,
      metadata: JSON.parse(row.metadata || '{}'),
      promptText: row.prompt_text,
      aiOutput: row.ai_output,
      modelUsed: row.model_used,
      responseTime: row.response_time
    }))
  }

  close(): void {
    this.db.close()
  }
} 