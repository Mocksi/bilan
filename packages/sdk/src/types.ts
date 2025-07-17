/**
 * Branded types for better type safety and preventing ID confusion.
 * These help ensure you don't accidentally pass a user ID where a prompt ID is expected.
 */
export type UserId = string & { __brand: 'UserId' }
export type PromptId = string & { __brand: 'PromptId' }
export type ConversationId = string & { __brand: 'ConversationId' }

// Import privacy types for use in config
import type { PrivacyConfig } from './events/privacy-controls'

/**
 * New event-based architecture types for v0.4.0
 */
export type EventId = string & { __brand: 'EventId' }
export type TurnId = string & { __brand: 'TurnId' }

/**
 * Standard event types for consistent taxonomy
 */
export type EventType = 
  | 'turn_started'
  | 'turn_completed'
  | 'turn_failed'
  | 'user_action'
  | 'vote_cast'
  | 'journey_step'
  | 'conversation_started'
  | 'conversation_ended'
  | 'custom'

/**
 * Core event interface for flexible analytics
 */
export interface Event {
  /** Unique identifier for this event */
  eventId: EventId
  /** Type of event from standard taxonomy */
  eventType: EventType
  /** When the event occurred (milliseconds since epoch) */
  timestamp: number
  /** User who triggered this event */
  userId: UserId
  /** Flexible properties for any additional data */
  properties: Record<string, any>
  /** Optional user prompt text (privacy-controlled) */
  promptText?: string
  /** Optional AI response text (privacy-controlled) */
  aiResponse?: string
}

/**
 * Event for AI turn tracking (core v0.4.0 feature)
 */
export interface TurnEvent extends Event {
  eventType: 'turn_started' | 'turn_completed' | 'turn_failed'
  properties: {
    turnId: TurnId
    modelUsed?: string
    conversationId?: string
    responseTime?: number
    status?: 'success' | 'failed'
    errorType?: 'timeout' | 'rate_limit' | 'network_error' | 'context_limit' | 'unknown_error'
    errorMessage?: string
    retryCount?: number
    [key: string]: any
  }
}

/**
 * Event for user actions and interactions
 */
export interface UserActionEvent extends Event {
  eventType: 'user_action'
  properties: {
    actionType: string
    turnId?: TurnId
    conversationId?: string
    satisfaction?: 'high' | 'medium' | 'low'
    [key: string]: any
  }
}

/**
 * Event for vote casting (backward compatibility)
 */
export interface VoteCastEvent extends Event {
  eventType: 'vote_cast'
  properties: {
    promptId: PromptId
    value: 1 | -1
    comment?: string
    turnId?: TurnId
    conversationId?: string
    [key: string]: any
  }
}

/**
 * Configuration options for initializing the Bilan SDK.
 */
export interface InitConfig {
  /** 'local' for browser storage or 'server' for API endpoint */
  mode: 'local' | 'server'
  /** Unique identifier for the user */
  userId: UserId
  /** API endpoint URL (required for 'server' mode) */
  endpoint?: string
  /** Enable debug logging and error throwing */
  debug?: boolean
  /** Custom storage adapter (for 'local' mode) */
  storage?: StorageAdapter
  /** Configuration for trend calculation algorithm */
  trendConfig?: TrendConfig
  /** Configuration for anonymous usage analytics */
  telemetry?: {
    /** Enable/disable telemetry collection (default: enabled for server mode, disabled for local mode) */
    enabled?: boolean
    /** Custom endpoint for telemetry data (default: Bilan analytics endpoint) */
    endpoint?: string
  }
  
  /** Privacy controls for content capture */
  privacyConfig?: PrivacyConfig
  /** Capture user prompts in events (default: true) */
  capturePrompts?: boolean
  /** Capture AI responses in events (default: false) */
  captureResponses?: boolean
  /** Selective response capture for specific contexts */
  captureResponsesFor?: string[]
  /** Enable PII sanitization for captured content (default: true) */
  sanitizeContent?: boolean
  /** Event batching configuration */
  eventBatching?: {
    /** Maximum number of events to batch (default: 10) */
    batchSize?: number
    /** Maximum time to wait before flushing batch in ms (default: 5000) */
    flushInterval?: number
    /** Maximum number of batches to keep in memory (default: 5) */
    maxBatches?: number
  }
}

/**
 * Event queue configuration for batching and offline support
 */
export interface EventQueue {
  /** Events waiting to be sent */
  events: Event[]
  /** Maximum size of the queue */
  maxSize: number
  /** Whether to persist events to storage */
  persistent: boolean
}

/**
 * Represents a single user feedback event on an AI suggestion.
 */
export interface VoteEvent {
  /** Unique identifier for the AI prompt/suggestion */
  promptId: PromptId
  /** User feedback: 1 for positive (👍), -1 for negative (👎) */
  value: 1 | -1
  /** Optional text comment from the user */
  comment?: string
  /** Timestamp when the feedback was recorded (milliseconds since epoch) */
  timestamp: number
  /** Unique identifier for the user who provided feedback */
  userId: UserId
  /** Additional arbitrary data attached to the event */
  metadata?: Record<string, any>
  /** The original user prompt/question that led to the AI response */
  promptText?: string
  /** The complete AI response that was rated */
  aiOutput?: string
  /** Which AI model generated the response (e.g., 'gpt-4', 'claude-3') */
  modelUsed?: string
  /** How long the AI took to respond, in seconds */
  responseTime?: number
}

/**
 * Aggregate statistics for all user feedback.
 */
export interface BasicStats {
  /** Total number of votes recorded */
  totalVotes: number
  /** Ratio of positive votes (0.0 to 1.0) */
  positiveRate: number
  /** Trend based on recent vs historical feedback */
  recentTrend: 'improving' | 'declining' | 'stable'
  /** Most recent feedback comments (up to 5) */
  topFeedback: string[]
}

/**
 * Statistics for a specific AI prompt/suggestion.
 */
export interface PromptStats {
  /** The prompt ID these statistics are for */
  promptId: PromptId
  /** Number of votes for this specific prompt */
  totalVotes: number
  /** Ratio of positive votes for this prompt (0.0 to 1.0) */
  positiveRate: number
  /** All text comments for this prompt */
  comments: string[]
}

/**
 * Configuration options for the trend calculation algorithm.
 * Fine-tune how trends are detected based on your use case.
 */
export interface TrendConfig {
  /** Threshold for trend detection - lower = more sensitive (default: 0.1) */
  sensitivity?: number
  /** Hours for time decay - recent events weighted more heavily (default: 24) */
  timeWeightHours?: number
  /** Minimum events needed for reliable trend calculation (default: 5) */
  minSampleSize?: number
  /** Size of recent window compared to historical data (default: 10) */
  recentWindowSize?: number
}

/**
 * Interface for custom storage adapters.
 * Implement this to use custom storage backends (Redis, etc.).
 */
export interface StorageAdapter {
  /** Get a value by key */
  get(key: string): Promise<string | null>
  /** Set a value by key */
  set(key: string, value: string): Promise<void>
  /** Delete a value by key */
  delete(key: string): Promise<void>
  /** Clear all stored data */
  clear(): Promise<void>
}

/**
 * Basic conversation tracking data.
 */
export interface ConversationData {
  /** Unique identifier for the conversation */
  id: ConversationId
  /** User who participated in the conversation */
  userId: UserId
  /** When the conversation started (milliseconds since epoch) */
  startedAt: number
  /** When the conversation ended (milliseconds since epoch) */
  endedAt?: number
  /** Number of messages in the conversation */
  messageCount: number
  /** Final outcome of the conversation */
  outcome?: 'completed' | 'abandoned'
}

/**
 * Simple feedback events for quality signals.
 */
export interface FeedbackEvent {
  /** Conversation this feedback belongs to */
  conversationId: ConversationId
  /** Type of feedback event */
  type: 'frustration' | 'regeneration' | 'explicit_feedback'
  /** Feedback value (only for explicit feedback) */
  value?: 1 | -1
  /** When the feedback was recorded (milliseconds since epoch) */
  timestamp: number
}

/**
 * Journey step tracking data.
 */
export interface JourneyStep {
  /** Name of the journey (e.g., 'email-agent', 'code-assistant') */
  journeyName: string
  /** Name of the step within the journey */
  stepName: string
  /** User who completed this step */
  userId: UserId
  /** When the step was completed (milliseconds since epoch) */
  timestamp: number
}

/**
 * Helper function to create a branded UserId from a string.
 * 
 * @param id - The user identifier string
 * @returns Branded UserId type
 * 
 * @example
 * ```typescript
 * const userId = createUserId('user-123')
 * await init({ mode: 'local', userId })
 * ```
 */
export const createUserId = (id: string): UserId => id as UserId

/**
 * Helper function to create a branded PromptId from a string.
 * 
 * @param id - The prompt identifier string
 * @returns Branded PromptId type
 * 
 * @example
 * ```typescript
 * const promptId = createPromptId('prompt-abc')
 * await vote(promptId, 1, 'Great response!')
 * ```
 */
export const createPromptId = (id: string): PromptId => id as PromptId

/**
 * Helper function to create a branded ConversationId from a string.
 * 
 * @param id - The conversation identifier string
 * @returns Branded ConversationId type
 * 
 * @example
 * ```typescript
 * const conversationId = createConversationId('conv-123')
 * await addMessage(conversationId)
 * ```
 */
export const createConversationId = (id: string): ConversationId => id as ConversationId

/**
 * Helper function to create a branded EventId from a string.
 * 
 * @param id - The event identifier string
 * @returns Branded EventId type
 * 
 * @example
 * ```typescript
 * const eventId = createEventId('event-123')
 * const event = { eventId, eventType: 'turn_started', ... }
 * ```
 */
export const createEventId = (id: string): EventId => id as EventId

/**
 * Helper function to create a branded TurnId from a string.
 * 
 * @param id - The turn identifier string  
 * @returns Branded TurnId type
 * 
 * @example
 * ```typescript
 * const turnId = createTurnId('turn-123')
 * await trackTurn(prompt, aiCall, { turnId })
 * ```
 */
export const createTurnId = (id: string): TurnId => id as TurnId

/**
 * Helper function to generate a new unique EventId.
 * 
 * @returns New unique EventId
 * 
 * @example
 * ```typescript
 * const eventId = generateEventId()
 * const event = { eventId, eventType: 'user_action', ... }
 * ```
 */
export const generateEventId = (): EventId => createEventId(crypto.randomUUID())

/**
 * Helper function to generate a new unique TurnId.
 * 
 * @returns New unique TurnId
 * 
 * @example
 * ```typescript
 * const turnId = generateTurnId()
 * await trackTurn(prompt, aiCall, { turnId })
 * ```
 */
export const generateTurnId = (): TurnId => createTurnId(`turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

// Re-export privacy types
export type { CaptureLevel, PrivacyConfig } from './events/privacy-controls' 