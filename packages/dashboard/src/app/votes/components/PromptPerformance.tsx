'use client'

import React from 'react'
import { VoteAnalytics } from '@/lib/types'

/**
 * Props for the PromptPerformance component
 */
export interface PromptPerformanceProps {
  /** Vote analytics data containing prompt performance information */
  analytics: VoteAnalytics | null
  /** Whether the component is in loading state */
  loading: boolean
}

export const PromptPerformance: React.FC<PromptPerformanceProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Prompt Performance</h3>
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

  if (!analytics || analytics.promptPerformance.topPrompts.length === 0) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Prompt Performance</h3>
            </div>
            <div className="card-body text-center text-muted py-5">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>No Prompt Performance Data</h3>
              <p>No prompt performance data available for the selected time period.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { promptPerformance } = analytics

  return (
    <div className="row row-deck row-cards">
      {/* Performance Overview */}
      <div className="col-md-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Performance Overview</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-primary text-white">
                      📊
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Average Positive Rate</div>
                    <div className="text-muted">{(promptPerformance.performanceMetrics.averagePositiveRate * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
              
              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-success text-white">
                      🏆
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Best Performing</div>
                    <div className="text-muted font-monospace" style={{ fontSize: '0.8em' }}>
                      {promptPerformance.performanceMetrics.bestPerformingPrompt}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-danger text-white">
                      ⚠️
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Worst Performing</div>
                    <div className="text-muted font-monospace" style={{ fontSize: '0.8em' }}>
                      {promptPerformance.performanceMetrics.worstPerformingPrompt}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-warning text-white">
                      📝
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">No Votes</div>
                    <div className="text-muted">{promptPerformance.performanceMetrics.promptsWithoutVotes} prompts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Prompts */}
      <div className="col-md-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Performing Prompts</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Votes</th>
                    <th>Positive Rate</th>
                    <th>Response Time</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {promptPerformance.topPrompts.slice(0, 10).map((prompt, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <div className="fw-medium font-monospace" style={{ fontSize: '0.9em' }}>
                            {prompt.promptId}
                          </div>
                          {prompt.promptText && (
                            <small className="text-muted">
                              {prompt.promptText.length > 50 ? 
                                prompt.promptText.substring(0, 50) + '...' : 
                                prompt.promptText}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-medium">{prompt.totalVotes}</div>
                          <small className="text-muted">
                            {prompt.positiveVotes}👍 {prompt.negativeVotes}👎
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <span className={`badge ${prompt.positiveRate > 0.7 ? 'bg-success text-white' : prompt.positiveRate > 0.3 ? 'bg-warning' : 'bg-danger text-white'}`}>
                              {(prompt.positiveRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="progress flex-fill" style={{ height: '6px' }}>
                            <div 
                              className={`progress-bar ${prompt.positiveRate > 0.7 ? 'bg-success' : prompt.positiveRate > 0.3 ? 'bg-warning' : 'bg-danger'}`}
                              style={{ width: `${prompt.positiveRate * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-muted">
                          {prompt.averageResponseTime ? `${prompt.averageResponseTime.toFixed(0)}ms` : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {prompt.positiveRate > 0.8 && (
                            <span className="badge bg-success text-white me-1">Excellent</span>
                          )}
                          {prompt.positiveRate > 0.6 && prompt.positiveRate <= 0.8 && (
                            <span className="badge bg-primary text-white me-1">Good</span>
                          )}
                          {prompt.positiveRate > 0.4 && prompt.positiveRate <= 0.6 && (
                            <span className="badge bg-warning text-white me-1">Average</span>
                          )}
                          {prompt.positiveRate <= 0.4 && (
                            <span className="badge bg-danger text-white me-1">Poor</span>
                          )}
                          {prompt.totalVotes >= 100 && (
                            <span className="badge bg-info text-white">High Volume</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Performance Distribution</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-success text-white">
                      🌟
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Excellent ({'>'}80%)</div>
                    <div className="text-muted">
                      {promptPerformance.topPrompts.filter(p => p.positiveRate > 0.8).length} prompts
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${(promptPerformance.topPrompts.filter(p => p.positiveRate > 0.8).length / promptPerformance.topPrompts.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-primary text-white">
                      👍
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Good (60-80%)</div>
                    <div className="text-muted">
                      {promptPerformance.topPrompts.filter(p => p.positiveRate > 0.6 && p.positiveRate <= 0.8).length} prompts
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${(promptPerformance.topPrompts.filter(p => p.positiveRate > 0.6 && p.positiveRate <= 0.8).length / promptPerformance.topPrompts.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-warning text-white">
                      ⚡
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Average (40-60%)</div>
                    <div className="text-muted">
                      {promptPerformance.topPrompts.filter(p => p.positiveRate > 0.4 && p.positiveRate <= 0.6).length} prompts
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-warning" 
                    style={{ width: `${(promptPerformance.topPrompts.filter(p => p.positiveRate > 0.4 && p.positiveRate <= 0.6).length / promptPerformance.topPrompts.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-danger text-white">
                      🔻
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Poor ({'<'}40%)</div>
                    <div className="text-muted">
                      {promptPerformance.topPrompts.filter(p => p.positiveRate <= 0.4).length} prompts
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-danger" 
                    style={{ width: `${(promptPerformance.topPrompts.filter(p => p.positiveRate <= 0.4).length / promptPerformance.topPrompts.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 