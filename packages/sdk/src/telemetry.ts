import { InitConfig } from './types'

export interface TelemetryEvent {
  event: 'sdk_init' | 'vote_recorded' | 'stats_requested' | 'error'
  timestamp: number
  version: string
  mode: 'local' | 'server'
  anonymousId: string // hash of userId
  metadata?: Record<string, any>
}

export interface TelemetryConfig {
  enabled: boolean // default: true for hosted, false for self-hosted
  endpoint?: string // default: your analytics endpoint
}

class TelemetryService {
  private config: TelemetryConfig
  private version: string
  private anonymousId: string
  private mode: 'local' | 'server'
  private queue: TelemetryEvent[] = []
  private isOnline: boolean = navigator?.onLine ?? true

  constructor(config: TelemetryConfig, version: string, anonymousId: string, mode: 'local' | 'server') {
    this.config = config
    this.version = version
    this.anonymousId = this.hashUserId(anonymousId)
    this.mode = mode

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flushQueue()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  private hashUserId(userId: string): string {
    // Simple hash function for anonymization
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private getDefaultEndpoint(): string {
    return 'https://analytics.bilan.dev/events'
  }

  private shouldSendTelemetry(): boolean {
    // Don't send telemetry if:
    // - Explicitly disabled
    // - Running in development mode
    // - Self-hosted mode (unless explicitly enabled)
    if (!this.config.enabled) return false
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return false
    }

    // For self-hosted (local mode), default to disabled unless explicitly enabled
    if (this.mode === 'local' && this.config.enabled === undefined) {
      return false
    }

    return true
  }

  async track(event: Omit<TelemetryEvent, 'timestamp' | 'version' | 'anonymousId' | 'mode'>): Promise<void> {
    if (!this.shouldSendTelemetry()) return

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
      version: this.version,
      anonymousId: this.anonymousId,
      mode: this.mode
    }

    // Add to queue
    this.queue.push(telemetryEvent)

    // Try to send immediately if online
    if (this.isOnline) {
      await this.flushQueue()
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || !this.shouldSendTelemetry()) return

    const events = [...this.queue]
    this.queue = []

    try {
      const endpoint = this.config.endpoint || this.getDefaultEndpoint()
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `bilan-sdk/${this.version}`
        },
        body: JSON.stringify({ events })
      })

      if (!response.ok) {
        // Re-queue events if send failed
        this.queue.unshift(...events)
      }
    } catch (error) {
      // Re-queue events if send failed
      this.queue.unshift(...events)
      
      // Only log in debug mode
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn('Bilan telemetry failed to send:', error)
      }
    }
  }

  // Graceful shutdown - flush remaining events
  async flush(): Promise<void> {
    if (this.queue.length > 0) {
      await this.flushQueue()
    }
  }
}

let telemetryService: TelemetryService | null = null

/**
 * Initializes the telemetry service with the provided configuration and tracks the SDK initialization event.
 *
 * Sets up telemetry event tracking for the SDK, including anonymized user identification and environment-specific settings.
 */
export function initTelemetry(config: InitConfig): void {
  const telemetryConfig: TelemetryConfig = {
    enabled: config.telemetry?.enabled ?? (config.mode === 'server'), // Default enabled for server mode
    endpoint: config.telemetry?.endpoint
  }

  telemetryService = new TelemetryService(
    telemetryConfig,
    '0.3.0', // TODO: Get from package.json
    config.userId,
    config.mode
  )

  // Track SDK initialization
  telemetryService.track({
    event: 'sdk_init',
    metadata: {
      mode: config.mode,
      endpoint: config.endpoint ? 'custom' : 'default',
      debug: config.debug || false
    }
  })
}

/**
 * Forwards a telemetry event to the initialized telemetry service for tracking.
 *
 * If the telemetry service is not initialized, the event is ignored.
 */
export function trackEvent(event: Omit<TelemetryEvent, 'timestamp' | 'version' | 'anonymousId' | 'mode'>): void {
  telemetryService?.track(event)
}

/**
 * Tracks a vote event with anonymized prompt information and comment presence.
 *
 * @param promptId - The unique identifier of the prompt being voted on
 * @param value - The vote value, either 1 (upvote) or -1 (downvote)
 * @param hasComment - Indicates whether the vote included a comment
 */
export function trackVote(promptId: string, value: 1 | -1, hasComment: boolean): void {
  trackEvent({
    event: 'vote_recorded',
    metadata: {
      value,
      hasComment,
      promptIdHash: promptId.substring(0, 8) // First 8 chars for debugging, no PII
    }
  })
}

/**
 * Tracks a telemetry event when statistics are requested.
 *
 * @param type - The type of statistics requested, either 'basic' or 'prompt'
 */
export function trackStatsRequest(type: 'basic' | 'prompt'): void {
  trackEvent({
    event: 'stats_requested',
    metadata: { type }
  })
}

/**
 * Tracks an error event with anonymized and truncated error details.
 *
 * @param error - The error object to report
 * @param context - Optional context describing where the error occurred
 */
export function trackError(error: Error, context?: string): void {
  trackEvent({
    event: 'error',
    metadata: {
      errorType: error.name,
      errorMessage: error.message.substring(0, 100), // Truncate to avoid PII
      context,
      stack: error.stack?.substring(0, 200) // Truncated stack trace
    }
  })
}

// Graceful shutdown
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    telemetryService?.flush()
  })
} 