/**
 * Branded types for better type safety and preventing ID confusion.
 * These help ensure you don't accidentally pass a user ID where a prompt ID is expected.
 */
export type UserId = string & { __brand: 'UserId' }
export type PromptId = string & { __brand: 'PromptId' }

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
  id: string
  /** User who participated in the conversation */
  userId: string
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
  conversationId: string
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
  userId: string
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