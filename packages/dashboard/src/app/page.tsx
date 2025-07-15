'use client'

import { useEffect, useState } from 'react'
import { useDashboardData } from '@/lib/api-client'
import { DashboardData } from '@/lib/types'
import { SimpleLineChart } from '@/components/SimpleLineChart'

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

  const handleRefresh = () => {
    refresh()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container-xl">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="container-xl">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="text-center">
              <div className="text-danger mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <h3 className="text-danger mb-3">Error Loading Dashboard</h3>
              <p className="text-muted mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <div className="container-xl">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <div className="text-center">
              <p className="text-muted">No data available</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="navbar navbar-expand-md d-print-none">
        <div className="container-xl">
          <div className="navbar-brand">
            <h1 className="navbar-brand-text">Bilan Analytics</h1>
          </div>
          <div className="navbar-nav flex-row order-md-last">
            {lastUpdated && (
              <span className="navbar-text me-3">
                <small className="text-muted">Updated: {lastUpdated.toLocaleTimeString()}</small>
              </span>
            )}
            <button onClick={handleRefresh} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">Dashboard</h2>
                <div className="text-muted mt-1">Trust analytics for your AI-powered application</div>
              </div>
            </div>
          </div>
        </div>

        <div className="page-body">
          <div className="container-xl">
            {/* Stats Cards */}
            <div className="row row-deck row-cards">
              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Conversation Success Rate</div>
                    </div>
                    <div className="d-flex align-items-baseline">
                      {data.conversationStats.successRate !== null ? (
                        <div className="h1 mb-0 me-2">{(data.conversationStats.successRate * 100).toFixed(1)}%</div>
                      ) : (
                        <div className="h1 mb-0 me-2 text-muted">N/A</div>
                      )}
                    </div>
                    <div className="mt-2">
                      {data.conversationStats.successRate !== null ? (
                        <small className="text-muted">{data.conversationStats.totalConversations} total conversations</small>
                      ) : (
                        <small className="text-muted">No conversation tracking implemented</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Journey Completion</div>
                    </div>
                    <div className="d-flex align-items-baseline">
                      {data.journeyStats.completionRate !== null ? (
                        <div className="h1 mb-0 me-2">{(data.journeyStats.completionRate * 100).toFixed(1)}%</div>
                      ) : (
                        <div className="h1 mb-0 me-2 text-muted">N/A</div>
                      )}
                    </div>
                    <div className="mt-2">
                      {data.journeyStats.totalJourneys !== null ? (
                        <small className="text-muted">{data.journeyStats.totalJourneys} active journeys</small>
                      ) : (
                        <small className="text-muted">No journey tracking implemented</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Positive Feedback</div>
                    </div>
                    <div className="d-flex align-items-baseline">
                      <div className="h1 mb-0 me-2">{(data.feedbackStats.positiveRate * 100).toFixed(1)}%</div>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">{data.feedbackStats.totalFeedback} total feedback</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-lg-3">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="subheader">Recent Trend</div>
                    </div>
                    <div className="d-flex align-items-baseline">
                      <div className={`h1 mb-0 me-2 ${data.feedbackStats.recentTrend === 'improving' ? 'text-success' : data.feedbackStats.recentTrend === 'declining' ? 'text-danger' : 'text-muted'}`}>
                        {data.feedbackStats.recentTrend === 'improving' ? '↗' : data.feedbackStats.recentTrend === 'declining' ? '↘' : '→'} {data.feedbackStats.recentTrend}
                      </div>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">Based on recent feedback</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Series Chart */}
            <div className="row row-deck row-cards mt-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Trust Score Trend</h3>
                  </div>
                  <div className="card-body">
                    {data.timeSeriesData.length > 0 ? (
                      <SimpleLineChart data={data.timeSeriesData} height={200} />
                    ) : (
                      <div className="text-muted text-center py-5">
                        No time-series data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="row row-deck row-cards mt-4">
              {/* Left Column - Recent Votes */}
              <div className="col-12 col-lg-8">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Votes</h3>
                  </div>
                  <div className="card-body">
                    {data.recentActivity.recentVotes.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-vcenter">
                          <thead>
                            <tr>
                              <th>Prompt ID</th>
                              <th>User</th>
                              <th>Vote</th>
                              {data.journeyStats.popularJourneys.length > 0 && <th>Journey</th>}
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.recentActivity.recentVotes.map((vote, index) => (
                              <tr key={index}>
                                <td>
                                  <div className="font-weight-medium">{vote.promptId}</div>
                                  {vote.comment && (
                                    <div className="text-muted small">"{vote.comment}"</div>
                                  )}
                                </td>
                                <td>
                                  <div className="text-muted">{vote.userId}</div>
                                </td>
                                <td>
                                  <span className={`badge ${vote.value > 0 ? 'bg-success' : 'bg-danger'}`}>
                                    {vote.value > 0 ? '+1' : '-1'}
                                  </span>
                                </td>
                                {data.journeyStats.popularJourneys.length > 0 && (
                                  <td>
                                    <div className="text-muted small">
                                      {vote.metadata?.journeyName || 'N/A'}
                                    </div>
                                  </td>
                                )}
                                <td className="text-muted">
                                  {formatTimestamp(vote.timestamp)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-muted">No recent votes</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Journey Performance + Quality Signals */}
              <div className="col-12 col-lg-4">
                <div className="row row-cards">
                  {/* Journey Performance - Only show if we have actual journey data */}
                  {data.journeyStats.popularJourneys.length > 0 && (
                    <div className="col-12">
                      <div className="card">
                        <div className="card-header">
                          <h3 className="card-title">Journey Performance</h3>
                        </div>
                        <div className="card-body">
                          <div className="space-y-3">
                            {data.journeyStats.popularJourneys.map((journey, index) => (
                              <div key={index} className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <div className="fw-medium">{journey.name}</div>
                                  <small className="text-muted">{Math.round(journey.completionRate * 100)}%</small>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div 
                                    className="progress-bar" 
                                    style={{ width: `${journey.completionRate * 100}%` }}
                                  ></div>
                                </div>
                                <small className="text-muted">{journey.count} events</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quality Signals */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">This Week's Signals</h3>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-6">
                            <div className="d-flex align-items-center mb-3">
                              <span className="me-2">👍</span>
                              <div>
                                <div className="fw-medium">{data.qualitySignals.positive}</div>
                                <small className="text-muted">Positive</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex align-items-center mb-3">
                              <span className="me-2">👎</span>
                              <div>
                                <div className="fw-medium">{data.qualitySignals.negative}</div>
                                <small className="text-muted">Negative</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex align-items-center">
                              <span className="me-2">🔄</span>
                              <div>
                                <div className="fw-medium">{data.qualitySignals.regenerations}</div>
                                <small className="text-muted">Regenerations</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex align-items-center">
                              <span className="me-2">😤</span>
                              <div>
                                <div className="fw-medium">{data.qualitySignals.frustration}</div>
                                <small className="text-muted">Frustration</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Comments */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Recent Comments</h3>
                      </div>
                      <div className="card-body">
                        {data.feedbackStats.topComments.length > 0 ? (
                          <div className="space-y-2">
                            {data.feedbackStats.topComments.map((comment, index) => (
                              <div key={index} className="text-muted border-start border-4 border-primary ps-3 mb-2">
                                "{comment}"
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-muted">No comments yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 