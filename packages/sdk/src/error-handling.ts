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
    super(message, 'INIT_ERROR', 'init', suggestion)
    this.name = 'BilanInitializationError'
  }
}



export class BilanNetworkError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'NETWORK_ERROR', 'network', suggestion)
    this.name = 'BilanNetworkError'
  }
}

export class BilanStorageError extends BilanError {
  constructor(message: string, suggestion?: string) {
    super(message, 'STORAGE_ERROR', 'storage', suggestion)
    this.name = 'BilanStorageError'
  }
}

export class ErrorHandler {
  private static isDebugMode = false

  static setDebugMode(enabled: boolean): void {
    ErrorHandler.isDebugMode = enabled
  }

  static handleInitError(error: Error, config?: InitConfig): BilanInitializationError {
    const msg = error.message
    let suggestion = ''

    if (msg.includes('mode')) {
      suggestion = 'Use mode: "local or server"'
    } else if (msg.includes('userId')) {
      suggestion = 'Use createUserId("your-user-id")'
    } else if (msg.includes('endpoint')) {
      suggestion = 'Add endpoint URL for server mode'
    } else if (msg.includes('localStorage')) {
      suggestion = 'localStorage not available, try server mode or check storage support'
    }

    return new BilanInitializationError(msg, suggestion)
  }



  static handleNetworkError(error: Error, operation: string = 'request'): BilanNetworkError {
    const msg = error.message
    let suggestion = ''

    if (msg.includes('fetch') || msg.includes('Connection refused')) {
      suggestion = 'Check network connection and ensure server is accessible'
    } else if (msg.includes('timeout')) {
      suggestion = 'Request timeout - check network or increase timeout'
    } else if (msg.includes('404')) {
      suggestion = 'Check endpoint URL'
    } else if (msg.includes('401') || msg.includes('403')) {
      suggestion = 'Check API key'
    }

    return new BilanNetworkError(msg, suggestion)
  }

  static handleStorageError(error: Error, operation: string = 'storage'): BilanStorageError {
    const msg = error.message
    let suggestion = ''

    if (msg.includes('localStorage')) {
      suggestion = 'localStorage not available - try server mode or check storage support'
    } else if (msg.toLowerCase().includes('quota')) {
      suggestion = 'Storage quota exceeded - clear storage or use server mode'
    } else if (msg.includes('parse')) {
      suggestion = 'Invalid data format'
    }

    return new BilanStorageError(msg, suggestion)
  }

  static log(error: Error, context?: string): void {
    if (ErrorHandler.isDebugMode) {
      console.error(`[Bilan SDK] ${context || 'Error'} error:`, error)
    }
  }

  static warn(message: string, context?: string): void {
    if (ErrorHandler.isDebugMode) {
      console.warn(`[Bilan] ${context || 'Warning'}:`, message)
    }
  }

  static createSafeError(message: string, code: string = 'UNKNOWN_ERROR'): BilanError {
    return new BilanError(message, code)
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


} 