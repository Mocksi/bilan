/**
 * Current v0.3.x database schema types
 */
export interface V3VoteEvent {
  id: string
  user_id: string
  prompt_id: string
  value: number
  comment: string | null
  timestamp: number
  metadata: string // JSON string
  prompt_text: string | null
  ai_output: string | null
  model_used: string | null
  response_time: number | null
}

/**
 * Target v0.4.0 database schema types
 */
export interface V4Event {
  event_id: string
  user_id: string
  event_type: string
  timestamp: number
  properties: Record<string, any> // JSONB
  prompt_text: string | null
  ai_response: string | null
}

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  sourceDbPath: string
  targetDbPath: string
  dryRun?: boolean
  batchSize?: number
  validate?: boolean
  verbose?: boolean
}

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  phase: 'extraction' | 'conversion' | 'validation' | 'complete'
  total: number
  processed: number
  errors: string[]
  startTime: number
  estimatedTimeRemaining?: number
}

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalEvents: number
    eventTypes: Record<string, number>
    dateRange: { start: number; end: number }
  }
}

/**
 * Migration statistics
 */
export interface MigrationStats {
  v3Stats: {
    totalVotes: number
    uniqueUsers: number
    uniquePrompts: number
    dateRange: { start: number; end: number }
  }
  v4Stats: {
    totalEvents: number
    eventTypes: Record<string, number>
    uniqueUsers: number
    dateRange: { start: number; end: number }
  }
  conversionSummary: {
    votesToVoteCast: number
    metadataPreserved: number
    contentPreserved: number
    errorsEncountered: number
  }
} 