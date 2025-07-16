'use client'

import { ConversationAnalytics } from '@/lib/types'
import StatsCard from '@/components/StatsCard'
import { Clock, MessageSquare, Users, CheckCircle, TrendingUp, Star } from 'lucide-react'

interface ConversationsOverviewProps {
  analytics: ConversationAnalytics
}

export function ConversationsOverview({ analytics }: ConversationsOverviewProps) {
  const { overview } = analytics

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Conversations"
          value={overview.totalConversations.toLocaleString()}
          trend={overview.totalConversations > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Active Conversations"
          value={overview.activeConversations.toLocaleString()}
          trend={overview.activeConversations > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Unique Users"
          value={overview.uniqueUsers.toLocaleString()}
          trend={overview.uniqueUsers > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Total Messages"
          value={overview.totalMessages.toLocaleString()}
          trend={overview.totalMessages > 0 ? 'up' : 'stable'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Average Length"
          value={`${overview.averageLength.toFixed(1)} msgs`}
          trend={overview.averageLength > 5 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Average Response Time"
          value={formatResponseTime(overview.averageResponseTime)}
          trend={overview.averageResponseTime < 2000 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Completion Rate"
          value={formatPercentage(overview.completionRate)}
          trend={overview.completionRate > 0.7 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Satisfaction Rate"
          value={formatPercentage(overview.satisfactionRate)}
          trend={overview.satisfactionRate > 0.8 ? 'up' : 'down'}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Engagement Quality</span>
              <span className={`text-sm font-medium ${
                overview.averageLength > 5 ? 'text-green-600' : 
                overview.averageLength > 3 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overview.averageLength > 5 ? 'High' : 
                 overview.averageLength > 3 ? 'Medium' : 'Low'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Performance</span>
              <span className={`text-sm font-medium ${
                overview.averageResponseTime < 2000 ? 'text-green-600' : 
                overview.averageResponseTime < 5000 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overview.averageResponseTime < 2000 ? 'Excellent' : 
                 overview.averageResponseTime < 5000 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Retention</span>
              <span className={`text-sm font-medium ${
                overview.completionRate > 0.7 ? 'text-green-600' : 
                overview.completionRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overview.completionRate > 0.7 ? 'High' : 
                 overview.completionRate > 0.5 ? 'Medium' : 'Low'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active vs Completed</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.activeConversations} active, {overview.totalConversations - overview.activeConversations} completed
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Messages per User</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.uniqueUsers > 0 ? (overview.totalMessages / overview.uniqueUsers).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversations per User</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.uniqueUsers > 0 ? (overview.totalConversations / overview.uniqueUsers).toFixed(1) : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 