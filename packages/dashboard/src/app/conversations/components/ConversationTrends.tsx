'use client'

import { ConversationAnalytics } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ConversationTrendsProps {
  analytics: ConversationAnalytics
}

export function ConversationTrends({ analytics }: ConversationTrendsProps) {
  const { trends } = analytics

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="space-y-6">
      {/* Daily Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Conversation Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === 'conversationCount' ? value.toLocaleString() :
                  name === 'averageLength' ? `${value.toFixed(1)} msgs` :
                  name === 'averageResponseTime' ? formatResponseTime(value) :
                  name === 'completionRate' ? `${(value * 100).toFixed(1)}%` :
                  value,
                  name === 'conversationCount' ? 'Conversations' :
                  name === 'averageLength' ? 'Avg Length' :
                  name === 'averageResponseTime' ? 'Avg Response Time' :
                  name === 'completionRate' ? 'Completion Rate' :
                  name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="conversationCount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="conversationCount"
              />
              <Line 
                type="monotone" 
                dataKey="averageLength" 
                stroke="#10b981" 
                strokeWidth={2}
                name="averageLength"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Activity Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends.hourly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                tickFormatter={formatHour}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => `${formatHour(Number(value))}`}
                formatter={(value: number, name: string) => [
                  name === 'conversationCount' ? value.toLocaleString() :
                  name === 'averageResponseTime' ? formatResponseTime(value) :
                  name === 'activeConversations' ? value.toLocaleString() :
                  value,
                  name === 'conversationCount' ? 'Conversations' :
                  name === 'averageResponseTime' ? 'Avg Response Time' :
                  name === 'activeConversations' ? 'Active Conversations' :
                  name
                ]}
              />
              <Bar 
                dataKey="conversationCount" 
                fill="#3b82f6" 
                name="conversationCount"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  formatResponseTime(value),
                  'Avg Response Time'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="averageResponseTime" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="averageResponseTime"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Rate Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  'Completion Rate'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="completionRate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Peak Activity Hours</h4>
              <div className="space-y-2">
                {trends.hourly
                  .sort((a, b) => b.conversationCount - a.conversationCount)
                  .slice(0, 3)
                  .map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        #{index + 1} {formatHour(hour.hour)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {hour.conversationCount} conversations
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Best Response Times</h4>
              <div className="space-y-2">
                {trends.hourly
                  .sort((a, b) => a.averageResponseTime - b.averageResponseTime)
                  .slice(0, 3)
                  .map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        #{index + 1} {formatHour(hour.hour)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatResponseTime(hour.averageResponseTime)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recent Trend</h4>
              <p className="text-sm text-gray-600">
                {trends.daily.length >= 2 ? (
                  (() => {
                    const recent = trends.daily.slice(-2)
                    const change = recent[1].conversationCount - recent[0].conversationCount
                    const percentage = recent[0].conversationCount > 0 
                      ? (change / recent[0].conversationCount) * 100 
                      : 0
                    
                    return (
                      <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}>
                        {change > 0 ? '↗' : change < 0 ? '↘' : '→'} 
                        {Math.abs(percentage).toFixed(1)}% vs yesterday
                      </span>
                    )
                  })()
                ) : (
                  'Not enough data for trend analysis'
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Activity Pattern</h4>
              <p className="text-sm text-gray-600">
                {(() => {
                  const totalConversations = trends.hourly.reduce((sum, h) => sum + h.conversationCount, 0)
                  const businessHours = trends.hourly.filter(h => h.hour >= 9 && h.hour <= 17)
                  const businessHoursConversations = businessHours.reduce((sum, h) => sum + h.conversationCount, 0)
                  const businessHoursPercentage = totalConversations > 0 
                    ? (businessHoursConversations / totalConversations) * 100 
                    : 0
                  
                  return `${businessHoursPercentage.toFixed(1)}% of conversations happen during business hours (9-17)`
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 