import { InitConfig, UserId, PromptId, ConversationId, createUserId, createPromptId, createConversationId, generateTurnId, generateEventId } from './types'
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
            // Handle event flushing - for now just log in debug mode
            if (config.debug) {
              console.log('Bilan: Flushing events:', events)
            }
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
  private validateConfig(config: InitConfig) {
    if (!config.mode || !['local', 'server'].includes(config.mode)) {
      throw new Error('Invalid mode. Must be "local" or "server".')
    }

    if (!config.userId) {
      throw new Error('userId is required.')
    }

    if (config.mode === 'server' && !config.endpoint) {
      throw new Error('endpoint is required for server mode.')
    }
  }

  /**
   * Track a turn (AI interaction) with automatic failure detection
   */
  async trackTurn<T>(
    prompt: string,
    aiFunction: () => Promise<T>,
    properties?: Record<string, any> & { systemPromptVersion?: string },
    options?: { timeout?: number; retries?: number }
  ): Promise<T> {
    if (!this.isInitialized) {
      // Graceful degradation - just execute the AI function without tracking
      return await aiFunction()
    }
    
    if (!this.turnTracker) {
      await this.loadEventSystem()
      
      // Create event queue manager
      const { EventQueueManager } = await import('./events/event-queue')
      const eventQueue = new EventQueueManager(
        this.config!,
        this.storage,
        async (events) => {
          // Handle event flushing - for now just log in debug mode
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
    
    // Set timeout if provided
    if (options?.timeout) {
      this.turnTracker.setTimeoutMs(options.timeout)
    }
    
    return this.turnTracker.trackTurn(prompt, aiFunction, properties)
  }

  /**
   * Track a turn with retry logic
   */
  async trackTurnWithRetry<T>(
    prompt: string,
    aiFunction: () => Promise<T>,
    properties?: Record<string, any> & { systemPromptVersion?: string },
    maxRetries: number = 3
  ): Promise<T> {
    if (!this.isInitialized) {
      // Graceful degradation - just execute the AI function without tracking
      return await aiFunction()
    }
    
    if (!this.turnTracker) {
      await this.loadEventSystem()
      
      // Create event queue manager
      const { EventQueueManager } = await import('./events/event-queue')
      const eventQueue = new EventQueueManager(
        this.config!,
        this.storage,
        async (events) => {
          // Handle event flushing - for now just log in debug mode
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
    
    return this.turnTracker.trackTurnWithRetry(prompt, aiFunction, properties, maxRetries)
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
   * Cast a vote on a prompt/response
   */
  async vote(promptId: string, value: 1 | -1, comment?: string): Promise<void> {
    await this.track('vote_cast', {
      prompt_id: promptId,
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
  prompt: string,
  aiFunction: () => Promise<T>,
  properties?: Record<string, any> & { systemPromptVersion?: string },
  options?: { timeout?: number; retries?: number }
): Promise<T> => sdk.trackTurn(prompt, aiFunction, properties, options)

/**
 * Track a turn with retry logic
 */
export const trackTurnWithRetry = <T>(
  prompt: string,
  aiFunction: () => Promise<T>,
  properties?: Record<string, any> & { systemPromptVersion?: string },
  maxRetries?: number
): Promise<T> => sdk.trackTurnWithRetry(prompt, aiFunction, properties, maxRetries)

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
 * Cast a vote on a prompt/response
 */
export const vote = (promptId: string, value: 1 | -1, comment?: string): Promise<void> => 
  sdk.vote(promptId, value, comment)

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
export type { InitConfig, UserId, PromptId, ConversationId, Event, TurnEvent, UserActionEvent, VoteCastEvent } from './types'
export { createUserId, createPromptId, createConversationId, generateTurnId, generateEventId } from './types'
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