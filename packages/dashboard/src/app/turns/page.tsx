'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useTurns, useTurnAnalytics } from '@/lib/api-client'
import { TurnData } from '@/lib/types'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'

import { Pagination } from '@/components/ui/pagination'

/**
 * TurnsContent component renders the main turns analytics interface
 * including statistics, filters, and turn data table with pagination state management.
 */
const TurnsContent: React.FC = () => {
  const [page, setPage] = useState(1)
  const [limit] = useState(25) // Reduced limit to enable pagination
  
  // Use useMemo to create a stable filters object
  const filters = useMemo(() => ({}), [])
  
  const { data, loading, error } = useTurns(filters, page, limit)
  const { data: analytics } = useTurnAnalytics('30d')

  if (loading) {
    return (
      <DashboardLayout 
        title="Turn Analytics"
        subtitle="Loading turn data..."
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
        title="Turn Analytics"
        subtitle="Error loading turns"
      >
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error loading turns</h4>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  // Use events API total for consistency, scale analytics proportionally
  const totalTurns = data?.total || 0
  const analyticsTotal = analytics?.overview.totalTurns || 1 // Avoid division by zero
  const scaleFactor = totalTurns / analyticsTotal
  
  const completedTurns = Math.round((analytics?.overview.completedTurns || 0) * scaleFactor)
  const failedTurns = Math.round((analytics?.overview.failedTurns || 0) * scaleFactor)
  const withFeedback = Math.round((analytics?.overview.turnsWithFeedback || 0) * scaleFactor)
  const avgResponseTime = analytics?.overview.averageResponseTime || 0

  return (
    <DashboardLayout 
      title="Turn Analytics"
      subtitle="Detailed analysis of AI interactions and performance"
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Turns"
            value={totalTurns.toLocaleString()}
            trend="stable"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 2.1l4 4-4 4"/>
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Completed Turns"
            value={completedTurns.toLocaleString()}
            trend={completedTurns > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Failed Turns"
            value={failedTurns.toLocaleString()}
            trend={failedTurns > 0 ? 'down' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Avg Response Time"
            value={`${avgResponseTime.toFixed(0)}ms`}
            trend={avgResponseTime < 1000 ? 'up' : 'down'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            }
          />
        </div>
      </div>

      {/* Turns Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">All Turns</h3>
            {data && (
              <p className="card-subtitle">
                Showing {data.turns.length} of {data.total} total turns 
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
          {data && data.turns.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table table-vcenter">
                  <thead>
                    <tr>
                      <th>Turn ID</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Prompt</th>
                      <th>Response</th>
                      <th>Response Time</th>
                      <th>Vote</th>
                      <th>Conversation</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.turns.map((turn: TurnData, index: number) => (
                      <tr key={index}>
                        <td className="text-muted">
                          <code>{turn.id}</code>
                        </td>
                        <td className="text-muted">
                          <code>{turn.userId}</code>
                        </td>
                        <td>
                          <span className={`badge ${turn.status === 'completed' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                            {turn.status}
                          </span>
                        </td>
                        <td className="text-muted">
                          {turn.promptText ? (
                            <span title={turn.promptText}>
                              {turn.promptText.length > 50 ? `${turn.promptText.substring(0, 50)}...` : turn.promptText}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-muted">
                          {turn.responseText ? (
                            <span title={turn.responseText}>
                              {turn.responseText.length > 50 ? `${turn.responseText.substring(0, 50)}...` : turn.responseText}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-muted">
                          {turn.responseTime ? (
                            <span>{(turn.responseTime * 1000).toFixed(0)}ms</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {turn.voteValue !== undefined && turn.voteId ? (
                            <div className="d-flex flex-column align-items-start">
                              <span className={`badge ${turn.voteValue > 0 ? 'bg-success text-white' : 'bg-danger text-white'} mb-1`}>
                                {turn.voteValue > 0 ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 10v12"></path>
                                    <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 14V2"></path>
                                    <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
                                  </svg>
                                )}
                              </span>
                              <small className="text-muted">
                                <code>{turn.voteId}</code>
                              </small>
                            </div>
                          ) : turn.voteValue !== undefined ? (
                            <span className={`badge ${turn.voteValue > 0 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                              {turn.voteValue > 0 ? '👍' : '👎'}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-muted">
                          {turn.conversationId ? (
                            <code>{turn.conversationId}</code>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-muted">
                          {new Date(turn.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="mt-3">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(data.total / limit)}
                  onPageChange={setPage}
                  totalItems={data.total}
                  itemsPerPage={limit}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <div className="text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                  <path d="M17 2.1l4 4-4 4"/>
                  <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/>
                  <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>
                </svg>
                <h3>No turns found</h3>
                <p>No AI interactions found for the selected time period.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Turns component is the main page component that renders the turns analytics
 * section with a Suspense fallback for loading states.
 */
export default function Turns() {
  return (
    <Suspense fallback={<div>Loading turns...</div>}>
      <TurnsContent />
    </Suspense>
  )
} 