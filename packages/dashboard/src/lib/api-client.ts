import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  DashboardData, 
  VoteData, 
  VoteAnalytics, 
  VoteFilterState,
  ConversationData,
  ConversationAnalytics,
  ConversationFilterState,
  JourneyData,
  JourneyAnalytics,
  JourneyFilterState,
  OverviewAnalytics,
  RecentEventsResponse,
  Event,
  TurnData,
  TurnAnalytics
} from './types'
import { TimeRange } from '@/components/TimeRangeSelector'
import { formatDateForAPI, getDateRange, getPreviousDateRange } from './time-utils'

// API Configuration
const API_BASE_URL = process.env.BILAN_PUBLIC_API_BASE_URL || 'http://localhost:3002'

export interface DashboardDataWithComparison extends DashboardData {
  comparison?: {
    previousPeriod: DashboardData
    timeRange: TimeRange
  }
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch dashboard data from the API with optional time range
   */
  async fetchDashboardData(timeRange: TimeRange = '30d', includeComparison: boolean = false): Promise<DashboardDataWithComparison> {
    // Create a new abort controller for this specific request
    const abortController = new AbortController()

    try {
      // Fetch data from the server's dashboard endpoint which already has journey data
      const params = new URLSearchParams({
        range: timeRange
      })
      
      const response = await fetch(`${this.baseUrl}/api/dashboard?${params}`)
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`)
      }
      
      const serverData = await response.json()
      
             // Also fetch vote analytics and overview for additional data
       const [voteData, overviewData] = await Promise.all([
         this.fetchVoteAnalytics(timeRange),
         this.fetchOverviewAnalytics(timeRange)
       ])
      
      // Transform the server data to match the dashboard's expected format
      const data: DashboardData = {
         feedbackStats: {
           totalFeedback: voteData.overview.totalVotes,
           positiveRate: voteData.overview.positiveRate,
           recentTrend: voteData.overview.positiveRate >= 0.7 ? 'improving' : 
                       voteData.overview.positiveRate >= 0.5 ? 'stable' : 'declining',
           topComments: []
         },
         qualitySignals: {
           positive: voteData.overview.positiveVotes,
           negative: voteData.overview.negativeVotes,
           regenerations: 0, // We don't have this data yet
           frustration: 0 // We don't have this data yet
         },
         timeSeriesData: this.calculateTimeSeriesData(voteData),
         recentActivity: {
           conversations: [], // Server doesn't provide this yet
           recentVotes: (serverData.recentActivity || [])
             .filter((activity: any) => activity.type === 'vote')
             .slice(0, 10)
             .map((activity: any, index: number) => ({
               promptId: `prompt_${index}`,
               userId: 'unknown',
               value: activity.sentiment === 'positive' ? 1 : activity.sentiment === 'negative' ? -1 : 0,
               timestamp: activity.timestamp,
               comment: activity.summary.includes('commented') ? activity.summary : undefined,
               metadata: { summary: activity.summary }
             })),
           totalEvents: overviewData.totalEvents
         },
         conversationStats: serverData.conversationStats,
         journeyStats: serverData.journeyStats
       }

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
   * Calculate time series data from vote analytics for trust score chart
   */
  private calculateTimeSeriesData(voteData: VoteAnalytics): DashboardData['timeSeriesData'] {
    // Use daily trends data to create time series
    return voteData.trends.daily.map(day => ({
      date: day.date,
      trustScore: day.positiveRate / 100, // Convert percentage to decimal (0-1 range) for chart
      totalVotes: day.totalVotes,
      positiveVotes: day.positiveVotes
    }))
  }

  /**
   * Fetch votes data with filtering and pagination
   * @param filters - Partial filters for vote data (search, rating, user, prompt, etc.)
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 50)
   * @param timeRange - Time range for data filtering (default: '30d')
   * @returns Promise resolving to votes data with pagination info
   */
  async fetchVotes(
    filters: Partial<VoteFilterState> = {},
    page: number = 1,
    limit: number = 50,
    timeRange: TimeRange = '30d'
  ): Promise<{ votes: VoteData[]; total: number; page: number; limit: number }> {
    // Create AbortController for request cancellation
    const abortController = new AbortController()
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
      timeRange: timeRange.toString(),
      eventType: 'vote_cast'  // Only fetch vote events
    })

    const response = await fetch(`${this.baseUrl}/api/events?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch votes: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // API now returns only vote events, so no need to filter
    const voteEvents = data.events
    
    const votes: VoteData[] = voteEvents.map((event: any, index: number) => ({
      id: event.event_id || `vote-${event.timestamp}-${index}`,
      promptId: event.properties.promptId || event.event_id,
      userId: event.user_id,
      value: event.properties.value,
      rating: event.properties.value > 0 ? 'positive' : 'negative',
      comment: event.properties.comment || '',
      timestamp: event.timestamp,
      date: new Date(event.timestamp).toISOString().split('T')[0],
      promptText: event.prompt_text || '',
      aiOutput: event.ai_response || '',
      responseTime: event.properties.responseTime || 0,
      model: event.properties.model || '',
      metadata: event.properties
    }))

    // API now returns filtered total count of vote events
    return {
      votes,
      total: data.total, // Now correctly represents total vote count
      page,
      limit
    }
  }

  /**
   * Fetch vote analytics data including overview, trends, user behavior, and prompt performance
   * @param timeRange - Time range for analytics data (default: '30d')
   * @returns Promise resolving to comprehensive vote analytics data
   */
  async fetchVoteAnalytics(timeRange: TimeRange = '30d'): Promise<VoteAnalytics> {
    const abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        timeRange: timeRange
      })

      const response = await fetch(`${this.baseUrl}/api/analytics/votes?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled')
        }
        throw new Error(`Failed to fetch vote analytics: ${error.message}`)
      }
      throw new Error('Failed to fetch vote analytics: Unknown error')
    }
  }

  /**
   * Export votes data to CSV or JSON format
   * @param filters - Partial filters for vote data (search, rating, user, prompt, etc.)
   * @param timeRange - Time range for exported data (default: '30d')
   * @param format - Export format, either 'csv' or 'json' (default: 'csv')
   * @returns Promise resolving to a Blob containing the exported data
   */
  async exportVotes(
    filters: Partial<VoteFilterState> = {},
    timeRange: TimeRange = '30d',
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    // Mock implementation - API endpoint doesn't exist yet
    const emptyData = format === 'csv' ? 'id,userId,promptId,value,timestamp,comment\n' : '[]'
    return new Blob([emptyData], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    })
  }

  /**
   * Fetch previous period data for comparison
   */
  async fetchPreviousPeriodData(timeRange: TimeRange): Promise<DashboardData> {
    const { start, end } = getPreviousDateRange(timeRange)
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
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch previous period data: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch overview analytics data from the new event-based API
   */
  async fetchOverviewAnalytics(timeRange: TimeRange = '30d'): Promise<OverviewAnalytics> {
    const abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        timeRange: timeRange
      })

      const response = await fetch(`${this.baseUrl}/api/analytics/overview?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled')
        }
        throw new Error(`Failed to fetch overview analytics: ${error.message}`)
      }
      throw new Error('Failed to fetch overview analytics: Unknown error')
    }
  }

  /**
   * Fetch recent events for activity feed
   */
  async fetchRecentEvents(limit: number = 20, timeRange: string = '30d'): Promise<RecentEventsResponse> {
    const abortController = new AbortController()

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0',
        timeRange: timeRange
      })

      const response = await fetch(`${this.baseUrl}/api/events?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled')
        }
        throw new Error(`Failed to fetch recent events: ${error.message}`)
      }
      throw new Error('Failed to fetch recent events: Unknown error')
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
   * Note: With the new implementation, each request has its own AbortController
   * so this method is no longer needed but kept for backward compatibility
   */
  cancelRequests(): void {
    // No-op since each request now manages its own cancellation
  }
}

// Default API client instance
export const apiClient = new ApiClient()

// Custom hook for dashboard data fetching with time range support
export function useDashboardData(timeRange: TimeRange = '30d', includeComparison: boolean = false) {
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
      // Only set error if it's not a cancellation error
      if (err instanceof Error && err.message !== 'Request was cancelled') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData(timeRange, includeComparison)
  }

  // Automatically fetch data when the hook is first used or when timeRange changes
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const dashboardData = await apiClient.fetchDashboardData(timeRange, includeComparison)
        
        // Only update state if component is still mounted
        if (isMounted) {
          setData(dashboardData)
        }
      } catch (err) {
        // Only set error if component is still mounted and it's not a cancellation error
        if (isMounted && err instanceof Error && err.message !== 'Request was cancelled') {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false
    }
  }, [timeRange, includeComparison])

  return { data, loading, error, refresh, fetchData }
}

// New hook for event-based overview analytics
export function useOverviewAnalytics(timeRange: TimeRange = '30d') {
  const [data, setData] = useState<OverviewAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (range: TimeRange = timeRange) => {
    try {
      setLoading(true)
      setError(null)
      const overviewData = await apiClient.fetchOverviewAnalytics(range)
      setData(overviewData)
    } catch (err) {
      // Only set error if it's not a cancellation error
      if (err instanceof Error && err.message !== 'Request was cancelled') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData(timeRange)
  }

  // Automatically fetch data when the hook is first used or when timeRange changes
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const overviewData = await apiClient.fetchOverviewAnalytics(timeRange)
        
        // Only update state if component is still mounted
        if (isMounted) {
          setData(overviewData)
        }
      } catch (err) {
        // Only set error if component is still mounted and it's not a cancellation error
        if (isMounted && err instanceof Error && err.message !== 'Request was cancelled') {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false
    }
  }, [timeRange])

  return { data, loading, error, refresh, fetchData }
}

// New hook for recent events
export function useRecentEvents(limit: number = 20) {
  const [data, setData] = useState<RecentEventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (eventLimit: number = limit) => {
    try {
      setLoading(true)
      setError(null)
      const eventsData = await apiClient.fetchRecentEvents(eventLimit)
      setData(eventsData)
    } catch (err) {
      // Only set error if it's not a cancellation error
      if (err instanceof Error && err.message !== 'Request was cancelled') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchData(limit)
  }

  // Automatically fetch data when the hook is first used or when limit changes
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const eventsData = await apiClient.fetchRecentEvents(limit)
        
        // Only update state if component is still mounted
        if (isMounted) {
          setData(eventsData)
        }
      } catch (err) {
        // Only set error if component is still mounted and it's not a cancellation error
        if (isMounted && err instanceof Error && err.message !== 'Request was cancelled') {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false
    }
  }, [limit])

  return { data, loading, error, refresh, fetchData }
}

// Custom hook for votes data fetching
export function useVoteAnalytics(timeRange: TimeRange = '30d') {
  const [data, setData] = useState<VoteAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async (range: TimeRange = timeRange) => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      const analytics = await apiClient.fetchVoteAnalytics(range)
      if (isMountedRef.current) {
        setData(analytics)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vote analytics')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refresh = () => {
    fetchData(timeRange)
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchData(timeRange)
    
    return () => {
      isMountedRef.current = false
    }
  }, [timeRange])

  return { data, loading, error, refresh, fetchData }
}

// Custom hook for votes data fetching with filtering
export function useVotes(
  filters: Partial<VoteFilterState> = {},
  page: number = 1,
  limit: number = 50,
  timeRange: TimeRange = '30d'
) {
  const [data, setData] = useState<{ votes: VoteData[]; total: number; page: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      const votes = await apiClient.fetchVotes(filters, page, limit, timeRange)
      if (isMountedRef.current) {
        setData(votes)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch votes')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refresh = () => {
    fetchData()
  }

  // Memoize filters to avoid unnecessary re-renders from property order differences
  const memoizedFilters = useMemo(() => filters, [
    filters.search,
    filters.rating, 
    filters.user,
    filters.prompt,
    filters.timeRange,
    filters.hasComment,
    filters.sortBy,
    filters.sortOrder
  ])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [memoizedFilters, page, limit, timeRange])

  return { data, loading, error, refresh, fetchData }
} 

// Turn API Functions

/**
 * Fetch turn events with filtering and pagination
 */
async function fetchTurns(
  filters: Partial<{ userId?: string; status?: string; conversationId?: string }> = {},
  page: number = 1,
  limit: number = 50,
  timeRange: TimeRange = '30d'
): Promise<{ turns: TurnData[]; total: number; page: number; limit: number }> {
  const abortController = new AbortController()
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: ((page - 1) * limit).toString(),
    timeRange: timeRange.toString(),
    eventType: 'turn_completed,turn_failed'  // Only fetch turn events
  })

  const response = await fetch(`${API_BASE_URL}/api/events?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch turns: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  
  const turnEvents = data.events
  
  const turns: TurnData[] = turnEvents.map((event: any, index: number) => ({
    id: `${event.user_id}-${event.event_id}-${index}`,
    userId: event.user_id,
    status: event.event_type === 'turn_completed' ? 'completed' : 'failed',
    promptText: event.properties.promptText || event.prompt_text || '',
    responseText: event.properties.responseText || event.ai_response || '',
    responseTime: event.properties.responseTime || event.properties.response_time || 0,
    timestamp: event.timestamp,
    conversationId: event.conversation_id || event.properties.conversationId,
    voteValue: event.properties.voteValue,
    model: event.properties.model || '',
    metadata: event.properties
  }))

  return {
    turns,
    total: data.total,
    page,
    limit
  }
}

/**
 * Fetch turn analytics data
 */
async function fetchTurnAnalytics(timeRange: TimeRange = '30d'): Promise<TurnAnalytics> {
  const abortController = new AbortController()

  try {
    const params = new URLSearchParams({
      timeRange: timeRange
    })

    const response = await fetch(`${API_BASE_URL}/api/analytics/turns?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch turn analytics: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch turn analytics:', error)
    // Return default analytics data
    return {
      overview: {
        totalTurns: 0,
        completedTurns: 0,
        failedTurns: 0,
        turnsWithFeedback: 0,
        averageResponseTime: 0,
        uniqueUsers: 0,
        successRate: 0
      },
      trends: {
        daily: [],
        hourly: []
      },
      userBehavior: {
        topUsers: []
      },
      performance: {
        responseTimeDistribution: [],
        errorTypes: []
      }
    }
  }
}

/**
 * Hook to fetch turns with pagination and filtering
 */
export function useTurns(
  filters: Partial<{ userId?: string; status?: string; conversationId?: string }> = {},
  page: number = 1,
  limit: number = 50,
  timeRange: TimeRange = '30d'
) {
  const [data, setData] = useState<{ turns: TurnData[]; total: number; page: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)])

  const fetchData = async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const turns = await fetchTurns(memoizedFilters, page, limit, timeRange)
      setData(turns)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch turns')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [memoizedFilters, page, limit, timeRange])

  return { data, loading, error, refresh: fetchData }
}

/**
 * Hook to fetch turn analytics
 */
export function useTurnAnalytics(timeRange: TimeRange = '30d') {
  const [data, setData] = useState<TurnAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const analytics = await fetchTurnAnalytics(timeRange)
        setData(analytics)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch turn analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange])

  return { data, loading, error }
}

// Conversation API Functions

/**
 * Fetch conversation analytics data
 */
export async function fetchConversationAnalytics(timeRange: string = '30d'): Promise<ConversationAnalytics> {
  // Get overview data and events to calculate conversation analytics
  const [overviewData, eventsData] = await Promise.all([
    apiClient.fetchOverviewAnalytics(timeRange as TimeRange),
    apiClient.fetchRecentEvents(1000, '365d') // Get more events for better analytics
  ])
  
  // Filter for conversation-related events
  const conversationEvents = eventsData.events.filter(event => 
    event.event_type === 'conversation_started' || 
    event.event_type === 'conversation_ended' || 
    event.event_type === 'turn_completed' ||
    event.event_type === 'turn_created'
  )
  
  const conversationStarted = conversationEvents.filter(e => e.event_type === 'conversation_started')
  const conversationEnded = conversationEvents.filter(e => e.event_type === 'conversation_ended')
  const turnEvents = conversationEvents.filter(e => e.event_type === 'turn_completed' || e.event_type === 'turn_created')
  
  const totalConversations = conversationStarted.length
  const completedConversations = conversationEnded.length
  const activeConversations = Math.max(0, totalConversations - completedConversations)
  
  // Calculate averages
  const averageLength = conversationEnded.length > 0 ? 
    conversationEnded.reduce((sum, event) => sum + (event.properties.messageCount || 0), 0) / conversationEnded.length : 0
  
  const averageResponseTime = turnEvents.length > 0 ?
    turnEvents.reduce((sum, event) => sum + (event.properties.responseTime || 0), 0) / turnEvents.length : 0
  
  const uniqueUsers = new Set(conversationEvents.map(e => e.user_id)).size
  const totalMessages = conversationEnded.reduce((sum, event) => sum + (event.properties.messageCount || 0), 0)
  
  return {
    overview: {
      totalConversations,
      activeConversations,
      averageLength,
      averageResponseTime,
      satisfactionRate: 0, // Would need vote data correlation
      completionRate: totalConversations > 0 ? (completedConversations / totalConversations) * 100 : 0,
      uniqueUsers,
      totalMessages
    },
    trends: {
      daily: [],
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        conversationCount: 0,
        averageResponseTime: 0,
        activeConversations: 0
      }))
    },
    userBehavior: {
      topUsers: [],
      engagementMetrics: {
        averageConversationsPerUser: uniqueUsers > 0 ? totalConversations / uniqueUsers : 0,
        medianConversationsPerUser: 0,
        powerUsers: 0,
        oneTimeUsers: 0
      }
    },
    topicAnalysis: {
      topTopics: [],
      topicTrends: []
    },
    performanceMetrics: {
      responseTimeDistribution: [],
      lengthDistribution: [],
      satisfactionDistribution: []
    },
    conversationFlow: {
      averageMessagesPerConversation: averageLength,
      dropoffPoints: [],
      completionFunnels: []
    }
  }
}

/**
 * Fetch conversations data with filtering and pagination
 */
export async function fetchConversations(
  filters: Partial<ConversationFilterState> = {},
  page: number = 1,
  limit: number = 50
): Promise<{ conversations: ConversationData[]; total: number; page: number; totalPages: number }> {
  // Get conversation events and reconstruct conversation data
  // Request all events (not just last 30 days) to avoid filtering out older conversations
  const eventsData = await apiClient.fetchRecentEvents(1000, '365d')
  
  // Filter for ONLY conversation events, not turn events
  const conversationEvents = eventsData.events.filter(event => 
    event.event_type === 'conversation_started' || 
    event.event_type === 'conversation_ended'
  )
  
  // Group events by conversation ID
  const conversationMap = new Map<string, any[]>()
  conversationEvents.forEach(event => {
    const conversationId = event.properties.conversationId
    if (conversationId) {
      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, [])
      }
      conversationMap.get(conversationId)!.push(event)
    }
  })
  
  // Also collect turn events for these conversations to get accurate stats
  const turnEvents = eventsData.events.filter(event => 
    (event.event_type === 'turn_completed' || event.event_type === 'turn_created') &&
    event.properties.conversationId
  )
  
  // Convert to conversation data format
  const conversations: ConversationData[] = Array.from(conversationMap.entries()).map(([id, events]) => {
    const startEvent = events.find(e => e.event_type === 'conversation_started')
    const endEvent = events.find(e => e.event_type === 'conversation_ended')
    
    // Get turn events for this specific conversation
    const conversationTurnEvents = turnEvents.filter(e => e.properties.conversationId === id)
    
    return {
      id,
      userId: startEvent?.user_id || events[0]?.user_id || '',
      messages: [], // Could be reconstructed from turn events if needed
      startTime: startEvent?.timestamp || events[0]?.timestamp || Date.now(),
      endTime: endEvent?.timestamp || undefined,
      totalMessages: endEvent?.properties?.messageCount || conversationTurnEvents.length || 0,
      averageResponseTime: conversationTurnEvents.length > 0 ? 
        conversationTurnEvents.reduce((sum, event) => sum + (event.properties.responseTime || 0), 0) / conversationTurnEvents.length : 0,
      tags: [],
      metadata: {
        status: endEvent ? 'completed' : 'active',
        context: startEvent?.properties?.context || 'unknown'
      }
    }
  })
  
  // Apply pagination
  const total = conversations.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const paginatedConversations = conversations.slice(startIndex, startIndex + limit)
  
  return {
    conversations: paginatedConversations,
    total,
    page,
    totalPages
  }
}

/**
 * Fetch a single conversation by ID
 */
export async function fetchConversation(id: string): Promise<ConversationData> {
  // Input validation
  if (!id || typeof id !== 'string') {
    throw new Error('Conversation ID is required and must be a non-empty string')
  }
  
  if (id.trim().length === 0) {
    throw new Error('Conversation ID cannot be empty or contain only whitespace')
  }
  
  // Basic format validation - should only contain alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id.trim())) {
    throw new Error('Conversation ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed')
  }
  
  // Encode the ID to safely handle any special characters and prevent injection
  const sanitizedId = id.trim()
  const encodedId = encodeURIComponent(sanitizedId)
  const response = await fetch(`${API_BASE_URL}/conversations/${encodedId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

/**
 * Export conversations to CSV or JSON format
 */
export async function exportConversations(
  filters: Partial<ConversationFilterState>,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'tags' && Array.isArray(value)) {
        value.forEach(tag => params.append('tags', tag))
      } else if (key === 'startDate' || key === 'endDate') {
        if (value instanceof Date) {
          params.append(key, value.toISOString())
        }
      } else {
        params.append(key, String(value))
      }
    }
  })
  
  params.append('format', format)
  
  const response = await fetch(`${API_BASE_URL}/conversations/export?${params}`)
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  
  return response.text()
}

// Conversation Hooks

/**
 * Hook for fetching conversation analytics
 */
export function useConversationAnalytics(timeRange: string = '7d') {
  const [data, setData] = useState<ConversationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      const analytics = await fetchConversationAnalytics(timeRange)
      if (isMountedRef.current) {
        setData(analytics)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch conversation analytics')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refresh = () => {
    fetchData()
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [timeRange])

  return { data, loading, error, refresh, fetchData }
}

/**
 * Hook for fetching conversations with filtering and pagination
 */
export function useConversations(
  filters: Partial<ConversationFilterState> = {},
  page: number = 1,
  limit: number = 50,
  timeRange: string = '30d'
) {
  const [data, setData] = useState<{ conversations: ConversationData[]; total: number; page: number; limit: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      
      // Use the actual API function that returns empty data
      // Include timeRange in the filters for consistency with other hooks
      const filtersWithTimeRange = { ...filters, timeRange }
      const result = await fetchConversations(filtersWithTimeRange, page, limit)
      
      if (isMountedRef.current) {
        setData({
          conversations: result.conversations,
          total: result.total,
          page: result.page,
          limit
        })
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [filters, page, limit, timeRange])

  return { data, loading, error, refresh: fetchData }
}



// Journey API Functions

/**
 * Fetch journey analytics data
 */
export async function fetchJourneyAnalytics(timeRange: string = '30d'): Promise<JourneyAnalytics> {
  // Get overview data and events to calculate journey analytics
  const [overviewData, eventsData] = await Promise.all([
    apiClient.fetchOverviewAnalytics(timeRange as TimeRange),
    apiClient.fetchRecentEvents(1000)
  ])
  
  // Filter for journey events
  const journeyEvents = eventsData.events.filter(event => event.event_type === 'journey_step')
  
  // Group by journey ID
  const journeyMap = new Map<string, any[]>()
  journeyEvents.forEach(event => {
    const journeyId = event.properties.journeyId
    if (journeyId) {
      if (!journeyMap.has(journeyId)) {
        journeyMap.set(journeyId, [])
      }
      journeyMap.get(journeyId)!.push(event)
    }
  })
  
  const totalJourneys = journeyMap.size
  const completedJourneys = Array.from(journeyMap.values()).filter(events => 
    events.some(e => e.properties.isCompleted)
  ).length
  
  const uniqueUsers = new Set(journeyEvents.map(e => e.user_id)).size
  const totalSteps = journeyEvents.length
  
  return {
    overview: {
      totalJourneys,
      activeJourneys: totalJourneys - completedJourneys,
      completedJourneys,
      abandonedJourneys: 0, // Would need specific abandonment events
      averageCompletionRate: totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0,
      averageTimeToComplete: 0, // Would need timestamp analysis
      uniqueUsers,
      totalSteps
    },
    performance: {
      topPerformingJourneys: [],
      bottleneckSteps: [],
      conversionFunnel: []
    },
    trends: {
      daily: [],
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        totalJourneys: 0,
        completedJourneys: 0,
        averageCompletionRate: 0
      }))
    },
    userBehavior: {
      topUsers: [],
      engagementMetrics: {
        averageJourneysPerUser: uniqueUsers > 0 ? totalJourneys / uniqueUsers : 0,
        medianJourneysPerUser: 0,
        powerUsers: 0,
        oneTimeUsers: 0
      }
    },
    stepAnalysis: {
      stepPerformance: [],
      pathAnalysis: []
    },
    satisfactionAnalysis: {
      overallSatisfaction: 0,
      satisfactionByJourney: [],
      satisfactionByStep: []
    }
  }
}

/**
 * Fetch journeys data with filtering and pagination
 */
export async function fetchJourneys(
  filters: Partial<JourneyFilterState> = {},
  page: number = 1,
  limit: number = 50
): Promise<{ journeys: JourneyData[]; total: number; page: number; totalPages: number }> {
  // Get journey events and reconstruct journey data
  const eventsData = await apiClient.fetchRecentEvents(1000)
  
  // Filter for journey events
  const journeyEvents = eventsData.events.filter(event => event.event_type === 'journey_step')
  
  // Group by journey ID
  const journeyMap = new Map<string, any[]>()
  journeyEvents.forEach(event => {
    const journeyId = event.properties.journeyId
    if (journeyId) {
      if (!journeyMap.has(journeyId)) {
        journeyMap.set(journeyId, [])
      }
      journeyMap.get(journeyId)!.push(event)
    }
  })
  
  // Convert to journey data format
  const journeys: JourneyData[] = Array.from(journeyMap.entries()).map(([id, events]) => {
    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]
    const completedSteps = events.filter(e => e.properties.isCompleted).length
    const totalSteps = firstEvent?.properties?.totalSteps || 5
    const isCompleted = events.some(e => e.properties.isCompleted)
    
    return {
      id,
      name: firstEvent?.properties?.journeyName || 'Unknown Journey',
      userId: firstEvent?.user_id || '',
      status: isCompleted ? 'completed' : 'active',
      steps: Array.from({ length: totalSteps }, (_, i) => ({
        id: `step_${i}`,
        name: `Step ${i + 1}`,
        type: 'action' as const,
        order: i,
        isRequired: true,
        completionRate: i < completedSteps ? 100 : 0,
        averageTimeSpent: 0,
        dropoffRate: 0,
        metadata: {
          completed: i < completedSteps,
          timestamp: events.find(e => e.properties.stepIndex === i)?.timestamp
        }
      })),
      completedSteps: Array.from({ length: completedSteps }, (_, i) => `step_${i}`),
      startTime: firstEvent?.timestamp || Date.now(),
      endTime: isCompleted ? lastEvent?.timestamp : undefined,
      completionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      totalTimeSpent: isCompleted && lastEvent && firstEvent ? 
        (lastEvent.timestamp - firstEvent.timestamp) / 1000 : 0,
      tags: [],
      metadata: {
        totalSteps,
        completedSteps,
        journeyName: firstEvent?.properties?.journeyName
      }
    }
  })
  
  // Apply pagination
  const total = journeys.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const paginatedJourneys = journeys.slice(startIndex, startIndex + limit)
  
  return {
    journeys: paginatedJourneys,
    total,
    page,
    totalPages
  }
}

/**
 * Fetch a single journey by ID
 */
export async function fetchJourney(id: string): Promise<JourneyData> {
  // Input validation
  if (!id || typeof id !== 'string') {
    throw new Error('Journey ID is required and must be a non-empty string')
  }
  
  if (id.trim().length === 0) {
    throw new Error('Journey ID cannot be empty or contain only whitespace')
  }
  
  // Basic format validation - should only contain alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id.trim())) {
    throw new Error('Journey ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed')
  }
  
  const sanitizedId = id.trim()
  const response = await fetch(`${API_BASE_URL}/journeys/${encodeURIComponent(sanitizedId)}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch journey: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

/**
 * Export journeys to CSV or JSON format
 */
export async function exportJourneys(
  filters: Partial<JourneyFilterState>,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'tags' && Array.isArray(value)) {
        value.forEach(tag => params.append('tags', tag))
      } else if (key === 'startDate' || key === 'endDate') {
        if (value instanceof Date) {
          params.append(key, value.toISOString())
        }
      } else {
        params.append(key, String(value))
      }
    }
  })
  
  params.append('format', format)
  
  const response = await fetch(`${API_BASE_URL}/journeys/export?${params}`)
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  
  return response.text()
}

// Journey Hooks

/**
 * Hook for fetching journey analytics
 */
export function useJourneyAnalytics(timeRange: string = '30d') {
  const [data, setData] = useState<JourneyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      const analytics = await fetchJourneyAnalytics(timeRange)
      if (isMountedRef.current) {
        setData(analytics)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch journey analytics')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refresh = () => {
    fetchData()
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [timeRange])

  return { data, loading, error, refresh, fetchData }
}

/**
 * Hook for fetching journeys with filtering and pagination
 */
export function useJourneys(
  filters: Partial<JourneyFilterState> = {},
  page: number = 1,
  limit: number = 50
) {
  const [data, setData] = useState<{
    journeys: JourneyData[]
    total: number
    page: number
    totalPages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true)
        setError(null)
      }
      const journeys = await fetchJourneys(filters, page, limit)
      if (isMountedRef.current) {
        setData(journeys)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch journeys')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refresh = () => {
    fetchData()
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [filters, page, limit])

  return { data, loading, error, refresh, fetchData }
} 