import { StorageAdapter } from '../types'

export class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'bilan:'

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.prefix + key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, value)
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch {
      // Silently fail
    }
  }

  async clear(): Promise<void> {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key))
    } catch {
      // Silently fail
    }
  }
} 