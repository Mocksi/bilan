import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ApiClient, useDashboardData } from '../api-client'
import { DashboardData } from '../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  let apiClient: ApiClient

  const mockDashboardData: DashboardData = {
    conversationStats: {
      totalConversations: 100,
      successRate: 0.85,
      averageMessages: 5.2,
      completionRate: 0.78
    },
    journeyStats: {
      totalJourneys: 50,
      completionRate: 0.92,
      popularJourneys: [
        { name: 'email-agent', count: 25, completionRate: 0.88 },
        { name: 'code-assistant', count: 20, completionRate: 0.95 }
      ]
    },
    feedbackStats: {
      totalFeedback: 200,
      positiveRate: 0.82,
      recentTrend: 'improving',
      topComments: ['Great response!', 'Very helpful']
    },
    qualitySignals: {
      positive: 164,
      negative: 36,
      regenerations: 12,
      frustration: 8
    },
    timeSeriesData: [
      { date: '2023-01-01', trustScore: 0.8, totalVotes: 100, positiveVotes: 80 },
      { date: '2023-01-02', trustScore: 0.85, totalVotes: 120, positiveVotes: 102 }
    ],
    recentActivity: {
      conversations: [],
      recentVotes: [
        { promptId: 'prompt-1', userId: 'user-1', value: 1, timestamp: 1640995200000 }
      ],
      totalEvents: 200
    }
  }

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3002')
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchDashboardData', () => {
    it('successfully fetches dashboard data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData
      })

      const result = await apiClient.fetchDashboardData()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/dashboard',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
      expect(result).toEqual(mockDashboardData)
    })

    it('handles API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(apiClient.fetchDashboardData()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      )
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.fetchDashboardData()).rejects.toThrow(
        'Failed to fetch dashboard data: Network error'
      )
    })

    it('handles abort errors', async () => {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(apiClient.fetchDashboardData()).rejects.toThrow(
        'Request was cancelled'
      )
    })

    it('handles unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error')

      await expect(apiClient.fetchDashboardData()).rejects.toThrow(
        'Failed to fetch dashboard data: Unknown error'
      )
    })

    it('includes abort signal in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData
      })

      await apiClient.fetchDashboardData()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/dashboard',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })

    it('cancels previous requests when new request is made', async () => {
      const abortSpy = vi.fn()
      
      // Mock AbortController
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      }
      
      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData
      })

      // Make first request
      const promise1 = apiClient.fetchDashboardData()
      
      // Make second request (should abort first)
      const promise2 = apiClient.fetchDashboardData()

      await Promise.all([promise1, promise2])

      expect(abortSpy).toHaveBeenCalled()
    })
  })

  describe('checkHealth', () => {
    it('returns true when health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const result = await apiClient.checkHealth()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/health',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
      expect(result).toBe(true)
    })

    it('returns false when health check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await apiClient.checkHealth()

      expect(result).toBe(false)
    })

    it('returns false when health check throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await apiClient.checkHealth()

      expect(result).toBe(false)
    })
  })

  describe('cancelRequests', () => {
    it('cancels pending requests', async () => {
      const abortSpy = vi.fn()
      
      // Mock AbortController
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      }
      
      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any)

      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      // Start a request
      const promise = apiClient.fetchDashboardData()
      
      // Cancel it
      apiClient.cancelRequests()

      expect(abortSpy).toHaveBeenCalled()
    })

    it('does nothing when no requests are pending', () => {
      // Should not throw
      expect(() => apiClient.cancelRequests()).not.toThrow()
    })
  })

  describe('constructor', () => {
    it('uses default base URL when none provided', () => {
      const client = new ApiClient()
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('uses provided base URL', () => {
      const client = new ApiClient('http://custom-url:8080')
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('uses environment variable when available', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://env-url:9000'
      
      const client = new ApiClient()
      expect(client).toBeInstanceOf(ApiClient)
      
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
    })
  })
})

describe('useDashboardData hook', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches data on mount', async () => {
    const mockDashboardData: DashboardData = {
      conversationStats: {
        totalConversations: 50,
        successRate: 0.9,
        averageMessages: 4.5,
        completionRate: 0.85
      },
      journeyStats: {
        totalJourneys: 25,
        completionRate: 0.88,
        popularJourneys: []
      },
      feedbackStats: {
        totalFeedback: 100,
        positiveRate: 0.8,
        recentTrend: 'stable',
        topComments: []
      },
      qualitySignals: {
        positive: 80,
        negative: 20,
        regenerations: 5,
        frustration: 3
      },
      timeSeriesData: [],
      recentActivity: {
        conversations: [],
        recentVotes: [],
        totalEvents: 100
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData
    })

    const { result } = renderHook(() => useDashboardData())

    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)

    // Wait for data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(mockDashboardData)
    expect(result.current.error).toBe(null)
  })

  it('handles fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    const { result } = renderHook(() => useDashboardData())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe('Failed to fetch dashboard data: API Error')
  })

  it('refreshes data when refresh is called', async () => {
    const mockData1 = { conversationStats: { totalConversations: 50 } }
    const mockData2 = { conversationStats: { totalConversations: 75 } }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData1
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData2
      })

    const { result } = renderHook(() => useDashboardData())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual(mockData1)

    // Refresh
    await act(async () => {
      result.current.refresh()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual(mockData2)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('provides fetchData function', async () => {
    const mockData = { conversationStats: { totalConversations: 100 } }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    })

    const { result } = renderHook(() => useDashboardData())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(typeof result.current.fetchData).toBe('function')
    
    // Test fetchData
    await act(async () => {
      await result.current.fetchData()
    })

    expect(result.current.data).toEqual(mockData)
  })

  it('sets loading state correctly during refresh', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversationStats: { totalConversations: 50 } })
    })

    const { result } = renderHook(() => useDashboardData())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)

    // Start refresh
    act(() => {
      result.current.refresh()
    })

    expect(result.current.loading).toBe(true)

    // Wait for refresh to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
  })

  it('clears error state on successful refresh', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Initial error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversationStats: { totalConversations: 50 } })
      })

    const { result } = renderHook(() => useDashboardData())

    // Wait for initial error
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.error).toBeTruthy()

    // Refresh successfully
    await act(async () => {
      result.current.refresh()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.error).toBe(null)
    expect(result.current.data).toBeTruthy()
  })
}) 