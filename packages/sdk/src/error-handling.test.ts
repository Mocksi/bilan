/**
 * Comprehensive test suite for error-handling.ts
 * Tests all error classes, ErrorHandler methods, and GracefulDegradation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BilanError,
  BilanInitializationError,
  BilanVoteError,
  BilanStatsError,
  BilanNetworkError,
  BilanStorageError,
  ErrorHandler,
  GracefulDegradation
} from './error-handling'
import { createUserId } from './types'

describe('BilanError', () => {
  it('should create a BilanError with all properties', () => {
    const error = new BilanError(
      'Test error message',
      'TEST_ERROR',
      'test context',
      'test suggestion'
    )

    expect(error.name).toBe('BilanError')
    expect(error.message).toBe('Test error message')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.context).toBe('test context')
    expect(error.suggestion).toBe('test suggestion')
    expect(error).toBeInstanceOf(Error)
  })

  it('should create a BilanError with minimal properties', () => {
    const error = new BilanError('Test error', 'TEST_ERROR')

    expect(error.name).toBe('BilanError')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.context).toBeUndefined()
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanInitializationError', () => {
  it('should create an initialization error with suggestion', () => {
    const error = new BilanInitializationError('Init failed', 'Try again')

    expect(error.name).toBe('BilanInitializationError')
    expect(error.message).toBe('Init failed')
    expect(error.code).toBe('INIT_ERROR')
    expect(error.context).toBe('initialization')
    expect(error.suggestion).toBe('Try again')
    expect(error).toBeInstanceOf(BilanError)
  })

  it('should create an initialization error without suggestion', () => {
    const error = new BilanInitializationError('Init failed')

    expect(error.name).toBe('BilanInitializationError')
    expect(error.message).toBe('Init failed')
    expect(error.code).toBe('INIT_ERROR')
    expect(error.context).toBe('initialization')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanVoteError', () => {
  it('should create a vote error with suggestion', () => {
    const error = new BilanVoteError('Vote failed', 'Check vote value')

    expect(error.name).toBe('BilanVoteError')
    expect(error.message).toBe('Vote failed')
    expect(error.code).toBe('VOTE_ERROR')
    expect(error.context).toBe('vote recording')
    expect(error.suggestion).toBe('Check vote value')
    expect(error).toBeInstanceOf(BilanError)
  })

  it('should create a vote error without suggestion', () => {
    const error = new BilanVoteError('Vote failed')

    expect(error.name).toBe('BilanVoteError')
    expect(error.message).toBe('Vote failed')
    expect(error.code).toBe('VOTE_ERROR')
    expect(error.context).toBe('vote recording')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanStatsError', () => {
  it('should create a stats error with suggestion', () => {
    const error = new BilanStatsError('Stats failed', 'Check data')

    expect(error.name).toBe('BilanStatsError')
    expect(error.message).toBe('Stats failed')
    expect(error.code).toBe('STATS_ERROR')
    expect(error.context).toBe('stats retrieval')
    expect(error.suggestion).toBe('Check data')
    expect(error).toBeInstanceOf(BilanError)
  })

  it('should create a stats error without suggestion', () => {
    const error = new BilanStatsError('Stats failed')

    expect(error.name).toBe('BilanStatsError')
    expect(error.message).toBe('Stats failed')
    expect(error.code).toBe('STATS_ERROR')
    expect(error.context).toBe('stats retrieval')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanNetworkError', () => {
  it('should create a network error with suggestion', () => {
    const error = new BilanNetworkError('Network failed', 'Check connection')

    expect(error.name).toBe('BilanNetworkError')
    expect(error.message).toBe('Network failed')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.context).toBe('network request')
    expect(error.suggestion).toBe('Check connection')
    expect(error).toBeInstanceOf(BilanError)
  })

  it('should create a network error without suggestion', () => {
    const error = new BilanNetworkError('Network failed')

    expect(error.name).toBe('BilanNetworkError')
    expect(error.message).toBe('Network failed')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.context).toBe('network request')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanStorageError', () => {
  it('should create a storage error with suggestion', () => {
    const error = new BilanStorageError('Storage failed', 'Check localStorage')

    expect(error.name).toBe('BilanStorageError')
    expect(error.message).toBe('Storage failed')
    expect(error.code).toBe('STORAGE_ERROR')
    expect(error.context).toBe('storage operation')
    expect(error.suggestion).toBe('Check localStorage')
    expect(error).toBeInstanceOf(BilanError)
  })

  it('should create a storage error without suggestion', () => {
    const error = new BilanStorageError('Storage failed')

    expect(error.name).toBe('BilanStorageError')
    expect(error.message).toBe('Storage failed')
    expect(error.code).toBe('STORAGE_ERROR')
    expect(error.context).toBe('storage operation')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Reset debug mode before each test
    ErrorHandler.setDebugMode(false)
  })

  describe('setDebugMode', () => {
    it('should set debug mode to true', () => {
      ErrorHandler.setDebugMode(true)
      // We can't directly test the private property, but we can test the behavior
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const error = new BilanError('Test', 'TEST_ERROR')
      ErrorHandler.logError(error)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should set debug mode to false', () => {
      ErrorHandler.setDebugMode(false)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = new BilanError('Test', 'TEST_ERROR')
      ErrorHandler.logError(error)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('handleInitError', () => {
    it('should handle mode error with suggestion', () => {
      const originalError = new Error('Invalid mode specified')
      const handled = ErrorHandler.handleInitError(originalError)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Invalid mode specified')
      expect(handled.suggestion).toContain('mode: \'local\'')
      expect(handled.suggestion).toContain('createUserId')
    })

    it('should handle userId error with suggestion', () => {
      const originalError = new Error('userId is required')
      const handled = ErrorHandler.handleInitError(originalError)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('userId is required')
      expect(handled.suggestion).toContain('createUserId')
      expect(handled.suggestion).toContain('Add this')
    })

    it('should handle endpoint error with suggestion', () => {
      const originalError = new Error('endpoint is required')
      const handled = ErrorHandler.handleInitError(originalError)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('endpoint is required')
      expect(handled.suggestion).toContain('endpoint:')
      expect(handled.suggestion).toContain('server')
    })

    it('should handle generic error without specific suggestion', () => {
      const originalError = new Error('Generic initialization error')
      const handled = ErrorHandler.handleInitError(originalError)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Generic initialization error')
      expect(handled.suggestion).toBe('')
    })

    it('should accept optional config parameter', () => {
      const originalError = new Error('Config error')
      const config = { mode: 'local' as const, userId: createUserId('test-user') }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Config error')
    })
  })

  describe('handleVoteError', () => {
    it('should handle not initialized error with suggestion', () => {
      const originalError = new Error('SDK not initialized')
      const handled = ErrorHandler.handleVoteError(originalError)

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('SDK not initialized')
      expect(handled.suggestion).toContain('init({')
      expect(handled.suggestion).toContain('vote(')
    })

    it('should handle promptId error with suggestion', () => {
      const originalError = new Error('Invalid promptId')
      const handled = ErrorHandler.handleVoteError(originalError, 'prompt-1')

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('Invalid promptId')
      expect(handled.suggestion).toContain('createPromptId')
      expect(handled.suggestion).toContain('Use createPromptId')
    })

    it('should handle value error with suggestion', () => {
      const originalError = new Error('Invalid value')
      const handled = ErrorHandler.handleVoteError(originalError, 'prompt-1', 2)

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('Invalid value')
      expect(handled.suggestion).toContain('1 (positive)')
      expect(handled.suggestion).toContain('-1 (negative)')
    })

    it('should handle network error with suggestion', () => {
      const originalError = new Error('network request failed')
      const handled = ErrorHandler.handleVoteError(originalError)

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('network request failed')
      expect(handled.suggestion).toContain('Network error occurred')
      expect(handled.suggestion).toContain('endpoint')
    })

    it('should handle fetch error with suggestion', () => {
      const originalError = new Error('fetch failed')
      const handled = ErrorHandler.handleVoteError(originalError)

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('fetch failed')
      expect(handled.suggestion).toContain('Network error occurred')
      expect(handled.suggestion).toContain('endpoint')
    })

    it('should handle generic error without specific suggestion', () => {
      const originalError = new Error('Generic vote error')
      const handled = ErrorHandler.handleVoteError(originalError)

      expect(handled).toBeInstanceOf(BilanVoteError)
      expect(handled.message).toBe('Generic vote error')
      expect(handled.suggestion).toBe('')
    })
  })

  describe('handleStatsError', () => {
    it('should handle not initialized error with suggestion', () => {
      const originalError = new Error('SDK not initialized')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('SDK not initialized')
      expect(handled.suggestion).toContain('init({')
      expect(handled.suggestion).toContain('getStats()')
    })

    it('should handle no data error with suggestion', () => {
      const originalError = new Error('no data available')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('no data available')
      expect(handled.suggestion).toContain('Record some votes')
      expect(handled.suggestion).toContain('vote(')
    })

    it('should handle empty data error with suggestion', () => {
      const originalError = new Error('Data is empty')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('Data is empty')
      expect(handled.suggestion).toContain('Record some votes')
      expect(handled.suggestion).toContain('vote(')
    })

    it('should handle server error with suggestion', () => {
      const originalError = new Error('server error occurred')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('server error occurred')
      expect(handled.suggestion).toContain('Server error occurred')
      expect(handled.suggestion).toContain('endpoint')
    })

    it('should handle endpoint error with suggestion', () => {
      const originalError = new Error('endpoint not found')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('endpoint not found')
      expect(handled.suggestion).toContain('Server error occurred')
      expect(handled.suggestion).toContain('endpoint')
    })

    it('should handle generic error without specific suggestion', () => {
      const originalError = new Error('Generic stats error')
      const handled = ErrorHandler.handleStatsError(originalError)

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('Generic stats error')
      expect(handled.suggestion).toBe('')
    })

    it('should accept type parameter', () => {
      const originalError = new Error('Stats error')
      const handled = ErrorHandler.handleStatsError(originalError, 'prompt')

      expect(handled).toBeInstanceOf(BilanStatsError)
      expect(handled.message).toBe('Stats error')
    })
  })

  describe('handleNetworkError', () => {
    it('should handle CORS error with suggestion', () => {
      const originalError = new Error('CORS policy blocked')
      const handled = ErrorHandler.handleNetworkError(originalError)

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('CORS policy blocked')
      expect(handled.suggestion).toContain('CORS error')
      expect(handled.suggestion).toContain('Access-Control-Allow-Origin')
    })

    it('should handle timeout error with suggestion', () => {
      const originalError = new Error('Request timeout')
      const handled = ErrorHandler.handleNetworkError(originalError, '/api/events')

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('Request timeout')
      expect(handled.suggestion).toContain('Request timeout')
      expect(handled.suggestion).toContain('/api/events')
    })

    it('should handle 404 error with suggestion', () => {
      const originalError = new Error('404 Not Found')
      const handled = ErrorHandler.handleNetworkError(originalError, '/api/stats')

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('404 Not Found')
      expect(handled.suggestion).toContain('API endpoint not found')
      expect(handled.suggestion).toContain('/api/stats')
    })

    it('should handle generic error without specific suggestion', () => {
      const originalError = new Error('Generic network error')
      const handled = ErrorHandler.handleNetworkError(originalError)

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('Generic network error')
      expect(handled.suggestion).toBe('')
    })
  })

  describe('handleStorageError', () => {
    it('should handle localStorage error with suggestion', () => {
      const originalError = new Error('localStorage not available')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('localStorage not available')
      expect(handled.suggestion).toContain('localStorage is not available')
      expect(handled.suggestion).toContain('server mode')
    })

    it('should handle quota error with suggestion', () => {
      const originalError = new Error('quota exceeded')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('quota exceeded')
      expect(handled.suggestion).toContain('Storage quota exceeded')
      expect(handled.suggestion).toContain('server mode')
    })

    it('should handle storage error with suggestion', () => {
      const originalError = new Error('storage operation failed')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('storage operation failed')
      expect(handled.suggestion).toContain('Storage quota exceeded')
      expect(handled.suggestion).toContain('server mode')
    })

    it('should handle generic error without specific suggestion', () => {
      const originalError = new Error('Generic unknown error')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('Generic unknown error')
      expect(handled.suggestion).toBe('')
    })
  })

  describe('logError', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should log error in debug mode with full details', () => {
      ErrorHandler.setDebugMode(true)
      
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      const error = new BilanError('Test error', 'TEST_ERROR', 'test context', 'test suggestion')
      ErrorHandler.logError(error)

      expect(groupSpy).toHaveBeenCalledWith('🔴 Bilan SDK Error: TEST_ERROR')
      expect(errorSpy).toHaveBeenCalledWith('Message: Test error')
      expect(errorSpy).toHaveBeenCalledWith('Context: test context')
      expect(infoSpy).toHaveBeenCalledWith('💡 Suggestion:test suggestion')
      expect(groupEndSpy).toHaveBeenCalled()
    })

    it('should log error in debug mode without context', () => {
      ErrorHandler.setDebugMode(true)
      
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      const error = new BilanError('Test error', 'TEST_ERROR', undefined, 'test suggestion')
      ErrorHandler.logError(error)

      expect(groupSpy).toHaveBeenCalledWith('🔴 Bilan SDK Error: TEST_ERROR')
      expect(errorSpy).toHaveBeenCalledWith('Message: Test error')
      expect(errorSpy).not.toHaveBeenCalledWith('Context: test context')
      expect(infoSpy).toHaveBeenCalledWith('💡 Suggestion:test suggestion')
      expect(groupEndSpy).toHaveBeenCalled()
    })

    it('should log error in debug mode without suggestion', () => {
      ErrorHandler.setDebugMode(true)
      
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

      const error = new BilanError('Test error', 'TEST_ERROR', 'test context')
      ErrorHandler.logError(error)

      expect(groupSpy).toHaveBeenCalledWith('🔴 Bilan SDK Error: TEST_ERROR')
      expect(errorSpy).toHaveBeenCalledWith('Message: Test error')
      expect(errorSpy).toHaveBeenCalledWith('Context: test context')
      expect(infoSpy).not.toHaveBeenCalledWith('💡 Suggestion:test suggestion')
      expect(groupEndSpy).toHaveBeenCalled()
    })

    it('should log error in non-debug mode with simple warning', () => {
      ErrorHandler.setDebugMode(false)
      
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const error = new BilanError('Test error', 'TEST_ERROR', 'test context', 'test suggestion')
      ErrorHandler.logError(error)

      expect(warnSpy).toHaveBeenCalledWith('Bilan SDK (TEST_ERROR): Test error')
    })
  })

  describe('handleGracefully', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should handle init context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Init failed')
      const fallback = { initialized: false }

      const result = ErrorHandler.handleGracefully(originalError, 'init', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanInitializationError))
      expect(result).toBe(fallback)
    })

    it('should handle vote context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Vote failed')
      const fallback = { success: false }

      const result = ErrorHandler.handleGracefully(originalError, 'vote', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanVoteError))
      expect(result).toBe(fallback)
    })

    it('should handle stats context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Stats failed')
      const fallback = { totalVotes: 0 }

      const result = ErrorHandler.handleGracefully(originalError, 'stats', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanStatsError))
      expect(result).toBe(fallback)
    })

    it('should handle network context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Network failed')
      const fallback = { online: false }

      const result = ErrorHandler.handleGracefully(originalError, 'network', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanNetworkError))
      expect(result).toBe(fallback)
    })

    it('should handle storage context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Storage failed')
      const fallback = { stored: false }

      const result = ErrorHandler.handleGracefully(originalError, 'storage', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanStorageError))
      expect(result).toBe(fallback)
    })

    it('should handle unknown context and return fallback', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Unknown error')
      const fallback = { unknown: true }

      const result = ErrorHandler.handleGracefully(originalError, 'unknown', fallback)

      expect(logSpy).toHaveBeenCalledWith(expect.any(BilanError))
      expect(result).toBe(fallback)
    })

    it('should return undefined when no fallback provided', () => {
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Test error')

      const result = ErrorHandler.handleGracefully(originalError, 'test')

      expect(logSpy).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should never throw even in debug mode', () => {
      ErrorHandler.setDebugMode(true)
      const logSpy = vi.spyOn(ErrorHandler, 'logError').mockImplementation(() => {})
      const originalError = new Error('Test error')
      const fallback = { safe: true }

      expect(() => {
        const result = ErrorHandler.handleGracefully(originalError, 'test', fallback)
        expect(result).toBe(fallback)
      }).not.toThrow()

      expect(logSpy).toHaveBeenCalled()
    })
  })
})

describe('GracefulDegradation', () => {
  describe('isBrowser', () => {
    it('should return true in browser environment', () => {
      // Vitest runs in a browser-like environment
      expect(GracefulDegradation.isBrowser()).toBe(true)
    })

    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      const originalDocument = global.document
      
      // @ts-ignore
      delete global.window
      // @ts-ignore
      delete global.document

      expect(GracefulDegradation.isBrowser()).toBe(false)

      // Restore
      global.window = originalWindow
      global.document = originalDocument
    })

    it('should return false when document is undefined', () => {
      const originalDocument = global.document
      
      // @ts-ignore
      delete global.document

      expect(GracefulDegradation.isBrowser()).toBe(false)

      // Restore
      global.document = originalDocument
    })
  })

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(true)
    })

    it('should return false when localStorage is undefined', () => {
      const originalLocalStorage = global.localStorage
      
      // @ts-ignore
      delete global.localStorage

      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(false)

      // Restore
      global.localStorage = originalLocalStorage
    })

    it('should return false when localStorage throws on setItem', () => {
      const originalLocalStorage = global.localStorage
      
      global.localStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage disabled')
        }),
        removeItem: vi.fn(),
        getItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      }

      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(false)

      // Restore
      global.localStorage = originalLocalStorage
    })

    it('should return false when localStorage throws on removeItem', () => {
      const originalLocalStorage = global.localStorage
      
      global.localStorage = {
        setItem: vi.fn(),
        removeItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage disabled')
        }),
        getItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      }

      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(false)

      // Restore
      global.localStorage = originalLocalStorage
    })
  })

  describe('isOnline', () => {
    it('should return true when navigator.onLine is true', () => {
      const originalNavigator = global.navigator
      
      global.navigator = {
        ...originalNavigator,
        onLine: true
      }

      expect(GracefulDegradation.isOnline()).toBe(true)

      // Restore
      global.navigator = originalNavigator
    })

    it('should return false when navigator.onLine is false', () => {
      const originalNavigator = global.navigator
      
      global.navigator = {
        ...originalNavigator,
        onLine: false
      }

      expect(GracefulDegradation.isOnline()).toBe(false)

      // Restore
      global.navigator = originalNavigator
    })

    it('should return true when navigator is undefined', () => {
      const originalNavigator = global.navigator
      
      // @ts-ignore
      delete global.navigator

      expect(GracefulDegradation.isOnline()).toBe(true)

      // Restore
      global.navigator = originalNavigator
    })
  })

  describe('getStatsFallback', () => {
    it('should return default stats object', () => {
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
    it('should return default prompt stats object', () => {
      const promptId = 'test-prompt-123'
      const fallback = GracefulDegradation.getPromptStatsFallback(promptId)

      expect(fallback).toEqual({
        promptId: 'test-prompt-123',
        totalVotes: 0,
        positiveRate: 0,
        comments: []
      })
    })
  })
}) 