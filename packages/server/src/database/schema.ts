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
 * Unified event structure for flexible AI analytics with v0.4.1 relationship support
 */
export interface Event {
  event_id: string
  user_id: string
  event_type: EventType
  timestamp: number
  properties: Record<string, any>
  prompt_text?: string | null
  ai_response?: string | null
  // v0.4.1: Optional relationship fields for contextual analytics
  journey_id?: string | null
  conversation_id?: string | null
  turn_sequence?: number | null
  turn_id?: string | null
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
        ai_response TEXT,
        -- v0.4.1: Optional relationship fields for contextual analytics
        journey_id TEXT,
        conversation_id TEXT,
        turn_sequence INTEGER,
        turn_id TEXT
      );
      
      -- Create indexes separately for better SQLite compatibility
      CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      -- v0.4.1: Relationship indexes for contextual queries
      CREATE INDEX IF NOT EXISTS idx_events_journey ON events(journey_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_conversation ON events(conversation_id, turn_sequence, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_turn_context ON events(turn_id, timestamp);
    `)
  }

  // Simple query method for direct SQL access
  query(sql: string, params: any[] = []): any[] {
    return this.db.prepare(sql).all(...params)
  }

  // Raw SQL execution for testing purposes (bypasses validation)
  executeRaw(sql: string, params: any[] = []): void {
    // Security: Only allow raw SQL execution in non-production environments
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'executeRaw() is disabled in production for security. This method bypasses validation and should only be used in development/testing environments.'
      )
    }

    // Additional safety check for common production indicators
    if (process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME) {
      throw new Error(
        'executeRaw() is disabled in hosted environments. This method is intended for local development and testing only.'
      )
    }

    this.db.prepare(sql).run(...params)
  }

  // Single row query
  queryOne(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).get(...params)
  }

  /**
   * Insert a new event into the unified events table with v0.4.1 relationship support
   */
  insertEvent(event: Event): void {
    // Validate event before insertion
    const validation = validateEvent(event)
    if (!validation.valid) {
      throw new Error(`Invalid event data: ${validation.errors.join(', ')}`)
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (
        event_id, user_id, event_type, timestamp, properties, 
        prompt_text, ai_response, journey_id, conversation_id, turn_sequence, turn_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      event.event_id,
      event.user_id,
      event.event_type,
      event.timestamp,
      JSON.stringify(event.properties || {}),
      event.prompt_text || null,
      event.ai_response || null,
      event.journey_id || null,
      event.conversation_id || null,
      event.turn_sequence || null,
      event.turn_id || null
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
      INSERT INTO events (
        event_id, user_id, event_type, timestamp, properties, 
        prompt_text, ai_response, journey_id, conversation_id, turn_sequence, turn_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          event.ai_response || null,
          event.journey_id || null,
          event.conversation_id || null,
          event.turn_sequence || null,
          event.turn_id || null
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
        turn_id: event.promptId, // Map promptId to turn_id for consistency
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
    turnId?: string
    startTimestamp?: number
    endTimestamp?: number
    limit?: number
    offset?: number
  } = {}): Event[] {
    const { userId, eventType, turnId, startTimestamp, endTimestamp, limit = 100, offset = 0 } = filters
    
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

    if (turnId) {
      sql += ' AND JSON_EXTRACT(properties, "$.turn_id") = ?'
      params.push(turnId)
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
    turnId?: string
    startTimestamp?: number
    endTimestamp?: number
  } = {}): number {
    const { userId, eventType, turnId, startTimestamp, endTimestamp } = filters
    
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

    if (turnId) {
      sql += ' AND JSON_EXTRACT(properties, "$.turn_id") = ?'
      params.push(turnId)
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
   * Get all events associated with a specific turn ID
   */
  getEventsByTurnId(turnId: string): Event[] {
    const sql = `
      SELECT * FROM events 
      WHERE turn_id = ? 
         OR JSON_EXTRACT(properties, '$.turn_id') = ?
         OR JSON_EXTRACT(properties, '$.turnId') = ?
      ORDER BY timestamp ASC
    `
    
    const rows = this.query(sql, [turnId, turnId, turnId])
    return rows.map(this.mapRowToEvent)
  }

  /**
   * Get vote events with optional filtering for backward compatibility
   * Supports both new turn_id and legacy promptId filtering
   */
  getVoteEvents(filters: { 
    userId?: string; 
    promptId?: string;  // Legacy support
    turnId?: string;    // New turn_id support
  } = {}): VoteEvent[] {
    const { promptId, turnId, ...eventFilters } = filters
    
    const events = this.getEvents({ 
      eventType: EVENT_TYPES.VOTE_CAST,
      limit: 10000,
      ...eventFilters
    })
    
    return events
      // Filter by turn_id if provided (new approach)
      .filter(event => !turnId || event.properties.turn_id === turnId)
      // Filter by promptId for legacy compatibility (maps to turn_id)
      .filter(event => !promptId || event.properties.turn_id === promptId)
      .map(event => ({
        promptId: event.properties.turn_id || event.properties.prompt_id, // Return as promptId for backward compatibility
        value: event.properties.value,
        comment: event.properties.comment,
        timestamp: event.timestamp,
        userId: event.user_id,
        metadata: event.properties,
        promptText: event.prompt_text || undefined,
        aiOutput: event.ai_response || undefined,
        modelUsed: event.properties.model_used || event.properties.modelUsed || undefined,
        responseTime: event.properties.response_time || event.properties.responseTime || undefined
      }))
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
      ai_response: row.ai_response,
      // v0.4.1: Include relationship fields
      journey_id: row.journey_id,
      conversation_id: row.conversation_id,
      turn_sequence: row.turn_sequence,
      turn_id: row.turn_id
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

  /**
   * v0.4.1: Validate that the turn ID migration completed successfully
   */
  validateTurnIdMigration(): { success: boolean; details: any } {
    try {
      const results = this.db.prepare(`
        SELECT 
          COUNT(*) as total_votes,
          COUNT(CASE WHEN JSON_EXTRACT(properties, '$.turn_id') IS NOT NULL THEN 1 END) as votes_with_turn_id,
          COUNT(CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 END) as votes_with_promptId_remaining,
          COUNT(CASE WHEN JSON_EXTRACT(properties, '$.prompt_id') IS NOT NULL THEN 1 END) as votes_with_legacy_prompt_id
        FROM events 
        WHERE event_type = 'vote_cast'
      `).get() as any

      const success = (results?.total_votes || 0) > 0 &&
                     (results?.votes_with_promptId_remaining || 0) === 0 && 
                     (results?.votes_with_turn_id || 0) >= (results?.votes_with_legacy_prompt_id || 0)

      return {
        success,
        details: {
          totalVotes: results?.total_votes || 0,
          votesWithTurnId: results?.votes_with_turn_id || 0,
          votesWithPromptIdRemaining: results?.votes_with_promptId_remaining || 0,
          votesWithLegacyPromptId: results?.votes_with_legacy_prompt_id || 0,
          migrationComplete: success
        }
      }
    } catch (error) {
      return {
        success: false,
        details: { error: (error as Error).message }
      }
    }
  }

  /**
   * v0.4.1: Validate relationship data capture is working
   */
  validateRelationshipCapture(timeRangeHours: number = 24): { success: boolean; details: any } {
    try {
      const sinceTimestamp = Date.now() - (timeRangeHours * 60 * 60 * 1000)
      
      const results = this.db.prepare(`
        SELECT 
          event_type,
          COUNT(*) as total_events,
          COUNT(journey_id) as events_with_journey,
          COUNT(conversation_id) as events_with_conversation,
          COUNT(turn_sequence) as events_with_sequence,
          COUNT(CASE WHEN journey_id IS NOT NULL OR conversation_id IS NOT NULL THEN 1 END) as events_with_relationships
        FROM events 
        WHERE timestamp >= ?
        GROUP BY event_type
        ORDER BY total_events DESC
      `).all(sinceTimestamp)

      const totalEvents = results.reduce((sum: number, row: any) => sum + (row.total_events || 0), 0)
      const eventsWithRelationships = results.reduce((sum: number, row: any) => sum + (row.events_with_relationships || 0), 0)
      
      return {
        success: true,
        details: {
          timeRangeHours,
          totalEvents,
          eventsWithRelationships,
          relationshipCaptureRate: totalEvents > 0 ? (eventsWithRelationships / totalEvents) * 100 : 0,
          byEventType: results
        }
      }
    } catch (error) {
      return {
        success: false,
        details: { error: (error as Error).message }
      }
    }
  }

  /**
   * v0.4.1: Basic turn-vote correlation for debugging and validation
   */
  getTurnVoteCorrelation(turnId: string): any {
    try {
      const result = this.db.prepare(`
        SELECT 
          t.event_id as turn_event_id,
          t.timestamp as turn_timestamp,
          t.properties as turn_properties,
          v.event_id as vote_event_id,
          v.timestamp as vote_timestamp,
          JSON_EXTRACT(v.properties, '$.value') as vote_value,
          JSON_EXTRACT(v.properties, '$.comment') as vote_comment,
          -- Optional relationship context
          t.journey_id,
          t.conversation_id,
          t.turn_sequence
        FROM events t
        LEFT JOIN events v ON (
          COALESCE(JSON_EXTRACT(t.properties, '$.turnId'), JSON_EXTRACT(t.properties, '$.turn_id')) = 
          JSON_EXTRACT(v.properties, '$.turn_id')
        ) AND v.event_type = 'vote_cast'
        WHERE (
          JSON_EXTRACT(t.properties, '$.turnId') = ? OR 
          JSON_EXTRACT(t.properties, '$.turn_id') = ?
        )
        AND t.event_type IN ('turn_created', 'turn_completed', 'turn_failed')
        ORDER BY t.timestamp DESC
        LIMIT 1
      `).get(turnId, turnId)

      return result || null
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to get turn-vote correlation:', error)
      }
      return null
    }
  }

  close(): void {
    this.db.close()
  }
} 