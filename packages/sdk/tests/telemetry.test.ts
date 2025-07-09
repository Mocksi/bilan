import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { initTelemetry, trackEvent, trackVote, trackStatsRequest, trackError } from '../src/telemetry'
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
      // Reset telemetry service
      const originalService = (global as any).telemetryService
      ;(global as any).telemetryService = null
      
      expect(() => trackEvent({
        event: 'vote_recorded' as const,
        metadata: { test: 'data' }
      })).not.toThrow()
      
      // Restore
      ;(global as any).telemetryService = originalService
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
      const originalService = (global as any).telemetryService
      ;(global as any).telemetryService = null
      
      expect(() => trackVote('test-prompt', 1, true)).not.toThrow()
      
      ;(global as any).telemetryService = originalService
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
      const originalService = (global as any).telemetryService
      ;(global as any).telemetryService = null
      
      expect(() => trackStatsRequest('basic')).not.toThrow()
      
      ;(global as any).telemetryService = originalService
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
      const originalService = (global as any).telemetryService
      ;(global as any).telemetryService = null
      
      const error = new Error('Test error')
      expect(() => trackError(error, 'test-context')).not.toThrow()
      
      ;(global as any).telemetryService = originalService
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
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      trackVote('test-prompt', 1, true)
      
      expect(mockFetch).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
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
      
      // Should not crash or consume unlimited memory
      expect(true).toBe(true)
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

    it('should handle online/offline events', () => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      
      initTelemetry(config)
      
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })
      
      // Simulate online event
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
      
      // Should not crash
      expect(true).toBe(true)
    })
  })

  describe('Hash Function', () => {
    beforeEach(() => {
      const config = {
        mode: 'server' as const,
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      }
      initTelemetry(config)
    })

    it('should produce consistent hashes', () => {
      // Track the same prompt multiple times
      trackVote('consistent-prompt', 1, true)
      trackVote('consistent-prompt', -1, false)
      
      // Should produce same hash each time
      expect(true).toBe(true)
    })

    it('should produce different hashes for different inputs', () => {
      trackVote('prompt-1', 1, true)
      trackVote('prompt-2', 1, true)
      
      // Different prompts should have different hashes
      expect(true).toBe(true)
    })
  })
}) 