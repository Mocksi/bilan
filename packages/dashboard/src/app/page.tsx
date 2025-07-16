'use client'

import { useEffect, useState, Suspense } from 'react'
import { useDashboardData } from '@/lib/api-client'
import { DashboardData } from '@/lib/types'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { TrustScoreChart } from '@/components/TrustScoreChart'
import { QualitySignals } from '@/components/QualitySignals'
import { RecentActivity } from '@/components/RecentActivity'
import { JourneyPerformance } from '@/components/JourneyPerformance'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { formatDateRange } from '@/lib/time-utils'
import { calculateMetricComparisons } from '@/lib/comparison-utils'

// Wrapper component for TimeRangeSelector that uses useSearchParams
function TimeRangeWrapper({ onTimeRangeChange }: { onTimeRangeChange: (range: TimeRange) => void }) {
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
function DashboardContent() {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data, loading, error, refresh } = useDashboardData(timeRange, true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date())
    }
  }, [data])

  // Calculate comparisons if comparison data is available
  const comparisons = data?.comparison ? 
    calculateMetricComparisons(data, data.comparison.previousPeriod) : 
    null

  if (loading) {
    return (
      <DashboardLayout 
        title="Bilan"
        subtitle="Loading dashboard..."
      >
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading dashboard...</p>
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
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error loading dashboard</h4>
          <p>{error}</p>
          <button onClick={refresh} className="btn btn-outline-danger">
            Try Again
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout 
        title="Bilan"
        subtitle="No data available"
      >
        <div className="text-center py-5">
          <p className="text-muted">No data available</p>
        </div>
      </DashboardLayout>
    )
  }

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
            value={`${(data.feedbackStats.positiveRate * 100).toFixed(1)}%`}
            change={undefined}
            trend={data.feedbackStats.recentTrend === 'improving' ? 'up' : 
                   data.feedbackStats.recentTrend === 'declining' ? 'down' : 'stable'}
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
            value={data.recentActivity.totalEvents.toLocaleString()}
            change={undefined}
            trend="up"
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
            title="Conversations"
            value={data.conversationStats.totalConversations.toLocaleString()}
            change={undefined}
            trend="up"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Success Rate"
            value={data.conversationStats.successRate !== null ? 
              `${(data.conversationStats.successRate * 100).toFixed(1)}%` : 
              'N/A'}
            change={undefined}
            trend={data.conversationStats.successRate !== null ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            }
          />
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-lg-6">
          <TrustScoreChart data={data} />
        </div>
        <div className="col-lg-6">
          <QualitySignals data={data} />
        </div>
      </div>

      <div className="row row-deck row-cards">
        <div className="col-lg-6">
          <JourneyPerformance data={data} />
        </div>
        <div className="col-lg-6">
          <RecentActivity data={data} />
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