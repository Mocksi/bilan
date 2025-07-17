/**
 * Comprehensive test suite for error-handling.ts
 * Tests all error classes, ErrorHandler methods, and GracefulDegradation utilities
 */

import { describe, it, expect, vi } from 'vitest'
import { ErrorHandler, BilanError, BilanInitializationError, BilanNetworkError, BilanStorageError, GracefulDegradation } from './error-handling'
import { createUserId } from './types'

describe('ErrorHandler', () => {
  describe('handleInitError', () => {
    it('should handle mode errors with suggestion', () => {
      const originalError = new Error('Invalid mode')
      const config = { mode: 'invalid' as any, userId: createUserId('test-user') }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Invalid mode')
      expect(handled.suggestion).toContain('local or server')
    })

    it('should handle userId errors with suggestion', () => {
      const originalError = new Error('Missing userId')
      const config = { mode: 'local' as const, userId: null as any }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Missing userId')
      expect(handled.suggestion).toContain('createUserId')
    })

    it('should handle endpoint errors with suggestion', () => {
      const originalError = new Error('Missing endpoint')
      const config = { mode: 'server' as const, userId: createUserId('test-user') }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Missing endpoint')
      expect(handled.suggestion).toContain('endpoint')
    })

    it('should handle storage errors with suggestion', () => {
      const originalError = new Error('localStorage not available')
      const config = { mode: 'local' as const, userId: createUserId('test-user') }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('localStorage not available')
      expect(handled.suggestion).toContain('storage')
    })

    it('should handle generic initialization errors', () => {
      const originalError = new Error('Config error')
      const config = { mode: 'local' as const, userId: createUserId('test-user') }
      const handled = ErrorHandler.handleInitError(originalError, config)

      expect(handled).toBeInstanceOf(BilanInitializationError)
      expect(handled.message).toBe('Config error')
    })
  })

  describe('handleNetworkError', () => {
    it('should handle timeout errors with suggestion', () => {
      const originalError = new Error('Request timeout')
      const handled = ErrorHandler.handleNetworkError(originalError, 'API request')

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('Request timeout')
      expect(handled.suggestion).toContain('timeout')
    })

    it('should handle connection errors with suggestion', () => {
      const originalError = new Error('Connection refused')
      const handled = ErrorHandler.handleNetworkError(originalError, 'API request')

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('Connection refused')
      expect(handled.suggestion).toContain('network connection')
    })

    it('should handle generic network errors', () => {
      const originalError = new Error('Network error')
      const handled = ErrorHandler.handleNetworkError(originalError)

      expect(handled).toBeInstanceOf(BilanNetworkError)
      expect(handled.message).toBe('Network error')
    })
  })

  describe('handleStorageError', () => {
    it('should handle localStorage errors with suggestion', () => {
      const originalError = new Error('localStorage not available')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('localStorage not available')
      expect(handled.suggestion).toContain('storage')
    })

    it('should handle quota errors with suggestion', () => {
      const originalError = new Error('Quota exceeded')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('Quota exceeded')
      expect(handled.suggestion).toContain('storage')
    })

    it('should handle generic storage errors', () => {
      const originalError = new Error('Storage error')
      const handled = ErrorHandler.handleStorageError(originalError)

      expect(handled).toBeInstanceOf(BilanStorageError)
      expect(handled.message).toBe('Storage error')
    })
  })

  describe('log', () => {
    it('should log errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Enable debug mode for logging
      ErrorHandler.setDebugMode(true)
      
      const error = new BilanError('Test error', 'TEST_ERROR', 'test')
      ErrorHandler.log(error, 'test-context')

      expect(consoleSpy).toHaveBeenCalledWith('[Bilan SDK] test-context error:', error)
      
      // Clean up
      ErrorHandler.setDebugMode(false)
      consoleSpy.mockRestore()
    })
  })
})

describe('BilanError', () => {
  it('should create error with all properties', () => {
    const error = new BilanError('Test message', 'TEST_ERROR', 'test', 'Test suggestion')
    
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.context).toBe('test')
    expect(error.suggestion).toBe('Test suggestion')
    expect(error.name).toBe('BilanError')
  })

  it('should create error without suggestion', () => {
    const error = new BilanError('Test message', 'TEST_ERROR', 'test')
    
    expect(error.message).toBe('Test message')
    expect(error.suggestion).toBeUndefined()
  })
})

describe('BilanInitializationError', () => {
  it('should create initialization error', () => {
    const error = new BilanInitializationError('Init failed', 'Call init() first')
    
    expect(error.message).toBe('Init failed')
    expect(error.suggestion).toBe('Call init() first')
    expect(error.name).toBe('BilanInitializationError')
    expect(error.code).toBe('INIT_ERROR')
    expect(error.context).toBe('init')
  })
})

describe('BilanNetworkError', () => {
  it('should create network error', () => {
    const error = new BilanNetworkError('Network failed', 'Check connection')
    
    expect(error.message).toBe('Network failed')
    expect(error.suggestion).toBe('Check connection')
    expect(error.name).toBe('BilanNetworkError')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.context).toBe('network')
  })
})

describe('BilanStorageError', () => {
  it('should create storage error', () => {
    const error = new BilanStorageError('Storage failed', 'Check localStorage')
    
    expect(error.message).toBe('Storage failed')
    expect(error.suggestion).toBe('Check localStorage')
    expect(error.name).toBe('BilanStorageError')
    expect(error.code).toBe('STORAGE_ERROR')
    expect(error.context).toBe('storage')
  })
})

describe('GracefulDegradation', () => {
  describe('isBrowser', () => {
    it('should detect browser environment', () => {
      expect(GracefulDegradation.isBrowser()).toBe(true)
    })
  })

  describe('isLocalStorageAvailable', () => {
    it('should detect localStorage availability', () => {
      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(true)
    })

    it('should handle localStorage errors', () => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(GracefulDegradation.isLocalStorageAvailable()).toBe(false)

      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('isOnline', () => {
    it('should detect online status', () => {
      expect(GracefulDegradation.isOnline()).toBe(true)
    })
  })
}) 