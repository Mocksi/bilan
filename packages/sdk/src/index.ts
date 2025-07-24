import { InitConfig, UserId, ConversationId, createUserId, createConversationId, generateTurnId, generateEventId, TurnContext } from './types'
import { LocalStorageAdapter } from './storage/local-storage'

import { ErrorHandler } from './error-handling'

// Dynamic imports for heavy features
let eventTracker: any = null
let turnTracker: any = null

/**
 * Bilan SDK for tracking user feedback on AI suggestions and calculating trust metrics.
 */
class BilanSDK {
  private config: InitConfig | null = null
  private storage: any = null
  private analytics: any = null
  private isInitialized = false
  private turnTracker: any = null

  constructor() {
    this.storage = new LocalStorageAdapter()
  }

  private async sendEventsToServer(events: any[], c: InitConfig) {
    if (c.mode === 'server' && c.endpoint && events.length) {
      try {
        const r = await fetch(c.endpoint + '/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey },
          body: JSON.stringify({ events })
        })
        !r.ok ? console.error('Bilan:', r.status) : c.debug && console.log('Bilan:', events.length)
      } catch (e) {
        console.error('Bilan:', e)
      }
    }
  }

  /**
   * Lazy load event system components
   */
  private async loadEventSystem() {
    if (!eventTracker) {
      const { EventTracker, TurnTracker } = await import('./events')
      eventTracker = EventTracker
      turnTracker = TurnTracker
    }
  }

  /**
   * Initialize the Bilan SDK with configuration options.
   */
  async init(config: InitConfig): Promise<void> {
    try {
      this.validateConfig(config)
      this.config = config
      
      // Initialize storage
      if (config.storage) {
        this.storage = config.storage
      }
      
      // Initialize event system if privacy config is provided
      if (config.privacyConfig) {
        await this.loadEventSystem()
        
        // Create event queue manager
        const { EventQueueManager } = await import('./events/event-queue')
        const eventQueue = new EventQueueManager(
          config,
          this.storage,
                  async (events) => {
          config.debug && console.log('Bilan:', events.length)
          await this.sendEventsToServer(events, config)
        }
        )
        
        this.turnTracker = new turnTracker(
          new eventTracker(config, eventQueue), 
          config
        )
      }
      
      this.isInitialized = true
      ErrorHandler.setDebugMode(config.debug || false)
      
    } catch (error) {
      const bilanError = ErrorHandler.handleInitError(error as Error, config)
      if (config.debug) {
        throw bilanError
      }
      ErrorHandler.log(bilanError, 'init')
    }
  }

  /**
   * Validate configuration options.
   */
  private validateConfig(c: InitConfig) {
    if (!c.mode || !['local', 'server'].includes(c.mode)) throw new Error('Invalid mode')
    if (!c.userId) throw new Error('userId required')
    if (c.mode === 'server' && (!c.endpoint || !c.apiKey)) throw new Error('endpoint/apiKey required')
  }

  /**
   * Track a turn (AI interaction) with automatic failure detection
   */
  async trackTurn<T>(
    promptText: string,
    aiCall: () => Promise<T>,
    context?: TurnContext,
    options?: { timeout?: number; retries?: number }
  ): Promise<{ result: T, turnId: string }> {
    if (!this.isInitialized) {
      // Graceful degradation - just execute the AI function without tracking
      const result = await aiCall()
      return { result, turnId: '' }
    }
    
    if (!this.turnTracker) {
      await this.loadEventSystem()
      
      // Create event queue manager
      const { EventQueueManager } = await import('./events/event-queue')
      const eventQueue = new EventQueueManager(
        this.config!,
        this.storage,
        async (events) => {
          if (this.config?.debug) {
            console.log('Bilan: Flushing events:', events)
          }
          if (this.config) {
            await this.sendEventsToServer(events, this.config)
          }
        }
      )
      
      this.turnTracker = new turnTracker(
        new eventTracker(this.config!, eventQueue), 
        this.config!
      )
    }
    
    // Set timeout if provided
    if (options?.timeout) {
      this.turnTracker.setTimeoutMs(options.timeout)
    }
    
    // Convert context to properties for backward compatibility with turn tracker
    const properties = {
      ...(context || {}),
      systemPromptVersion: context?.systemPromptVersion
    }
    
    const result = await this.turnTracker.trackTurn(promptText, aiCall, properties)
    const turnId = this.turnTracker.getLastTurnId()
    
    return { result, turnId }
  }

  /**
   * Track a turn with retry logic
   */
  async trackTurnWithRetry<T>(
    promptText: string,
    aiCall: () => Promise<T>,
    context?: TurnContext,
    maxRetries: number = 3
  ): Promise<{ result: T, turnId: string }> {
    if (!this.isInitialized) {
      const result = await aiCall()
      return { result, turnId: '' }
    }
    
    if (!this.turnTracker) {
      await this.loadEventSystem()
      
      // Create event queue manager
      const { EventQueueManager } = await import('./events/event-queue')
      const eventQueue = new EventQueueManager(
        this.config!,
        this.storage,
        async (events) => {
          if (this.config?.debug) {
            console.log('Bilan: Flushing events:', events)
          }
          if (this.config) {
            await this.sendEventsToServer(events, this.config)
          }
        }
      )
      
      this.turnTracker = new turnTracker(
        new eventTracker(this.config!, eventQueue), 
        this.config!
      )
    }
    
    // Convert context to properties for backward compatibility with turn tracker
    const properties = {
      ...(context || {}),
      systemPromptVersion: context?.systemPromptVersion
    }
    
    const result = await this.turnTracker.trackTurnWithRetry(promptText, aiCall, properties, maxRetries)
    const turnId = this.turnTracker.getLastTurnId()
    
    return { result, turnId }
  }





  /**
   * Core method to track any event type
   */
  async track(
    eventType: string,
    properties?: Record<string, any>,
    content?: { promptText?: string; aiResponse?: string; context?: string }
  ): Promise<void> {
    if (!this.isInitialized) {
      // Graceful degradation - log in debug mode but don't throw
      if (this.config?.debug) {
        console.warn('Bilan: SDK not initialized, skipping event tracking')
      }
      return
    }

    if (!this.turnTracker) {
      await this.loadEventSystem()
      
      // Create event queue manager
      const { EventQueueManager } = await import('./events/event-queue')
      const eventQueue = new EventQueueManager(
        this.config!,
        this.storage,
        async (events) => {
          if (this.config?.debug) {
            console.log('Bilan: Flushing events:', events)
          }
        }
      )
      
      this.turnTracker = new turnTracker(
        new eventTracker(this.config!, eventQueue), 
        this.config!
      )
    }

    // Get the event tracker from turn tracker
    const tracker = this.turnTracker.eventTracker
    await tracker.track(eventType as any, properties || {}, content)
  }

  /**
   * Start a conversation and return conversation ID
   */
  async startConversation(userId: string): Promise<string> {
    const conversationId = createConversationId(crypto.randomUUID())
    
    await this.track('conversation_started', {
      conversation_id: conversationId,
      user_id: userId,
      started_at: Date.now()
    })
    
    return conversationId
  }

  /**
   * Cast a vote on a turn using turnId
   */
  async vote(turnId: string, value: 1 | -1, comment?: string): Promise<void> {
    await this.track('vote_cast', {
      turn_id: turnId,  // Use turn_id instead of promptId
      value,
      ...(comment && { comment }),
      timestamp: Date.now()
    })
  }

  /**
   * Track a journey step completion
   */
  async trackJourneyStep(journeyName: string, stepName: string, userId: string): Promise<void> {
    await this.track('journey_step', {
      journey_name: journeyName,
      step_name: stepName,
      user_id: userId,
      completed_at: Date.now()
    })
  }

  /**
   * Record feedback on a conversation
   */
  async recordFeedback(conversationId: string, value: 1 | -1, comment?: string): Promise<void> {
    await this.track('user_action', {
      action_type: 'feedback',
      conversation_id: conversationId,
      value,
      ...(comment && { comment }),
      timestamp: Date.now()
    })
  }

  /**
   * Record a regeneration request
   */
  async recordRegeneration(conversationId: string, reason?: string): Promise<void> {
    await this.track('regeneration_requested', {
      conversation_id: conversationId,
      ...(reason && { reason }),
      timestamp: Date.now()
    })
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string, status: 'completed' | 'abandoned' = 'completed'): Promise<void> {
    await this.track('conversation_ended', {
      conversation_id: conversationId,
      status,
      ended_at: Date.now()
    })
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Get current configuration
   */
  getConfig(): InitConfig | null {
    return this.config
  }
}

// Global SDK instance
const sdk = new BilanSDK()

/**
 * Initialize the Bilan SDK
 */
export const init = (config: InitConfig): Promise<void> => sdk.init(config)

/**
 * Track a turn (AI interaction) with automatic failure detection
 */
export const trackTurn = <T>(
  promptText: string,
  aiFunction: () => Promise<T>,
  context?: TurnContext,
  options?: { timeout?: number; retries?: number }
): Promise<{ result: T, turnId: string }> => sdk.trackTurn(promptText, aiFunction, context, options)

/**
 * Track a turn with retry logic
 */
export const trackTurnWithRetry = <T>(
  promptText: string,
  aiFunction: () => Promise<T>,
  context?: TurnContext,
  maxRetries?: number
): Promise<{ result: T, turnId: string }> => sdk.trackTurnWithRetry(promptText, aiFunction, context, maxRetries)

/**
 * Core method to track any event type
 */
export const track = (
  eventType: string,
  properties?: Record<string, any>,
  content?: { promptText?: string; aiResponse?: string; context?: string }
): Promise<void> => sdk.track(eventType, properties, content)

/**
 * Start a conversation and return conversation ID
 */
export const startConversation = (userId: string): Promise<string> => sdk.startConversation(userId)

/**
 * Cast a vote on a turn using turnId
 */
export const vote = (turnId: string, value: 1 | -1, comment?: string): Promise<void> => 
  sdk.vote(turnId, value, comment)

/**
 * Track a journey step completion
 */
export const trackJourneyStep = (journeyName: string, stepName: string, userId: string): Promise<void> =>
  sdk.trackJourneyStep(journeyName, stepName, userId)

/**
 * Record feedback on a conversation
 */
export const recordFeedback = (conversationId: string, value: 1 | -1, comment?: string): Promise<void> =>
  sdk.recordFeedback(conversationId, value, comment)

/**
 * Record a regeneration request
 */
export const recordRegeneration = (conversationId: string, reason?: string): Promise<void> =>
  sdk.recordRegeneration(conversationId, reason)

/**
 * End a conversation
 */
export const endConversation = (conversationId: string, status: 'completed' | 'abandoned' = 'completed'): Promise<void> =>
  sdk.endConversation(conversationId, status)

/**
 * Check if SDK is ready
 */
export const isReady = (): boolean => sdk.isReady()

/**
 * Get current configuration
 */
export const getConfig = (): InitConfig | null => sdk.getConfig()

// Export types and utilities
export type { InitConfig, UserId, ConversationId, Event, TurnEvent, UserActionEvent, VoteCastEvent, TurnContext } from './types'
export { createUserId, createConversationId, generateTurnId, generateEventId } from './types'
export { PrivacyUtils } from './events/privacy-controls'
export { ErrorHandler } from './error-handling'

// Export the SDK class for advanced usage
export { BilanSDK }
export default sdk

// Test helper function
export const resetSDKForTesting = () => {
  sdk['isInitialized'] = false
  sdk['config'] = null
  sdk['storage'] = null
  sdk['turnTracker'] = null
  // Clear any module-level state
  eventTracker = null
  turnTracker = null
} 