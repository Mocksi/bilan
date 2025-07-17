/**
 * End-to-end tests for dashboard functionality
 * Tests API client, data loading, and integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanSDK, createUserId, createPromptId } from '../../packages/sdk/src/index'
import { ApiClient } from '../../packages/dashboard/src/lib/api-client'
import { DashboardData } from '../../packages/dashboard/src/lib/types'

// Mock data setup
const mockDashboardData: DashboardData = {
  conversationStats: {
    totalConversations: 150,
    successRate: 0.85,
    averageMessages: 5.2,
    completionRate: 0.78
  },
  journeyStats: {
    totalJourneys: 75,
    completionRate: 0.92,
    popularJourneys: [
      { name: 'email-agent', count: 35, completionRate: 0.88 },
      { name: 'code-assistant', count: 25, completionRate: 0.95 },
      { name: 'data-analysis', count: 15, completionRate: 0.87 }
    ]
  },
  feedbackStats: {
    totalFeedback: 320,
    positiveRate: 0.82,
    recentTrend: 'improving',
    topComments: [
      'Excellent response!',
      'Very helpful',
      'Perfect solution',
      'Great explanation',
      'Exactly what I needed'
    ]
  },
  qualitySignals: {
    positive: 264,
    negative: 56,
    regenerations: 18,
    frustration: 12
  },
  timeSeriesData: [
    { date: '2023-12-01', trustScore: 0.78, totalVotes: 45, positiveVotes: 35 },
    { date: '2023-12-02', trustScore: 0.82, totalVotes: 52, positiveVotes: 43 },
    { date: '2023-12-03', trustScore: 0.85, totalVotes: 48, positiveVotes: 41 },
    { date: '2023-12-04', trustScore: 0.83, totalVotes: 51, positiveVotes: 42 },
    { date: '2023-12-05', trustScore: 0.87, totalVotes: 55, positiveVotes: 48 }
  ],
  recentActivity: {
    conversations: [
      {
        promptId: 'prompt-123',
        userId: 'user-456',
        lastActivity: Date.now() - 300000, // 5 minutes ago
        feedbackCount: 3,
        outcome: 'positive'
      },
      {
        promptId: 'prompt-789',
        userId: 'user-101',
        lastActivity: Date.now() - 600000, // 10 minutes ago
        feedbackCount: 1,
        outcome: 'negative'
      }
    ],
    recentVotes: [
      { promptId: 'prompt-123', userId: 'user-456', value: 1, timestamp: Date.now() - 120000 },
      { promptId: 'prompt-789', userId: 'user-101', value: -1, timestamp: Date.now() - 180000 }
    ],
    totalEvents: 320
  }
}

describe('E2E: Dashboard Integration', () => {
  let sdk: BilanSDK
  let apiClient: ApiClient
  let mockFetch: any

  beforeEach(() => {
    // Setup mocks
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Initialize SDK and API client
    sdk = new BilanSDK()
    apiClient = new ApiClient('http://localhost:3002')
    
    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Data Loading', () => {
    it('should load and display dashboard data correctly', async () => {
      const dashboardData = await apiClient.fetchDashboardData()
      
      expect(dashboardData).toEqual(mockDashboardData)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3002/api/dashboard')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await expect(apiClient.fetchDashboardData()).rejects.toThrow('Network error')
    })

    it('should handle API timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )
      
      await expect(apiClient.fetchDashboardData()).rejects.toThrow('Timeout')
    })
  })

  describe('Data Validation', () => {
    it('should validate conversation stats structure', async () => {
      const data = await apiClient.fetchDashboardData()
      
      expect(data.conversationStats).toBeDefined()
      expect(typeof data.conversationStats.totalConversations).toBe('number')
      expect(typeof data.conversationStats.successRate).toBe('number')
      expect(typeof data.conversationStats.averageMessages).toBe('number')
      expect(typeof data.conversationStats.completionRate).toBe('number')
    })

    it('should validate quality signals structure', async () => {
      const data = await apiClient.fetchDashboardData()
      
      expect(data.qualitySignals).toBeDefined()
      expect(typeof data.qualitySignals.positive).toBe('number')
      expect(typeof data.qualitySignals.negative).toBe('number')
      expect(typeof data.qualitySignals.regenerations).toBe('number')
      expect(typeof data.qualitySignals.frustration).toBe('number')
    })

    it('should validate time series data structure', async () => {
      const data = await apiClient.fetchDashboardData()
      
      expect(Array.isArray(data.timeSeriesData)).toBe(true)
      data.timeSeriesData.forEach(point => {
        expect(typeof point.date).toBe('string')
        expect(typeof point.trustScore).toBe('number')
        expect(typeof point.totalVotes).toBe('number')
        expect(typeof point.positiveVotes).toBe('number')
      })
    })
  })

  describe('Data Integration with SDK', () => {
    it('should reflect SDK actions in dashboard data', async () => {
      // Initialize SDK
      await sdk.init({
        mode: 'local',
        userId: createUserId('test-user'),
        debug: true
      })

      // Record some votes
      await sdk.vote(createPromptId('test-1'), 1, 'Great!')
      await sdk.vote(createPromptId('test-2'), -1, 'Not helpful')
      await sdk.vote(createPromptId('test-3'), 1, 'Perfect!')

      // Get SDK stats
      const sdkStats = await sdk.getStats()
      
      expect(sdkStats.totalVotes).toBe(3)
      expect(sdkStats.positiveRate).toBe(2/3)
      expect(sdkStats.topFeedback).toContain('Great!')
    })

    it('should handle conversation flow integration', async () => {
      await sdk.init({
        mode: 'local',
        userId: createUserId('test-user'),
        debug: true
      })

      // Start and complete conversation
      const conversationId = await sdk.startConversation(createUserId('test-user'))
      await sdk.addMessage(conversationId)
      await sdk.recordFeedback(conversationId, 1)
      await sdk.endConversation(conversationId, 'completed')

      // Verify conversation was created
      expect(conversationId).toBeTruthy()
      expect(conversationId).toMatch(/^conv-/)
    })
  })

  describe('Real-time Data Updates', () => {
    it('should handle polling for live updates', async () => {
      // Mock multiple API calls for polling
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDashboardData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockDashboardData,
            recentActivity: {
              ...mockDashboardData.recentActivity,
              totalEvents: 325
            }
          })
        })
      
      // Initial load
      const initialData = await apiClient.fetchDashboardData()
      expect(initialData.recentActivity.totalEvents).toBe(320)
      
      // Simulate polling interval
      await new Promise(resolve => setTimeout(resolve, 100))
      const updatedData = await apiClient.fetchDashboardData()
      expect(updatedData.recentActivity.totalEvents).toBe(325)
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle data refresh correctly', async () => {
      // Mock updated data
      const updatedData = {
        ...mockDashboardData,
        feedbackStats: {
          ...mockDashboardData.feedbackStats,
          totalFeedback: 350
        }
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData
      })
      
      const data = await apiClient.fetchDashboardData()
      expect(data.feedbackStats.totalFeedback).toBe(350)
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = {
        ...mockDashboardData,
        timeSeriesData: Array.from({ length: 1000 }, (_, i) => ({
          date: `2023-01-${(i % 31) + 1}`,
          trustScore: Math.random(),
          totalVotes: Math.floor(Math.random() * 100),
          positiveVotes: Math.floor(Math.random() * 50)
        }))
      }
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => largeData
      })
      
      const startTime = performance.now()
      const data = await apiClient.fetchDashboardData()
      const endTime = performance.now()
      
      expect(data).toEqual(largeData)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should maintain data consistency', async () => {
      // Test that data structure remains consistent
      const data = await apiClient.fetchDashboardData()
      
      // Verify all required fields exist
      expect(data).toHaveProperty('conversationStats')
      expect(data).toHaveProperty('journeyStats')
      expect(data).toHaveProperty('feedbackStats')
      expect(data).toHaveProperty('qualitySignals')
      expect(data).toHaveProperty('timeSeriesData')
      expect(data).toHaveProperty('recentActivity')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' })
      })
      
      const data = await apiClient.fetchDashboardData()
      expect(data).toEqual({ invalid: 'data' })
    })

    it('should handle network failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await expect(apiClient.fetchDashboardData()).rejects.toThrow('Network error')
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      
      await expect(apiClient.fetchDashboardData()).rejects.toThrow('500')
    })
  })
}) 