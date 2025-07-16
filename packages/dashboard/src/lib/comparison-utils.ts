import { TrendDirection } from '@/components/TrendIndicator'
import { DashboardData } from '@/lib/types'

export interface ComparisonResult {
  current: number
  previous: number
  change: number
  percentChange: number
  trend: TrendDirection
}

export const calculateComparison = (current: number, previous: number): ComparisonResult => {
  const change = current - previous
  const percentChange = previous !== 0 ? ((change / previous) * 100) : 0
  
  let trend: TrendDirection = 'stable'
  if (Math.abs(percentChange) >= 5) {
    trend = percentChange > 0 ? 'improving' : 'declining'
  }
  
  return {
    current,
    previous,
    change,
    percentChange,
    trend
  }
}

export const formatPercentChange = (percentChange: number): string => {
  const sign = percentChange >= 0 ? '+' : ''
  return `${sign}${percentChange.toFixed(1)}%`
}

export const formatAbsoluteChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change}`
}

export interface MetricComparison {
  averageMessages: ComparisonResult
  totalVotes: ComparisonResult
  positiveRate: ComparisonResult
  totalConversations: ComparisonResult
}

export const calculateMetricComparisons = (
  currentData: DashboardData,
  previousData: DashboardData
): MetricComparison => {
  return {
    averageMessages: calculateComparison(
      currentData.conversationStats.averageMessages || 0,
      previousData.conversationStats.averageMessages || 0
    ),
    totalVotes: calculateComparison(
      currentData.feedbackStats.totalFeedback,
      previousData.feedbackStats.totalFeedback
    ),
    positiveRate: calculateComparison(
      currentData.feedbackStats.positiveRate,
      previousData.feedbackStats.positiveRate
    ),
    totalConversations: calculateComparison(
      currentData.conversationStats.totalConversations,
      previousData.conversationStats.totalConversations
    )
  }
}

export const getTrendFromRecentTrend = (recentTrend: 'improving' | 'declining' | 'stable'): TrendDirection => {
  return recentTrend
} 