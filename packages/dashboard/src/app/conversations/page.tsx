'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useConversations } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import { Pagination } from '@/components/ui/pagination'

/**
 * ConversationsContent component renders the main conversations analytics interface
 * including statistics, filters, and conversation data table with pagination state management.
 */
const ConversationsContent: React.FC = () => {
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  
  // Use useMemo to create a stable filters object
  const filters = useMemo(() => ({}), [])
  
  const { data, loading, error } = useConversations(filters, page, limit)

  if (loading) {
    return (
      <DashboardLayout 
        title="Conversation Analytics"
        subtitle="Loading conversation data..."
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
      >
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error loading conversations</h4>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  const totalConversations = data?.total || 0  // Use actual total count, not current page length
  const completedConversations = data?.conversations.filter(conv => conv.endTime).length || 0
  const activeConversations = data?.conversations.filter(conv => !conv.endTime).length || 0
  const successRate = totalConversations > 0 ? (completedConversations / totalConversations) * 100 : 0

  return (
    <DashboardLayout 
      title="Conversation Analytics" 
      subtitle="Multi-turn chat analysis and user engagement patterns"
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Conversations"
            value={totalConversations.toLocaleString()}
            trend={totalConversations > 0 ? 'up' : 'stable'}
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
            value={activeConversations.toLocaleString()}
            trend={activeConversations > 0 ? 'up' : 'stable'}
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
            title="Completed"
            value={completedConversations.toLocaleString()}
            trend={completedConversations > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            }
          />
        </div>
      </div>

      {/* Conversations Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Conversations</h3>
        </div>
        <div className="card-body">
          {data && data.conversations.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Conversation ID</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Messages</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.conversations.map((conversation, index) => (
                    <tr key={index}>
                      <td className="text-muted">
                        <code>{conversation.id}</code>
                      </td>
                      <td className="text-muted">
                        <code>{conversation.userId}</code>
                      </td>
                      <td>
                        <span className={`badge ${
                          conversation.endTime ? 'bg-success text-white' : 'bg-primary text-white'
                        }`}>
                          {conversation.endTime ? 'completed' : 'active'}
                        </span>
                      </td>
                      <td>
                        {conversation.totalMessages || 0}
                      </td>
                      <td className="text-muted">
                        {new Date(conversation.startTime).toLocaleString()}
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
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <h3>No conversation tracking enabled</h3>
                <p>This system currently tracks individual votes, not full conversations.</p>
                <p className="text-muted small">
                  To enable conversation tracking, use the SDK's <code>startConversation()</code>, 
                  <code>addMessage()</code>, and <code>endConversation()</code> methods.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Conversations component is the main page component that renders the conversations analytics
 * section with a Suspense fallback for loading states.
 */
export default function Conversations() {
  return (
    <Suspense fallback={<div>Loading conversations...</div>}>
      <ConversationsContent />
    </Suspense>
  )
} 