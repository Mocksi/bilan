import { useState, useEffect } from 'react'
import { DashboardData, VoteData, VoteAnalytics, VoteFilterState } from './types'
import { TimeRange } from '@/components/TimeRangeSelector'
import { formatDateForAPI, getDateRange, getPreviousDateRange } from './time-utils'

export interface DashboardDataWithComparison extends DashboardData {
  comparison?: {
    previousPeriod: DashboardData
    timeRange: TimeRange
  }
}

export class ApiClient {
  private baseUrl: string
  private abortController: AbortController | null = null

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch dashboard data from the API with optional time range
   */
  async fetchDashboardData(timeRange: TimeRange = '7d', includeComparison: boolean = false): Promise<DashboardDataWithComparison> {
    // Cancel any pending requests
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const { start, end } = getDateRange(timeRange)
      const params = new URLSearchParams({
        start: formatDateForAPI(start),
        end: formatDateForAPI(end),
        range: timeRange
      })

      const response = await fetch(`${this.baseUrl}/api/dashboard?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as DashboardData

      // Fetch comparison data if requested
      if (includeComparison) {
        const previousPeriodData = await this.fetchPreviousPeriodData(timeRange)
        return {
          ...data,
          comparison: {
            previousPeriod: previousPeriodData,
            timeRange
          }
        }
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled')
        }
        throw new Error(`Failed to fetch dashboard data: ${error.message}`)
      }
      throw new Error('Failed to fetch dashboard data: Unknown error')
    }
  }

  /**
   * Fetch votes data with filtering and pagination
   */
  async fetchVotes(
    filters: Partial<VoteFilterState> = {},
    page: number = 1,
    limit: number = 50,
    timeRange: TimeRange = '7d'
  ): Promise<{ votes: VoteData[]; total: number; page: number; limit: number }> {
    const { start, end } = getDateRange(timeRange)
    const params = new URLSearchParams({
      start: formatDateForAPI(start),
      end: formatDateForAPI(end),
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      )
    })

    const response = await fetch(`${this.baseUrl}/api/votes?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch votes: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch vote analytics data
   */
  async fetchVoteAnalytics(timeRange: TimeRange = '7d'): Promise<VoteAnalytics> {
    const { start, end } = getDateRange(timeRange)
    const params = new URLSearchParams({
      start: formatDateForAPI(start),
      end: formatDateForAPI(end),
      range: timeRange
    })

    const response = await fetch(`${this.baseUrl}/api/votes/analytics?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch vote analytics: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Export votes data
   */
  async exportVotes(
    filters: Partial<VoteFilterState> = {},
    timeRange: TimeRange = '7d',
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const { start, end } = getDateRange(timeRange)
    const params = new URLSearchParams({
      start: formatDateForAPI(start),
      end: formatDateForAPI(end),
      format,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      )
    })

    const response = await fetch(`${this.baseUrl}/api/votes/export?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to export votes: ${response.status} ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * Fetch data for the previous period for comparison
   */
  private async fetchPreviousPeriodData(timeRange: TimeRange): Promise<DashboardData> {
    const { start, end } = getPreviousDateRange(timeRange)
    const params = new URLSearchParams({
      start: formatDateForAPI(start),
      end: formatDateForAPI(end),
      range: timeRange
    })

    // Create independent AbortController for comparison request
    const comparisonController = new AbortController()

    const response = await fetch(`${this.baseUrl}/api/dashboard?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: comparisonController.signal,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data as DashboardData
  }

  /**
   * Check if the API is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Cancel any pending requests
   */
  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

// Default API client instance
export const apiClient = new ApiClient()

// Custom hook for dashboard data fetching with time range support
export function useDashboardData(timeRange: TimeRange = '7d', includeComparison: boolean = false) {
  const [data, setData] = useState<DashboardDataWithComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (range: TimeRange = timeRange, comparison: boolean = includeComparison) => {
    try {
      setLoading(true)
      setError(null)
      const dashboardData = await apiClient.fetchDashboardData(range, comparison)
      setData(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData(timeRange, includeComparison)
  }

  // Automatically fetch data when the hook is first used or when timeRange changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const dashboardData = await apiClient.fetchDashboardData(timeRange, includeComparison)
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [timeRange, includeComparison])

  return { data, loading, error, refresh, fetchData }
}

// Custom hook for votes data fetching
export function useVoteAnalytics(timeRange: TimeRange = '7d') {
  const [data, setData] = useState<VoteAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (range: TimeRange = timeRange) => {
    try {
      setLoading(true)
      setError(null)
      const analytics = await apiClient.fetchVoteAnalytics(range)
      setData(analytics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vote analytics')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData(timeRange)
  }

  useEffect(() => {
    fetchData(timeRange)
  }, [timeRange])

  return { data, loading, error, refresh, fetchData }
}

// Custom hook for votes data fetching with filtering
export function useVotes(
  filters: Partial<VoteFilterState> = {},
  page: number = 1,
  limit: number = 50,
  timeRange: TimeRange = '7d'
) {
  const [data, setData] = useState<{ votes: VoteData[]; total: number; page: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const votes = await apiClient.fetchVotes(filters, page, limit, timeRange)
      setData(votes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch votes')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [filters, page, limit, timeRange])

  return { data, loading, error, refresh, fetchData }
} 