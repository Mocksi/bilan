import { useState, useEffect } from 'react'
import { DashboardData } from './types'

export class ApiClient {
  private baseUrl: string
  private abortController: AbortController | null = null

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch dashboard data from the API
   */
  async fetchDashboardData(): Promise<DashboardData> {
    // Cancel any pending requests
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.baseUrl}/api/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data as DashboardData
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

// Custom hook for dashboard data fetching
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const dashboardData = await apiClient.fetchDashboardData()
      setData(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData()
  }

  // Automatically fetch data when the hook is first used
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const dashboardData = await apiClient.fetchDashboardData()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  return { data, loading, error, refresh, fetchData }
} 