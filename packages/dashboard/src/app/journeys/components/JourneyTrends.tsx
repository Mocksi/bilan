'use client'

import { JourneyAnalytics } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'

interface JourneyTrendsProps {
  analytics: JourneyAnalytics
}

export function JourneyTrends({ analytics }: JourneyTrendsProps) {
  const { trends, stepAnalysis } = analytics

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${Math.round(ms / 3600000)}h`
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Daily Journey Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Journey Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends.daily}>
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
                  name === 'totalJourneys' ? value.toLocaleString() :
                  name === 'completedJourneys' ? value.toLocaleString() :
                  name === 'abandonedJourneys' ? value.toLocaleString() :
                  name === 'averageCompletionRate' ? formatPercentage(value) :
                  name === 'averageTimeToComplete' ? formatDuration(value) :
                  value,
                  name === 'totalJourneys' ? 'Total Journeys' :
                  name === 'completedJourneys' ? 'Completed' :
                  name === 'abandonedJourneys' ? 'Abandoned' :
                  name === 'averageCompletionRate' ? 'Completion Rate' :
                  name === 'averageTimeToComplete' ? 'Avg Time' :
                  name
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="totalJourneys" 
                stackId="1"
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.6}
                name="totalJourneys"
              />
              <Area 
                type="monotone" 
                dataKey="completedJourneys" 
                stackId="2"
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.6}
                name="completedJourneys"
              />
              <Area 
                type="monotone" 
                dataKey="abandonedJourneys" 
                stackId="3"
                stroke="#ef4444" 
                fill="#ef4444"
                fillOpacity={0.6}
                name="abandonedJourneys"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Activity Pattern */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Activity Pattern</h3>
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
                  name === 'totalJourneys' ? value.toLocaleString() :
                  name === 'completedJourneys' ? value.toLocaleString() :
                  name === 'averageCompletionRate' ? formatPercentage(value) :
                  value,
                  name === 'totalJourneys' ? 'Total Journeys' :
                  name === 'completedJourneys' ? 'Completed' :
                  name === 'averageCompletionRate' ? 'Completion Rate' :
                  name
                ]}
              />
              <Bar 
                dataKey="totalJourneys" 
                fill="#3b82f6" 
                name="totalJourneys"
              />
              <Bar 
                dataKey="completedJourneys" 
                fill="#10b981" 
                name="completedJourneys"
              />
            </BarChart>
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
                tickFormatter={(value) => formatPercentage(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  formatPercentage(value),
                  'Completion Rate'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="averageCompletionRate" 
                stroke="#10b981" 
                strokeWidth={3}
                name="averageCompletionRate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time to Complete Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time to Complete Trends</h3>
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
                tickFormatter={(value) => formatDuration(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  formatDuration(value),
                  'Avg Time to Complete'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="averageTimeToComplete" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="averageTimeToComplete"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Step Performance Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Step Performance Analysis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Step Completion Rates */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Step Completion Rates</h4>
            <div className="space-y-3">
              {stepAnalysis.stepPerformance.slice(0, 8).map((step, index) => (
                <div key={step.stepId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{step.stepName}</div>
                      <div className="text-xs text-gray-500">{step.journeyName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      step.completionRate > 0.8 ? 'text-green-600' :
                      step.completionRate > 0.6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(step.completionRate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.totalAttempts} attempts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Time Analysis */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Step Time Analysis</h4>
            <div className="space-y-3">
              {stepAnalysis.stepPerformance
                .sort((a, b) => b.averageTimeSpent - a.averageTimeSpent)
                .slice(0, 8)
                .map((step, index) => (
                  <div key={step.stepId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{step.stepName}</div>
                        <div className="text-xs text-gray-500">{step.journeyName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDuration(step.averageTimeSpent)}
                      </div>
                      <div className="text-xs text-gray-500">
                        avg time spent
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Path Analysis */}
      {stepAnalysis.pathAnalysis.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Path Analysis</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stepAnalysis.pathAnalysis.slice(0, 6).map((path, index) => (
                <div key={`${path.fromStep}-${path.toStep}`} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {path.fromStep} → {path.toStep}
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      {formatPercentage(path.transitionRate)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{path.userCount} users</span>
                    <span>{formatDuration(path.averageTransitionTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trend Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Peak Activity Hours</h4>
              <div className="space-y-2">
                {trends.hourly
                  .sort((a, b) => b.totalJourneys - a.totalJourneys)
                  .slice(0, 3)
                  .map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        #{index + 1} {formatHour(hour.hour)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {hour.totalJourneys} journeys
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Best Completion Hours</h4>
              <div className="space-y-2">
                {trends.hourly
                  .sort((a, b) => b.averageCompletionRate - a.averageCompletionRate)
                  .slice(0, 3)
                  .map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        #{index + 1} {formatHour(hour.hour)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPercentage(hour.averageCompletionRate)}
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
                    const change = recent[1].totalJourneys - recent[0].totalJourneys
                    const percentage = recent[0].totalJourneys > 0 
                      ? (change / recent[0].totalJourneys) * 100 
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
              <h4 className="font-medium text-gray-900 mb-2">Completion Pattern</h4>
              <p className="text-sm text-gray-600">
                {(() => {
                  const totalJourneys = trends.hourly.reduce((sum, h) => sum + h.totalJourneys, 0)
                  const businessHours = trends.hourly.filter(h => h.hour >= 9 && h.hour <= 17)
                  const businessHoursJourneys = businessHours.reduce((sum, h) => sum + h.totalJourneys, 0)
                  const businessHoursPercentage = totalJourneys > 0 
                    ? (businessHoursJourneys / totalJourneys) * 100 
                    : 0
                  
                  return `${businessHoursPercentage.toFixed(1)}% of journeys start during business hours (9-17)`
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 