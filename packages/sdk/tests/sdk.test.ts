import { describe, it, expect, beforeEach } from 'vitest'
import { init, vote, getStats, getPromptStats } from '../src/index'
import { createUserId, createPromptId } from '../src/types'

// Mock localStorage for testing
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => {
      return (window as any).localStorageData[key] || null
    },
    setItem: (key: string, value: string) => {
      (window as any).localStorageData[key] = value
    },
    removeItem: (key: string) => {
      delete (window as any).localStorageData[key]
    },
    clear: () => {
      (window as any).localStorageData = {}
    }
  },
  writable: true
});

describe('Bilan SDK', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    (window as any).localStorageData = {}
  })

  it('should initialize without errors', async () => {
    await expect(init({
      mode: 'local',
      userId: createUserId('test-user')
    })).resolves.not.toThrow()
  })

  it('should track votes', async () => {
    await init({ mode: 'local', userId: createUserId('test-user') })
    
    await vote(createPromptId('prompt-1'), 1, 'Great!')
    await vote(createPromptId('prompt-1'), -1, 'Not helpful')
    
    const stats = await getStats()
    expect(stats.totalVotes).toBe(2)
    expect(stats.positiveRate).toBe(0.5)
  })

  it('should calculate prompt-specific stats', async () => {
    await init({ mode: 'local', userId: createUserId('test-user') })
    
    await vote(createPromptId('prompt-1'), 1, 'Great!')
    await vote(createPromptId('prompt-1'), 1, 'Awesome!')
    await vote(createPromptId('prompt-2'), -1, 'Bad')
    
    const promptStats = await getPromptStats(createPromptId('prompt-1'))
    expect(promptStats.totalVotes).toBe(2)
    expect(promptStats.positiveRate).toBe(1)
    expect(promptStats.comments).toEqual(['Great!', 'Awesome!'])
  })

  it('should detect trends', async () => {
    await init({ mode: 'local', userId: createUserId('test-user') })
    
    // Add some votes to trigger trend calculation
    for (let i = 0; i < 15; i++) {
      await vote(createPromptId(`prompt-${i}`), 1)
    }
    
    // Add recent negative votes
    for (let i = 15; i < 25; i++) {
      await vote(createPromptId(`prompt-${i}`), -1)
    }
    
    const stats = await getStats()
    expect(stats.recentTrend).toBe('declining')
  })

  it('should handle empty state', async () => {
    await init({ mode: 'local', userId: createUserId('test-user') })
    
    const stats = await getStats()
    expect(stats.totalVotes).toBe(0)
    expect(stats.positiveRate).toBe(0)
    expect(stats.recentTrend).toBe('stable')
    expect(stats.topFeedback).toEqual([])
  })
}) 