'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useOverviewAnalytics, useRecentEvents } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { formatDateRange } from '@/lib/time-utils'

/**
 * JourneysContent component renders the journey analytics interface
 * using event-based data for journey tracking and workflow optimization.
 */
function JourneysContent() {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data: overviewData, loading: overviewLoading, error: overviewError, refresh: refreshOverview } = useOverviewAnalytics(timeRange)
  const { data: eventsData, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useRecentEvents(100)

  const loading = overviewLoading || eventsLoading
  const error = overviewError || eventsError

  const refresh = () => {
    refreshOverview()
    refreshEvents()
  }

  // Process events to extract journey-related data
  const journeyEvents = useMemo(() => {
    if (!eventsData?.events) return []
    
    // Filter for journey-related events
    return eventsData.events.filter(event => 
      event.event_type === 'journey_step' || 
      event.event_type === 'journey_started' || 
      event.event_type === 'journey_completed' ||
      event.event_type === 'journey_abandoned'
    )
  }, [eventsData])

  const journeyStats = useMemo(() => {
    if (!journeyEvents.length) return { total: 0, steps: 0, active: 0, completed: 0, abandoned: 0 }
    
    const stepEvents = journeyEvents.filter(e => e.event_type === 'journey_step')
    const startedEvents = journeyEvents.filter(e => e.event_type === 'journey_started')
    const completedEvents = journeyEvents.filter(e => e.event_type === 'journey_completed')
    const abandonedEvents = journeyEvents.filter(e => e.event_type === 'journey_abandoned')
    
    // Count unique journeys by journey ID from properties
    const uniqueJourneys = new Set()
    journeyEvents.forEach(event => {
      const journeyId = event.properties.journeyId || event.properties.journey_id
      if (journeyId) uniqueJourneys.add(journeyId)
    })
    
    return {
      total: uniqueJourneys.size,
      steps: stepEvents.length,
      active: startedEvents.length - completedEvents.length - abandonedEvents.length,
      completed: completedEvents.length,
      abandoned: abandonedEvents.length
    }
  }, [journeyEvents])

  if (loading) {
    return (
      <DashboardLayout 
        title="Journey Analytics"
        subtitle="Loading journey data..."
        showTimeRange={true}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      >
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout 
        title="Journey Analytics"
        subtitle="Error loading journeys"
        showTimeRange={true}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      >
        <div className="row">
          <div className="col-12">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
              <h4 className="text-lg font-semibold mb-2">Error loading journey data</h4>
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

  const completionRate = journeyStats.total > 0 ? (journeyStats.completed / journeyStats.total) * 100 : 0

  return (
    <DashboardLayout 
      title="Journey Analytics" 
      subtitle={`Workflow tracking and user journey optimization (${formatDateRange(timeRange)})`}
      showTimeRange={true}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Journeys"
            value={journeyStats.total.toLocaleString()}
            trend={journeyStats.total > 0 ? 'up' : 'stable'}
            description="Unique journeys tracked in this period"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            trend={completionRate > 50 ? 'up' : completionRate < 50 ? 'down' : 'stable'}
            description="Percentage of journeys completed successfully"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Journey Steps"
            value={journeyStats.steps.toLocaleString()}
            trend={journeyStats.steps > 0 ? 'up' : 'stable'}
            description="Total steps taken across all journeys"
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
            title="Active Journeys"
            value={Math.max(0, journeyStats.active).toLocaleString()}
            trend={journeyStats.active > 0 ? 'up' : 'stable'}
            description="Journeys currently in progress"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6"></path>
                <path d="m15.5 4.5-1.5 1.5m0 0L12 8m0 0L9.5 6L8 4.5"></path>
                <path d="m4.5 15.5 1.5-1.5m0 0L8 12m0 0l1.5 1.5 1.5-1.5"></path>
              </svg>
            }
          />
        </div>
      </div>

      {/* Journey Analysis */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Journey Event Distribution</h3>
              <p className="card-subtitle">Breakdown of journey-related events</p>
            </div>
            <div className="card-body">
              {overviewData?.eventTypes ? (
                <div className="space-y-3">
                  {overviewData.eventTypes
                    .filter(et => et.type.includes('journey'))
                    .map((eventType) => (
                      <div key={eventType.type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{eventType.type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-600">{eventType.count}</span>
                      </div>
                    ))}
                  {overviewData.eventTypes.filter(et => et.type.includes('journey')).length === 0 && (
                    <div className="text-center py-3">
                      <p className="text-muted">No journey events found</p>
                    </div>
                  )}
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
              <h3 className="card-title">Journey Status Overview</h3>
              <p className="card-subtitle">Current status of all journeys</p>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{journeyStats.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{journeyStats.abandoned}</div>
                    <div className="text-sm text-gray-600">Abandoned</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="progress">
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2 text-sm text-gray-600">
                  {completionRate.toFixed(1)}% completion rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Journey Events */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Journey Activity</h3>
              <p className="card-subtitle">Latest journey events and user progress</p>
            </div>
            <div className="card-body">
              {journeyEvents.length > 0 ? (
                <div className="space-y-3">
                  {journeyEvents.slice(0, 10).map((event, index) => (
                    <div key={event.event_id} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        event.event_type === 'journey_started' ? 'bg-blue-500' :
                        event.event_type === 'journey_completed' ? 'bg-green-500' :
                        event.event_type === 'journey_abandoned' ? 'bg-red-500' :
                        event.event_type === 'journey_step' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium truncate">
                            {event.event_type.replace('_', ' ')}
                          </div>
                          {event.properties.journeyName && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {event.properties.journeyName}
                            </span>
                          )}
                          {event.properties.stepName && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {event.properties.stepName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          User: {event.user_id} • {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                    <h3>No journey events found</h3>
                    <p>No journey tracking events detected in this time period.</p>
                    <p className="text-muted small">
                      To enable journey tracking, use the SDK's <code>startJourney()</code>, 
                      <code>updateJourney()</code>, and <code>completeJourney()</code> methods.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Events Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Events</h3>
          <p className="card-subtitle">Complete event history with filtering capabilities</p>
        </div>
        <div className="card-body">
          {eventsData?.events && eventsData.events.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>Timestamp</th>
                    <th>Properties</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsData.events.slice(0, 20).map((event) => (
                    <tr key={event.event_id}>
                      <td>
                        <span className={`badge ${
                          event.event_type.includes('journey') ? 'bg-info' :
                          event.event_type.includes('conversation') ? 'bg-success' :
                          event.event_type.includes('turn') ? 'bg-primary' :
                          event.event_type.includes('vote') ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {event.event_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-muted">
                        <code>{event.user_id}</code>
                      </td>
                      <td className="text-muted">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="text-muted">
                        {Object.keys(event.properties).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm">View properties</summary>
                            <pre className="text-xs mt-1 p-2 bg-gray-100 rounded">
                              {JSON.stringify(event.properties, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          'No properties'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <h3>No events found</h3>
                <p>No events found for the selected time period.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Journeys component is the main page component that renders the journey analytics
 * section with a Suspense fallback for loading states. This component provides
 * workflow tracking and user journey optimization analytics.
 */
export default function Journeys() {
  return (
    <Suspense fallback={<div>Loading journeys...</div>}>
      <JourneysContent />
    </Suspense>
  )
} 