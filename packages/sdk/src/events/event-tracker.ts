import { Event, EventType, InitConfig, generateEventId, UserId } from '../types'
import { EventQueueManager } from './event-queue'
import { ContentProcessor, PrivacyController, PrivacyConfig } from './privacy-controls'

/**
 * Privacy controls for content capture - enhanced with new privacy system
 */
export class ContentSanitizer {
  private contentProcessor: ContentProcessor

  constructor(config: InitConfig) {
    // Initialize content processor with privacy config
    const privacyConfig = config.privacyConfig || {
      defaultCaptureLevel: 'sanitized',
      captureLevels: {
        prompts: 'sanitized',
        responses: 'sanitized',
        errors: 'sanitized',
        metadata: 'full'
      },
      customPiiPatterns: [],
      detectBuiltinPii: true,
      hashSensitiveContent: false
    }
    this.contentProcessor = new ContentProcessor(new PrivacyController(privacyConfig))
  }

  /**
   * Process prompt text with privacy controls
   */
  processPrompt(prompt: string): string | null {
    return this.contentProcessor.processPrompt(prompt)
  }

  /**
   * Process response text with privacy controls
   */
  processResponse(response: string): string | null {
    return this.contentProcessor.processResponse(response)
  }

  /**
   * Process error text with privacy controls
   */
  processError(error: string): string | null {
    return this.contentProcessor.processError(error)
  }

  /**
   * Update privacy configuration
   */
  updatePrivacyConfig(config: Partial<PrivacyConfig>): void {
    // Create new content processor with updated privacy config
    this.contentProcessor = new ContentProcessor(new PrivacyController(config))
  }
}

/**
 * Core event tracker for recording all types of events
 */
export class EventTracker {
  private config: InitConfig
  private eventQueue: EventQueueManager
  private contentSanitizer: ContentSanitizer
  private userId: UserId

  constructor(
    config: InitConfig,
    eventQueue: EventQueueManager
  ) {
    this.config = config
    this.eventQueue = eventQueue
    this.contentSanitizer = new ContentSanitizer(config)
    this.userId = config.userId
  }

  /**
   * Core track method for recording events
   * @param eventType - Type of event being recorded
   * @param properties - Event-specific properties
   * @param content - Optional content (prompt/response) with privacy controls
   */
  async track(
    eventType: EventType,
    properties: Record<string, any> = {},
    content?: {
      promptText?: string
      aiResponse?: string
      context?: string
    }
  ): Promise<void> {
    try {
      // Create base event
      const event: Event = {
        eventId: generateEventId(),
        eventType,
        timestamp: Date.now(),
        userId: this.userId,
        properties: {
          ...properties,
          // Add context if provided
          ...(content?.context && { context: content.context })
        }
      }

      // Add content based on privacy settings
      if (content?.promptText) {
        const processedPrompt = this.contentSanitizer.processPrompt(content.promptText)
        if (processedPrompt) {
          event.promptText = processedPrompt
        }
      }

      if (content?.aiResponse) {
        const processedResponse = this.contentSanitizer.processResponse(content.aiResponse)
        if (processedResponse) {
          event.aiResponse = processedResponse
        }
      }

      // Add to queue for batching
      await this.eventQueue.addEvent(event)

      if (this.config.debug) {
        console.log('Bilan: Event tracked:', event)
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('Bilan: Failed to track event:', error)
        throw error
      } else {
        console.warn('Bilan: Failed to track event:', error)
      }
    }
  }

  /**
   * Convenience method for tracking user actions
   */
  async trackUserAction(
    actionType: string,
    properties: Record<string, any> = {},
    content?: { promptText?: string; aiResponse?: string; context?: string }
  ): Promise<void> {
    await this.track('user_action', {
      actionType,
      ...properties
    }, content)
  }

  /**
   * Convenience method for tracking vote events (backward compatibility)
   */
  async trackVote(
    promptId: string,
    value: 1 | -1,
    comment?: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    await this.track('vote_cast', {
      promptId,
      value,
      comment,
      ...properties
    })
  }

  /**
   * Convenience method for tracking journey steps
   */
  async trackJourneyStep(
    journeyName: string,
    stepName: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    await this.track('journey_step', {
      journeyName,
      stepName,
      ...properties
    })
  }

  /**
   * Flush any pending events
   */
  async flush(): Promise<void> {
    await this.eventQueue.flush(true)
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.eventQueue.getQueueSize()
  }
} 