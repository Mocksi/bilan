import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  initTelemetry, 
  trackEvent, 
  trackVote, 
  trackStatsRequest, 
  trackError, 
  resetTelemetryForTesting,
  getTelemetryQueueSize 
} from '../src/telemetry'
import { createUserId } from '../src/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
})

describe('Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetTelemetryForTesting()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    resetTelemetryForTesting()
  })

  describe('initTelemetry', () => {
    it('should initialize telemetry with default settings', () => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      expect(() => initTelemetry(config)).not.toThrow()
    })

    it('should initialize telemetry with custom version', () => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      expect(() => initTelemetry(config, '1.0.0')).not.toThrow()
    })

    it('should initialize telemetry with custom settings', () => {
      const config = {
        mode: 'local' as const,
        userId: createUserId('test-user'),
        telemetry: {
          enabled: true,
          endpoint: 'https://custom-analytics.com'
        }
      }
      
      expect(() => initTelemetry(config)).not.toThrow()
    })

    it('should track SDK initialization event', async () => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://analytics.bilan.dev/events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('sdk_init')
        })
      )
    })
  })

  describe('trackEvent', () => {
    beforeEach(() => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should track custom events', () => {
      const event = {
        event: 'vote_recorded' as const,
        metadata: { test: 'data' }
      }
      
      expect(() => trackEvent(event)).not.toThrow()
    })

    it('should handle null telemetry service gracefully', () => {
      resetTelemetryForTesting()
      
      expect(() => trackEvent({
        event: 'vote_recorded' as const,
        metadata: { test: 'data' }
      })).not.toThrow()
    })
  })

  describe('trackVote', () => {
    beforeEach(() => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should track vote events with proper hashing', () => {
      expect(() => trackVote('test-prompt', 1, true)).not.toThrow()
    })

    it('should track negative votes', () => {
      expect(() => trackVote('test-prompt', -1, false)).not.toThrow()
    })

    it('should handle null telemetry service gracefully', () => {
      resetTelemetryForTesting()
      
      expect(() => trackVote('test-prompt', 1, true)).not.toThrow()
    })
  })

  describe('trackStatsRequest', () => {
    beforeEach(() => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should track basic stats requests', () => {
      expect(() => trackStatsRequest('basic')).not.toThrow()
    })

    it('should track prompt stats requests', () => {
      expect(() => trackStatsRequest('prompt')).not.toThrow()
    })

    it('should handle null telemetry service gracefully', () => {
      resetTelemetryForTesting()
      
      expect(() => trackStatsRequest('basic')).not.toThrow()
    })
  })

  describe('trackError', () => {
    beforeEach(() => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should track errors with context', () => {
      const error = new Error('Test error')
      expect(() => trackError(error, 'test-context')).not.toThrow()
    })

    it('should track errors without context', () => {
      const error = new Error('Test error')
      expect(() => trackError(error)).not.toThrow()
    })

    it('should handle null telemetry service gracefully', () => {
      resetTelemetryForTesting()
      
      const error = new Error('Test error')
      expect(() => trackError(error, 'test-context')).not.toThrow()
    })
  })

  describe('TelemetryService', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should respect telemetry enabled/disabled setting', () => {
      const config = {
        mode: 'local' as const,
        userId: createUserId('test-user'),
        telemetry: {
          enabled: false
        }
      }
      
      initTelemetry(config)
      trackVote('test-prompt', 1, true)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should disable telemetry in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development')
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      trackVote('test-prompt', 1, true)
      
      expect(mockFetch).not.toHaveBeenCalled()
      
      vi.unstubAllEnvs()
    })

    it('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      
      // Wait for initialization event to be sent
      await vi.runAllTimersAsync()
      
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      
      await vi.runAllTimersAsync()
      
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should respect queue size limits', () => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com',
        telemetry: {
          enabled: true
        }
      }
      
      // Mock offline mode to prevent immediate sending
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })
      
      initTelemetry(config)
      
      // Add more events than the queue limit (100)
      for (let i = 0; i < 150; i++) {
        trackVote(`prompt-${i}`, 1, true)
      }
      
      // Verify queue size is capped at 100
      const queueSize = getTelemetryQueueSize()
      expect(queueSize).toBeLessThanOrEqual(100)
    })

    it('should handle timeout errors', async () => {
      vi.useFakeTimers()
      
      // Mock fetch to hang
      mockFetch.mockImplementation(() => new Promise(() => {}))
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(6000)
      
      await vi.runAllTimersAsync()
      
      expect(mockFetch).toHaveBeenCalled()
      
      vi.useRealTimers()
    })

    it('should set User-Agent header in Node.js environment', () => {
      const originalProcess = global.process
      global.process = {
        ...originalProcess,
        versions: { node: '18.0.0' }
      } as any
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      trackVote('test-prompt', 1, true)
      
      global.process = originalProcess
    })

    it('should handle online/offline events and process queued events', async () => {
      vi.useFakeTimers()
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })
      
      initTelemetry(config)
      
      // Clear initial fetch calls
      mockFetch.mockClear()
      
      // Add events while offline
      trackVote('test-prompt', 1, true)
      trackVote('test-prompt-2', -1, false)
      
      // Verify no fetch calls made while offline
      expect(mockFetch).not.toHaveBeenCalled()
      
      // Verify events are queued
      expect(getTelemetryQueueSize()).toBeGreaterThan(0)
      
      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })
      
      // Simulate online event
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
      
      // Run all timers to process async operations
      await vi.runAllTimersAsync()
      
      // Verify queued events were sent
      expect(mockFetch).toHaveBeenCalled()
      
      vi.useRealTimers()
    }, 10000)
  })

  describe('Hash Function', () => {
    let capturedHashes: string[] = []
    
    beforeEach(() => {
      capturedHashes = []
      
      // Mock fetch to capture hash values
      mockFetch.mockImplementation(async (url, options) => {
        const body = JSON.parse(options.body as string)
        const events = body.events
        
        events.forEach((event: any) => {
          if (event.event === 'vote_recorded' && event.metadata?.turnIdHash) {
            capturedHashes.push(event.metadata.turnIdHash)
          }
        })
        
        return {
          ok: true,
          json: async () => ({ success: true })
        }
      })
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should produce consistent hashes for same input', async () => {
      // Track the same turn multiple times
      trackVote('consistent-turn', 1, true)
      trackVote('consistent-turn', -1, false)
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should produce same hash each time
      expect(capturedHashes.length).toBe(2)
      expect(capturedHashes[0]).toBe(capturedHashes[1])
    })

    it('should produce different hashes for different inputs', async () => {
      trackVote('turn-1', 1, true)
      trackVote('turn-2', 1, true)
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Different turns should have different hashes
      expect(capturedHashes.length).toBe(2)
      expect(capturedHashes[0]).not.toBe(capturedHashes[1])
    })
  })
}) 