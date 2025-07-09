/**
 * Enhanced error handling for the Bilan SDK with developer-friendly messages
 * and graceful degradation patterns.
 */

import { InitConfig } from './types'
import { createPromptId } from './types'

/**
 * Base error class for all Bilan SDK errors with enhanced developer experience.
 * Provides structured error information including error codes, context, and
 * actionable suggestions for resolving issues.
 * 
 * @example
 * ```typescript
 * const error = new BilanError(
 *   'Invalid configuration',
 *   'CONFIG_ERROR',
 *   'initialization',
 *   'Check your configuration object'
 * )
 * ```
 */
export class BilanError extends Error {
  /** 
   * Unique error code for programmatic error handling 
   */
  public readonly code: string
  
  /** 
   * Context where the error occurred (e.g., 'initialization', 'vote recording') 
   */
  public readonly context?: string
  
  /** 
   * Developer-friendly suggestion for resolving the error 
   */
  public readonly suggestion?: string

  /**
   * Creates a new BilanError instance
   * 
   * @param message - Human-readable error message
   * @param code - Unique error code for programmatic handling
   * @param context - Context where the error occurred
   * @param suggestion - Developer-friendly suggestion for resolution
   */
  constructor(message: string, code: string, context?: string, suggestion?: string) {
    super(message)
    this.name = 'BilanError'
    this.code = code
    this.context = context
    this.suggestion = suggestion
  }
}

/**
 * Error thrown during SDK initialization with helpful setup guidance.
 * Common causes include invalid mode, missing userId, or missing endpoint.
 * 
 * @example
 * ```typescript
 * throw new BilanInitializationError(
 *   'userId is required',
 *   'Use createUserId("your-user-id")'
 * )
 * ```
 */
export class BilanInitializationError extends BilanError {
  /**
   * Creates a new initialization error
   * 
   * @param message - Description of the initialization problem
   * @param suggestion - Helpful guidance for fixing the issue
   */
  constructor(message: string, suggestion?: string) {
    super(message, 'INIT_ERROR', 'initialization', suggestion)
    this.name = 'BilanInitializationError'
  }
}

/**
 * Error thrown during vote recording with guidance for proper usage.
 * Common causes include invalid vote values, missing promptId, or SDK not initialized.
 * 
 * @example
 * ```typescript
 * throw new BilanVoteError(
 *   'Invalid vote value',
 *   'Use 1 for positive or -1 for negative votes'
 * )
 * ```
 */
export class BilanVoteError extends BilanError {
  /**
   * Creates a new vote recording error
   * 
   * @param message - Description of the vote recording problem
   * @param suggestion - Helpful guidance for fixing the issue
   */
  constructor(message: string, suggestion?: string) {
    super(message, 'VOTE_ERROR', 'vote recording', suggestion)
    this.name = 'BilanVoteError'
  }
}

/**
 * Error thrown during statistics retrieval with guidance for data access.
 * Common causes include no data available, SDK not initialized, or server errors.
 * 
 * @example
 * ```typescript
 * throw new BilanStatsError(
 *   'No data available',
 *   'Record some votes first before requesting statistics'
 * )
 * ```
 */
export class BilanStatsError extends BilanError {
  /**
   * Creates a new statistics retrieval error
   * 
   * @param message - Description of the statistics problem
   * @param suggestion - Helpful guidance for fixing the issue
   */
  constructor(message: string, suggestion?: string) {
    super(message, 'STATS_ERROR', 'stats retrieval', suggestion)
    this.name = 'BilanStatsError'
  }
}

/**
 * Error thrown during network operations with connectivity guidance.
 * Common causes include CORS issues, timeout errors, or endpoint not found.
 * 
 * @example
 * ```typescript
 * throw new BilanNetworkError(
 *   'Request timeout',
 *   'Check your network connection and server availability'
 * )
 * ```
 */
export class BilanNetworkError extends BilanError {
  /**
   * Creates a new network error
   * 
   * @param message - Description of the network problem
   * @param suggestion - Helpful guidance for fixing the issue
   */
  constructor(message: string, suggestion?: string) {
    super(message, 'NETWORK_ERROR', 'network request', suggestion)
    this.name = 'BilanNetworkError'
  }
}

/**
 * Error thrown during storage operations with storage guidance.
 * Common causes include localStorage unavailable, quota exceeded, or storage errors.
 * 
 * @example
 * ```typescript
 * throw new BilanStorageError(
 *   'localStorage not available',
 *   'Consider using server mode or a custom storage adapter'
 * )
 * ```
 */
export class BilanStorageError extends BilanError {
  /**
   * Creates a new storage error
   * 
   * @param message - Description of the storage problem
   * @param suggestion - Helpful guidance for fixing the issue
   */
  constructor(message: string, suggestion?: string) {
    super(message, 'STORAGE_ERROR', 'storage operation', suggestion)
    this.name = 'BilanStorageError'
  }
}

/**
 * Enhanced error handler that provides contextual error messages and suggestions
 * for common SDK usage issues. Supports both debug and production modes with
 * appropriate logging levels.
 * 
 * @example
 * ```typescript
 * // Enable debug mode for detailed error logging
 * ErrorHandler.setDebugMode(true)
 * 
 * // Handle an initialization error
 * const error = ErrorHandler.handleInitError(new Error('Invalid mode'))
 * ```
 */
export class ErrorHandler {
  private static isDebugMode = false

  /**
   * Sets the debug mode for error handling and logging.
   * In debug mode, errors are logged with full details including stack traces.
   * In production mode, only basic error messages are logged.
   * 
   * @param enabled - Whether to enable debug mode
   * 
   * @example
   * ```typescript
   * // Enable debug mode during development
   * ErrorHandler.setDebugMode(process.env.NODE_ENV === 'development')
   * ```
   */
  static setDebugMode(enabled: boolean): void {
    ErrorHandler.isDebugMode = enabled
  }

  /**
   * Handles initialization errors and provides helpful setup guidance.
   * Analyzes the error message to provide specific suggestions for common
   * initialization problems like missing configuration or invalid parameters.
   * 
   * @param error - The original error that occurred during initialization
   * @param config - Optional configuration object for additional context
   * @returns A BilanInitializationError with helpful suggestions
   * 
   * @example
   * ```typescript
   * try {
   *   await init({ mode: 'invalid' })
   * } catch (error) {
   *   const handled = ErrorHandler.handleInitError(error)
   *   console.log(handled.suggestion) // Shows proper init() usage
   * }
   * ```
   */
  static handleInitError(error: Error, config?: InitConfig): BilanInitializationError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('mode')) {
      suggestion = `
Bilan SDK initialization failed. Make sure to specify a valid mode:

import { init, createUserId } from '@mocksi/bilan-sdk'

await init({
  mode: 'local',  // or 'server'
  userId: createUserId('your-user-id')
})
`
    } else if (error.message.includes('userId')) {
      suggestion = `
Bilan SDK requires a userId. Use the createUserId helper:

import { init, createUserId } from '@mocksi/bilan-sdk'

await init({
  mode: 'local',
  userId: createUserId('your-user-id')  // ← Add this
})
`
    } else if (error.message.includes('endpoint')) {
      suggestion = `
Server mode requires an endpoint URL:

import { init, createUserId } from '@mocksi/bilan-sdk'

await init({
  mode: 'server',
  userId: createUserId('your-user-id'),
  endpoint: 'https://your-bilan-api.com'  // ← Add this
})
`
    }

    return new BilanInitializationError(message, suggestion)
  }

  /**
   * Handles vote recording errors and provides helpful usage guidance.
   * Analyzes the error to provide specific suggestions for common voting
   * problems like invalid values, missing initialization, or network issues.
   * 
   * @param error - The original error that occurred during vote recording
   * @param promptId - Optional prompt ID for additional context
   * @param value - Optional vote value for additional context
   * @returns A BilanVoteError with helpful suggestions
   * 
   * @example
   * ```typescript
   * try {
   *   await vote('prompt-1', 2) // Invalid vote value
   * } catch (error) {
   *   const handled = ErrorHandler.handleVoteError(error, 'prompt-1', 2)
   *   console.log(handled.suggestion) // Shows valid vote values
   * }
   * ```
   */
  static handleVoteError(error: Error, promptId?: string, value?: number): BilanVoteError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('not initialized')) {
      suggestion = `
Bilan SDK not initialized. Add this to your app startup:

import { init, createUserId } from '@mocksi/bilan-sdk'

await init({
  mode: 'local',
  userId: createUserId('your-user-id')
})

Then you can record votes:

import { vote, createPromptId } from '@mocksi/bilan-sdk'
await vote(createPromptId('prompt-123'), 1, 'Great response!')
`
    } else if (error.message.includes('promptId')) {
      suggestion = `
Invalid promptId. Use the createPromptId helper:

import { vote, createPromptId } from '@mocksi/bilan-sdk'

await vote(createPromptId('prompt-123'), 1)  // ← Use createPromptId
`
    } else if (error.message.includes('value')) {
      suggestion = `
Vote value must be 1 (positive) or -1 (negative):

await vote(promptId, 1)   // ← Thumbs up
await vote(promptId, -1)  // ← Thumbs down
`
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      suggestion = `
Network error occurred. Check your connection and endpoint:

// For server mode, verify your endpoint is accessible
await init({
  mode: 'server',
  endpoint: 'https://your-bilan-api.com',  // ← Check this URL
  userId: createUserId('your-user-id')
})

// For local mode, this might be a telemetry connection issue (non-critical)
`
    }

    return new BilanVoteError(message, suggestion)
  }

  /**
   * Handles statistics retrieval errors and provides helpful data access guidance.
   * Analyzes the error to provide specific suggestions for common stats problems
   * like no data available, SDK not initialized, or server connectivity issues.
   * 
   * @param error - The original error that occurred during stats retrieval
   * @param type - Type of stats being requested ('basic' or 'prompt')
   * @returns A BilanStatsError with helpful suggestions
   * 
   * @example
   * ```typescript
   * try {
   *   const stats = await getStats()
   * } catch (error) {
   *   const handled = ErrorHandler.handleStatsError(error, 'basic')
   *   console.log(handled.suggestion) // Shows how to record votes first
   * }
   * ```
   */
  static handleStatsError(error: Error, type: 'basic' | 'prompt' = 'basic'): BilanStatsError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('not initialized')) {
      suggestion = `
Bilan SDK not initialized. Initialize first:

import { init, getStats, createUserId } from '@mocksi/bilan-sdk'

await init({
  mode: 'local',
  userId: createUserId('your-user-id')
})

const stats = await getStats()
`
    } else if (error.message.includes('no data') || error.message.includes('empty')) {
      suggestion = `
No feedback data available yet. Record some votes first:

import { vote, createPromptId } from '@mocksi/bilan-sdk'

await vote(createPromptId('prompt-123'), 1, 'Helpful!')
await vote(createPromptId('prompt-456'), -1, 'Not quite right')

// Then get stats
const stats = await getStats()
`
    } else if (error.message.includes('server') || error.message.includes('endpoint')) {
      suggestion = `
Server error occurred. Check your endpoint configuration:

await init({
  mode: 'server',
  endpoint: 'https://your-bilan-api.com',  // ← Verify this URL
  userId: createUserId('your-user-id')
})
`
    }

    return new BilanStatsError(message, suggestion)
  }

  /**
   * Handles network errors and provides helpful connectivity guidance.
   * Analyzes the error to provide specific suggestions for common network
   * problems like CORS issues, timeouts, or endpoint configuration.
   * 
   * @param error - The original network error
   * @param endpoint - Optional endpoint URL for additional context
   * @returns A BilanNetworkError with helpful suggestions
   * 
   * @example
   * ```typescript
   * try {
   *   await fetch('/api/events')
   * } catch (error) {
   *   const handled = ErrorHandler.handleNetworkError(error, '/api/events')
   *   console.log(handled.suggestion) // Shows CORS or connectivity fixes
   * }
   * ```
   */
  static handleNetworkError(error: Error, endpoint?: string): BilanNetworkError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('CORS')) {
      suggestion = `
CORS error: Your Bilan API server needs to allow requests from your domain.

Add these headers to your server:
- Access-Control-Allow-Origin: https://your-domain.com
- Access-Control-Allow-Methods: GET, POST, OPTIONS
- Access-Control-Allow-Headers: Content-Type
`
    } else if (error.message.includes('timeout')) {
      suggestion = `
Request timeout. Your Bilan API server might be slow or unreachable.

Check:
1. Server is running: ${endpoint}
2. Network connectivity
3. Server response time
`
    } else if (error.message.includes('404')) {
      suggestion = `
API endpoint not found. Verify your Bilan server has these endpoints:

- POST /api/events (for recording votes)
- GET /api/stats (for getting statistics)
- GET /api/stats/prompt/:promptId (for prompt stats)

Current endpoint: ${endpoint}
`
    }

    return new BilanNetworkError(message, suggestion)
  }

  /**
   * Handles storage errors and provides helpful storage guidance.
   * Analyzes the error to provide specific suggestions for common storage
   * problems like localStorage unavailable or quota exceeded.
   * 
   * @param error - The original storage error
   * @returns A BilanStorageError with helpful suggestions
   * 
   * @example
   * ```typescript
   * try {
   *   localStorage.setItem('key', 'value')
   * } catch (error) {
   *   const handled = ErrorHandler.handleStorageError(error)
   *   console.log(handled.suggestion) // Shows alternative storage options
   * }
   * ```
   */
  static handleStorageError(error: Error): BilanStorageError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('localStorage')) {
      suggestion = `
localStorage is not available. This might happen in:

1. Private/incognito browser mode
2. Server-side rendering (SSR)
3. Some mobile browsers

Solutions:
- Use server mode instead of local mode
- Implement a custom storage adapter
- Check if running in browser environment
`
    } else if (error.message.includes('quota') || error.message.includes('storage')) {
      suggestion = `
Storage quota exceeded. The browser has limited storage space.

Solutions:
- Clear old Bilan data
- Use server mode for production
- Implement data cleanup in your app
`
    }

    return new BilanStorageError(message, suggestion)
  }

  /**
   * Logs errors with appropriate formatting based on debug mode.
   * In debug mode, provides detailed error information including context and suggestions.
   * In production mode, logs simple warning messages.
   * 
   * @param error - The BilanError to log
   * 
   * @example
   * ```typescript
   * const error = new BilanError('Something went wrong', 'GENERIC_ERROR')
   * ErrorHandler.logError(error) // Logs with appropriate detail level
   * ```
   */
  static logError(error: BilanError): void {
    if (ErrorHandler.isDebugMode) {
      console.group(`🔴 Bilan SDK Error: ${error.code}`)
      console.error(`Message: ${error.message}`)
      if (error.context) {
        console.error(`Context: ${error.context}`)
      }
      if (error.suggestion) {
        console.info(`💡 Suggestion:${error.suggestion}`)
      }
      console.groupEnd()
    } else {
      console.warn(`Bilan SDK (${error.code}): ${error.message}`)
    }
  }

  /**
   * Handles errors gracefully without throwing, following the SDK principle
   * of never crashing user applications. Logs the error and returns a fallback value.
   * 
   * @param error - The original error that occurred
   * @param context - Context where the error occurred
   * @param fallback - Optional fallback value to return
   * @returns The fallback value or undefined
   * 
   * @example
   * ```typescript
   * // Always returns a safe value, never throws
   * const result = ErrorHandler.handleGracefully(
   *   new Error('API failed'),
   *   'stats',
   *   { totalVotes: 0, positiveRate: 0 }
   * )
   * ```
   */
  static handleGracefully(error: Error, context: string, fallback?: any): any {
    let bilanError: BilanError

    // Convert to appropriate Bilan error type
    switch (context) {
      case 'init':
        bilanError = ErrorHandler.handleInitError(error)
        break
      case 'vote':
        bilanError = ErrorHandler.handleVoteError(error)
        break
      case 'stats':
        bilanError = ErrorHandler.handleStatsError(error)
        break
      case 'network':
        bilanError = ErrorHandler.handleNetworkError(error)
        break
      case 'storage':
        bilanError = ErrorHandler.handleStorageError(error)
        break
      default:
        bilanError = new BilanError(error.message, 'UNKNOWN_ERROR', context)
    }

    // Always log the error
    ErrorHandler.logError(bilanError)

    // Always return fallback gracefully - never throw even in debug mode
    return fallback
  }
}

/**
 * Utility class for graceful degradation patterns and environment detection.
 * Provides safe methods to check browser capabilities and return fallback values
 * when features are not available.
 * 
 * @example
 * ```typescript
 * if (GracefulDegradation.isBrowser()) {
 *   // Safe to use browser APIs
 * }
 * 
 * const stats = GracefulDegradation.getStatsFallback()
 * ```
 */
export class GracefulDegradation {
  /**
   * Safely checks if running in a browser environment.
   * 
   * @returns True if running in browser, false in Node.js or other environments
   */
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  /**
   * Safely checks if localStorage is available and functional.
   * Handles cases where localStorage exists but throws errors (e.g., incognito mode).
   * 
   * @returns True if localStorage is available and working, false otherwise
   */
  static isLocalStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false
      
      const testKey = '__bilan_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Safely checks if the browser is currently online.
   * 
   * @returns True if online, false if offline or navigator unavailable
   */
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  /**
   * Returns a safe fallback statistics object when real stats are unavailable.
   * 
   * @returns Default statistics structure with zero values
   */
  static getStatsFallback() {
    return {
      totalVotes: 0,
      positiveRate: 0,
      recentTrend: 'stable' as const,
      topFeedback: []
    }
  }

  /**
   * Returns a safe fallback prompt statistics object when real stats are unavailable.
   * 
   * @param promptId - The prompt ID for the fallback stats
   * @returns Default prompt statistics structure with zero values
   */
  static getPromptStatsFallback(promptId: string) {
    return {
      promptId,
      totalVotes: 0,
      positiveRate: 0,
      comments: []
    }
  }
} 