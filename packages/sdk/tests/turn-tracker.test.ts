import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TurnTracker, ErrorClassifier } from '../src/events/turn-tracker'
import { EventTracker } from '../src/events/event-tracker'
import { EventQueueManager } from '../src/events/event-queue'
import { createUserId } from '../src/types'

describe('TurnTracker', () => {
  let turnTracker: TurnTracker
  let eventTracker: EventTracker
  let eventQueue: EventQueueManager
  let mockFlushCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFlushCallback = vi.fn()
    
    const config = {
      mode: 'local' as const,
      userId: createUserId('test-user'),
      debug: false,
      capturePrompts: true,
      captureResponses: false
    }

    eventQueue = new EventQueueManager(config, null, mockFlushCallback)
    eventTracker = new EventTracker(config, eventQueue)
    turnTracker = new TurnTracker(eventTracker, config)
  })

  describe('trackTurn', () => {
    it('should track successful AI turn', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      const trackSpy = vi.spyOn(eventTracker, 'track')

      const result = await turnTracker.trackTurn(
        'Test prompt',
        mockAiCall,
        { conversationId: 'conv-123', modelUsed: 'gpt-4' }
      )

      expect(result).toBe('AI response')
      expect(mockAiCall).toHaveBeenCalledTimes(1)
      expect(trackSpy).toHaveBeenCalledTimes(2)
      
      // Check turn_started event
      const startCall = trackSpy.mock.calls[0]
      expect(startCall[0]).toBe('turn_started')
      expect(startCall[1]).toMatchObject({
        conversationId: 'conv-123',
        modelUsed: 'gpt-4',
        retryCount: 0
      })
      expect(startCall[2]).toMatchObject({
        promptText: 'Test prompt'
      })
      
      // Check turn_completed event
      const completeCall = trackSpy.mock.calls[1]
      expect(completeCall[0]).toBe('turn_completed')
      expect(completeCall[1]).toMatchObject({
        status: 'success',
        conversationId: 'conv-123',
        modelUsed: 'gpt-4',
        responseLength: 11 // 'AI response'.length
      })
      expect(completeCall[2]).toMatchObject({
        promptText: 'Test prompt',
        aiResponse: 'AI response'
      })
    })

    it('should expose turnId from last trackTurn call', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')

      await turnTracker.trackTurn(
        'Test prompt',
        mockAiCall,
        { conversationId: 'conv-123' }
      )

      const turnId = turnTracker.getLastTurnId()
      expect(turnId).toMatch(/^turn_\d+_[a-z0-9]+$/)
      expect(typeof turnId).toBe('string')
    })

    it('should track failed AI turn', async () => {
      const mockError = new Error('API error')
      const mockAiCall = vi.fn().mockRejectedValue(mockError)
      const trackSpy = vi.spyOn(eventTracker, 'track')

      await expect(turnTracker.trackTurn('Test prompt', mockAiCall)).rejects.toThrow('API error')
      
      expect(trackSpy).toHaveBeenCalledTimes(2)
      
      // Check turn_started event
      expect(trackSpy.mock.calls[0][0]).toBe('turn_started')
      
      // Check turn_failed event
      const failCall = trackSpy.mock.calls[1]
      expect(failCall[0]).toBe('turn_failed')
      expect(failCall[1]).toMatchObject({
        status: 'failed',
        errorType: 'unknown_error',
        errorMessage: 'API error'
      })
    })

    it('should handle timeout', async () => {
      // Create a turn tracker with very short timeout for testing
      turnTracker.setTimeoutMs(100)
      
      const mockAiCall = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('Late response'), 200))
      )
      const trackSpy = vi.spyOn(eventTracker, 'track')

      await expect(turnTracker.trackTurn('Test prompt', mockAiCall)).rejects.toThrow('AI request timeout')
      
      expect(trackSpy).toHaveBeenCalledTimes(2)
      
      // Check turn_failed event
      const failCall = trackSpy.mock.calls[1]
      expect(failCall[0]).toBe('turn_failed')
      expect(failCall[1]).toMatchObject({
        status: 'failed',
        errorType: 'timeout',
        errorMessage: 'AI request timed out after 30 seconds'
      })
    })

    it('should handle JSON responses', async () => {
      const mockResponse = { message: 'AI response', tokens: 100 }
      const mockAiCall = vi.fn().mockResolvedValue(mockResponse)
      const trackSpy = vi.spyOn(eventTracker, 'track')

      const result = await turnTracker.trackTurn('Test prompt', mockAiCall)

      expect(result).toEqual(mockResponse)
      
      // Check turn_completed event
      const completeCall = trackSpy.mock.calls[1]
      expect(completeCall[1]).toMatchObject({
        responseLength: JSON.stringify(mockResponse).length
      })
      expect(completeCall[2]).toMatchObject({
        aiResponse: JSON.stringify(mockResponse)
      })
    })
  })

  describe('trackTurnWithRetry', () => {
    it('should succeed on first try', async () => {
      const mockAiCall = vi.fn().mockResolvedValue('AI response')
      const trackSpy = vi.spyOn(eventTracker, 'track')

      const result = await turnTracker.trackTurnWithRetry('Test prompt', mockAiCall, {}, 2)

      expect(result).toBe('AI response')
      expect(mockAiCall).toHaveBeenCalledTimes(1)
      expect(trackSpy).toHaveBeenCalledTimes(2) // start + complete
    })

    it('should retry on failure and succeed', async () => {
      const mockAiCall = vi.fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValue('AI response')
      const trackSpy = vi.spyOn(eventTracker, 'track')

      const result = await turnTracker.trackTurnWithRetry('Test prompt', mockAiCall, {}, 2)

      expect(result).toBe('AI response')
      expect(mockAiCall).toHaveBeenCalledTimes(2)
      expect(trackSpy).toHaveBeenCalledTimes(4) // start + fail + start + complete
    })

    it('should not retry on auth errors', async () => {
      const mockAiCall = vi.fn().mockRejectedValue(new Error('401 Unauthorized'))
      const trackSpy = vi.spyOn(eventTracker, 'track')

      await expect(turnTracker.trackTurnWithRetry('Test prompt', mockAiCall, {}, 2)).rejects.toThrow('401 Unauthorized')
      
      expect(mockAiCall).toHaveBeenCalledTimes(1)
      expect(trackSpy).toHaveBeenCalledTimes(2) // start + fail only
    })

    it('should not retry on context limit errors', async () => {
      const mockAiCall = vi.fn().mockRejectedValue(new Error('Context limit exceeded'))
      const trackSpy = vi.spyOn(eventTracker, 'track')

      await expect(turnTracker.trackTurnWithRetry('Test prompt', mockAiCall, {}, 2)).rejects.toThrow('Context limit exceeded')
      
      expect(mockAiCall).toHaveBeenCalledTimes(1)
      expect(trackSpy).toHaveBeenCalledTimes(2) // start + fail only
    })
  })

  describe('timeout configuration', () => {
    it('should allow setting custom timeout', () => {
      expect(turnTracker.getTimeoutMs()).toBe(30000) // default
      
      turnTracker.setTimeoutMs(60000)
      expect(turnTracker.getTimeoutMs()).toBe(60000)
    })
  })
})

describe('ErrorClassifier', () => {
  it('should classify timeout errors', () => {
    const error = new Error('AI_TIMEOUT')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('timeout')
    expect(result.errorMessage).toBe('AI request timed out after 30 seconds')
  })

  it('should classify rate limit errors', () => {
    const error = new Error('429 Too Many Requests')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('rate_limit')
    expect(result.errorMessage).toBe('API rate limit exceeded')
  })

  it('should classify service unavailable errors', () => {
    const error = new Error('503 Service Unavailable')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('service_unavailable')
    expect(result.errorMessage).toBe('AI service temporarily unavailable')
  })

  it('should classify context limit errors', () => {
    const error = new Error('Maximum context limit exceeded')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('context_limit')
    expect(result.errorMessage).toBe('Input context exceeds model limits')
  })

  it('should classify auth errors', () => {
    const error = new Error('401 Unauthorized - Invalid API key')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('auth_error')
    expect(result.errorMessage).toBe('Authentication failed')
  })

  it('should classify network errors', () => {
    const error = new Error('Network connection failed')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('network_error')
    expect(result.errorMessage).toBe('Network connection failed')
  })

  it('should classify unknown errors', () => {
    const error = new Error('Some unexpected error')
    const result = ErrorClassifier.classify(error)
    
    expect(result.errorType).toBe('unknown_error')
    expect(result.errorMessage).toBe('Some unexpected error')
  })
}) 