import { InitConfig } from './types'

export interface TelemetryEvent {
  event: 'sdk_init' | 'vote_recorded' | 'stats_requested' | 'error'
  timestamp: number
  version: string
  mode: 'local' | 'server'
  anonymousId: string // hash of userId
  metadata?: Record<string, unknown>
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
  private readonly MAX_QUEUE_SIZE = 100 // Maximum events to keep in queue
  private isHashingComplete: boolean = false
  private pendingEvents: TelemetryEvent[] = []

  constructor(config: TelemetryConfig, version: string, anonymousId: string, mode: 'local' | 'server') {
    this.config = config
    this.version = version
    this.anonymousId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Temporary ID until hashing completes
    this.mode = mode

    // Hash the user ID asynchronously
    this.hashUserId(anonymousId).then(hash => {
      this.anonymousId = hash
      this.isHashingComplete = true
      this.processPendingEvents()
    }).catch(() => {
      // Fallback to simple hash if crypto fails
      this.anonymousId = this.fallbackHashUserId(anonymousId)
      this.isHashingComplete = true
      this.processPendingEvents()
    })

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

  private async hashUserId(userId: string): Promise<string> {
    // Use cryptographic SHA-256 hash for strong anonymization
    try {
      // Browser environment
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder()
        const data = encoder.encode(userId)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
      }
      
      // Node.js environment
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const crypto = await import('crypto')
        return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16)
      }
      
      // Fallback if crypto is not available
      return this.fallbackHashUserId(userId)
    } catch (error) {
      // Fallback if crypto fails
      return this.fallbackHashUserId(userId)
    }
  }

  private fallbackHashUserId(userId: string): string {
    // Simple hash function for anonymization (fallback)
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private processPendingEvents(): void {
    // Update anonymousId for all pending events and move them to main queue
    for (const event of this.pendingEvents) {
      event.anonymousId = this.anonymousId
      
      // Check queue size limit before adding
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        this.queue.shift()
      }
      
      this.queue.push(event)
    }
    
    // Clear pending events
    this.pendingEvents = []
    
    // Try to flush if online
    if (this.isOnline) {
      this.flushQueue()
    }
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
    
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
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

    // If hashing is not complete, queue event separately
    if (!this.isHashingComplete) {
      if (this.pendingEvents.length >= this.MAX_QUEUE_SIZE) {
        this.pendingEvents.shift()
      }
      this.pendingEvents.push(telemetryEvent)
      return
    }

    // Check queue size limit before adding new event
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest event to make room for new one
      this.queue.shift()
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
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      // Prepare headers - conditionally set User-Agent for Node.js environments
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Only set User-Agent in Node.js environments where it's allowed
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        headers['User-Agent'] = `bilan-sdk/${this.version}`
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Re-queue events if send failed, but respect queue size limit
        const eventsToRequeue = events.slice(-this.MAX_QUEUE_SIZE)
        this.queue.unshift(...eventsToRequeue)
      }
    } catch (error) {
      // Re-queue events if send failed, but respect queue size limit
      const eventsToRequeue = events.slice(-this.MAX_QUEUE_SIZE)
      this.queue.unshift(...eventsToRequeue)
      
      // Only log in debug mode
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
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

export function trackEvent(event: Omit<TelemetryEvent, 'timestamp' | 'version' | 'anonymousId' | 'mode'>): void {
  telemetryService?.track(event)
}

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

export function trackStatsRequest(type: 'basic' | 'prompt'): void {
  trackEvent({
    event: 'stats_requested',
    metadata: { type }
  })
}

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