/**
 * Dashboard data structure matching the server analytics processor
 */
export interface DashboardData {
  conversationStats: {
    totalConversations: number
    successRate: number
    averageMessages: number
    completionRate: number
  }
  journeyStats: {
    totalJourneys: number
    completionRate: number
    popularJourneys: { name: string; count: number }[]
  }
  feedbackStats: {
    totalFeedback: number
    positiveRate: number
    recentTrend: 'improving' | 'declining' | 'stable'
    topComments: string[]
  }
  recentActivity: {
    conversations: ConversationSummary[]
    totalEvents: number
  }
}

/**
 * Summary of recent conversation activity
 */
export interface ConversationSummary {
  promptId: string
  userId: string
  lastActivity: number
  feedbackCount: number
  outcome: 'positive' | 'negative'
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

/**
 * Loading state for dashboard components
 */
export interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  refreshInterval: number
  maxRetries: number
  retryDelay: number
  apiBaseUrl: string
} 