'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useOverviewAnalytics, useRecentEvents, useVoteAnalytics } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { formatDateRange } from '@/lib/time-utils'

// Wrapper component for TimeRangeSelector that uses useSearchParams
const TimeRangeWrapper: React.FC<{ onTimeRangeChange: (range: TimeRange) => void }> = ({ onTimeRangeChange }) => {
  const { timeRange, setTimeRange } = useTimeRange()
  
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    onTimeRangeChange(range)
  }

  return (
    <TimeRangeSelector 
      value={timeRange}
      onChange={handleTimeRangeChange}
    />
  )
}

// Dashboard content component that uses the time range
const DashboardContent: React.FC = () => {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data: overviewData, loading: overviewLoading, error: overviewError, refresh: refreshOverview } = useOverviewAnalytics(timeRange)
  const { data: recentEventsData, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useRecentEvents(20)
  const { data: voteData, loading: voteLoading, error: voteError, refresh: refreshVotes } = useVoteAnalytics(timeRange)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loading = overviewLoading || eventsLoading || voteLoading
  const error = overviewError || eventsError || voteError

  useEffect(() => {
    if (overviewData || recentEventsData || voteData) {
      setLastUpdated(new Date())
    }
  }, [overviewData, recentEventsData, voteData])

  const refresh = () => {
    refreshOverview()
    refreshEvents()
    refreshVotes()
  }

  if (loading) {
    return (
      <DashboardLayout 
        title="Bilan"
        subtitle="Loading dashboard..."
      >
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3 mx-auto" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout 
        title="Bilan"
        subtitle="Error loading dashboard"
      >
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
          <h4 className="text-lg font-semibold mb-2">Error loading dashboard</h4>
          <p className="mb-4">{error}</p>
          <button onClick={refresh} className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md transition-colors">
            Try Again
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (!overviewData && !recentEventsData && !voteData) {
    return (
      <DashboardLayout 
        title="Bilan"
        subtitle="No data available"
      >
        <div className="text-center py-5">
          <p className="text-gray-600">No data available</p>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate stats from the new data structure
  const totalEvents = overviewData?.totalEvents || 0
  const totalUsers = overviewData?.totalUsers || 0
  const totalVotes = voteData?.overview?.totalVotes || 0
  const positiveRate = voteData?.overview?.positiveRate || 0
  const trustScore = positiveRate // Use positive rate as trust score
  
  // Calculate conversation stats (estimated from event data)
  const conversationEvents = overviewData?.eventTypes?.find(et => et.type === 'conversation_started')?.count || 0
  const turnEvents = overviewData?.eventTypes?.find(et => et.type === 'turn_completed')?.count || 0
  const successRate = turnEvents > 0 ? ((turnEvents / (turnEvents + (overviewData?.eventTypes?.find(et => et.type === 'turn_failed')?.count || 0))) * 100) : 0

  return (
    <DashboardLayout 
      title="Bilan" 
      subtitle={`Monitor and improve user trust in AI features (${formatDateRange(timeRange)})`}
      showTimeRange={true}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      lastUpdated={lastUpdated}
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Trust Score"
            value={`${trustScore.toFixed(1)}%`}
            change={undefined}
            trend={trustScore >= 70 ? 'up' : trustScore >= 50 ? 'stable' : 'down'}
            description="Overall user confidence in AI responses"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Events"
            value={totalEvents.toLocaleString()}
            change={undefined}
            trend="up"
            description="All tracked events in the system"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Active Users"
            value={totalUsers.toLocaleString()}
            change={undefined}
            trend="up"
            description="Users with recent activity"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Votes"
            value={totalVotes.toLocaleString()}
            change={undefined}
            trend={totalVotes > 0 ? 'up' : 'stable'}
            description="User feedback and ratings"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12"></path>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
              </svg>
            }
          />
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Trust Score Trend</h3>
              <p className="card-subtitle">AI trust score over time</p>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <p className="text-muted">Trust score trending will be implemented with vote analytics data</p>
                <p className="text-sm text-gray-600">Current positive rate: {trustScore.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quality Signals</h3>
              <p className="card-subtitle">AI response quality indicators</p>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{voteData?.overview?.positiveVotes || 0}</div>
                    <div className="text-sm text-gray-600">Positive Votes</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{voteData?.overview?.negativeVotes || 0}</div>
                    <div className="text-sm text-gray-600">Negative Votes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row row-deck row-cards">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Event Types</h3>
              <p className="card-subtitle">Breakdown of events by type</p>
            </div>
            <div className="card-body">
              {overviewData?.eventTypes && overviewData.eventTypes.length > 0 ? (
                <div className="space-y-2">
                  {overviewData.eventTypes.map((eventType) => (
                    <div key={eventType.type} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{eventType.type.replace('_', ' ')}</span>
                      <span className="text-sm text-gray-600">{eventType.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No event data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Latest events and user actions</p>
            </div>
            <div className="card-body">
              {recentEventsData?.events && recentEventsData.events.length > 0 ? (
                <div className="space-y-3">
                  {recentEventsData.events.slice(0, 5).map((event, index) => (
                    <div key={event.event_id} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.event_type.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentEventsData.events.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-gray-500">
                        +{recentEventsData.events.length - 5} more events
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
} 