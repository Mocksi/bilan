import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorHandler, BilanError, BilanInitializationError, BilanVoteError, BilanStatsError, BilanNetworkError, BilanStorageError, GracefulDegradation } from '../src/error-handling'
import { createUserId } from '../src/types'

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.setDebugMode(false)
  })

  describe('setDebugMode', () => {
    it('should set debug mode', () => {
      ErrorHandler.setDebugMode(true)
      expect(ErrorHandler['isDebugMode']).toBe(true)
    })
  })

  describe('handleInitError', () => {
    it('should handle mode validation errors', () => {
      const error = new Error('Invalid mode')
      const result = ErrorHandler.handleInitError(error)
      
      expect(result).toBeInstanceOf(BilanInitializationError)
      expect(result.message).toBe('Invalid mode')
      expect(result.suggestion).toContain('mode: \'local\'')
    })

    it('should handle userId validation errors', () => {
      const error = new Error('userId is required')
      const result = ErrorHandler.handleInitError(error)
      
      expect(result.suggestion).toContain('createUserId')
    })

    it('should handle endpoint validation errors', () => {
      const error = new Error('endpoint is required')
      const result = ErrorHandler.handleInitError(error)
      
      expect(result.suggestion).toContain('endpoint: \'https://your-bilan-api.com\'')
    })

    it('should handle generic initialization errors', () => {
      const error = new Error('Unknown init error')
      const result = ErrorHandler.handleInitError(error)
      
      expect(result).toBeInstanceOf(BilanInitializationError)
      expect(result.message).toBe('Unknown init error')
    })
  })

  describe('handleVoteError', () => {
    it('should handle not initialized errors', () => {
      const error = new Error('not initialized')
      const result = ErrorHandler.handleVoteError(error)
      
      expect(result).toBeInstanceOf(BilanVoteError)
      expect(result.suggestion).toContain('Bilan SDK not initialized')
    })

    it('should handle promptId validation errors', () => {
      const error = new Error('Invalid promptId')
      const result = ErrorHandler.handleVoteError(error, 'prompt-123')
      
      expect(result.suggestion).toContain('createPromptId')
    })

    it('should handle value validation errors', () => {
      const error = new Error('Invalid value')
      const result = ErrorHandler.handleVoteError(error, 'prompt-123', 2)
      
      expect(result.suggestion).toContain('1 (positive) or -1 (negative)')
    })

    it('should handle network errors', () => {
      const error = new Error('network error occurred')
      const result = ErrorHandler.handleVoteError(error)
      
      expect(result.suggestion).toContain('Check your connection')
    })

    it('should handle fetch errors', () => {
      const error = new Error('fetch failed')
      const result = ErrorHandler.handleVoteError(error)
      
      expect(result.suggestion).toContain('endpoint is accessible')
    })
  })

  describe('handleStatsError', () => {
    it('should handle not initialized errors', () => {
      const error = new Error('not initialized')
      const result = ErrorHandler.handleStatsError(error, 'basic')
      
      expect(result).toBeInstanceOf(BilanStatsError)
      expect(result.suggestion).toContain('Initialize first')
    })

    it('should handle no data errors', () => {
      const error = new Error('no data available')
      const result = ErrorHandler.handleStatsError(error)
      
      expect(result.suggestion).toContain('Record some votes first')
    })

    it('should handle empty data errors', () => {
      const error = new Error('empty dataset')
      const result = ErrorHandler.handleStatsError(error)
      
      expect(result.suggestion).toContain('Record some votes first')
    })

    it('should handle server errors', () => {
      const error = new Error('server error')
      const result = ErrorHandler.handleStatsError(error)
      
      expect(result.suggestion).toContain('Check your endpoint')
    })

    it('should handle endpoint errors', () => {
      const error = new Error('endpoint not found')
      const result = ErrorHandler.handleStatsError(error)
      
      expect(result.suggestion).toContain('Verify this URL')
    })
  })

  describe('handleNetworkError', () => {
    it('should handle CORS errors', () => {
      const error = new Error('CORS policy blocked')
      const result = ErrorHandler.handleNetworkError(error)
      
      expect(result).toBeInstanceOf(BilanNetworkError)
      expect(result.suggestion).toContain('Access-Control-Allow-Origin')
    })

    it('should handle timeout errors', () => {
      const error = new Error('timeout exceeded')
      const result = ErrorHandler.handleNetworkError(error, 'https://api.example.com')
      
      expect(result.suggestion).toContain('https://api.example.com')
      expect(result.suggestion).toContain('Network connectivity')
    })

    it('should handle 404 errors', () => {
      const error = new Error('404 not found')
      const result = ErrorHandler.handleNetworkError(error, 'https://api.example.com')
      
      expect(result.suggestion).toContain('/api/events')
      expect(result.suggestion).toContain('https://api.example.com')
    })
  })

  describe('handleStorageError', () => {
    it('should handle localStorage errors', () => {
      const error = new Error('localStorage not available')
      const result = ErrorHandler.handleStorageError(error)
      
      expect(result).toBeInstanceOf(BilanStorageError)
      expect(result.suggestion).toContain('Private/incognito browser mode')
    })

    it('should handle quota errors', () => {
      const error = new Error('quota exceeded')
      const result = ErrorHandler.handleStorageError(error)
      
      expect(result.suggestion).toContain('Storage quota exceeded')
    })

    it('should handle storage errors', () => {
      const error = new Error('storage operation failed')
      const result = ErrorHandler.handleStorageError(error)
      
      expect(result.suggestion).toContain('limited storage space')
    })
  })

  describe('logError', () => {
    it('should log errors in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
      
      ErrorHandler.setDebugMode(true)
      
      const error = new BilanError('Test error', 'TEST_ERROR', 'test context', 'Test suggestion')
      ErrorHandler.logError(error)
      
      expect(consoleSpy).toHaveBeenCalledWith('🔴 Bilan SDK Error: TEST_ERROR')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Message: Test error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Context: test context')
      expect(consoleInfoSpy).toHaveBeenCalledWith('💡 Suggestion:Test suggestion')
      expect(consoleGroupEndSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
      consoleInfoSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
    })

    it('should log simple warning in non-debug mode', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      ErrorHandler.setDebugMode(false)
      
      const error = new BilanError('Test error', 'TEST_ERROR')
      ErrorHandler.logError(error)
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Bilan SDK (TEST_ERROR): Test error')
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('handleGracefully', () => {
    it('should handle init context', () => {
      const error = new Error('Init failed')
      const result = ErrorHandler.handleGracefully(error, 'init', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should handle vote context', () => {
      const error = new Error('Vote failed')
      const result = ErrorHandler.handleGracefully(error, 'vote', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should handle stats context', () => {
      const error = new Error('Stats failed')
      const result = ErrorHandler.handleGracefully(error, 'stats', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should handle network context', () => {
      const error = new Error('Network failed')
      const result = ErrorHandler.handleGracefully(error, 'network', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should handle storage context', () => {
      const error = new Error('Storage failed')
      const result = ErrorHandler.handleGracefully(error, 'storage', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should handle unknown context', () => {
      const error = new Error('Unknown error')
      const result = ErrorHandler.handleGracefully(error, 'unknown', 'fallback')
      
      expect(result).toBe('fallback')
    })

    it('should throw in debug mode', () => {
      ErrorHandler.setDebugMode(true)
      
      const error = new Error('Test error')
      expect(() => {
        ErrorHandler.handleGracefully(error, 'init')
      }).toThrow(BilanInitializationError)
    })
  })
})

describe('GracefulDegradation', () => {
  describe('isBrowser', () => {
    it('should return true in browser environment', () => {
      expect(GracefulDegradation.isBrowser()).toBe(true)
    })
  })

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(true)
    })

    it('should return false when localStorage throws', () => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage not available')
      })
      
      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(false)
      
      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })
      
      expect(GracefulDegradation.isOnline()).toBe(true)
      
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })
      
      expect(GracefulDegradation.isOnline()).toBe(false)
    })
  })

  describe('getStatsFallback', () => {
    it('should return default stats structure', () => {
      const fallback = GracefulDegradation.getStatsFallback()
      
      expect(fallback).toEqual({
        totalVotes: 0,
        positiveRate: 0,
        recentTrend: 'stable',
        topFeedback: []
      })
    })
  })

  describe('getPromptStatsFallback', () => {
    it('should return default prompt stats structure', () => {
      const fallback = GracefulDegradation.getPromptStatsFallback('test-prompt')
      
      expect(fallback.totalVotes).toBe(0)
      expect(fallback.positiveRate).toBe(0)
      expect(fallback.comments).toEqual([])
    })
  })
})

describe('Error Classes', () => {
  describe('BilanError', () => {
    it('should create error with all properties', () => {
      const error = new BilanError('Test message', 'TEST_CODE', 'test context', 'Test suggestion')
      
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.context).toBe('test context')
      expect(error.suggestion).toBe('Test suggestion')
      expect(error.name).toBe('BilanError')
    })

    it('should create error with minimal properties', () => {
      const error = new BilanError('Test message', 'TEST_CODE')
      
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.context).toBeUndefined()
      expect(error.suggestion).toBeUndefined()
    })
  })

  describe('BilanInitializationError', () => {
    it('should create initialization error', () => {
      const error = new BilanInitializationError('Init failed', 'Try again')
      
      expect(error.message).toBe('Init failed')
      expect(error.code).toBe('INIT_ERROR')
      expect(error.context).toBe('initialization')
      expect(error.suggestion).toBe('Try again')
      expect(error.name).toBe('BilanInitializationError')
    })
  })

  describe('BilanVoteError', () => {
    it('should create vote error', () => {
      const error = new BilanVoteError('Vote failed', 'Check input')
      
      expect(error.message).toBe('Vote failed')
      expect(error.code).toBe('VOTE_ERROR')
      expect(error.context).toBe('vote recording')
      expect(error.suggestion).toBe('Check input')
      expect(error.name).toBe('BilanVoteError')
    })
  })

  describe('BilanStatsError', () => {
    it('should create stats error', () => {
      const error = new BilanStatsError('Stats failed', 'Try later')
      
      expect(error.message).toBe('Stats failed')
      expect(error.code).toBe('STATS_ERROR')
      expect(error.context).toBe('stats retrieval')
      expect(error.suggestion).toBe('Try later')
      expect(error.name).toBe('BilanStatsError')
    })
  })

  describe('BilanNetworkError', () => {
    it('should create network error', () => {
      const error = new BilanNetworkError('Network failed', 'Check connection')
      
      expect(error.message).toBe('Network failed')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.context).toBe('network request')
      expect(error.suggestion).toBe('Check connection')
      expect(error.name).toBe('BilanNetworkError')
    })
  })

  describe('BilanStorageError', () => {
    it('should create storage error', () => {
      const error = new BilanStorageError('Storage failed', 'Clear cache')
      
      expect(error.message).toBe('Storage failed')
      expect(error.code).toBe('STORAGE_ERROR')
      expect(error.context).toBe('storage operation')
      expect(error.suggestion).toBe('Clear cache')
      expect(error.name).toBe('BilanStorageError')
    })
  })
}) 