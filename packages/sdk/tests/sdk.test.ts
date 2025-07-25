// Mock localStorage for browser environment
Object.defineProperty(window, 'localStorage', {
  value: {
    data: {} as Record<string, string>,
    getItem(key: string) { return this.data[key] || null },
    setItem(key: string, value: string) { this.data[key] = value },
    removeItem(key: string) { delete this.data[key] },
    clear() { this.data = {} }
  },
  writable: true
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  init, 
  trackTurn, 
  trackTurnWithRetry,
  vote, 
  track,
  startConversation,
  recordFeedback,
  endConversation,
  isReady, 
  getConfig,
  BilanSDK,
  createUserId,
  resetSDKForTesting 
} from '../src/index'

// Mock fetch for server mode tests
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Bilan SDK v0.4.2', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    ;(window as any).localStorage.data = {}
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

    it('should return both result and turnId', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      
      const { result, turnId } = await trackTurn(
        'Test prompt',
        mockAiCall,
        { systemPromptVersion: 'v2.1' }
      )
      
      expect(result).toBe('AI response')
      expect(turnId).toMatch(/^turn_\d+_[a-z0-9]+$/)
      expect(typeof turnId).toBe('string')
      expect(mockAiCall).toHaveBeenCalledOnce()
    })

    it('should handle context parameters', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      
      const { result, turnId } = await trackTurn(
        'Test prompt',
        mockAiCall,
        {
          systemPromptVersion: 'v2.1',
          conversation_id: 'conv-123',
          journey_id: 'journey-456',
          turn_sequence: 1
        }
      )
      
      expect(result).toBe('AI response')
      expect(turnId).toBeTruthy()
      expect(mockAiCall).toHaveBeenCalledOnce()
    })

    it('should handle retry logic', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      
      const { result, turnId } = await trackTurnWithRetry(
        'Test prompt',
        mockAiCall,
        { systemPromptVersion: 'v2.1' },
        3
      )
      
      expect(result).toBe('AI response')
      expect(turnId).toBeTruthy()
      expect(mockAiCall).toHaveBeenCalledOnce()
    })

    it('should gracefully degrade when not initialized', async () => {
      resetSDKForTesting()
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      
      const { result, turnId } = await trackTurn(
        'Test prompt',
        mockAiCall
      )
      
      expect(result).toBe('AI response')
      expect(turnId).toBe('')
      expect(mockAiCall).toHaveBeenCalledOnce()
    })
  })

  describe('vote', () => {
    it('should accept turnId instead of promptId', async () => {
      await init({
        mode: 'local',
        userId: createUserId('test-user')
      })

      const { turnId } = await trackTurn('Test', () => Promise.resolve('result'))
      
      // Should not throw
      await expect(vote(turnId, 1, 'Good')).resolves.not.toThrow()
    })

    it('should track vote with turn_id property', async () => {
      const sdk = new BilanSDK()
      await sdk.init({
        mode: 'local',
        userId: createUserId('test-user')
      })

      const trackSpy = vi.spyOn(sdk, 'track')
      const { turnId } = await sdk.trackTurn('Test', () => Promise.resolve('result'))
      
      await sdk.vote(turnId, 1, 'Great!')
      
      expect(trackSpy).toHaveBeenCalledWith('vote_cast', {
        turn_id: turnId,      // Verify turn_id is used
        value: 1,
        comment: 'Great!',
        timestamp: expect.any(Number)
      })
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
      
      const { result, turnId } = await sdk.trackTurn(
        'What is the weather?',
        mockAiFunction,
        { systemPromptVersion: 'v2.1' }
      )
      
      expect(result).toBe('AI response')
      expect(turnId).toBeTruthy()
      expect(mockAiFunction).toHaveBeenCalledOnce()
    })
  })
}) 