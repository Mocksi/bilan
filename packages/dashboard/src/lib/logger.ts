type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  details?: any
  timestamp: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLogEntry(level: LogLevel, message: string, details?: any): LogEntry {
    return {
      level,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  }

  private log(level: LogLevel, message: string, details?: any) {
    const entry = this.formatLogEntry(level, message, details)
    
    if (this.isDevelopment) {
      // In development, use console for immediate feedback
      const consoleMethod = this.getConsoleMethod(level)
      consoleMethod(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, details || '')
    } else {
      // In production, you might want to send to a logging service
      // For now, still use console but in a structured format
      console.log(JSON.stringify(entry))
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'error':
        return console.error
      case 'warn':
        return console.warn
      case 'info':
        return console.info
      case 'debug':
        return console.debug
      default:
        return console.log
    }
  }

  error(message: string, details?: any) {
    this.log('error', message, details)
  }

  warn(message: string, details?: any) {
    this.log('warn', message, details)
  }

  info(message: string, details?: any) {
    this.log('info', message, details)
  }

  debug(message: string, details?: any) {
    if (this.isDevelopment) {
      this.log('debug', message, details)
    }
  }
}

export const logger = new Logger()
export default logger 