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

/**
 * Conversation message structure
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Comprehensive conversation data structure
 */
export interface ConversationData {
  id: string
  userId: string
  messages: ConversationMessage[]
  startTime: number
  endTime?: number
  totalMessages: number
  averageResponseTime: number
  satisfactionScore?: number
  tags: string[]
  metadata: Record<string, any>
}

/**
 * Conversation analytics data structure
 */
export interface ConversationAnalytics {
  overview: {
    totalConversations: number
    activeConversations: number
    averageLength: number
    averageResponseTime: number
    satisfactionRate: number
    completionRate: number
    uniqueUsers: number
    totalMessages: number
  }
  trends: {
    daily: {
      date: string
      conversationCount: number
      averageLength: number
      averageResponseTime: number
      completionRate: number
    }[]
    hourly: {
      hour: number
      conversationCount: number
      averageResponseTime: number
      activeConversations: number
    }[]
  }
  userBehavior: {
    topUsers: {
      userId: string
      conversationCount: number
      averageLength: number
      totalMessages: number
      lastActivity: number
    }[]
    engagementMetrics: {
      averageConversationsPerUser: number
      medianConversationsPerUser: number
      powerUsers: number // Users with >5 conversations
      oneTimeUsers: number // Users with only 1 conversation
    }
  }
  topicAnalysis: {
    topTopics: {
      topic: string
      count: number
      percentage: number
      averageLength: number
      satisfactionScore: number
    }[]
    topicTrends: {
      topic: string
      dailyData: {
        date: string
        count: number
      }[]
    }[]
  }
  performanceMetrics: {
    responseTimeDistribution: {
      range: string
      count: number
      percentage: number
    }[]
    lengthDistribution: {
      range: string
      count: number
      percentage: number
    }[]
    satisfactionDistribution: {
      score: number
      count: number
      percentage: number
    }[]
  }
  conversationFlow: {
    averageMessagesPerConversation: number
    dropoffPoints: {
      messageNumber: number
      dropoffRate: number
      count: number
    }[]
    completionFunnels: {
      stage: string
      count: number
      percentage: number
    }[]
  }
}

/**
 * Conversation filter state
 */
export interface ConversationFilterState {
  search: string
  userId: string
  minMessages: number | null
  maxMessages: number | null
  satisfactionScore: number | null
  tags: string[]
  startDate: Date | null
  endDate: Date | null
  status: 'all' | 'active' | 'completed'
  sortBy: 'startTime' | 'endTime' | 'totalMessages' | 'averageResponseTime' | 'satisfactionScore'
  sortOrder: 'asc' | 'desc'
}

/**
 * Conversation export format
 */
export interface ConversationExport {
  id: string
  userId: string
  startTime: string
  endTime?: string
  totalMessages: number
  averageResponseTime: number
  satisfactionScore?: number
  tags: string[]
  status: 'active' | 'completed'
  messages: {
    role: string
    content: string
    timestamp: string
  }[]
}

/**
 * Journey step structure
 */
export interface JourneyStep {
  id: string
  name: string
  type: 'form' | 'action' | 'decision' | 'endpoint'
  order: number
  isRequired: boolean
  completionRate: number
  averageTimeSpent: number
  dropoffRate: number
  metadata?: Record<string, any>
}

/**
 * Journey data structure
 */
export interface JourneyData {
  id: string
  name: string
  description?: string
  userId: string
  steps: JourneyStep[]
  startTime: number
  endTime?: number
  currentStepId?: string
  completedSteps: string[]
  status: 'active' | 'completed' | 'abandoned'
  completionRate: number
  totalTimeSpent: number
  satisfactionScore?: number
  tags: string[]
  metadata: Record<string, any>
}

/**
 * Journey analytics data structure
 */
export interface JourneyAnalytics {
  overview: {
    totalJourneys: number
    activeJourneys: number
    completedJourneys: number
    abandonedJourneys: number
    averageCompletionRate: number
    averageTimeToComplete: number
    uniqueUsers: number
    totalSteps: number
  }
  performance: {
    topPerformingJourneys: {
      journeyId: string
      name: string
      completionRate: number
      averageTime: number
      totalUsers: number
    }[]
    bottleneckSteps: {
      stepId: string
      stepName: string
      journeyName: string
      dropoffRate: number
      averageTimeSpent: number
    }[]
    conversionFunnel: {
      stepId: string
      stepName: string
      totalUsers: number
      completedUsers: number
      dropoffUsers: number
      conversionRate: number
    }[]
  }
  trends: {
    daily: {
      date: string
      totalJourneys: number
      completedJourneys: number
      abandonedJourneys: number
      averageCompletionRate: number
      averageTimeToComplete: number
    }[]
    hourly: {
      hour: number
      totalJourneys: number
      completedJourneys: number
      averageCompletionRate: number
    }[]
  }
  userBehavior: {
    topUsers: {
      userId: string
      totalJourneys: number
      completedJourneys: number
      averageCompletionRate: number
      averageTimeToComplete: number
      lastActivity: number
    }[]
    engagementMetrics: {
      averageJourneysPerUser: number
      medianJourneysPerUser: number
      powerUsers: number // Users with >3 journeys
      oneTimeUsers: number // Users with only 1 journey
    }
  }
  stepAnalysis: {
    stepPerformance: {
      stepId: string
      stepName: string
      journeyName: string
      totalAttempts: number
      completions: number
      abandonments: number
      completionRate: number
      averageTimeSpent: number
      commonErrors: string[]
    }[]
    pathAnalysis: {
      fromStep: string
      toStep: string
      transitionRate: number
      averageTransitionTime: number
      userCount: number
    }[]
  }
  satisfactionAnalysis: {
    overallSatisfaction: number
    satisfactionByJourney: {
      journeyId: string
      journeyName: string
      averageSatisfaction: number
      responseCount: number
    }[]
    satisfactionByStep: {
      stepId: string
      stepName: string
      averageSatisfaction: number
      responseCount: number
    }[]
  }
}

/**
 * Journey filter state
 */
export interface JourneyFilterState {
  search: string
  userId: string
  journeyName: string
  status: 'all' | 'active' | 'completed' | 'abandoned'
  minSteps: number | null
  maxSteps: number | null
  minCompletionRate: number | null
  satisfactionScore: number | null
  tags: string[]
  startDate: Date | null
  endDate: Date | null
  sortBy: 'startTime' | 'endTime' | 'completionRate' | 'totalTimeSpent' | 'satisfactionScore'
  sortOrder: 'asc' | 'desc'
}

/**
 * Journey export format
 */
export interface JourneyExport {
  id: string
  name: string
  description?: string
  userId: string
  startTime: string
  endTime?: string
  status: 'active' | 'completed' | 'abandoned'
  completionRate: number
  totalTimeSpent: number
  satisfactionScore?: number
  tags: string[]
  steps: {
    id: string
    name: string
    type: string
    order: number
    isRequired: boolean
    completed: boolean
    timeSpent?: number
  }[]
}