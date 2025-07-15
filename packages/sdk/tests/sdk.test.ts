import { describe, it, expect, beforeEach, vi } from 'vitest'
import { init, vote, getStats, getPromptStats, BilanSDK } from '../src/index'
import { createUserId, createPromptId, createConversationId } from '../src/types'

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

  describe('Conversation Tracking', () => {
    let testBilan: BilanSDK

    beforeEach(async () => {
      testBilan = new BilanSDK()
      await testBilan.init({ mode: 'local', userId: createUserId('test-user') })
    })

    it('should start a new conversation', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      expect(conversationId).toMatch(/^conv-\d+-[a-z0-9]+$/)
      expect(conversationId).toBeTruthy()
    })

    it('should add messages to conversation', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.addMessage(conversationId)).resolves.not.toThrow()
    })

    it('should record frustration events', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.recordFrustration(conversationId)).resolves.not.toThrow()
    })

    it('should record regeneration events', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.recordRegeneration(conversationId)).resolves.not.toThrow()
    })

    it('should record explicit feedback', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.recordFeedback(conversationId, 1)).resolves.not.toThrow()
      await expect(testBilan.recordFeedback(conversationId, -1)).resolves.not.toThrow()
    })

    it('should end conversations with outcomes', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.endConversation(conversationId, 'completed')).resolves.not.toThrow()
      await expect(testBilan.endConversation(conversationId, 'abandoned')).resolves.not.toThrow()
    })

    it('should handle conversation tracking before initialization', async () => {
      const uninitializedBilan = new BilanSDK()
      
      await expect(uninitializedBilan.startConversation(createUserId('test-user'))).resolves.not.toThrow()
      await expect(uninitializedBilan.addMessage(createConversationId('conv-123'))).resolves.not.toThrow()
      await expect(uninitializedBilan.recordFrustration(createConversationId('conv-123'))).resolves.not.toThrow()
      await expect(uninitializedBilan.recordRegeneration(createConversationId('conv-123'))).resolves.not.toThrow()
      await expect(uninitializedBilan.recordFeedback(createConversationId('conv-123'), 1)).resolves.not.toThrow()
      await expect(uninitializedBilan.endConversation(createConversationId('conv-123'), 'completed')).resolves.not.toThrow()
    })

    it('should throw initialization error in debug mode for uninitialized methods', async () => {
      const debugBilan = new BilanSDK()
      // Initialize with debug mode first, then create a new instance to test uninitialized state
      await debugBilan.init({ mode: 'local', userId: createUserId('test-user'), debug: true })
      
      // Create a new uninitialized instance that would be in debug mode
      const uninitializedDebugBilan = new BilanSDK()
      // Set debug mode on the config to test the error path
      uninitializedDebugBilan['config'] = { debug: true } as any
      
      await expect(uninitializedDebugBilan.startConversation(createUserId('test-user')))
        .rejects.toThrow('Bilan SDK not initialized. Call init() first.')
    })

    it('should handle conversation tracking in debug mode', async () => {
      const debugBilan = new BilanSDK()
      await debugBilan.init({ mode: 'local', userId: createUserId('test-user'), debug: true })
      
      const conversationId = await debugBilan.startConversation('test-user')
      await debugBilan.addMessage(conversationId)
      await debugBilan.recordFrustration(conversationId)
      await debugBilan.recordRegeneration(conversationId)
      await debugBilan.recordFeedback(conversationId, 1)
      await debugBilan.endConversation(conversationId, 'completed')
      
      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should store conversation data in localStorage', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      // Check that conversation data is stored (LocalStorageAdapter adds 'bilan:' prefix)
      const storageKey = 'bilan:conversations:test-user'
      const storedData = localStorage.getItem(storageKey)
      const conversations = JSON.parse(storedData || '[]')
      
      expect(conversations).toHaveLength(1)
      expect(conversations[0].id).toBe(conversationId)
      expect(conversations[0].userId).toBe('test-user')
      expect(conversations[0].messageCount).toBe(0)
    })

    it('should increment message count correctly', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await testBilan.addMessage(conversationId)
      await testBilan.addMessage(conversationId)
      
      const storageKey = 'bilan:conversations:test-user'
      const storedData = localStorage.getItem(storageKey)
      const conversations = JSON.parse(storedData || '[]')
      
      expect(conversations[0].messageCount).toBe(2)
    })

    it('should store feedback events correctly', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await testBilan.recordFrustration(conversationId)
      await testBilan.recordRegeneration(conversationId)
      await testBilan.recordFeedback(conversationId, 1)
      
      const storageKey = 'bilan:feedback:test-user'
      const storedData = localStorage.getItem(storageKey)
      const feedbackEvents = JSON.parse(storedData || '[]')
      
      expect(feedbackEvents).toHaveLength(3)
      expect(feedbackEvents[0].type).toBe('frustration')
      expect(feedbackEvents[1].type).toBe('regeneration')
      expect(feedbackEvents[2].type).toBe('explicit_feedback')
      expect(feedbackEvents[2].value).toBe(1)
    })

    it('should end conversation with correct outcome', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await testBilan.endConversation(conversationId, 'completed')
      
      const storageKey = 'bilan:conversations:test-user'
      const storedData = localStorage.getItem(storageKey)
      const conversations = JSON.parse(storedData || '[]')
      
      expect(conversations[0].outcome).toBe('completed')
      expect(conversations[0].endedAt).toBeTruthy()
    })

    it('should handle invalid feedback values gracefully', async () => {
      const conversationId = await testBilan.startConversation('test-user')
      
      await expect(testBilan.recordFeedback(conversationId, 2 as any)).resolves.not.toThrow()
      await expect(testBilan.recordFeedback(conversationId, 0 as any)).resolves.not.toThrow()
    })

    it('should handle storage errors gracefully', async () => {
      const customStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        delete: vi.fn().mockRejectedValue(new Error('Storage error')),
        clear: vi.fn().mockRejectedValue(new Error('Storage error'))
      }
      
      const errorBilan = new BilanSDK()
      await errorBilan.init({
        mode: 'local',
        userId: createUserId('test-user'),
        storage: customStorage
      })
      
      await expect(errorBilan.startConversation('test-user')).resolves.not.toThrow()
    })
  })

  describe('Journey Tracking', () => {
    let testBilan: BilanSDK

    beforeEach(async () => {
      testBilan = new BilanSDK()
      await testBilan.init({ mode: 'local', userId: createUserId('test-user') })
    })

    it('should track journey steps', async () => {
      await expect(testBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')).resolves.not.toThrow()
      await expect(testBilan.trackJourneyStep('email-agent', 'response-received', 'test-user')).resolves.not.toThrow()
    })

    it('should complete journeys', async () => {
      await expect(testBilan.completeJourney('email-agent', 'test-user')).resolves.not.toThrow()
    })

    it('should handle journey tracking before initialization', async () => {
      const uninitializedBilan = new BilanSDK()
      
      await expect(uninitializedBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')).resolves.not.toThrow()
      await expect(uninitializedBilan.completeJourney('email-agent', 'test-user')).resolves.not.toThrow()
    })

    it('should handle journey tracking in debug mode', async () => {
      const debugBilan = new BilanSDK()
      await debugBilan.init({ mode: 'local', userId: createUserId('test-user'), debug: true })
      
      await debugBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')
      await debugBilan.completeJourney('email-agent', 'test-user')
      
      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should store journey steps in localStorage', async () => {
      await testBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')
      await testBilan.trackJourneyStep('email-agent', 'response-received', 'test-user')
      
      const storageKey = 'bilan:journey:test-user'
      const storedData = localStorage.getItem(storageKey)
      const journeySteps = JSON.parse(storedData || '[]')
      
      expect(journeySteps).toHaveLength(2)
      expect(journeySteps[0].journeyName).toBe('email-agent')
      expect(journeySteps[0].stepName).toBe('query-sent')
      expect(journeySteps[1].stepName).toBe('response-received')
    })

    it('should store journey completion correctly', async () => {
      await testBilan.completeJourney('email-agent', 'test-user')
      
      const storageKey = 'bilan:journey:test-user'
      const storedData = localStorage.getItem(storageKey)
      const journeySteps = JSON.parse(storedData || '[]')
      
      expect(journeySteps).toHaveLength(1)
      expect(journeySteps[0].journeyName).toBe('email-agent')
      expect(journeySteps[0].stepName).toBe('completed')
    })

    it('should handle multiple journey types', async () => {
      await testBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')
      await testBilan.trackJourneyStep('code-assistant', 'code-generated', 'test-user')
      await testBilan.completeJourney('email-agent', 'test-user')
      
      const storageKey = 'bilan:journey:test-user'
      const storedData = localStorage.getItem(storageKey)
      const journeySteps = JSON.parse(storedData || '[]')
      
      expect(journeySteps).toHaveLength(3)
      expect(journeySteps.map((s: any) => s.journeyName)).toEqual(['email-agent', 'code-assistant', 'email-agent'])
    })

    it('should handle storage errors gracefully', async () => {
      const customStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        delete: vi.fn().mockRejectedValue(new Error('Storage error')),
        clear: vi.fn().mockRejectedValue(new Error('Storage error'))
      }
      
      const errorBilan = new BilanSDK()
      await errorBilan.init({
        mode: 'local',
        userId: createUserId('test-user'),
        storage: customStorage
      })
      
      await expect(errorBilan.trackJourneyStep('email-agent', 'query-sent', 'test-user')).resolves.not.toThrow()
      await expect(errorBilan.completeJourney('email-agent', 'test-user')).resolves.not.toThrow()
    })
  })
}) 