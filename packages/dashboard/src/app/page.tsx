'use client'

import { useEffect, useState } from 'react'
import { useDashboardData } from '@/lib/api-client'
import { DashboardData } from '@/lib/types'

export default function Dashboard() {
  const { data, loading, error, refresh } = useDashboardData()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date())
    }
  }, [data])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      case 'stable':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return '↗'
      case 'declining':
        return '↘'
      case 'stable':
        return '→'
      default:
        return '→'
    }
  }

  const handleRefresh = () => {
    refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bilan Analytics</h1>
              <p className="text-sm text-gray-600">Trust analytics for your AI-powered application</p>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Conversation Success Rate */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">💬</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversation Success Rate</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {(data.conversationStats.successRate * 100).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.conversationStats.totalConversations} total conversations
            </div>
          </div>

          {/* Journey Completion Rate */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">🚀</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Journey Completion</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {(data.journeyStats.completionRate * 100).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.journeyStats.totalJourneys} active journeys
            </div>
          </div>

          {/* Feedback Positive Rate */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">👍</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Positive Feedback</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {(data.feedbackStats.positiveRate * 100).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.feedbackStats.totalFeedback} total feedback
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">📈</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Trend</dt>
                  <dd className={`text-2xl font-semibold capitalize ${getTrendColor(data.feedbackStats.recentTrend)}`}>
                    {getTrendIcon(data.feedbackStats.recentTrend)} {data.feedbackStats.recentTrend}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Based on recent feedback
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Conversations */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.recentActivity.conversations.map((conversation, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{conversation.promptId}</div>
                        <div className="text-sm text-gray-500">{conversation.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          conversation.outcome === 'positive' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {conversation.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(conversation.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Popular Journeys & Top Comments */}
          <div className="space-y-6">
            {/* Popular Journeys */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Popular Journeys</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.journeyStats.popularJourneys.map((journey, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{journey.name}</div>
                      <div className="text-sm text-gray-500">{journey.count} events</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Comments */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Recent Comments</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {data.feedbackStats.topComments.map((comment, index) => (
                    <div key={index} className="text-sm text-gray-700 border-l-4 border-blue-200 pl-4">
                      "{comment}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 