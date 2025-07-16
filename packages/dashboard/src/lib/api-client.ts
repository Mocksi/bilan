import { useState, useEffect } from 'react'
import { DashboardData } from './types'
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