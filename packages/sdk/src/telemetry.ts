import { InitConfig } from './types'
import { SDK_VERSION } from './version'

export interface TelemetryEvent {
  event: 'sdk_init' | 'vote_recorded' | 'stats_requested' | 'error'
  timestamp: number
  version: string
  mode: 'local' | 'server'
  anonymousId: string
  metadata?: Record<string, unknown>
}

export interface TelemetryConfig {
  enabled: boolean
  endpoint?: string
}

class TelemetryService {
  private config: TelemetryConfig
  private version: string
  private anonymousId: string
  private mode: 'local' | 'server'
  private queue: TelemetryEvent[] = []
  private isOnline: boolean = navigator?.onLine ?? true
  private readonly MAX_QUEUE_SIZE = 100

  constructor(config: TelemetryConfig, version: string, anonymousId: string, mode: 'local' | 'server') {
    this.config = config
    this.version = version
    this.anonymousId = this.hashString(anonymousId)
    this.mode = mode

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      const onOnline = () => { this.isOnline = true; this.flushQueue() }
      const onOffline = () => { this.isOnline = false }
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
    }
  }

  private hashString(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  // Make hashString accessible for turnId hashing
  public hashTurnId(turnId: string): string {
    return this.hashString(turnId)
  }

  // Expose queue size for testing
  public getQueueSize(): number {
    return this.queue.length
  }

  private shouldSendTelemetry(): boolean {
    if (!this.config.enabled) return false
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') return false
    if (this.mode === 'local' && this.config.enabled === undefined) return false
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

    // Check queue size limit before adding new event
    if (this.queue.length >= this.MAX_QUEUE_SIZE) this.queue.shift()
    this.queue.push(telemetryEvent)

    // Try to send immediately if online
    if (this.isOnline) await this.flushQueue()
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || !this.shouldSendTelemetry()) return

    const events = [...this.queue]
    this.queue = []

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (typeof process !== 'undefined' && process.versions?.node) {
        headers['User-Agent'] = `bilan-sdk/${this.version}`
      }
      
      const response = await fetch(this.config.endpoint || 'https://analytics.bilan.dev/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({ events }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const eventsToRequeue = events.slice(-this.MAX_QUEUE_SIZE)
        this.queue.unshift(...eventsToRequeue)
      }
    } catch (error) {
      const eventsToRequeue = events.slice(-this.MAX_QUEUE_SIZE)
      this.queue.unshift(...eventsToRequeue)
      
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn('Bilan telemetry failed to send:', error)
      }
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length > 0) await this.flushQueue()
  }
}

let telemetryService: TelemetryService | null = null

export function initTelemetry(config: InitConfig, version?: string): void {
  const telemetryConfig: TelemetryConfig = {
    enabled: config.telemetry?.enabled ?? (config.mode === 'server'),
    endpoint: config.telemetry?.endpoint
  }

  telemetryService = new TelemetryService(telemetryConfig, version || SDK_VERSION, config.userId, config.mode)

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
  if (!telemetryService) return
  telemetryService.track(event)
}

export function trackVote(turnId: string, value: 1 | -1, hasComment: boolean): void {
  if (!telemetryService) return
  
  trackEvent({
    event: 'vote_recorded',
    metadata: { value, hasComment, turnIdHash: telemetryService.hashTurnId(turnId) }
  })
}

export function trackStatsRequest(type: 'basic' | 'prompt'): void {
  if (!telemetryService) return
  trackEvent({ event: 'stats_requested', metadata: { type } })
}

export function trackError(error: Error, context?: string): void {
  if (!telemetryService) return
  trackEvent({
    event: 'error',
    metadata: { message: error.message, context }
  })
}

// Testing utilities
export function resetTelemetryForTesting(): void {
  telemetryService = null
}

export function getTelemetryQueueSize(): number {
  return telemetryService?.getQueueSize() ?? 0
} 