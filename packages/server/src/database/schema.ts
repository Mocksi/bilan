import Database from 'better-sqlite3'

/**
 * Legacy VoteEvent interface for backward compatibility
 * TODO: Remove when v0.3.x compatibility is no longer needed
 */
export interface VoteEvent {
  promptId: string
  value: 1 | -1
  comment?: string
  timestamp: number
  userId: string
  metadata?: Record<string, any>
  promptText?: string
  aiOutput?: string
  modelUsed?: string
  responseTime?: number
}

/**
 * Event types supported by the unified events table
 */
export const EVENT_TYPES = {
  // Core AI interaction events
  TURN_CREATED: 'turn_created',
  TURN_COMPLETED: 'turn_completed',
  TURN_FAILED: 'turn_failed',
  
  // User interaction events
  USER_ACTION: 'user_action',
  VOTE_CAST: 'vote_cast',
  
  // Workflow and journey events
  JOURNEY_STEP: 'journey_step',
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_ENDED: 'conversation_ended',
  
  // Quality signals
  REGENERATION_REQUESTED: 'regeneration_requested',
  FRUSTRATION_DETECTED: 'frustration_detected'
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

/**
 * Validation helpers for event data
 */

/**
 * Validate event type against allowed types
 */
export function isValidEventType(eventType: string): eventType is EventType {
  return Object.values(EVENT_TYPES).includes(eventType as EventType)
}

/**
 * Validate timestamp (must be positive integer)
 */
export function isValidTimestamp(timestamp: number): boolean {
  return Number.isInteger(timestamp) && timestamp > 0
}

/**
 * Validate event properties (must be valid JSON object)
 */
export function isValidProperties(properties: any): boolean {
  if (typeof properties !== 'object' || properties === null) {
    return false
  }
  
  try {
    JSON.stringify(properties)
    return true
  } catch {
    return false
  }
}

/**
 * Validate complete event object
 */
export function validateEvent(event: Event): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!event.event_id || typeof event.event_id !== 'string') {
    errors.push('event_id must be a non-empty string')
  }

  if (!event.user_id || typeof event.user_id !== 'string') {
    errors.push('user_id must be a non-empty string')
  }

  if (!isValidEventType(event.event_type)) {
    errors.push(`event_type must be one of: ${Object.values(EVENT_TYPES).join(', ')}`)
  }

  if (!isValidTimestamp(event.timestamp)) {
    errors.push('timestamp must be a positive integer')
  }

  if (!isValidProperties(event.properties)) {
    errors.push('properties must be a valid JSON object')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Unified event structure for flexible AI analytics
 */
export interface Event {
  event_id: string
  user_id: string
  event_type: EventType
  timestamp: number
  properties: Record<string, any>
  prompt_text?: string | null
  ai_response?: string | null
}

export class BilanDatabase {
  private db: Database.Database

  constructor(dbPath: string = './bilan.db') {
    this.db = new Database(dbPath)
    this.init()
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN (
          'turn_created', 'turn_completed', 'turn_failed',
          'user_action', 'vote_cast', 'journey_step',
          'conversation_started', 'conversation_ended',
          'regeneration_requested', 'frustration_detected'
        )),
        timestamp BIGINT NOT NULL CHECK (timestamp > 0),
        properties TEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(properties)),
        prompt_text TEXT,
        ai_response TEXT
      );
      
      -- Create indexes separately for better SQLite compatibility
      CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
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

  /**
   * Insert a new event into the unified events table
   */
  insertEvent(event: Event): void {
    // Validate event before insertion
    const validation = validateEvent(event)
    if (!validation.valid) {
      throw new Error(`Invalid event data: ${validation.errors.join(', ')}`)
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (event_id, user_id, event_type, timestamp, properties, prompt_text, ai_response)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      event.event_id,
      event.user_id,
      event.event_type,
      event.timestamp,
      JSON.stringify(event.properties || {}),
      event.prompt_text || null,
      event.ai_response || null
    )
  }

  /**
   * Insert multiple events in a single transaction for better performance
   */
  insertEvents(events: Event[]): void {
    if (events.length === 0) return

    // Validate all events before insertion
    for (const event of events) {
      const validation = validateEvent(event)
      if (!validation.valid) {
        throw new Error(`Invalid event data: ${validation.errors.join(', ')}`)
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (event_id, user_id, event_type, timestamp, properties, prompt_text, ai_response)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((events: Event[]) => {
      for (const event of events) {
        stmt.run(
          event.event_id,
          event.user_id,
          event.event_type,
          event.timestamp,
          JSON.stringify(event.properties || {}),
          event.prompt_text || null,
          event.ai_response || null
        )
      }
    })
    
    transaction(events)
  }

  /**
   * Legacy method for backward compatibility with VoteEvent
   * Maps old vote structure to new event structure
   */
  insertVoteEvent(event: VoteEvent): void {
    const unifiedEvent: Event = {
      event_id: crypto.randomUUID(),
      user_id: event.userId,
      event_type: EVENT_TYPES.VOTE_CAST,
      timestamp: event.timestamp,
      properties: {
        prompt_id: event.promptId,
        value: event.value,
        comment: event.comment,
        model_used: event.modelUsed,
        response_time: event.responseTime,
        ...event.metadata
      },
      prompt_text: event.promptText,
      ai_response: event.aiOutput
    }
    
    this.insertEvent(unifiedEvent)
  }

  /**
   * Get events with flexible filtering and pagination
   */
  getEvents(filters: { 
    userId?: string
    eventType?: EventType | EventType[]
    startTimestamp?: number
    endTimestamp?: number
    limit?: number
    offset?: number
  } = {}): Event[] {
    const { userId, eventType, startTimestamp, endTimestamp, limit = 100, offset = 0 } = filters
    
    let sql = 'SELECT * FROM events WHERE 1=1'
    const params: any[] = []
    
    if (userId) {
      sql += ' AND user_id = ?'
      params.push(userId)
    }
    
    if (eventType) {
      if (Array.isArray(eventType)) {
        sql += ` AND event_type IN (${eventType.map(() => '?').join(', ')})`
        params.push(...eventType)
      } else {
        sql += ' AND event_type = ?'
        params.push(eventType)
      }
    }

    if (startTimestamp) {
      sql += ' AND timestamp >= ?'
      params.push(startTimestamp)
    }

    if (endTimestamp) {
      sql += ' AND timestamp <= ?'
      params.push(endTimestamp)
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const rows = this.query(sql, params)
    return rows.map(this.mapRowToEvent)
  }

  /**
   * Get event count with filtering
   */
  getEventsCount(filters: { 
    userId?: string
    eventType?: EventType | EventType[]
    startTimestamp?: number
    endTimestamp?: number
  } = {}): number {
    const { userId, eventType, startTimestamp, endTimestamp } = filters
    
    let sql = 'SELECT COUNT(*) as count FROM events WHERE 1=1'
    const params: any[] = []
    
    if (userId) {
      sql += ' AND user_id = ?'
      params.push(userId)
    }
    
    if (eventType) {
      if (Array.isArray(eventType)) {
        sql += ` AND event_type IN (${eventType.map(() => '?').join(', ')})`
        params.push(...eventType)
      } else {
        sql += ' AND event_type = ?'
        params.push(eventType)
      }
    }

    if (startTimestamp) {
      sql += ' AND timestamp >= ?'
      params.push(startTimestamp)
    }

    if (endTimestamp) {
      sql += ' AND timestamp <= ?'
      params.push(endTimestamp)
    }
    
    const result = this.queryOne(sql, params)
    return result?.count || 0
  }

  /**
   * Legacy method for backward compatibility
   * Maps old vote queries to new event structure
   */
  getVoteEvents(filters: { 
    userId?: string; 
    promptId?: string; 
    limit?: number; 
    offset?: number;
    startTimestamp?: number;
    endTimestamp?: number;
  } = {}): VoteEvent[] {
    const { promptId, ...eventFilters } = filters
    
    const events = this.getEvents({
      ...eventFilters,
      eventType: EVENT_TYPES.VOTE_CAST
    })
    
    return events
      .filter(event => !promptId || event.properties.prompt_id === promptId)
      .map(this.mapEventToVote)
  }

  private mapRowToEvent(row: any): Event {
    let properties = {}
    try {
      properties = JSON.parse(row.properties || '{}')
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to parse event properties:', error)
      }
      properties = {}
    }

    return {
      event_id: row.event_id,
      user_id: row.user_id,
      event_type: row.event_type,
      timestamp: row.timestamp,
      properties,
      prompt_text: row.prompt_text,
      ai_response: row.ai_response
    }
  }

  private mapEventToVote(event: Event): VoteEvent {
    return {
      promptId: event.properties.prompt_id,
      value: event.properties.value,
      comment: event.properties.comment,
      timestamp: event.timestamp,
      userId: event.user_id,
      metadata: event.properties,
      promptText: event.prompt_text || undefined,
      aiOutput: event.ai_response || undefined,
      modelUsed: event.properties.model_used,
      responseTime: event.properties.response_time
    }
  }

  close(): void {
    this.db.close()
  }
} 