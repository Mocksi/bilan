'use client'

import { VoteAnalytics } from '@/lib/types'
import { SimpleLineChart } from '@/components/SimpleLineChart'

interface VoteTrendsProps {
  analytics: VoteAnalytics | null
  loading: boolean
}

export function VoteTrends({ analytics, loading }: VoteTrendsProps) {
  if (loading) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Vote Trends</h3>
            </div>
            <div className="card-body">
              <div className="placeholder placeholder-lg"></div>
              <div className="placeholder placeholder-lg"></div>
              <div className="placeholder placeholder-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Vote Trends</h3>
            </div>
            <div className="card-body text-center text-muted py-5">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="M7 12l4-4 4 4 4-4"/>
                </svg>
              </div>
              <h3>No Trend Data</h3>
              <p>No vote trends available for the selected time period.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { trends } = analytics

  // Prepare data for daily trends chart
  const dailyTrendsData = trends.daily.map(day => ({
    date: day.date,
    trustScore: day.positiveRate,
    totalVotes: day.totalVotes,
    positiveVotes: day.positiveVotes
  }))

  // Prepare data for hourly distribution
  const hourlyData = trends.hourly.map(hour => ({
    hour: hour.hour,
    totalVotes: hour.totalVotes,
    positiveRate: hour.positiveRate
  }))

  return (
    <div className="row row-deck row-cards">
      {/* Daily Trends Chart */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Daily Vote Trends</h3>
            <div className="card-actions">
              <div className="d-flex gap-2">
                <div className="d-flex align-items-center">
                  <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#206bc4' }}></div>
                  <small className="text-muted">Positive Rate</small>
                </div>
                <div className="d-flex align-items-center">
                  <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#79a6dc' }}></div>
                  <small className="text-muted">Total Votes</small>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body">
            {dailyTrendsData.length > 0 ? (
              <SimpleLineChart data={dailyTrendsData} height={300} />
            ) : (
              <div className="text-center text-muted py-5">
                <p>No daily trend data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Hourly Vote Distribution</h3>
          </div>
          <div className="card-body">
            {hourlyData.length > 0 ? (
              <div className="space-y-3">
                {hourlyData.map((hour, index) => (
                  <div key={index} className="d-flex align-items-center">
                    <div className="me-3 text-muted" style={{ minWidth: '60px' }}>
                      {hour.hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-fill">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">{hour.totalVotes} votes</small>
                        <small className="text-muted">{(hour.positiveRate * 100).toFixed(1)}% positive</small>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          style={{ width: `${hour.positiveRate * 100}%` }}
                        ></div>
                        <div 
                          className="progress-bar bg-danger" 
                          style={{ width: `${(1 - hour.positiveRate) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <p>No hourly data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary Stats */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Daily Summary</h3>
          </div>
          <div className="card-body">
            {trends.daily.length > 0 ? (
              <div className="space-y-3">
                {trends.daily.slice(-7).map((day, index) => (
                  <div key={index} className="d-flex align-items-center">
                    <div className="me-3 text-muted" style={{ minWidth: '80px' }}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex-fill">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">{day.totalVotes} votes</small>
                        <small className={`fw-medium ${day.positiveRate > 0.5 ? 'text-success' : 'text-danger'}`}>
                          {(day.positiveRate * 100).toFixed(1)}%
                        </small>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          style={{ width: `${day.positiveRate * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <p>No daily summary available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Insights */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Trend Insights</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-primary text-white">
                      📈
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Peak Hour</div>
                    <div className="text-muted">
                      {hourlyData.length > 0 ? (
                        `${hourlyData.reduce((max, hour) => hour.totalVotes > max.totalVotes ? hour : max).hour}:00`
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-success text-white">
                      📊
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Best Day</div>
                    <div className="text-muted">
                      {trends.daily.length > 0 ? (
                        new Date(trends.daily.reduce((max, day) => day.positiveRate > max.positiveRate ? day : max).date)
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-info text-white">
                      🎯
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Most Active Day</div>
                    <div className="text-muted">
                      {trends.daily.length > 0 ? (
                        new Date(trends.daily.reduce((max, day) => day.totalVotes > max.totalVotes ? day : max).date)
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ) : (
                        'N/A'
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
  )
} 