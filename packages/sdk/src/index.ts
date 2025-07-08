import { InitConfig, VoteEvent, BasicStats, PromptStats, StorageAdapter, TrendConfig, UserId, PromptId, createUserId, createPromptId } from './types'
import { LocalStorageAdapter } from './storage/local-storage'
import { BasicAnalytics } from './analytics/basic-analytics'

/**
 * Bilan SDK for tracking user feedback on AI suggestions and calculating trust metrics.
 * 
 * @example
 * ```typescript
 * import { init, vote, getStats } from '@bilan/sdk'
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
    this.config = config
    
    // Use custom storage if provided
    if (config.mode === 'local') {
      this.storage = config.storage || new LocalStorageAdapter()
    }

    this.isInitialized = true
    
    if (this.config.debug) {
      console.log('Bilan SDK initialized:', config)
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
      if (this.config && this.config.debug) {
        throw error
      } else {
        console.warn(error.message)
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
    } catch (error) {
      const errorMessage = `Failed to record vote: ${error instanceof Error ? error.message : 'Unknown error'}`
      if (this.config.debug) {
        throw new Error(errorMessage)
      } else {
        console.warn(errorMessage)
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
      if (this.config && this.config.debug) {
        throw error
      }
      return { totalVotes: 0, positiveRate: 0, recentTrend: 'stable', topFeedback: [] }
    }

    try {
      if (this.config.mode === 'server') {
        return await this.getStatsFromServer()
      }

      const events = await this.getAllEvents()
      return BasicAnalytics.calculateBasicStats(events, this.config.trendConfig)
    } catch (error) {
      const errorMessage = `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      if (this.config.debug) {
        throw new Error(errorMessage)
      } else {
        console.warn(errorMessage)
        return { totalVotes: 0, positiveRate: 0, recentTrend: 'stable', topFeedback: [] }
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
      if (this.config && this.config.debug) {
        throw error
      }
      return { promptId: typedPromptId, totalVotes: 0, positiveRate: 0, comments: [] }
    }

    try {
      if (this.config.mode === 'server') {
        return await this.getPromptStatsFromServer(typedPromptId)
      }

      const events = await this.getAllEvents()
      return BasicAnalytics.calculatePromptStats(events, typedPromptId)
    } catch (error) {
      const errorMessage = `Failed to get prompt stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      if (this.config.debug) {
        throw new Error(errorMessage)
      } else {
        console.warn(errorMessage)
        return { promptId: typedPromptId, totalVotes: 0, positiveRate: 0, comments: [] }
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
export * from './types' 