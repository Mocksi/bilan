/**
 * Enhanced error handling for the Bilan SDK with developer-friendly messages
 * and graceful degradation patterns.
 */

export class BilanError extends Error {
  public readonly code: string
  public readonly context?: string
  public readonly suggestion?: string

  constructor(message: string, code: string, context?: string, suggestion?: string) {
    super(message)
    this.name = 'BilanError'
    this.code = code
    this.context = context
    this.suggestion = suggestion
  }
}

export class BilanInitializationError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'INIT_ERROR', 'initialization', suggestion)
    this.name = 'BilanInitializationError'
  }
}

export class BilanVoteError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'VOTE_ERROR', 'vote recording', suggestion)
    this.name = 'BilanVoteError'
  }
}

export class BilanStatsError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'STATS_ERROR', 'stats retrieval', suggestion)
    this.name = 'BilanStatsError'
  }
}

export class BilanNetworkError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'NETWORK_ERROR', 'network request', suggestion)
    this.name = 'BilanNetworkError'
  }
}

export class BilanStorageError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'STORAGE_ERROR', 'storage operation', suggestion)
    this.name = 'BilanStorageError'
  }
}

/**
 * Enhanced error handling with helpful developer messages
 */
export class ErrorHandler {
  private static isDebugMode = false

  static setDebugMode(enabled: boolean): void {
    ErrorHandler.isDebugMode = enabled
  }

  /**
   * Handle initialization errors with helpful suggestions
   */
  static handleInitError(error: Error, config?: any): BilanInitializationError {
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
   * Handle vote recording errors with helpful suggestions
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
   * Handle stats retrieval errors with helpful suggestions
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
   * Handle network errors with helpful suggestions
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
   * Handle storage errors with helpful suggestions
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
   * Log error with helpful formatting
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
   * Graceful error handling - log but don't throw
   */
  static handleGracefully(error: Error, context: string, fallback?: any): any {
    let bilanError: BilanError

    switch (context) {
      case 'init':
        bilanError = ErrorHandler.handleInitError(error)
        break
      case 'vote':
        bilanError = ErrorHandler.handleVoteError(error)
        break
      case 'stats':
        bilanError = ErrorHandler.handleStatsError(error, 'basic')
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

    ErrorHandler.logError(bilanError)

    if (ErrorHandler.isDebugMode) {
      throw bilanError
    }

    return fallback
  }
}

/**
 * Graceful degradation helpers
 */
export class GracefulDegradation {
  /**
   * Check if we're in a browser environment
   */
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  /**
   * Check if localStorage is available
   */
  static isLocalStorageAvailable(): boolean {
    try {
      if (!GracefulDegradation.isBrowser()) return false
      
      const test = '__bilan_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if we're online
   */
  static isOnline(): boolean {
    if (!GracefulDegradation.isBrowser()) return true
    return navigator.onLine
  }

  /**
   * Get a safe fallback for stats when errors occur
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
   * Get a safe fallback for prompt stats when errors occur
   */
  static getPromptStatsFallback(promptId: string) {
    return {
      promptId: promptId as any,
      totalVotes: 0,
      positiveRate: 0,
      comments: []
    }
  }
} 