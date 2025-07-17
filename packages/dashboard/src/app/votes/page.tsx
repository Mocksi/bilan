'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useVotes } from '@/lib/api-client'
import { VoteData } from '@/lib/types'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { ThumbsUpIcon } from '@/components/icons'

/**
 * VotesContent component renders the main votes analytics interface
 * including statistics, filters, and vote data table with pagination state management.
 */
const VotesContent: React.FC = () => {
  const [page, setPage] = useState(1)
  const [limit] = useState(25) // Reduced limit to enable pagination
  
  // Use useMemo to create a stable filters object
  const filters = useMemo(() => ({}), [])
  
  const { data, loading, error } = useVotes(filters, page, limit)

  if (loading) {
    return (
      <DashboardLayout 
        title="Vote Analytics"
        subtitle="Loading vote data..."
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
        title="Vote Analytics"
        subtitle="Error loading votes"
      >
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error loading votes</h4>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  const totalVotes = data?.votes.length || 0
  const positiveVotes = data?.votes.filter(vote => vote.value > 0).length || 0
  const negativeVotes = data?.votes.filter(vote => vote.value < 0).length || 0
  const commentsCount = data?.votes.filter(vote => vote.comment).length || 0
  const positiveRate = totalVotes > 0 ? (positiveVotes / totalVotes) * 100 : 0

  return (
    <DashboardLayout 
      title="Vote Analytics"
      subtitle="Detailed analysis of user feedback and voting patterns"
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Votes"
            value={totalVotes.toLocaleString()}
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
            title="Positive Rate"
            value={`${positiveRate.toFixed(1)}%`}
            trend={positiveRate > 50 ? 'up' : positiveRate < 50 ? 'down' : 'stable'}
            icon={<ThumbsUpIcon width={16} height={16} />}
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Negative Votes"
            value={negativeVotes.toLocaleString()}
            trend={negativeVotes > 0 ? 'down' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2"></path>
                <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h-3.5a2 2 0 0 1-2-2.5v-1.38z"></path>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="With Comments"
            value={commentsCount.toLocaleString()}
            trend={commentsCount > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            }
          />
        </div>
      </div>

      {/* Votes Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">All Votes</h3>
            {data && (
              <p className="card-subtitle">
                Showing {data.votes.length} of {data.total} total votes 
                {data.total > limit && (
                  <span className="text-muted ms-2">
                    (Page {page} of {Math.ceil(data.total / limit)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="card-body">
          {data && data.votes.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>User</th>
                    <th>Vote</th>
                    <th>Comment</th>
                    <th>Model</th>
                    <th>Response Time</th>
                    <th>Prompt Text</th>
                    <th>AI Output</th>
                    <th>Session ID</th>
                    <th>Conversation ID</th>
                    <th>Journey</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.votes.map((vote, index) => (
                    <tr key={index}>
                      <td className="text-muted">
                        <code>{vote.promptId}</code>
                      </td>
                      <td className="text-muted">
                        <code>{vote.userId}</code>
                      </td>
                      <td>
                        <span className={`badge ${vote.value > 0 ? 'bg-success' : 'bg-danger'}`}>
                          {vote.value > 0 ? '+1' : '-1'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {vote.comment ? (
                          <span title={vote.comment}>
                            {vote.comment.length > 30 ? `${vote.comment.substring(0, 30)}...` : vote.comment}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.model ? (
                          <code className="text-primary">{vote.model}</code>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.responseTime ? (
                          <span>{(vote.responseTime * 1000).toFixed(0)}ms</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.promptText ? (
                          <span title={vote.promptText}>
                            {vote.promptText.length > 50 ? `${vote.promptText.substring(0, 50)}...` : vote.promptText}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.aiOutput ? (
                          <span title={vote.aiOutput}>
                            {vote.aiOutput.length > 50 ? `${vote.aiOutput.substring(0, 50)}...` : vote.aiOutput}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.metadata?.sessionId ? (
                          <code>{vote.metadata.sessionId}</code>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.metadata?.conversationId ? (
                          <code>{vote.metadata.conversationId}</code>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {vote.metadata?.journey ? (
                          <span className="badge bg-info">{vote.metadata.journey}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-muted">
                        {new Date(vote.timestamp).toLocaleString()}
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
                  <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5"/>
                </svg>
                <h3>No votes found</h3>
                <p>No votes found for the selected time period.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Votes component is the main page component that renders the votes analytics
 * section with a Suspense fallback for loading states.
 */
export default function Votes() {
  return (
    <Suspense fallback={<div>Loading votes...</div>}>
      <VotesContent />
    </Suspense>
  )
} 