'use client'

import { JourneyAnalytics } from '@/lib/types'
import StatsCard from '@/components/StatsCard'
import { Route, Clock, Users, CheckCircle, TrendingUp, AlertTriangle, Target, Star } from 'lucide-react'

interface JourneysOverviewProps {
  analytics: JourneyAnalytics
}

export function JourneysOverview({ analytics }: JourneysOverviewProps) {
  const { overview, performance } = analytics

  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${Math.round(ms / 3600000)}h`
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Journeys"
          value={overview.totalJourneys.toLocaleString()}
          trend={overview.totalJourneys > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Active Journeys"
          value={overview.activeJourneys.toLocaleString()}
          trend={overview.activeJourneys > 0 ? 'up' : 'stable'}
        />
        
        <StatsCard
          title="Completed Journeys"
          value={overview.completedJourneys.toLocaleString()}
          trend={overview.completedJourneys > overview.abandonedJourneys ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Unique Users"
          value={overview.uniqueUsers.toLocaleString()}
          trend={overview.uniqueUsers > 0 ? 'up' : 'stable'}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Avg Completion Rate"
          value={formatPercentage(overview.averageCompletionRate)}
          trend={overview.averageCompletionRate > 0.7 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Avg Time to Complete"
          value={formatDuration(overview.averageTimeToComplete)}
          trend={overview.averageTimeToComplete < 1800000 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Abandoned Journeys"
          value={overview.abandonedJourneys.toLocaleString()}
          trend={overview.abandonedJourneys < overview.completedJourneys ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Total Steps"
          value={overview.totalSteps.toLocaleString()}
          trend={overview.totalSteps > 0 ? 'up' : 'stable'}
        />
      </div>

      {/* Journey Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Journeys */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Top Performing Journeys
          </h3>
          <div className="space-y-3">
            {performance.topPerformingJourneys.slice(0, 5).map((journey, index) => (
              <div key={journey.journeyId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{journey.name}</div>
                    <div className="text-sm text-gray-500">{journey.totalUsers} users</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    {formatPercentage(journey.completionRate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(journey.averageTime)}
                  </div>
                </div>
              </div>
            ))}
            {performance.topPerformingJourneys.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No journey performance data available
              </div>
            )}
          </div>
        </div>

        {/* Bottleneck Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Bottleneck Steps
          </h3>
          <div className="space-y-3">
            {performance.bottleneckSteps.slice(0, 5).map((step, index) => (
              <div key={step.stepId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{step.stepName}</div>
                    <div className="text-sm text-gray-500">{step.journeyName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-red-600">
                    {formatPercentage(step.dropoffRate)} dropoff
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(step.averageTimeSpent)}
                  </div>
                </div>
              </div>
            ))}
            {performance.bottleneckSteps.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No bottleneck data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Route className="h-5 w-5 mr-2 text-blue-600" />
          Conversion Funnel
        </h3>
        <div className="space-y-4">
          {performance.conversionFunnel.map((step, index) => {
            const isLast = index === performance.conversionFunnel.length - 1
            return (
              <div key={step.stepId} className="relative">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{step.stepName}</div>
                      <div className="text-sm text-gray-500">
                        {step.completedUsers} of {step.totalUsers} users completed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatPercentage(step.conversionRate)}
                    </div>
                    <div className="text-sm text-gray-500">conversion rate</div>
                  </div>
                </div>
                {!isLast && (
                  <div className="flex items-center justify-center py-2">
                    <div className="w-0.5 h-4 bg-gray-300"></div>
                  </div>
                )}
              </div>
            )
          })}
          {performance.conversionFunnel.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No conversion funnel data available
            </div>
          )}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Journey Health</span>
              <span className={`text-sm font-medium ${
                overview.averageCompletionRate > 0.7 ? 'text-green-600' : 
                overview.averageCompletionRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overview.averageCompletionRate > 0.7 ? 'Excellent' : 
                 overview.averageCompletionRate > 0.5 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Engagement</span>
              <span className={`text-sm font-medium ${
                overview.activeJourneys > overview.abandonedJourneys ? 'text-green-600' : 'text-red-600'
              }`}>
                {overview.activeJourneys > overview.abandonedJourneys ? 'High' : 'Low'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Efficiency</span>
              <span className={`text-sm font-medium ${
                overview.averageTimeToComplete < 1800000 ? 'text-green-600' : 
                overview.averageTimeToComplete < 3600000 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overview.averageTimeToComplete < 1800000 ? 'Fast' : 
                 overview.averageTimeToComplete < 3600000 ? 'Moderate' : 'Slow'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.totalJourneys > 0 ? formatPercentage(overview.completedJourneys / overview.totalJourneys) : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Abandonment Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.totalJourneys > 0 ? formatPercentage(overview.abandonedJourneys / overview.totalJourneys) : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Journeys per User</span>
              <span className="text-sm font-medium text-gray-900">
                {overview.uniqueUsers > 0 ? (overview.totalJourneys / overview.uniqueUsers).toFixed(1) : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 