/**
 * Dashboard data structure matching the server analytics processor
 */
export interface DashboardData {
  conversationStats: {
    totalConversations: number
    successRate: number | null // null when we don't have real conversation data
    averageMessages: number | null
    completionRate: number | null
  }
  journeyStats: {
    totalJourneys: number | null // null when we don't have real journey data
    completionRate: number | null
    popularJourneys: { name: string; count: number; completionRate: number }[]
  }
  feedbackStats: {
    totalFeedback: number
    positiveRate: number
    recentTrend: 'improving' | 'declining' | 'stable'
    topComments: string[]
  }
  qualitySignals: {
    positive: number
    negative: number
    regenerations: number // We don't have this data yet
    frustration: number // We don't have this data yet
  }
  timeSeriesData: {
    date: string
    trustScore: number
    totalVotes: number
    positiveVotes: number
  }[]
  recentActivity: {
    conversations: ConversationSummary[] // empty when we don't have real conversations
    recentVotes: { 
      promptId: string; 
      userId: string; 
      value: number; 
      timestamp: number;
      comment?: string;
      metadata?: any;
    }[]
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
 * Error response structure
 */
export interface ErrorResponse {
  error: {
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