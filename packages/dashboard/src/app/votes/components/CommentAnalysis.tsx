'use client'

import React from 'react'
import { VoteAnalytics } from '@/lib/types'

/**
 * Props for the CommentAnalysis component
 */
export interface CommentAnalysisProps {
  /** Vote analytics data containing comment analysis information */
  analytics: VoteAnalytics | null
  /** Whether the component is in loading state */
  loading: boolean
}

export const CommentAnalysis: React.FC<CommentAnalysisProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Comment Analysis</h3>
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

  if (!analytics || analytics.commentAnalysis.totalComments === 0) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Comment Analysis</h3>
            </div>
            <div className="card-body text-center text-muted py-5">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </div>
              <h3>No Comments</h3>
              <p>No comments found for analysis in the selected time period.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { commentAnalysis } = analytics

  return (
    <div className="row row-deck row-cards">
      {/* Comment Overview */}
      <div className="col-md-4">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Comment Overview</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-primary text-white">
                      💬
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Total Comments</div>
                    <div className="text-muted">{commentAnalysis.totalComments.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <div className="col-12">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-info text-white">
                      📝
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Average Length</div>
                    <div className="text-muted">{commentAnalysis.averageCommentLength.toFixed(0)} characters</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="col-md-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Sentiment Analysis</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-success text-white">
                      😊
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Positive</div>
                    <div className="text-muted">
                      {commentAnalysis.sentimentAnalysis.positive.toLocaleString()} 
                      ({((commentAnalysis.sentimentAnalysis.positive / commentAnalysis.totalComments) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${(commentAnalysis.sentimentAnalysis.positive / commentAnalysis.totalComments) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-warning text-white">
                      😐
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Neutral</div>
                    <div className="text-muted">
                      {commentAnalysis.sentimentAnalysis.neutral.toLocaleString()} 
                      ({((commentAnalysis.sentimentAnalysis.neutral / commentAnalysis.totalComments) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-warning" 
                    style={{ width: `${(commentAnalysis.sentimentAnalysis.neutral / commentAnalysis.totalComments) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-danger text-white">
                      😞
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Negative</div>
                    <div className="text-muted">
                      {commentAnalysis.sentimentAnalysis.negative.toLocaleString()} 
                      ({((commentAnalysis.sentimentAnalysis.negative / commentAnalysis.totalComments) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-danger" 
                    style={{ width: `${(commentAnalysis.sentimentAnalysis.negative / commentAnalysis.totalComments) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Common Themes */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Common Themes</h3>
          </div>
          <div className="card-body">
            {commentAnalysis.commonThemes.length > 0 ? (
              <div className="space-y-3">
                {commentAnalysis.commonThemes.map((theme, index) => (
                  <div key={index} className="d-flex align-items-center">
                    <div className="me-3">
                      <span className={`badge ${
                        theme.sentiment === 'positive' ? 'bg-success' : 
                        theme.sentiment === 'negative' ? 'bg-danger' : 'bg-warning'
                      }`}>
                        {theme.sentiment === 'positive' ? '😊' : 
                         theme.sentiment === 'negative' ? '😞' : '😐'}
                      </span>
                    </div>
                    <div className="flex-fill">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="fw-medium">{theme.theme}</div>
                        <small className="text-muted">{theme.count} mentions</small>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div 
                          className={`progress-bar ${
                            theme.sentiment === 'positive' ? 'bg-success' : 
                            theme.sentiment === 'negative' ? 'bg-danger' : 'bg-warning'
                          }`}
                          style={{ width: `${(theme.count / commentAnalysis.totalComments) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-3">
                <p>No common themes identified</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Comments */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Comments</h3>
          </div>
          <div className="card-body">
            {commentAnalysis.topComments.length > 0 ? (
              <div className="space-y-3">
                {commentAnalysis.topComments.slice(0, 5).map((comment, index) => (
                  <div key={index} className="border-start border-4 border-primary ps-3 mb-3">
                    <div className="d-flex align-items-start">
                      <div className="me-2">
                        <span className={`badge ${comment.vote > 0 ? 'bg-success' : 'bg-danger'}`}>
                          {comment.vote > 0 ? '👍' : '👎'}
                        </span>
                      </div>
                      <div className="flex-fill">
                        <div className="mb-1">
                          "{comment.comment}"
                        </div>
                        <small className="text-muted">
                          {comment.userId} • {new Date(comment.timestamp).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-3">
                <p>No recent comments available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 