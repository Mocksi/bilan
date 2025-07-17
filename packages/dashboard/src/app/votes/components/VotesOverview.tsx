'use client'

import React from 'react'
import { VoteAnalytics } from '@/lib/types'
import StatsCard from '@/components/StatsCard'
import { ThumbsUpIcon } from '@/components/icons'

interface VotesOverviewProps {
  analytics: VoteAnalytics | null
  loading: boolean
}

export function VotesOverview({ analytics, loading }: VotesOverviewProps) {
  if (loading) {
    return (
      <div className="row row-deck row-cards">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="col-sm-6 col-lg-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="subheader">Loading...</div>
                </div>
                <div className="h1 mb-0 me-2">
                  <div className="placeholder placeholder-lg col-4"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-body text-center text-muted py-5">
              <div className="mb-3">
                <ThumbsUpIcon width={48} height={48} />
              </div>
              <h3>No Vote Data</h3>
              <p>No votes found for the selected time period.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { overview } = analytics

  return (
    <div className="row row-deck row-cards">
      {/* Total Votes */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Total Votes</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{overview.totalVotes.toLocaleString()}</div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                {overview.uniqueUsers} unique users
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Positive Rate */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Positive Rate</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{(overview.positiveRate * 100).toFixed(1)}%</div>
              <div className="ms-auto">
                <span className={`badge ${overview.positiveRate > 0.7 ? 'bg-success' : overview.positiveRate < 0.3 ? 'bg-danger' : 'bg-secondary'}`}>
                  {overview.positiveRate > 0.7 ? 'Positive' : overview.positiveRate < 0.3 ? 'Negative' : 'Neutral'}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <small className="text-success me-2">
                👍 {overview.positiveVotes.toLocaleString()} positive
              </small>
              <small className="text-danger">
                👎 {overview.negativeVotes.toLocaleString()} negative
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Average Rating */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Average Rating</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{overview.averageRating.toFixed(2)}</div>
              <div className="ms-auto">
                <span className={`badge ${overview.averageRating > 0 ? 'bg-success' : overview.averageRating < 0 ? 'bg-danger' : 'bg-secondary'}`}>
                  {overview.averageRating > 0 ? 'Positive' : overview.averageRating < 0 ? 'Negative' : 'Neutral'}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                Scale: -1 (worst) to +1 (best)
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Comments</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{overview.commentsCount.toLocaleString()}</div>
              <div className="ms-auto">
                <small className="text-muted">
                  {overview.totalVotes > 0 ? Math.round((overview.commentsCount / overview.totalVotes) * 100) : 0}%
                </small>
              </div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                {overview.commentsCount} of {overview.totalVotes} votes
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Unique Users</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{overview.uniqueUsers.toLocaleString()}</div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                {overview.totalVotes > 0 ? (overview.totalVotes / overview.uniqueUsers).toFixed(1) : 0} avg votes per user
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Coverage */}
      <div className="col-sm-6 col-lg-3">
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="subheader">Unique Prompts</div>
            </div>
            <div className="d-flex align-items-baseline">
              <div className="h1 mb-0 me-2">{overview.uniquePrompts.toLocaleString()}</div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                {overview.uniquePrompts > 0 ? (overview.totalVotes / overview.uniquePrompts).toFixed(1) : 0} avg votes per prompt
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Distribution */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Vote Distribution</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-success text-white">
                      👍
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Positive Votes</div>
                    <div className="text-muted">
                      {overview.positiveVotes.toLocaleString()} ({(overview.positiveRate * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${overview.positiveRate * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-danger text-white">
                      👎
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">Negative Votes</div>
                    <div className="text-muted">
                      {overview.negativeVotes.toLocaleString()} ({((overview.negativeVotes / overview.totalVotes) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-danger" 
                    style={{ width: `${(overview.negativeVotes / overview.totalVotes) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    <span className="avatar avatar-sm bg-primary text-white">
                      💬
                    </span>
                  </div>
                  <div>
                    <div className="fw-medium">With Comments</div>
                    <div className="text-muted">
                      {overview.commentsCount.toLocaleString()} ({((overview.commentsCount / overview.totalVotes) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${(overview.commentsCount / overview.totalVotes) * 100}%` }}
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