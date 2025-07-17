import { InitConfig, VoteEvent, BasicStats, PromptStats, StorageAdapter, TrendConfig, UserId, PromptId, ConversationId, createUserId, createPromptId, createConversationId, ConversationData, FeedbackEvent, JourneyStep, Event, EventType } from './types'
import { LocalStorageAdapter } from './storage/local-storage'
import { BasicAnalytics } from './analytics/basic-analytics'
import { initTelemetry, trackVote, trackStatsRequest, trackError } from './telemetry'
import { ErrorHandler, GracefulDegradation } from './error-handling'
import { EventTracker, EventQueueManager, TurnTracker } from './events'

/**
 * Bilan SDK for tracking user feedback on AI suggestions and calculating trust metrics.
 * 
 * @example
 * ```typescript
 * import { init, vote, getStats } from '@mocksi/bilan-sdk'
 * 
 * // Initialize the SDK
 * await init({ mode: 'local', userId: 'user-123' })
 * 
 * // Track user feedback
 * await vote('prompt-abc', 1, 'Helpful suggestion!')
 * 
 * // Get analytics
 * const stats = await getStats()
 * console.log(`Positive rate: ${(stats.positiveRate * 100).toFixed(1)}%`)
 * ```
 * 
 * @example
 * ```typescript
 * import { init, startConversation, addMessage, recordFeedback, endConversation } from '@mocksi/bilan-sdk'
 * 
 * // Initialize the SDK
 * await init({ mode: 'local', userId: 'user-123' })
 * 
 * // Track conversation flow
 * const conversationId = await startConversation('user-123')
 * await addMessage(conversationId)
 * await recordFeedback(conversationId, 1)
 * await endConversation(conversationId, 'completed')
 * ```
 * 
 * @example
 * ```typescript
 * import { init, trackJourneyStep, completeJourney } from '@mocksi/bilan-sdk'
 * 
 * // Initialize the SDK
 * await init({ mode: 'local', userId: 'user-123' })
 * 
 * // Track user journey
 * await trackJourneyStep('email-agent', 'query-sent', 'user-123')
 * await trackJourneyStep('email-agent', 'response-received', 'user-123')
 * await completeJourney('email-agent', 'user-123')
 * ```
 */
class BilanSDK {
  private config: InitConfig | null = null
  private storage: StorageAdapter | null = null
  private isInitialized = false
  private eventTracker: EventTracker | null = null
  private eventQueue: EventQueueManager | null = null
  private turnTracker: TurnTracker | null = null

  constructor() {
    this.storage = new LocalStorageAdapter()
  }

  /**
   * Initialize the Bilan SDK with configuration options.
   * 
   * @param config - Configuration object for the SDK
   * @param config.mode - 'local' for browser storage or 'server' for API endpoint
   * @param config.userId - Unique identifier for the user
   * @param config.endpoint - API endpoint URL (required for 'server' mode)
   * @param config.debug - Enable debug logging and error throwing
   * @param config.storage - Custom storage adapter (for 'local' mode)
   * @param config.trendConfig - Configuration for trend calculation algorithm
   * @param config.telemetry - Configuration for anonymous usage analytics
   * 
   * @throws {Error} When in debug mode and initialization fails
   * 
   * @example
   * ```typescript
   * // Local mode (browser storage)
   * await init({
   *   mode: 'local',
   *   userId: 'user-123',
   *   debug: true
   * })
   * 
   * // Server mode (self-hosted API)
   * await init({
   *   mode: 'server',
   *   userId: 'user-123',
   *   endpoint: 'https://your-api.com',
   *   trendConfig: {
   *     sensitivity: 0.15,
   *     timeWeightHours: 48
   *   }
   * })
   * ```
   */
  async init(config: InitConfig): Promise<void> {
    try {
      // Validate configuration
      if (!config.mode || !['local', 'server'].includes(config.mode)) {
        throw new Error('Invalid mode. Must be "local" or "server".')
      }

      if (!config.userId) {
        throw new Error('userId is required. Use createUserId("your-user-id").')
      }

      if (config.mode === 'server' && !config.endpoint) {
        throw new Error('endpoint is required for server mode.')
      }

      // Check environment compatibility
      if (config.mode === 'local' && !GracefulDegradation.isLocalStorageAvailable()) {
        throw new Error('localStorage is not available. Consider using server mode or a custom storage adapter.')
      }

      this.config = config
      
      // Set debug mode for error handling
      ErrorHandler.setDebugMode(config.debug || false)
      
      // Use custom storage if provided
      if (config.mode === 'local') {
        this.storage = config.storage || new LocalStorageAdapter()
      }

      // Initialize telemetry
      initTelemetry(config)

      // Initialize event system
      this.eventQueue = new EventQueueManager(
        config,
        this.storage,
        this.sendEventsToStorage.bind(this)
      )

      // Load any persisted events
      await this.eventQueue.loadPersistedQueue()

      this.eventTracker = new EventTracker(config, this.eventQueue)
      this.turnTracker = new TurnTracker(this.eventTracker, config)

      this.isInitialized = true
      
      if (this.config.debug) {
        console.log('Bilan SDK initialized:', config)
      }
    } catch (error) {
      const bilanError = ErrorHandler.handleInitError(error instanceof Error ? error : new Error('Unknown init error'), config)
      trackError(bilanError, 'init')
      
      if (config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
      }
    }
  }

  /**
   * Record user feedback on an AI suggestion.
   * 
   * @param promptId - Unique identifier for the AI prompt/suggestion
   * @param value - User feedback: 1 for positive (👍), -1 for negative (👎)
   * @param comment - Optional text comment from the user
   * @param options - Additional context about the AI interaction
   * @param options.promptText - The original user prompt/question
   * @param options.aiOutput - The AI's complete response
   * @param options.modelUsed - Which AI model generated the response
   * @param options.responseTime - How long the AI took to respond (seconds)
   * 
   * @throws {Error} When in debug mode and the vote fails to record
   * 
   * @example
   * ```typescript
   * // Simple vote
   * await vote('prompt-123', 1)
   * 
   * // Vote with comment
   * await vote('prompt-123', -1, 'Not accurate for my use case')
   * 
   * // Vote with full context
   * await vote('prompt-123', 1, 'Perfect!', {
   *   promptText: 'How do I center a div?',
   *   aiOutput: 'Use flexbox with justify-content: center...',
   *   modelUsed: 'gpt-4',
   *   responseTime: 1.2
   * })
   * ```
   */
  async vote(
    promptId: PromptId | string, 
    value: 1 | -1, 
    comment?: string,
    options?: {
      promptText?: string
      aiOutput?: string
      modelUsed?: string
      responseTime?: number
    }
  ): Promise<void> {
    if (!this.isInitialized || !this.config) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      const bilanError = ErrorHandler.handleVoteError(error)
      
      if (this.config && this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return
      }
    }

    // Validate inputs
    if (value !== 1 && value !== -1) {
      const error = new Error('Invalid vote value. Must be 1 (positive) or -1 (negative).')
      const promptIdStr = typeof promptId === 'string' ? promptId : String(promptId)
      const bilanError = ErrorHandler.handleVoteError(error, promptIdStr, value)
      
      if (this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return
      }
    }

    const event: VoteEvent = {
      promptId: typeof promptId === 'string' ? createPromptId(promptId) : promptId,
      value,
      comment,
      timestamp: Date.now(),
      userId: this.config.userId,
      metadata: {},
      promptText: options?.promptText,
      aiOutput: options?.aiOutput,
      modelUsed: options?.modelUsed,
      responseTime: options?.responseTime
    }

    try {
      if (this.config.mode === 'local') {
        await this.storeEventLocally(event)
      } else if (this.config.mode === 'server') {
        await this.sendEventToServer(event)
      }

      // Track vote for analytics (no PII)
      trackVote(event.promptId, value, !!comment)
    } catch (error) {
      const promptIdStr = typeof promptId === 'string' ? promptId : String(promptId)
      const bilanError = ErrorHandler.handleVoteError(error instanceof Error ? error : new Error('Unknown vote error'), promptIdStr, value)
      trackError(bilanError, 'vote')
      
      if (this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
      }
    }
  }

  /**
   * Get aggregate statistics for all user feedback.
   * 
   * @returns Promise resolving to basic analytics including vote counts, positive rate, and trend
   * @throws {Error} When in debug mode and stats retrieval fails
   * 
   * @example
   * ```typescript
   * const stats = await getStats()
   * console.log({
   *   totalVotes: stats.totalVotes,           // e.g., 47
   *   positiveRate: stats.positiveRate,       // e.g., 0.74 (74%)
   *   recentTrend: stats.recentTrend,         // 'improving' | 'declining' | 'stable'
   *   topFeedback: stats.topFeedback          // ['Great!', 'Very helpful', ...]
   * })
   * ```
   */
  async getStats(): Promise<BasicStats> {
    if (!this.isInitialized || !this.config) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      const bilanError = ErrorHandler.handleStatsError(error)
      
      if (this.config && this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return GracefulDegradation.getStatsFallback()
      }
    }

    try {
      trackStatsRequest('basic')
      
      if (this.config.mode === 'server') {
        return await this.getStatsFromServer()
      }

      const events = await this.getAllEvents()
      return BasicAnalytics.calculateBasicStats(events, this.config.trendConfig)
    } catch (error) {
      const bilanError = ErrorHandler.handleStatsError(error instanceof Error ? error : new Error('Unknown stats error'))
      trackError(bilanError, 'getStats')
      
      if (this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return GracefulDegradation.getStatsFallback()
      }
    }
  }

  /**
   * Get statistics for a specific AI prompt/suggestion.
   * 
   * @param promptId - Unique identifier for the prompt to analyze
   * @returns Promise resolving to prompt-specific analytics
   * @throws {Error} When in debug mode and stats retrieval fails
   * 
   * @example
   * ```typescript
   * const promptStats = await getPromptStats('prompt-123')
   * console.log({
   *   promptId: promptStats.promptId,         // 'prompt-123'
   *   totalVotes: promptStats.totalVotes,     // e.g., 12
   *   positiveRate: promptStats.positiveRate, // e.g., 0.83 (83%)
   *   comments: promptStats.comments          // ['Helpful!', 'Thanks', ...]
   * })
   * ```
   */
  async getPromptStats(promptId: PromptId | string): Promise<PromptStats> {
    const typedPromptId = typeof promptId === 'string' ? createPromptId(promptId) : promptId
    
    if (!this.isInitialized || !this.config) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      const bilanError = ErrorHandler.handleStatsError(error, 'prompt')
      
      if (this.config && this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return GracefulDegradation.getPromptStatsFallback(typedPromptId)
      }
    }

    try {
      trackStatsRequest('prompt')
      
      if (this.config.mode === 'server') {
        return await this.getPromptStatsFromServer(typedPromptId)
      }

      const events = await this.getAllEvents()
      return BasicAnalytics.calculatePromptStats(events, typedPromptId)
    } catch (error) {
      const bilanError = ErrorHandler.handleStatsError(error instanceof Error ? error : new Error('Unknown prompt stats error'), 'prompt')
      trackError(bilanError, 'getPromptStats')
      
      if (this.config.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return GracefulDegradation.getPromptStatsFallback(typedPromptId)
      }
    }
  }

  // Helper method to check initialization and handle errors
  private checkInit(): boolean {
    if (!this.isInitialized || !this.config) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      const bilanError = ErrorHandler.handleInitError(error, this.config || undefined)
      
      if (this.config?.debug) {
        throw bilanError
      } else {
        ErrorHandler.logError(bilanError)
        return false
      }
    }
    return true
  }

  // Storage helper
  private async storeData(key: string, data: any, updateFn?: (items: any[]) => void): Promise<void> {
    if (!this.storage || !this.config) return
    try {
      const existing = await this.storage.get(key)
      const items = existing ? JSON.parse(existing) : []
      if (updateFn) {
        updateFn(items)
      } else {
        items.push(data)
      }
      await this.storage.set(key, JSON.stringify(items))
    } catch (error) {
      if (this.config.debug) throw error
      console.warn('Storage failed:', error)
    }
  }

  /** Start a conversation session */
  async startConversation(userId: UserId): Promise<ConversationId> {
    if (!this.checkInit()) return createConversationId('fallback-conversation-id')
    
    const conversationId = createConversationId(`conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    const data: ConversationData = { id: conversationId, userId, startedAt: Date.now(), messageCount: 0 }

    if (this.config!.mode === 'local') {
      await this.storeData(`conversations:${this.config!.userId}`, data)
    }
    return conversationId
  }

  /** Add a message to a conversation */
  async addMessage(conversationId: ConversationId): Promise<void> {
    if (!this.checkInit()) return
    
    if (this.config!.mode === 'local') {
      await this.storeData(`conversations:${this.config!.userId}`, null, (conversations) => {
        const conv = conversations.find(c => c.id === conversationId)
        if (conv) conv.messageCount++
      })
    }
  }

  /** Record user frustration */
  async recordFrustration(conversationId: ConversationId): Promise<void> {
    if (!this.checkInit()) return
    await this.recordFeedbackEvent({ conversationId, type: 'frustration', timestamp: Date.now() })
  }

  /** Record AI regeneration */
  async recordRegeneration(conversationId: ConversationId): Promise<void> {
    if (!this.checkInit()) return
    await this.recordFeedbackEvent({ conversationId, type: 'regeneration', timestamp: Date.now() })
  }

  /** Record explicit feedback */
  async recordFeedback(conversationId: ConversationId, value: 1 | -1): Promise<void> {
    if (!this.checkInit()) return
    
    // Validate feedback value
    if (value !== 1 && value !== -1) {
      if (this.config?.debug) {
        throw new Error('Invalid feedback value. Must be 1 (positive) or -1 (negative).')
      } else {
        console.warn('Bilan SDK: Invalid feedback value. Must be 1 (positive) or -1 (negative).')
        return
      }
    }
    
    await this.recordFeedbackEvent({ conversationId, type: 'explicit_feedback', value, timestamp: Date.now() })
  }

  /** End a conversation */
  async endConversation(conversationId: ConversationId, outcome: 'completed' | 'abandoned'): Promise<void> {
    if (!this.checkInit()) return
    
    if (this.config!.mode === 'local') {
      await this.storeData(`conversations:${this.config!.userId}`, null, (conversations) => {
        const conv = conversations.find(c => c.id === conversationId)
        if (conv) {
          conv.endedAt = Date.now()
          conv.outcome = outcome
        }
      })
    }
  }

  /** Track a journey step */
  async trackJourneyStep(journeyName: string, stepName: string, userId: UserId): Promise<void> {
    if (!this.checkInit()) return
    
    const step: JourneyStep = { journeyName, stepName, userId, timestamp: Date.now() }
    if (this.config!.mode === 'local') {
      await this.storeData(`journey:${this.config!.userId}`, step)
    }
  }

  /** Complete a journey */
  async completeJourney(journeyName: string, userId: UserId): Promise<void> {
    await this.trackJourneyStep(journeyName, 'completed', userId)
  }

  private async storeEventLocally(event: VoteEvent): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not available')
    }

    const key = `events:${this.config!.userId}`
    const existingData = await this.storage.get(key)
    const events: VoteEvent[] = existingData ? JSON.parse(existingData) : []
    
    events.push(event)
    
    // Keep only last 1000 events to prevent storage bloat
    if (events.length > 1000) {
      events.splice(0, events.length - 1000)
    }
    
    await this.storage.set(key, JSON.stringify(events))
  }

  private async sendEventToServer(event: VoteEvent): Promise<void> {
    if (!this.config?.endpoint) {
      throw new Error('No endpoint configured for server mode')
    }

    const response = await fetch(`${this.config.endpoint}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: [event] })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }
  }

  private async getStatsFromServer(): Promise<BasicStats> {
    if (!this.config?.endpoint) {
      throw new Error('No endpoint configured for server mode')
    }

    const response = await fetch(`${this.config.endpoint}/api/stats?userId=${this.config.userId}`)
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async getPromptStatsFromServer(promptId: PromptId): Promise<PromptStats> {
    if (!this.config?.endpoint) {
      throw new Error('No endpoint configured for server mode')
    }

    const response = await fetch(`${this.config.endpoint}/api/stats/prompt/${promptId}?userId=${this.config.userId}`)
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  private async getAllEvents(): Promise<VoteEvent[]> {
    if (!this.config || !this.storage) return []

    const key = `events:${this.config.userId}`
    const data = await this.storage.get(key)
    return data ? JSON.parse(data) : []
  }

  private async recordFeedbackEvent(event: FeedbackEvent): Promise<void> {
    if (this.config!.mode === 'local') {
      await this.storeData(`feedback:${this.config!.userId}`, event)
    }
  }

  /**
   * Send events to storage or server (event queue callback)
   */
  private async sendEventsToStorage(events: Event[]): Promise<void> {
    if (!this.config) return

    try {
      if (this.config.mode === 'local') {
        // Store events locally
        const key = `events:${this.config.userId}`
        const existingData = await this.storage?.get(key)
        const allEvents: Event[] = existingData ? JSON.parse(existingData) : []
        
        allEvents.push(...events)
        
        // Keep only last 1000 events to prevent storage bloat
        if (allEvents.length > 1000) {
          allEvents.splice(0, allEvents.length - 1000)
        }
        
        await this.storage?.set(key, JSON.stringify(allEvents))
      } else if (this.config.mode === 'server') {
        // Send to server
        const response = await fetch(`${this.config.endpoint}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events })
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Bilan: Failed to send events:', error)
        throw error
      } else {
        console.warn('Bilan: Failed to send events:', error)
      }
    }
  }

  /**
   * Core event tracking method (v0.4.0 foundation)
   * @param eventType - Type of event to track
   * @param properties - Event properties
   * @param content - Optional content (prompt/response)
   */
  track(
    eventType: EventType,
    properties: Record<string, any> = {},
    content?: {
      promptText?: string
      aiResponse?: string
      context?: string
    }
  ): void {
    if (!this.eventTracker) {
      if (this.config?.debug) {
        console.error('Bilan: Event tracker not initialized')
      }
      return
    }

    // Fire and forget - don't await
    this.eventTracker.track(eventType, properties, content).catch(error => {
      if (this.config?.debug) {
        console.error('Bilan: Track failed:', error)
      }
    })
  }

  /**
   * Track an AI turn with automatic failure detection (v0.4.0 flagship feature)
   * @param promptText - The user's prompt/question
   * @param aiCall - Function that makes the AI API call
   * @param properties - Additional properties to track
   * @returns The AI response
   * 
   * @example
   * ```typescript
   * const response = await trackTurn(
   *   'How do I center a div?',
   *   () => openai.chat.completions.create({
   *     model: 'gpt-4',
   *     messages: [{ role: 'user', content: prompt }]
   *   }),
   *   { conversationId: 'conv_123', modelUsed: 'gpt-4' }
   * )
   * ```
   */
  async trackTurn<T = string>(
    promptText: string,
    aiCall: () => Promise<T>,
    properties: Record<string, any> = {}
  ): Promise<T> {
    if (!this.turnTracker) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      if (this.config?.debug) {
        throw error
      } else {
        console.error('Bilan: Turn tracker not initialized')
        // Fall back to executing the AI call without tracking
        return await aiCall()
      }
    }

    return await this.turnTracker.trackTurn(promptText, aiCall, properties)
  }

  /**
   * Track an AI turn with automatic retry logic
   * @param promptText - The user's prompt/question
   * @param aiCall - Function that makes the AI API call
   * @param properties - Additional properties to track
   * @param maxRetries - Maximum number of retries (default: 2)
   * @returns The AI response
   * 
   * @example
   * ```typescript
   * const response = await trackTurnWithRetry(
   *   'Summarize this document',
   *   () => anthropic.messages.create({
   *     model: 'claude-3-haiku',
   *     messages: [{ role: 'user', content: prompt }]
   *   }),
   *   { conversationId: 'conv_123', modelUsed: 'claude-3-haiku' },
   *   3 // retry up to 3 times
   * )
   * ```
   */
  async trackTurnWithRetry<T = string>(
    promptText: string,
    aiCall: () => Promise<T>,
    properties: Record<string, any> = {},
    maxRetries: number = 2
  ): Promise<T> {
    if (!this.turnTracker) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      if (this.config?.debug) {
        throw error
      } else {
        console.error('Bilan: Turn tracker not initialized')
        // Fall back to executing the AI call without tracking
        return await aiCall()
      }
    }

    return await this.turnTracker.trackTurnWithRetry(promptText, aiCall, properties, maxRetries)
  }
}

// Create a default instance for convenience
const defaultBilan = new BilanSDK()

// Core SDK methods
export const init = defaultBilan.init.bind(defaultBilan)
export const vote = defaultBilan.vote.bind(defaultBilan)
export const getStats = defaultBilan.getStats.bind(defaultBilan)
export const getPromptStats = defaultBilan.getPromptStats.bind(defaultBilan)

// New v0.4.0 event tracking method
export const track = defaultBilan.track.bind(defaultBilan)

// New v0.4.0 AI turn tracking methods (flagship feature)
export const trackTurn = defaultBilan.trackTurn.bind(defaultBilan)
export const trackTurnWithRetry = defaultBilan.trackTurnWithRetry.bind(defaultBilan)

// Conversation tracking methods
export const startConversation = defaultBilan.startConversation.bind(defaultBilan)
export const addMessage = defaultBilan.addMessage.bind(defaultBilan)
export const recordFrustration = defaultBilan.recordFrustration.bind(defaultBilan)
export const recordRegeneration = defaultBilan.recordRegeneration.bind(defaultBilan)
export const recordFeedback = defaultBilan.recordFeedback.bind(defaultBilan)
export const endConversation = defaultBilan.endConversation.bind(defaultBilan)

// Journey tracking methods
export const trackJourneyStep = defaultBilan.trackJourneyStep.bind(defaultBilan)
export const completeJourney = defaultBilan.completeJourney.bind(defaultBilan)

// Export the class for creating custom instances
export { BilanSDK }
export { LocalStorageAdapter } from './storage/local-storage'
export { BasicAnalytics } from './analytics/basic-analytics'

// Export error handling classes for advanced users
export { 
  BilanError, 
  BilanInitializationError, 
  BilanVoteError, 
  BilanStatsError, 
  BilanNetworkError, 
  BilanStorageError,
  ErrorHandler,
  GracefulDegradation
} from './error-handling'

// Export telemetry types for advanced users
export type { TelemetryEvent, TelemetryConfig } from './telemetry'

export * from './types'
export * from './events' 