import { EventTracker } from './event-tracker'
import { InitConfig, generateTurnId, TurnId } from '../types'
import { ContentProcessor, PrivacyController, PrivacyConfig } from './privacy-controls'

/**
 * Error classification for AI failures
 */
export class ErrorClassifier {
  /**
   * Classify an error into a specific category
   */
  static classify(error: Error): {
    errorType: 'timeout' | 'rate_limit' | 'network_error' | 'context_limit' | 'service_unavailable' | 'auth_error' | 'unknown_error'
    errorMessage: string
  } {
    const message = error.message.toLowerCase()
    
    if (message === 'ai_timeout' || message.includes('ai request timeout')) {
      return {
        errorType: 'timeout',
        errorMessage: 'AI request timed out after 30 seconds'
      }
    }
    
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
      return {
        errorType: 'rate_limit',
        errorMessage: 'API rate limit exceeded'
      }
    }
    
    if (message.includes('503') || message.includes('service unavailable') || message.includes('temporarily unavailable')) {
      return {
        errorType: 'service_unavailable',
        errorMessage: 'AI service temporarily unavailable'
      }
    }
    
    if (message.includes('context') && message.includes('limit')) {
      return {
        errorType: 'context_limit',
        errorMessage: 'Input context exceeds model limits'
      }
    }
    
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('api key')) {
      return {
        errorType: 'auth_error',
        errorMessage: 'Authentication failed'
      }
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return {
        errorType: 'network_error',
        errorMessage: 'Network connection failed'
      }
    }
    
    return {
      errorType: 'unknown_error',
      errorMessage: error.message
    }
  }
}

/**
 * Turn tracker for AI call wrapping with automatic failure detection
 */
export class TurnTracker {
  private eventTracker: EventTracker
  private config: InitConfig
  private timeoutMs: number
  private contentProcessor: ContentProcessor

  constructor(eventTracker: EventTracker, config: InitConfig) {
    this.eventTracker = eventTracker
    this.config = config
    this.timeoutMs = 30000 // 30 seconds default timeout
    this.contentProcessor = new ContentProcessor(new PrivacyController(config.privacyConfig))
  }

  /**
   * Track an AI turn with automatic failure detection
   * @param promptText - The user's prompt/question
   * @param aiCall - Function that makes the AI API call
   * @param properties - Additional properties to track
   * @returns The AI response
   */
  async trackTurn<T = string>(
    promptText: string,
    aiCall: () => Promise<T>,
    properties: Record<string, any> = {}
  ): Promise<T> {
    const turnId = generateTurnId()
    const startTime = Date.now()
    
    // Track turn start
    await this.eventTracker.track('turn_started', {
      turnId,
      startedAt: startTime,
      modelUsed: properties.modelUsed || properties.model,
      conversationId: properties.conversationId,
      retryCount: properties.retryCount || 0,
      ...properties
    }, {
      promptText,
      context: properties.context
    })

    try {
      // Race the AI call against timeout
      const response = await Promise.race([
        aiCall(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AI request timeout')), this.timeoutMs)
        )
      ])

      const endTime = Date.now()
      const responseTime = (endTime - startTime) / 1000

      // Process content with privacy controls
      const processedPrompt = this.contentProcessor.processPrompt(promptText)
      const processedResponse = this.contentProcessor.processResponse(
        typeof response === 'string' ? response : JSON.stringify(response)
      )

      // Track successful completion
      await this.eventTracker.track('turn_completed', {
        turnId,
        status: 'success',
        responseTime,
        responseLength: typeof response === 'string' ? response.length : JSON.stringify(response).length,
        completedAt: endTime,
        modelUsed: properties.modelUsed || properties.model,
        conversationId: properties.conversationId,
        retryCount: properties.retryCount || 0,
        ...properties
      }, {
        promptText: processedPrompt || undefined,
        aiResponse: processedResponse || undefined,
        context: properties.context
      })

      return response
      
    } catch (error) {
      const endTime = Date.now()
      const attemptedDuration = (endTime - startTime) / 1000
      const { errorType, errorMessage } = ErrorClassifier.classify(error as Error)

      // Process content with privacy controls for failure case
      const processedPrompt = this.contentProcessor.processPrompt(promptText)
      const processedError = this.contentProcessor.processError(errorMessage)

      // Track failure with detailed error information
      await this.eventTracker.track('turn_failed', {
        turnId,
        status: 'failed',
        errorType,
        errorMessage: processedError || errorMessage,
        attemptedDuration,
        failedAt: endTime,
        modelUsed: properties.modelUsed || properties.model,
        conversationId: properties.conversationId,
        retryCount: properties.retryCount || 0,
        ...properties
      }, {
        promptText: processedPrompt || undefined,
        context: properties.context
      })

      // Re-throw the original error for the caller to handle
      throw error
    }
  }

  /**
   * Track a turn with retry logic
   * @param promptText - The user's prompt/question
   * @param aiCall - Function that makes the AI API call
   * @param properties - Additional properties to track
   * @param maxRetries - Maximum number of retries (default: 2)
   * @returns The AI response
   */
  async trackTurnWithRetry<T = string>(
    promptText: string,
    aiCall: () => Promise<T>,
    properties: Record<string, any> = {},
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.trackTurn(promptText, aiCall, {
          ...properties,
          retryCount: attempt
        })
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain error types
        const { errorType } = ErrorClassifier.classify(lastError)
        if (errorType === 'auth_error' || errorType === 'context_limit') {
          break
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s...
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Set custom timeout for AI calls
   * @param timeoutMs - Timeout in milliseconds
   */
  setTimeoutMs(timeoutMs: number): void {
    this.timeoutMs = timeoutMs
  }

  /**
   * Get current timeout setting
   */
  getTimeoutMs(): number {
    return this.timeoutMs
  }
} 