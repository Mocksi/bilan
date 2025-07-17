'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useOverviewAnalytics, useRecentEvents } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { formatDateRange } from '@/lib/time-utils'

/**
 * ConversationsContent component renders the conversation analytics interface
 * using event-based data for conversation tracking and analysis.
 */
const ConversationsContent: React.FC = () => {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data: overviewData, loading: overviewLoading, error: overviewError, refresh: refreshOverview } = useOverviewAnalytics(timeRange)
  const { data: eventsData, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useRecentEvents(100)

  const loading = overviewLoading || eventsLoading
  const error = overviewError || eventsError

  const refresh = () => {
    refreshOverview()
    refreshEvents()
  }

  // Process events to extract conversation-related data
  const conversationEvents = useMemo(() => {
    if (!eventsData?.events) return []
    
    // Filter for conversation-related events
    return eventsData.events.filter(event => 
      event.event_type === 'conversation_started' || 
      event.event_type === 'conversation_ended' || 
      event.event_type === 'turn_started' || 
      event.event_type === 'turn_completed'
    )
  }, [eventsData])

  const conversationStats = useMemo(() => {
    if (!conversationEvents.length) return { total: 0, started: 0, completed: 0, active: 0, turns: 0 }
    
    const startedEvents = conversationEvents.filter(e => e.event_type === 'conversation_started')
    const completedEvents = conversationEvents.filter(e => e.event_type === 'conversation_ended')
    const turnEvents = conversationEvents.filter(e => e.event_type === 'turn_started' || e.event_type === 'turn_completed')
    
    return {
      total: startedEvents.length,
      started: startedEvents.length,
      completed: completedEvents.length,
      active: startedEvents.length - completedEvents.length,
      turns: turnEvents.length
    }
  }, [conversationEvents])

  if (loading) {
    return (
      <DashboardLayout 
        title="Conversation Analytics"
        subtitle="Loading conversation data..."
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
        title="Conversation Analytics"
        subtitle="Error loading conversations"
        showTimeRange={true}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      >
        <div className="row">
          <div className="col-12">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
              <h4 className="text-lg font-semibold mb-2">Error loading conversation data</h4>
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

  const successRate = conversationStats.started > 0 ? (conversationStats.completed / conversationStats.started) * 100 : 0

  return (
    <DashboardLayout 
      title="Conversation Analytics" 
      subtitle={`Multi-turn chat analysis and user engagement patterns (${formatDateRange(timeRange)})`}
      showTimeRange={true}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Conversations"
            value={conversationStats.total.toLocaleString()}
            trend={conversationStats.total > 0 ? 'up' : 'stable'}
            description="Conversations started in this period"
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
            value={`${successRate.toFixed(1)}%`}
            trend={successRate > 50 ? 'up' : successRate < 50 ? 'down' : 'stable'}
            description="Percentage of conversations completed"
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
            title="Active Conversations"
            value={conversationStats.active.toLocaleString()}
            trend={conversationStats.active > 0 ? 'up' : 'stable'}
            description="Conversations started but not yet ended"
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
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Turns"
            value={conversationStats.turns.toLocaleString()}
            trend={conversationStats.turns > 0 ? 'up' : 'stable'}
            description="AI turns and interactions"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 20V10c0-2.21 1.79-4 4-4s4 1.79 4 4v10"></path>
                <path d="M16 16c0 1.1-.9 2-2 2s-2-.9-2-2"></path>
                <circle cx="12" cy="14" r="2"></circle>
              </svg>
            }
          />
        </div>
      </div>

      {/* Event Type Analysis */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Event Type Distribution</h3>
              <p className="card-subtitle">Breakdown of conversation-related events</p>
            </div>
            <div className="card-body">
              {overviewData?.eventTypes ? (
                <div className="space-y-3">
                  {overviewData.eventTypes
                    .filter(et => et.type.includes('conversation') || et.type.includes('turn'))
                    .map((eventType) => (
                      <div key={eventType.type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{eventType.type.replace('_', ' ')}</span>
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
              <h3 className="card-title">Recent Conversation Events</h3>
              <p className="card-subtitle">Latest conversation activity</p>
            </div>
            <div className="card-body">
              {conversationEvents.length > 0 ? (
                <div className="space-y-3">
                  {conversationEvents.slice(0, 8).map((event, index) => (
                    <div key={event.event_id} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        event.event_type === 'conversation_started' ? 'bg-green-500' :
                        event.event_type === 'conversation_ended' ? 'bg-red-500' :
                        event.event_type === 'turn_completed' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {event.event_type.replace('_', ' ')}
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
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <h3>No conversation events found</h3>
                    <p>No conversation tracking events detected in this time period.</p>
                    <p className="text-muted small">
                      To enable conversation tracking, use the SDK's <code>startConversation()</code>, 
                      <code>addMessage()</code>, and <code>endConversation()</code> methods.
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
          <p className="card-subtitle">Complete event history with filtering and search</p>
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
                          event.event_type.includes('conversation') ? 'bg-success' :
                          event.event_type.includes('turn') ? 'bg-info' :
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
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
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
 * Conversations component is the main page component that renders the conversation analytics
 * section with a Suspense fallback for loading states.
 */
export default function Conversations() {
  return (
    <Suspense fallback={<div>Loading conversations...</div>}>
      <ConversationsContent />
    </Suspense>
  )
} 