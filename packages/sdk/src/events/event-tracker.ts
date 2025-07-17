import { Event, EventType, InitConfig, generateEventId, UserId } from '../types'
import { EventQueueManager } from './event-queue'
import { ContentProcessor, PrivacyConfig } from './privacy-controls'

/**
 * Privacy controls for content capture - enhanced with new privacy system
 */
export class ContentSanitizer {
  private sanitizeContent: boolean
  private capturePrompts: boolean
  private captureResponses: boolean
  private captureResponsesFor: string[]
  private contentProcessor: ContentProcessor

  constructor(config: InitConfig) {
    this.sanitizeContent = config.sanitizeContent ?? true
    this.capturePrompts = config.capturePrompts ?? true
    this.captureResponses = config.captureResponses ?? false
    this.captureResponsesFor = config.captureResponsesFor || []
    
    // Initialize content processor with privacy config
    this.contentProcessor = new ContentProcessor(config.privacyConfig)
  }

  /**
   * Determine if prompts should be captured
   */
  shouldCapturePrompt(): boolean {
    return this.capturePrompts
  }

  /**
   * Determine if responses should be captured based on context
   */
  shouldCaptureResponse(context?: string): boolean {
    if (!this.captureResponses) return false
    
    if (this.captureResponsesFor.length > 0) {
      return context ? this.captureResponsesFor.includes(context) : false
    }
    
    return true
  }

  /**
   * Sanitize content to remove PII using enhanced privacy controls
   */
  sanitizeText(text: string): string {
    if (!this.sanitizeContent) return text
    
    // Use new privacy system for sanitization
    return this.contentProcessor.processResponse(text) || '[CONTENT_BLOCKED]'
  }

  /**
   * Process prompt text with privacy controls
   */
  processPrompt(prompt: string): string | null {
    if (!this.capturePrompts) return null
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
    this.contentProcessor.updatePrivacyConfig(config)
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
      if (content?.promptText && this.contentSanitizer.shouldCapturePrompt()) {
        event.promptText = this.contentSanitizer.sanitizeText(content.promptText)
      }

      if (content?.aiResponse && this.contentSanitizer.shouldCaptureResponse(content.context)) {
        event.aiResponse = this.contentSanitizer.sanitizeText(content.aiResponse)
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