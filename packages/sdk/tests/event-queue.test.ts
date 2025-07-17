import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventQueueManager } from '../src/events/event-queue'
import { Event, InitConfig, EventId, UserId } from '../src/types'

// Mock storage interface
const mockStorage = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
}

// Mock event
const createMockEvent = (id: string = 'test-event'): Event => ({
  eventId: id as EventId,
  eventType: 'vote_cast',
  timestamp: Date.now(),
  userId: 'test-user' as UserId,
  properties: { value: 1 }
})

// Mock config
const createMockConfig = (overrides: Partial<InitConfig> = {}): InitConfig => ({
  mode: 'local',
  userId: 'test-user' as UserId,
  eventBatching: {
    batchSize: 3,
    flushInterval: 1000,
    maxBatches: 2
  },
  ...overrides
})

describe('EventQueueManager', () => {
  let eventQueueManager: EventQueueManager
  let mockOnFlush: ReturnType<typeof vi.fn>
  let config: InitConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnFlush = vi.fn().mockResolvedValue(undefined)
    config = createMockConfig()
    
    // Mock timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (eventQueueManager) {
      eventQueueManager.stopFlushTimer()
    }
  })

  describe('Constructor', () => {
         it('should initialize with default config values', () => {
       const minimalConfig: InitConfig = { mode: 'local', userId: 'test' as UserId }
       eventQueueManager = new EventQueueManager(minimalConfig, mockStorage, mockOnFlush)
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should initialize with custom config values', () => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should start flush timer on initialization', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
    })

    it('should work without storage', () => {
      eventQueueManager = new EventQueueManager(config, null, mockOnFlush)
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })
  })

  describe('addEvent', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should add event to queue', async () => {
      const event = createMockEvent()
      
      await eventQueueManager.addEvent(event)
      
      expect(eventQueueManager.getQueueSize()).toBe(1)
    })

    it('should flush when batch size is reached', async () => {
      const events = [
        createMockEvent('1'),
        createMockEvent('2'),
        createMockEvent('3')
      ]
      
      for (const event of events) {
        await eventQueueManager.addEvent(event)
      }
      
      expect(mockOnFlush).toHaveBeenCalledWith(events)
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should persist to storage after adding event', async () => {
      const event = createMockEvent()
      
      await eventQueueManager.addEvent(event)
      
      expect(mockStorage.set).toHaveBeenCalledWith('bilan:event_queue', JSON.stringify([event]))
    })

    it('should not persist if storage is null', async () => {
      eventQueueManager = new EventQueueManager(config, null, mockOnFlush)
      const event = createMockEvent()
      
      await eventQueueManager.addEvent(event)
      
      expect(mockStorage.set).not.toHaveBeenCalled()
    })

    it('should drop oldest events when maxBatches limit is reached', async () => {
      // Create config to test maxBatches behavior
      const testConfig = createMockConfig({
        eventBatching: {
          batchSize: 3,
          flushInterval: 1000,
          maxBatches: 2
        }
      })
      
      // Mock onFlush to fail so events stay in queue
      const mockFailingOnFlush = vi.fn().mockRejectedValue(new Error('Flush failed'))
      eventQueueManager = new EventQueueManager(testConfig, mockStorage, mockFailingOnFlush)
      
      // Stop the timer to prevent auto-flush during test
      eventQueueManager.stopFlushTimer()
      
      // maxBatches = 2, batchSize = 3, so max queue size = 6
      const events = []
      for (let i = 0; i < 7; i++) {
        events.push(createMockEvent(`event-${i}`))
      }
      
      // Add 6 events - should reach max capacity
      for (let i = 0; i < 6; i++) {
        try {
          await eventQueueManager.addEvent(events[i])
        } catch (error) {
          // Ignore flush errors - events should be put back in queue
        }
      }
      
      expect(eventQueueManager.getQueueSize()).toBe(6)
      
      // Add 7th event - should drop oldest
      try {
        await eventQueueManager.addEvent(events[6])
      } catch (error) {
        // Ignore flush errors
      }
      
      expect(eventQueueManager.getQueueSize()).toBe(6) // Still 6, oldest dropped
    })

    it('should handle storage persistence errors gracefully', async () => {
      mockStorage.set.mockRejectedValue(new Error('Storage error'))
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const event = createMockEvent()
      
      await expect(eventQueueManager.addEvent(event)).resolves.not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan: Failed to persist event queue:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('flush', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should flush events from queue', async () => {
      const events = [createMockEvent('1'), createMockEvent('2')]
      
      for (const event of events) {
        await eventQueueManager.addEvent(event)
      }
      
      await eventQueueManager.flush()
      
      expect(mockOnFlush).toHaveBeenCalledWith(events)
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should not flush if queue is empty', async () => {
      await eventQueueManager.flush()
      
      expect(mockOnFlush).not.toHaveBeenCalled()
    })

    it('should force flush even if queue is empty', async () => {
      await eventQueueManager.flush(true)
      
      expect(mockOnFlush).toHaveBeenCalledWith([])
    })

    it('should not flush if already processing', async () => {
      const event = createMockEvent()
      await eventQueueManager.addEvent(event)
      
      // Start a flush that will be slow
      let resolveSlowFlush: () => void
      const slowFlushPromise = new Promise<void>(resolve => {
        resolveSlowFlush = resolve
      })
      mockOnFlush.mockImplementation(() => slowFlushPromise)
      
      const flush1Promise = eventQueueManager.flush()
      const flush2Promise = eventQueueManager.flush()
      
      // Resolve the slow flush
      resolveSlowFlush!()
      
      await flush1Promise
      await flush2Promise
      
      expect(mockOnFlush).toHaveBeenCalledTimes(1)
    })

    it('should handle flush errors by putting events back in queue', async () => {
      const events = [createMockEvent('1'), createMockEvent('2')]
      
      for (const event of events) {
        await eventQueueManager.addEvent(event)
      }
      
      mockOnFlush.mockRejectedValue(new Error('Flush failed'))
      
      await expect(eventQueueManager.flush()).rejects.toThrow('Flush failed')
      
      // Events should be back in queue
      expect(eventQueueManager.getQueueSize()).toBe(2)
    })

    it('should persist queue after successful flush', async () => {
      const event = createMockEvent()
      await eventQueueManager.addEvent(event)
      
      await eventQueueManager.flush()
      
      expect(mockStorage.set).toHaveBeenCalledWith('bilan:event_queue', JSON.stringify([]))
    })

    it('should persist queue after failed flush', async () => {
      const event = createMockEvent()
      await eventQueueManager.addEvent(event)
      
      mockOnFlush.mockRejectedValue(new Error('Flush failed'))
      
      await expect(eventQueueManager.flush()).rejects.toThrow('Flush failed')
      
      expect(mockStorage.set).toHaveBeenCalledWith('bilan:event_queue', JSON.stringify([event]))
    })

    it('should work without storage', async () => {
      eventQueueManager = new EventQueueManager(config, null, mockOnFlush)
      const event = createMockEvent()
      await eventQueueManager.addEvent(event)
      
      await eventQueueManager.flush()
      
      expect(mockOnFlush).toHaveBeenCalledWith([event])
      expect(mockStorage.set).not.toHaveBeenCalled()
    })
  })

  describe('getQueueSize', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should return correct queue size', async () => {
      expect(eventQueueManager.getQueueSize()).toBe(0)
      
      await eventQueueManager.addEvent(createMockEvent('1'))
      expect(eventQueueManager.getQueueSize()).toBe(1)
      
      await eventQueueManager.addEvent(createMockEvent('2'))
      expect(eventQueueManager.getQueueSize()).toBe(2)
    })
  })

  describe('clearQueue', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should clear the queue', async () => {
      await eventQueueManager.addEvent(createMockEvent('1'))
      await eventQueueManager.addEvent(createMockEvent('2'))
      
      expect(eventQueueManager.getQueueSize()).toBe(2)
      
      await eventQueueManager.clearQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should delete persisted queue from storage', async () => {
      await eventQueueManager.clearQueue()
      
      expect(mockStorage.delete).toHaveBeenCalledWith('bilan:event_queue')
    })

    it('should work without storage', async () => {
      eventQueueManager = new EventQueueManager(config, null, mockOnFlush)
      await eventQueueManager.addEvent(createMockEvent())
      
      await eventQueueManager.clearQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
      expect(mockStorage.delete).not.toHaveBeenCalled()
    })
  })

  describe('Timer Management', () => {
    it('should start flush timer', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
    })

    it('should stop flush timer', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      eventQueueManager.stopFlushTimer()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should handle periodic flush', async () => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      await eventQueueManager.addEvent(createMockEvent('1'))
      await eventQueueManager.addEvent(createMockEvent('2'))
      
      // Advance timer to trigger flush once
      vi.advanceTimersByTime(1000)
      
      // Clean up timer immediately to prevent infinite loop
      eventQueueManager.stopFlushTimer()
      
      // Wait for the flush to complete
      await vi.runAllTimersAsync()
      
      expect(mockOnFlush).toHaveBeenCalledWith([
        expect.objectContaining({ eventId: '1' }),
        expect.objectContaining({ eventId: '2' })
      ])
    })

    it('should handle flush errors in background timer', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockOnFlush.mockRejectedValue(new Error('Background flush failed'))
      
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      await eventQueueManager.addEvent(createMockEvent())
      
      // Advance timer to trigger flush once
      vi.advanceTimersByTime(1000)
      
      // Clean up timer immediately to prevent infinite loop
      eventQueueManager.stopFlushTimer()
      
      await vi.runAllTimersAsync()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan: Background flush failed:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })

    it('should clear existing timer when starting new one', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
      
      // Start timer again (should clear existing)
      eventQueueManager['startFlushTimer']()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Persistence', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should load persisted queue on initialization', async () => {
      const persistedEvents = [createMockEvent('1'), createMockEvent('2')]
      mockStorage.get.mockResolvedValue(JSON.stringify(persistedEvents))
      
      await eventQueueManager.loadPersistedQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(2)
      expect(mockStorage.get).toHaveBeenCalledWith('bilan:event_queue')
    })

    it('should handle missing persisted queue', async () => {
      mockStorage.get.mockResolvedValue(null)
      
      await eventQueueManager.loadPersistedQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })

    it('should handle corrupted persisted queue', async () => {
      mockStorage.get.mockResolvedValue('invalid json')
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await eventQueueManager.loadPersistedQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan: Failed to load persisted event queue:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })

    it('should handle storage errors when loading', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'))
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await eventQueueManager.loadPersistedQueue()
      
      expect(eventQueueManager.getQueueSize()).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan: Failed to load persisted event queue:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })

    it('should not load if storage is null', async () => {
      eventQueueManager = new EventQueueManager(config, null, mockOnFlush)
      
      await eventQueueManager.loadPersistedQueue()
      
      expect(mockStorage.get).not.toHaveBeenCalled()
      expect(eventQueueManager.getQueueSize()).toBe(0)
    })
  })

  describe('destroy', () => {
    beforeEach(() => {
      eventQueueManager = new EventQueueManager(config, mockStorage, mockOnFlush)
    })

    it('should stop timer and perform final flush', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      await eventQueueManager.addEvent(createMockEvent())
      
      await eventQueueManager.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(mockOnFlush).toHaveBeenCalled()
    })

    it('should handle final flush errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockOnFlush.mockRejectedValue(new Error('Final flush failed'))
      
      await eventQueueManager.addEvent(createMockEvent())
      
      await expect(eventQueueManager.destroy()).resolves.not.toThrow()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan: Final flush failed during destroy:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })

    it('should force flush even if queue is empty', async () => {
      await eventQueueManager.destroy()
      
      expect(mockOnFlush).toHaveBeenCalledWith([])
    })
  })
}) 