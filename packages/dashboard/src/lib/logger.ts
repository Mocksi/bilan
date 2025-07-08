// Simple logging utility for Bilan Dashboard
const log = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[BILAN] ${message}`, data || '')
  }
}

const error = (message: string, error?: any) => {
  console.error(`[BILAN ERROR] ${message}`, error || '')
}

const warn = (message: string, data?: any) => {
  console.warn(`[BILAN WARN] ${message}`, data || '')
}

export const logger = { log, error, warn }
export default logger 