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
 * Comprehensive vote data structure for votes analytics page
 */
export interface VoteData {
  id: string
  promptId: string
  userId: string
  value: number // -1 for negative, 1 for positive
  comment?: string
  timestamp: number
  metadata?: {
    promptText?: string
    aiOutput?: string
    responseTime?: number
    model?: string
    journey?: string
    step?: string
    sessionId?: string
    [key: string]: any
  }
}

/**
 * Vote analytics data structure
 */
export interface VoteAnalytics {
  overview: {
    totalVotes: number
    positiveVotes: number
    negativeVotes: number
    positiveRate: number
    averageRating: number
    commentsCount: number
    uniqueUsers: number
    uniquePrompts: number
  }
  trends: {
    daily: {
      date: string
      totalVotes: number
      positiveVotes: number
      negativeVotes: number
      positiveRate: number
    }[]
    hourly: {
      hour: number
      totalVotes: number
      positiveVotes: number
      negativeVotes: number
      positiveRate: number
    }[]
  }
  userBehavior: {
    topUsers: {
      userId: string
      totalVotes: number
      positiveVotes: number
      negativeVotes: number
      positiveRate: number
      lastActivity: number
    }[]
    votingPatterns: {
      averageVotesPerUser: number
      medianVotesPerUser: number
      powerUsers: number // Users with >10 votes
      oneTimeVoters: number // Users with only 1 vote
    }
  }
  promptPerformance: {
    topPrompts: {
      promptId: string
      promptText?: string
      totalVotes: number
      positiveVotes: number
      negativeVotes: number
      positiveRate: number
      averageResponseTime?: number
    }[]
    performanceMetrics: {
      averagePositiveRate: number
      bestPerformingPrompt: string
      worstPerformingPrompt: string
      promptsWithoutVotes: number
    }
  }
  commentAnalysis: {
    totalComments: number
    averageCommentLength: number
    topComments: {
      comment: string
      vote: number
      timestamp: number
      userId: string
    }[]
    sentimentAnalysis: {
      positive: number
      negative: number
      neutral: number
    }
    commonThemes: {
      theme: string
      count: number
      sentiment: 'positive' | 'negative' | 'neutral'
    }[]
  }
}

/**
 * Vote filter state
 */
export interface VoteFilterState {
  search: string
  rating: 'all' | 'positive' | 'negative'
  user: string
  prompt: string
  timeRange: string
  hasComment: boolean | null
  sortBy: 'timestamp' | 'rating' | 'user' | 'prompt'
  sortOrder: 'asc' | 'desc'
}

/**
 * Vote export format
 */
export interface VoteExport {
  id: string
  promptId: string
  userId: string
  rating: 'positive' | 'negative'
  value: number
  comment?: string
  timestamp: string
  date: string
  promptText?: string
  aiOutput?: string
  responseTime?: number
  model?: string
  journey?: string
  step?: string
  sessionId?: string
}

/**
 * Summary of recent conversation activity
 */
export interface ConversationSummary {
  promptId: string
  userId: string
  outcome: 'positive' | 'negative'
  feedbackCount: number
  lastActivity: number
  // Optional fields for conversation context
  promptText?: string
  aiOutput?: string
  comment?: string
  journeyName?: string
  journeyStep?: string
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