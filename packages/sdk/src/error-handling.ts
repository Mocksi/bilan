import { InitConfig, PromptId } from './types'
import { createPromptId } from './types'

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

export class ErrorHandler {
  private static isDebugMode = false

  static setDebugMode(enabled: boolean): void {
    ErrorHandler.isDebugMode = enabled
  }

  static handleInitError(error: Error, config?: InitConfig): BilanInitializationError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('mode')) {
      suggestion = 'Use mode: "local" or "server"'
    } else if (error.message.includes('userId')) {
      suggestion = 'Use createUserId("your-user-id")'
    } else if (error.message.includes('endpoint')) {
      suggestion = 'Add endpoint URL for server mode'
    }

    return new BilanInitializationError(message, suggestion)
  }

  static handleVoteError(error: Error, promptId?: string, value?: number): BilanVoteError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('not initialized')) {
      suggestion = 'Call init() first'
    } else if (error.message.includes('promptId')) {
      suggestion = 'Use createPromptId()'
    } else if (error.message.includes('value')) {
      suggestion = 'Use 1 or -1 for vote value'
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      suggestion = 'Check network connection'
    }

    return new BilanVoteError(message, suggestion)
  }

  static handleStatsError(error: Error, type: string = 'basic'): BilanStatsError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('not initialized')) {
      suggestion = 'Call init() first'
    } else if (error.message.includes('no data') || error.message.includes('empty')) {
      suggestion = 'Record some votes first'
    } else if (error.message.includes('server') || error.message.includes('endpoint')) {
      suggestion = 'Check endpoint configuration'
    }

    return new BilanStatsError(message, suggestion)
  }

  static handleNetworkError(error: Error, endpoint?: string): BilanNetworkError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('CORS')) {
      suggestion = 'Configure CORS on server'
    } else if (error.message.includes('timeout')) {
      suggestion = 'Check server availability'
    } else if (error.message.includes('404')) {
      suggestion = 'Verify API endpoints'
    }

    return new BilanNetworkError(message, suggestion)
  }

  static handleStorageError(error: Error): BilanStorageError {
    let message = error.message
    let suggestion = ''

    if (error.message.includes('localStorage')) {
      suggestion = 'Use server mode or custom storage'
    } else if (error.message.includes('quota') || error.message.includes('storage')) {
      suggestion = 'Clear storage or use server mode'
    }

    return new BilanStorageError(message, suggestion)
  }

  static logError(error: BilanError): void {
    if (ErrorHandler.isDebugMode) {
      console.group(`🔴 Bilan SDK Error: ${error.code}`)
      console.error(`Message: ${error.message}`)
      if (error.context) {
        console.error(`Context: ${error.context}`)
      }
      if (error.suggestion) {
        console.error(`Suggestion: ${error.suggestion}`)
      }
      console.groupEnd()
    } else {
      console.warn(`Bilan SDK (${error.code}): ${error.message}`)
    }
  }

  static handleGracefully<T>(
    error: Error,
    context: string,
    fallback?: T
  ): T | undefined {
    let bilanError: BilanError

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

    ErrorHandler.logError(bilanError)
    return fallback
  }
}

export class GracefulDegradation {
  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  static isLocalStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false
      }
      const testKey = '__bilan_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  static isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine
  }

  static getStatsFallback() {
    return {
      totalVotes: 0,
      positiveRate: 0,
      recentTrend: 'stable' as const,
      topFeedback: []
    }
  }

  static getPromptStatsFallback(promptId: PromptId) {
    return {
      promptId,
      totalVotes: 0,
      positiveRate: 0,
      comments: []
    }
  }
} 