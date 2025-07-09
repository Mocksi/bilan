import { describe, it, expect, beforeEach, vi } from 'vitest'
import { init, vote, getStats, getPromptStats } from '../src/index'
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

// Test utility to reset SDK state
function resetSDKForTesting() {
  // Clear any module-level state
  ;(global as any).sdkInitialized = false
  ;(global as any).sdkConfig = null
  ;(global as any).storageAdapter = null
  ;(global as any).analytics = null
}

describe('Bilan SDK', () => {
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

    it('should initialize with debug mode', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        debug: true
      })).resolves.not.toThrow()
    })

    it('should initialize server mode', async () => {
      await expect(init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })).resolves.not.toThrow()
    })

    it('should handle invalid mode gracefully', async () => {
      await expect(init({
        mode: 'invalid' as any,
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
    })

    it('should handle missing userId gracefully', async () => {
      await expect(init({
        mode: 'local',
        userId: null as any
      })).resolves.not.toThrow()
    })

    it('should handle server mode without endpoint gracefully', async () => {
      await expect(init({
        mode: 'server',
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
    })

    it('should handle localStorage unavailable gracefully', async () => {
      const originalLocalStorage = window.localStorage
      window.localStorage = undefined as any
      
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user')
      })).resolves.not.toThrow()
      
      window.localStorage = originalLocalStorage
    })

    it('should initialize with custom storage adapter', async () => {
      const customStorage = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined)
      }
      
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        storage: customStorage
      })).resolves.not.toThrow()
    })

    it('should initialize with custom trend config', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        trendConfig: {
          sensitivity: 0.2,
          timeWeightHours: 48,
          minSampleSize: 10,
          recentWindowSize: 20
        }
      })).resolves.not.toThrow()
    })

    it('should initialize with telemetry config', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        telemetry: {
          enabled: true,
          endpoint: 'https://custom-analytics.com'
        }
      })).resolves.not.toThrow()
    })
  })

  describe('Vote Recording', () => {
    beforeEach(async () => {
      await init({ mode: 'local', userId: createUserId('test-user') })
    })

    it('should track votes', async () => {
      await vote(createPromptId('prompt-1'), 1, 'Great!')
      await vote(createPromptId('prompt-1'), -1, 'Not helpful')
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(2)
      expect(stats.positiveRate).toBe(0.5)
    })

    it('should handle string promptId', async () => {
      await vote('prompt-1', 1, 'Great!')
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(1)
    })

    it('should handle votes without comments', async () => {
      await vote(createPromptId('prompt-1'), 1)
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(1)
    })

    it('should handle votes with full context', async () => {
      await vote(createPromptId('prompt-1'), 1, 'Great!', {
        promptText: 'How do I center a div?',
        aiOutput: 'Use flexbox...',
        modelUsed: 'gpt-4',
        responseTime: 1.2
      })
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(1)
    })

    it('should handle invalid vote value gracefully', async () => {
      await expect(vote(createPromptId('prompt-1'), 2 as any)).resolves.not.toThrow()
    })

    it('should handle vote before initialization', async () => {
      // Reset SDK state to simulate uninitialized state
      resetSDKForTesting()
      
      // Try to vote before init
      await expect(vote(createPromptId('prompt-1'), 1)).resolves.not.toThrow()
    })

    it('should handle vote in debug mode', async () => {
      await init({ mode: 'local', userId: createUserId('test-user'), debug: true })
      
      await expect(vote(createPromptId('prompt-1'), 1, 'Great!')).resolves.not.toThrow()
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await init({ mode: 'local', userId: createUserId('test-user') })
    })

    it('should calculate prompt-specific stats', async () => {
      await vote(createPromptId('prompt-1'), 1, 'Great!')
      await vote(createPromptId('prompt-1'), 1, 'Awesome!')
      await vote(createPromptId('prompt-2'), -1, 'Bad')
      
      const promptStats = await getPromptStats(createPromptId('prompt-1'))
      expect(promptStats.totalVotes).toBe(2)
      expect(promptStats.positiveRate).toBe(1)
      expect(promptStats.comments).toEqual(['Great!', 'Awesome!'])
    })

    it('should handle string promptId for stats', async () => {
      await vote('prompt-1', 1, 'Great!')
      
      const promptStats = await getPromptStats('prompt-1')
      expect(promptStats.totalVotes).toBe(1)
    })

    it('should detect trends', async () => {
      // Add some votes to trigger trend calculation
      for (let i = 0; i < 15; i++) {
        await vote(createPromptId(`prompt-${i}`), 1)
      }
      
      // Add recent negative votes
      for (let i = 15; i < 25; i++) {
        await vote(createPromptId(`prompt-${i}`), -1)
      }
      
      const stats = await getStats()
      expect(stats.recentTrend).toBe('declining')
    })

    it('should detect improving trends', async () => {
      // Add some negative votes first
      for (let i = 0; i < 15; i++) {
        await vote(createPromptId(`prompt-${i}`), -1)
      }
      
      // Add recent positive votes
      for (let i = 15; i < 25; i++) {
        await vote(createPromptId(`prompt-${i}`), 1)
      }
      
      const stats = await getStats()
      expect(stats.recentTrend).toBe('improving')
    })

    it('should handle empty state', async () => {
      const stats = await getStats()
      expect(stats.totalVotes).toBe(0)
      expect(stats.positiveRate).toBe(0)
      expect(stats.recentTrend).toBe('stable')
      expect(stats.topFeedback).toEqual([])
    })

    it('should handle stats before initialization', async () => {
      resetSDKForTesting()
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(0)
    })

    it('should handle prompt stats for non-existent prompt', async () => {
      const promptStats = await getPromptStats(createPromptId('non-existent'))
      expect(promptStats.totalVotes).toBe(0)
      expect(promptStats.positiveRate).toBe(0)
      expect(promptStats.comments).toEqual([])
    })
  })

  describe('Server Mode', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          totalVotes: 10,
          positiveRate: 0.7,
          recentTrend: 'improving',
          topFeedback: ['Great!', 'Helpful']
        })
      })
    })

    it('should send votes to server', async () => {
      await init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })
      
      await vote(createPromptId('prompt-1'), 1, 'Great!')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/events',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should get stats from server', async () => {
      await init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })
      
      const stats = await getStats()
      
      expect(stats.totalVotes).toBe(10)
      expect(stats.positiveRate).toBe(0.7)
    })

    it('should get prompt stats from server', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          promptId: 'prompt-1',
          totalVotes: 5,
          positiveRate: 0.8,
          comments: ['Good', 'Excellent']
        })
      })
      
      await init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })
      
      const promptStats = await getPromptStats(createPromptId('prompt-1'))
      
      expect(promptStats.totalVotes).toBe(5)
      expect(promptStats.positiveRate).toBe(0.8)
    })

    it('should handle server errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })
      
      const stats = await getStats()
      
      // Should return fallback stats
      expect(stats.totalVotes).toBe(0)
      expect(stats.positiveRate).toBe(0)
    })

    it('should handle server response errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      
      await init({
        mode: 'server',
        userId: createUserId('test-user'),
        endpoint: 'https://api.example.com'
      })
      
      const stats = await getStats()
      
      // Should return fallback stats
      expect(stats.totalVotes).toBe(0)
      expect(stats.positiveRate).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully in non-debug mode', async () => {
      await expect(init({
        mode: 'local',
        userId: createUserId('test-user'),
        debug: false
      })).resolves.not.toThrow()
    })

    it('should throw initialization errors in debug mode', async () => {
      await expect(init({
        mode: 'invalid' as any,
        userId: createUserId('test-user'),
        debug: true
      })).rejects.toThrow()
    })

    it('should handle vote errors gracefully in non-debug mode', async () => {
      await init({ mode: 'local', userId: createUserId('test-user'), debug: false })
      
      await expect(vote(createPromptId('prompt-1'), 2 as any)).resolves.not.toThrow()
    })

    it('should throw vote errors in debug mode', async () => {
      await init({ mode: 'local', userId: createUserId('test-user'), debug: true })
      
      await expect(vote(createPromptId('prompt-1'), 2 as any)).rejects.toThrow()
    })
  })

  describe('Storage Adapter', () => {
    it('should use custom storage adapter', async () => {
      const customStorage = {
        get: vi.fn().mockResolvedValue('[]'),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined)
      }
      
      await init({
        mode: 'local',
        userId: createUserId('test-user'),
        storage: customStorage
      })
      
      await vote(createPromptId('prompt-1'), 1, 'Great!')
      
      expect(customStorage.get).toHaveBeenCalled()
    })

    it('should handle storage errors gracefully', async () => {
      const customStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        delete: vi.fn().mockRejectedValue(new Error('Storage error')),
        clear: vi.fn().mockRejectedValue(new Error('Storage error'))
      }
      
      await init({
        mode: 'local',
        userId: createUserId('test-user'),
        storage: customStorage
      })
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(0)
    })
  })

  describe('Memory Management', () => {
    beforeEach(async () => {
      await init({ mode: 'local', userId: createUserId('test-user') })
    })

    it('should handle large numbers of votes', async () => {
      // Add many votes to test memory usage
      for (let i = 0; i < 100; i++) {
        await vote(createPromptId(`prompt-${i}`), i % 2 === 0 ? 1 : -1, `Comment ${i}`)
      }
      
      const stats = await getStats()
      expect(stats.totalVotes).toBe(100)
    })

    it('should limit top feedback to reasonable size', async () => {
      // Add many votes with comments
      for (let i = 0; i < 20; i++) {
        await vote(createPromptId(`prompt-${i}`), 1, `Comment ${i}`)
      }
      
      const stats = await getStats()
      expect(stats.topFeedback.length).toBeLessThanOrEqual(5)
    })
  })
}) 