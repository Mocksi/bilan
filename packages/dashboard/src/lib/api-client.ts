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
  JourneyFilterState
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
        signal: abortController.signal,
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
      timeRange: timeRange.toString()
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
    
    // Transform the events into VoteData format with improved ID generation
    const votes: VoteData[] = data.events.map((event: any, index: number) => ({
      id: `${event.userId}-${event.promptId}-${event.timestamp}-${index}-${Math.random().toString(36).substring(2, 8)}`,
      promptId: event.promptId,
      userId: event.userId,
      value: event.value,
      rating: event.value > 0 ? 'positive' : 'negative',
      comment: event.comment,
      timestamp: event.timestamp,
      date: new Date(event.timestamp).toISOString().split('T')[0],
      promptText: event.promptText,
      aiOutput: event.aiOutput,
      responseTime: event.responseTime,
      model: event.modelUsed,
      metadata: event.metadata
    }))

    return {
      votes,
      total: data.total,
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
    // Mock implementation - API endpoint doesn't exist yet
    return {
      overview: {
        totalVotes: 0,
        positiveVotes: 0,
        negativeVotes: 0,
        positiveRate: 0,
        averageRating: 0,
        commentsCount: 0,
        uniqueUsers: 0,
        uniquePrompts: 0
      },
      trends: {
        daily: [],
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          totalVotes: 0,
          positiveVotes: 0,
          negativeVotes: 0,
          positiveRate: 0
        }))
      },
      userBehavior: {
        topUsers: [],
        votingPatterns: {
          averageVotesPerUser: 0,
          medianVotesPerUser: 0,
          powerUsers: 0,
          oneTimeVoters: 0
        }
      },
      promptPerformance: {
        topPrompts: [],
        performanceMetrics: {
          averagePositiveRate: 0,
          bestPerformingPrompt: '',
          worstPerformingPrompt: '',
          promptsWithoutVotes: 0
        }
      },
      commentAnalysis: {
        totalComments: 0,
        averageCommentLength: 0,
        topComments: [],
        sentimentAnalysis: {
          positive: 0,
          negative: 0,
          neutral: 0
        },
        commonThemes: []
      }
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

// Conversation API Functions

/**
 * Fetch conversation analytics data
 */
export async function fetchConversationAnalytics(timeRange: string = '30d'): Promise<ConversationAnalytics> {
  // Mock implementation - API endpoint doesn't exist yet
  return {
    overview: {
      totalConversations: 0,
      activeConversations: 0,
      averageLength: 0,
      averageResponseTime: 0,
      satisfactionRate: 0,
      completionRate: 0,
      uniqueUsers: 0,
      totalMessages: 0
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
        averageConversationsPerUser: 0,
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
      averageMessagesPerConversation: 0,
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
  // No real conversation data exists - the server only tracks individual votes
  // The "conversations" count in dashboard data is actually unique prompts, not real conversations
  return {
    conversations: [],
    total: 0,
    page,
    totalPages: 0
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
  // Mock implementation - API endpoint doesn't exist yet
  return {
    overview: {
      totalJourneys: 0,
      activeJourneys: 0,
      completedJourneys: 0,
      abandonedJourneys: 0,
      averageCompletionRate: 0,
      averageTimeToComplete: 0,
      uniqueUsers: 0,
      totalSteps: 0
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
        averageJourneysPerUser: 0,
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
  // No real journey data exists - the server only tracks individual votes
  // Journey data would need to be explicitly tracked through the SDK's journey tracking methods
  return {
    journeys: [],
    total: 0,
    page,
    totalPages: 0
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