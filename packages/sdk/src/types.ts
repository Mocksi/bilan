/**
 * Branded types for better type safety and preventing ID confusion.
 */
export type UserId = string & { __brand: 'UserId' }
export type ConversationId = string & { __brand: 'ConversationId' }
export type EventId = string & { __brand: 'EventId' }
export type TurnId = string & { __brand: 'TurnId' }

// Import privacy types for use in config
import type { PrivacyConfig } from './events/privacy-controls'

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
 * Core event interface for flexible analytics with optional relationship context
 */
export interface Event {
  eventId: EventId
  eventType: EventType
  timestamp: number
  userId: UserId
  properties: Record<string, any>
  
  // Optional contextual relationships
  journey_id?: string
  conversation_id?: string
  turn_id?: string
  turn_sequence?: number
  
  promptText?: string
  aiResponse?: string
}

/**
 * Enhanced context parameter for trackTurn method
 */
export interface TurnContext {
  systemPromptVersion?: string
  journey_id?: string        // Optional journey context
  conversation_id?: string   // Optional conversation context  
  turn_sequence?: number     // Order within conversation
  [key: string]: any         // Allow additional custom properties
}

/**
 * Event for AI turn tracking (core v0.4.0 feature)
 */
export interface TurnEvent extends Event {
  eventType: 'turn_started' | 'turn_completed' | 'turn_failed'
  turn_id: string           // Always present for turn events
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
 * Event for vote casting - updated to use turn_id instead of promptId
 */
export interface VoteCastEvent extends Event {
  eventType: 'vote_cast'
  turn_id: string           // Required - inherits from trackTurn
  properties: {
    turn_id: string         // Use turn_id instead of promptId
    value: 1 | -1
    comment?: string
    timestamp: number
    [key: string]: any
  }
  // Automatically inherits journey_id, conversation_id if turn had them
}

/**
 * Configuration options for initializing the Bilan SDK.
 */
export interface InitConfig {
  mode: 'local' | 'server'
  userId: UserId
  endpoint?: string
  debug?: boolean
  storage?: StorageAdapter

  telemetry?: {
    enabled?: boolean
    endpoint?: string
  }
  privacyConfig?: PrivacyConfig
  eventBatching?: {
    batchSize?: number
    flushInterval?: number
    maxBatches?: number
  }
}

/**
 * Event queue configuration for batching and offline support
 */
export interface EventQueue {
  events: Event[]
  maxSize: number
  flushInterval: number
}

/**
 * Interface for custom storage adapters.
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Helper functions to create branded types
 */
export const createUserId = (id: string): UserId => id as UserId
export const createConversationId = (id: string): ConversationId => id as ConversationId

/**
 * Generate unique IDs
 */
export const generateEventId = (): EventId => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as EventId
export const generateTurnId = (): TurnId => `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as TurnId 