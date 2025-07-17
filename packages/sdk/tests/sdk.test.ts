import { describe, it, expect, beforeEach, vi } from 'vitest'
import { init, trackTurn, trackTurnWithRetry, BilanSDK, isReady, getConfig, resetSDKForTesting } from '../src/index'
import { createUserId, createPromptId } from '../src/types'

// Mock localStorage for testing
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => {
      return (window as any).localStorageData[key] || null
    },
    setItem: (key: string, value: string) => {
      (window as any).localStorageData[key] = value
    },
    removeItem: (key: string) => {
      delete (window as any).localStorageData[key]
    },
    clear: () => {
      (window as any).localStorageData = {}
    }
  },
  writable: true
})

// Mock fetch for server mode tests
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test utility to reset SDK state (removed - using exported function instead)

describe('Bilan SDK v0.4.0', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    ;(window as any).localStorageData = {}
    vi.clearAllMocks()
    resetSDKForTesting()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
  })

  describe('Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
    })

    it('should initialize with server mode', async () => {
      await expect(init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })).resolves.not.toThrow()
    })

    it('should check if SDK is ready', async () => {
      expect(isReady()).toBe(false)
      
      await init({
        mode: 'local',
        userId: createUserId('test-user')
      })
      
      expect(isReady()).toBe(true)
    })

    it('should return current configuration', async () => {
      expect(getConfig()).toBeNull()
      
      const config = {
        mode: 'local' as const,
        userId: createUserId('test-user'),
        debug: true
      }
      
      await init(config)
      
      const currentConfig = getConfig()
      expect(currentConfig).toMatchObject(config)
    })
  })

  describe('trackTurn', () => {
    beforeEach(async () => {
      await init({
        mode: 'local',
        userId: createUserId('test-user')
      })
    })

    it('should track successful AI turn', async () => {
      const mockAiFunction = vi.fn().mockResolvedValue('AI response')
      
      const result = await trackTurn(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' }
      )
      
      expect(result).toBe('AI response')
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })

    it('should track failed AI turn', async () => {
      const mockAiFunction = vi.fn().mockRejectedValue(new Error('AI error'))
      
      await expect(trackTurn(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' }
      )).rejects.toThrow('AI error')
      
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })

    it('should handle timeout', async () => {
      const mockAiFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      )
      
      await expect(trackTurn(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' },
        { timeout: 100 }
      )).rejects.toThrow('timeout')
      
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })

    it('should work without initialization in graceful mode', async () => {
      resetSDKForTesting()
      
      const mockAiFunction = vi.fn().mockResolvedValue('AI response')
      
      const result = await trackTurn(
        'What is the weather?',
        mockAiFunction
      )
      
      expect(result).toBe('AI response')
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })
  })

  describe('trackTurnWithRetry', () => {
    beforeEach(async () => {
      await init({
        mode: 'local',
        userId: createUserId('test-user')
      })
    })

    it('should retry failed AI calls', async () => {
      let callCount = 0
      const mockAiFunction = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          throw new Error('Temporary error')
        }
        return Promise.resolve('AI response')
      })
      
      const result = await trackTurnWithRetry(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' },
        3
      )
      
      expect(result).toBe('AI response')
      expect(mockAiFunction).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const mockAiFunction = vi.fn().mockRejectedValue(new Error('Persistent error'))
      
      await expect(trackTurnWithRetry(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' },
        2
      )).rejects.toThrow('Persistent error')
      
      expect(mockAiFunction).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock a storage error
      const originalSetItem = window.localStorage.setItem
      window.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
      
      // Restore original method
      window.localStorage.setItem = originalSetItem
    })

    it('should handle network errors in server mode', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await expect(init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })).resolves.not.toThrow()
    })
  })

  describe('BilanSDK Class', () => {
    it('should create SDK instance', () => {
      const sdk = new BilanSDK()
      expect(sdk).toBeInstanceOf(BilanSDK)
    })

    it('should initialize SDK instance', async () => {
      const sdk = new BilanSDK()
      
      await expect(sdk.init({
        mode: 'local',
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
      
      expect(sdk.isReady()).toBe(true)
    })

    it('should track turns with SDK instance', async () => {
      const sdk = new BilanSDK()
      
      await sdk.init({
        mode: 'local',
        userId: createUserId('test-user')
      })
      
      const mockAiFunction = vi.fn().mockResolvedValue('AI response')
      
      const result = await sdk.trackTurn(
        'What is the weather?',
        mockAiFunction,
        { model: 'gpt-4' }
      )
      
      expect(result).toBe('AI response')
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })
  })

  describe('Privacy and Configuration', () => {
         it('should initialize with privacy configuration', async () => {
       await expect(init({
         mode: 'local',
         userId: createUserId('test-user'),
         privacyConfig: {
           defaultCaptureLevel: 'metadata',
           captureLevels: {
             prompts: 'metadata',
             responses: 'metadata',
             errors: 'sanitized',
             metadata: 'full'
           },
           customPiiPatterns: [],
           detectBuiltinPii: true,
           hashSensitiveContent: true
         }
       })).resolves.not.toThrow()
     })

    it('should initialize with event batching configuration', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        eventBatching: {
          batchSize: 10,
          flushInterval: 5000,
          maxBatches: 5
        }
      })).resolves.not.toThrow()
    })

    it('should initialize with telemetry configuration', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        telemetry: {
          enabled: true,
          endpoint: 'https://telemetry.example.com'
        }
      })).resolves.not.toThrow()
    })
  })
}) 