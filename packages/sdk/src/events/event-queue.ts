import { Event, EventQueue, InitConfig } from '../types'

/**
 * Event queue manager for batching and offline support
 * Handles event queuing, batching, and flushing to storage or server
 */
export class EventQueueManager {
  private queue: Event[] = []
  private batchSize: number
  private flushInterval: number
  private maxBatches: number
  private flushTimer: NodeJS.Timeout | null = null
  private isProcessing = false
  private storage: any = null
  private onFlush: (events: Event[]) => Promise<void>

  constructor(
    config: InitConfig,
    storage: any,
    onFlush: (events: Event[]) => Promise<void>
  ) {
    this.batchSize = config.eventBatching?.batchSize || 10
    this.flushInterval = config.eventBatching?.flushInterval || 5000
    this.maxBatches = config.eventBatching?.maxBatches || 5
    this.storage = storage
    this.onFlush = onFlush
    
    // Start periodic flush timer
    this.startFlushTimer()
  }

  /**
   * Add an event to the queue
   * @param event - Event to add to queue
   */
  async addEvent(event: Event): Promise<void> {
    // Check if queue has reached maximum capacity
    const maxQueueSize = this.maxBatches * this.batchSize
    if (this.queue.length >= maxQueueSize) {
      // Drop oldest events to make room for new ones
      this.queue.shift()
    }
    
    this.queue.push(event)
    
    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.flush()
    }
    
    // Persist to storage for offline support
    if (this.storage) {
      await this.persistQueue()
    }
  }

  /**
   * Flush events from queue
   * @param force - Force flush even if batch not full
   */
  async flush(force: boolean = false): Promise<void> {
    if (this.isProcessing || (this.queue.length === 0 && !force)) {
      return
    }

    this.isProcessing = true
    
    const eventsToFlush = this.queue.splice(0, this.batchSize)
    
    try {
      if (eventsToFlush.length > 0) {
        await this.onFlush(eventsToFlush)
        
        // Update persisted queue
        if (this.storage) {
          await this.persistQueue()
        }
      }
    } catch (error) {
      // On error, put events back in queue for retry
      this.queue.unshift(...eventsToFlush)
      
      if (this.storage) {
        await this.persistQueue()
      }
      
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    this.queue = []
    
    if (this.storage) {
      await this.storage.delete('bilan:event_queue')
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush()
      } catch (error) {
        // Silently handle flush errors in background
        console.warn('Bilan: Background flush failed:', error)
      }
    }, this.flushInterval)
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Persist queue to storage for offline support
   */
  private async persistQueue(): Promise<void> {
    if (!this.storage) return
    
    try {
      await this.storage.set('bilan:event_queue', JSON.stringify(this.queue))
    } catch (error) {
      console.warn('Bilan: Failed to persist event queue:', error)
    }
  }

  /**
   * Load queue from storage on initialization
   */
  async loadPersistedQueue(): Promise<void> {
    if (!this.storage) return
    
    try {
      const persistedQueue = await this.storage.get('bilan:event_queue')
      if (persistedQueue) {
        this.queue = JSON.parse(persistedQueue)
      }
    } catch (error) {
      console.warn('Bilan: Failed to load persisted event queue:', error)
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopFlushTimer()
    
    // Final flush before destroying
    try {
      await this.flush(true)
    } catch (error) {
      console.warn('Bilan: Final flush failed during destroy:', error)
    }
  }
} 