'use client'

import React, { useState, Suspense } from 'react'
import { useVoteAnalytics } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import { VotesOverview } from './components/VotesOverview'
import { VoteTrends } from './components/VoteTrends'
import { PromptPerformance } from './components/PromptPerformance'
import { CommentAnalysis } from './components/CommentAnalysis'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { formatDateRange } from '@/lib/time-utils'

/**
 * VotesContent component renders the comprehensive vote analytics interface
 * including overview stats, trends, prompt performance, and comment analysis.
 */
const VotesContent: React.FC = () => {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data: analytics, loading, error, refresh } = useVoteAnalytics(timeRange)

  if (loading) {
    return (
      <DashboardLayout 
        title="Vote Analytics"
        subtitle="Loading comprehensive vote analytics..."
        showTimeRange={true}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      >
        <div className="row row-deck row-cards mb-4">
          <VotesOverview analytics={null} loading={true} />
        </div>
        <div className="row row-deck row-cards mb-4">
          <VoteTrends analytics={null} loading={true} />
        </div>
        <div className="row row-deck row-cards mb-4">
          <PromptPerformance analytics={null} loading={true} />
        </div>
        <div className="row row-deck row-cards">
          <CommentAnalysis analytics={null} loading={true} />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout 
        title="Vote Analytics"
        subtitle="Error loading vote analytics"
        showTimeRange={true}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      >
        <div className="row">
          <div className="col-12">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
              <h4 className="text-lg font-semibold mb-2">Error loading vote analytics</h4>
              <p className="mb-4">{error}</p>
              <button 
                onClick={refresh} 
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title="Vote Analytics"
      subtitle={`Comprehensive analysis of user feedback and voting patterns (${formatDateRange(timeRange)})`}
      showTimeRange={true}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
    >
      {/* Overview Stats */}
      <div className="row row-deck row-cards mb-4">
        <VotesOverview analytics={analytics} loading={loading} />
      </div>

      {/* Trends and Patterns */}
      <div className="row row-deck row-cards mb-4">
        <VoteTrends analytics={analytics} loading={loading} />
      </div>

      {/* Performance Analysis */}
      <div className="row row-deck row-cards mb-4">
        <PromptPerformance analytics={analytics} loading={loading} />
      </div>

      {/* Comment Analysis */}
      <div className="row row-deck row-cards">
        <CommentAnalysis analytics={analytics} loading={loading} />
      </div>
    </DashboardLayout>
  )
}

/**
 * Votes component is the main page component that renders the vote analytics
 * section with a Suspense fallback for loading states.
 */
export default function Votes() {
  return (
    <Suspense fallback={<div>Loading comprehensive vote analytics...</div>}>
      <VotesContent />
    </Suspense>
  )
} 