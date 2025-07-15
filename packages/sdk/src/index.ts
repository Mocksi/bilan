import { InitConfig, VoteEvent, BasicStats, PromptStats, StorageAdapter, TrendConfig, UserId, PromptId, createUserId, createPromptId, ConversationData, FeedbackEvent, JourneyStep } from './types'
import { LocalStorageAdapter } from './storage/local-storage'
import { BasicAnalytics } from './analytics/basic-analytics'
import { initTelemetry, trackVote, trackStatsRequest, trackError } from './telemetry'
import { ErrorHandler, GracefulDegradation } from './error-handling'

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
 */
class BilanSDK {
  private config: InitConfig | null = null
  private storage: StorageAdapter | null = null
  private isInitialized = false

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

  /**
   * Start a new conversation session.
   * 
   * @param userId - User identifier for the conversation
   * @returns Promise resolving to the conversation ID
   * @throws {Error} When in debug mode and conversation creation fails
   * 
   * @example
   * ```typescript
   * const conversationId = await conversation.start('user-123')
   * ```
   */
  async startConversation(userId: string): Promise<string> {
    if (!this.isInitialized || !this.config) {
      const error = new Error('Bilan SDK not initialized. Call init() first.')
      
      if (this.config && this.config.debug) {
        throw error
      } else {
        console.warn('Bilan SDK not initialized. Call init() first.')
        return 'fallback-conversation-id'
      }
    }

    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const conversationData: ConversationData = {
      id: conversationId,
      userId,
      startedAt: Date.now(),
      messageCount: 0
    }

    try {
      if (this.config.mode === 'local') {
        await this.storeConversationLocally(conversationData)
      } else if (this.config.mode === 'server') {
        await this.sendConversationToServer(conversationData)
      }

      return conversationId
    } catch (error) {
      if (this.config.debug) {
        throw error
      } else {
        console.warn('Failed to start conversation:', error)
        return conversationId // Return ID anyway for graceful degradation
      }
    }
  }

  /**
   * Add a message to an existing conversation.
   * 
   * @param conversationId - The conversation to add message to
   * @returns Promise that resolves when message is recorded
   * 
   * @example
   * ```typescript
   * await conversation.addMessage('conv-123')
   * ```
   */
  async addMessage(conversationId: string): Promise<void> {
    if (!this.isInitialized || !this.config) {
      if (this.config && this.config.debug) {
        throw new Error('Bilan SDK not initialized. Call init() first.')
      } else {
        console.warn('Bilan SDK not initialized. Call init() first.')
        return
      }
    }

    try {
      if (this.config.mode === 'local') {
        await this.incrementMessageCountLocally(conversationId)
      } else if (this.config.mode === 'server') {
        await this.sendMessageUpdateToServer(conversationId)
      }
    } catch (error) {
      if (this.config.debug) {
        throw error
      } else {
        console.warn('Failed to add message:', error)
      }
    }
  }

  /**
   * Record user frustration in a conversation.
   * 
   * @param conversationId - The conversation where frustration occurred
   * @returns Promise that resolves when frustration is recorded
   * 
   * @example
   * ```typescript
   * await conversation.recordFrustration('conv-123')
   * ```
   */
  async recordFrustration(conversationId: string): Promise<void> {
    const feedbackEvent: FeedbackEvent = {
      conversationId,
      type: 'frustration',
      timestamp: Date.now()
    }

    try {
      await this.recordFeedbackEvent(feedbackEvent)
    } catch (error) {
      if (this.config && this.config.debug) {
        throw error
      } else {
        console.warn('Failed to record frustration:', error)
      }
    }
  }

  /**
   * Record AI response regeneration in a conversation.
   * 
   * @param conversationId - The conversation where regeneration occurred
   * @returns Promise that resolves when regeneration is recorded
   * 
   * @example
   * ```typescript
   * await conversation.recordRegeneration('conv-123')
   * ```
   */
  async recordRegeneration(conversationId: string): Promise<void> {
    const feedbackEvent: FeedbackEvent = {
      conversationId,
      type: 'regeneration',
      timestamp: Date.now()
    }

    try {
      await this.recordFeedbackEvent(feedbackEvent)
    } catch (error) {
      if (this.config && this.config.debug) {
        throw error
      } else {
        console.warn('Failed to record regeneration:', error)
      }
    }
  }

  /**
   * Record explicit user feedback in a conversation.
   * 
   * @param conversationId - The conversation to record feedback for
   * @param value - Feedback value: 1 for positive, -1 for negative
   * @returns Promise that resolves when feedback is recorded
   * 
   * @example
   * ```typescript
   * await conversation.recordFeedback('conv-123', 1)
   * ```
   */
  async recordFeedback(conversationId: string, value: 1 | -1): Promise<void> {
    const feedbackEvent: FeedbackEvent = {
      conversationId,
      type: 'explicit_feedback',
      value,
      timestamp: Date.now()
    }

    try {
      await this.recordFeedbackEvent(feedbackEvent)
    } catch (error) {
      if (this.config && this.config.debug) {
        throw error
      } else {
        console.warn('Failed to record feedback:', error)
      }
    }
  }

  /**
   * End a conversation with a final outcome.
   * 
   * @param conversationId - The conversation to end
   * @param outcome - Final outcome: 'completed' or 'abandoned'
   * @returns Promise that resolves when conversation is ended
   * 
   * @example
   * ```typescript
   * await conversation.end('conv-123', 'completed')
   * ```
   */
  async endConversation(conversationId: string, outcome: 'completed' | 'abandoned'): Promise<void> {
    if (!this.isInitialized || !this.config) {
      if (this.config && this.config.debug) {
        throw new Error('Bilan SDK not initialized. Call init() first.')
      } else {
        console.warn('Bilan SDK not initialized. Call init() first.')
        return
      }
    }

    try {
      if (this.config.mode === 'local') {
        await this.endConversationLocally(conversationId, outcome)
      } else if (this.config.mode === 'server') {
        await this.sendConversationEndToServer(conversationId, outcome)
      }
    } catch (error) {
      if (this.config.debug) {
        throw error
      } else {
        console.warn('Failed to end conversation:', error)
      }
    }
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

  private async storeConversationLocally(conversation: ConversationData): Promise<void> {
    if (!this.storage) throw new Error('Storage adapter not available')

    const key = `conversations:${this.config!.userId}`
    const existingData = await this.storage.get(key)
    const conversations: ConversationData[] = existingData ? JSON.parse(existingData) : []
    
    conversations.push(conversation)
    await this.storage.set(key, JSON.stringify(conversations))
  }

  private async incrementMessageCountLocally(conversationId: string): Promise<void> {
    if (!this.storage) throw new Error('Storage adapter not available')

    const key = `conversations:${this.config!.userId}`
    const existingData = await this.storage.get(key)
    const conversations: ConversationData[] = existingData ? JSON.parse(existingData) : []
    
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      conversation.messageCount++
      await this.storage.set(key, JSON.stringify(conversations))
    }
  }

  private async recordFeedbackEvent(event: FeedbackEvent): Promise<void> {
    if (!this.storage) throw new Error('Storage adapter not available')

    const key = `feedback:${this.config!.userId}`
    const existingData = await this.storage.get(key)
    const events: FeedbackEvent[] = existingData ? JSON.parse(existingData) : []
    
    events.push(event)
    await this.storage.set(key, JSON.stringify(events))
  }

  private async endConversationLocally(conversationId: string, outcome: 'completed' | 'abandoned'): Promise<void> {
    if (!this.storage) throw new Error('Storage adapter not available')

    const key = `conversations:${this.config!.userId}`
    const existingData = await this.storage.get(key)
    const conversations: ConversationData[] = existingData ? JSON.parse(existingData) : []
    
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      conversation.endedAt = Date.now()
      conversation.outcome = outcome
      await this.storage.set(key, JSON.stringify(conversations))
    }
  }

  private async sendConversationToServer(conversation: ConversationData): Promise<void> {
    // TODO: Implement server API calls in later commits
    throw new Error('Server mode not implemented yet')
  }

  private async sendMessageUpdateToServer(conversationId: string): Promise<void> {
    // TODO: Implement server API calls in later commits
    throw new Error('Server mode not implemented yet')
  }

  private async sendConversationEndToServer(conversationId: string, outcome: 'completed' | 'abandoned'): Promise<void> {
    // TODO: Implement server API calls in later commits
    throw new Error('Server mode not implemented yet')
  }
}

// Create a default instance for convenience
const defaultBilan = new BilanSDK()

/**
 * Initialize the Bilan SDK with configuration options.
 * Uses the default SDK instance for convenience.
 * 
 * @param config - Configuration object for the SDK
 * @see BilanSDK.init for detailed parameter documentation
 */
export const init = defaultBilan.init.bind(defaultBilan)

/**
 * Record user feedback on an AI suggestion.
 * Uses the default SDK instance for convenience.
 * 
 * @param promptId - Unique identifier for the AI prompt/suggestion
 * @param value - User feedback: 1 for positive (👍), -1 for negative (👎)
 * @param comment - Optional text comment from the user
 * @param options - Additional context about the AI interaction
 * @see BilanSDK.vote for detailed parameter documentation
 */
export const vote = defaultBilan.vote.bind(defaultBilan)

/**
 * Get aggregate statistics for all user feedback.
 * Uses the default SDK instance for convenience.
 * 
 * @returns Promise resolving to basic analytics
 * @see BilanSDK.getStats for detailed return value documentation
 */
export const getStats = defaultBilan.getStats.bind(defaultBilan)

/**
 * Get statistics for a specific AI prompt/suggestion.
 * Uses the default SDK instance for convenience.
 * 
 * @param promptId - Unique identifier for the prompt to analyze
 * @returns Promise resolving to prompt-specific analytics
 * @see BilanSDK.getPromptStats for detailed parameter and return value documentation
 */
export const getPromptStats = defaultBilan.getPromptStats.bind(defaultBilan)

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