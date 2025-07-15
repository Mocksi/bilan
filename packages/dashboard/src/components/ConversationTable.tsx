import React, { useState } from 'react'
import { ConversationSummary } from '@/lib/types'
import { ConversationFilterState } from './ConversationFilter'
import { highlightSearchTerm } from '@/lib/filter-utils'
import { TagDisplay } from './ConversationTags'

export interface ConversationTableProps {
  conversations: ConversationSummary[]
  filteredConversations: ConversationSummary[]
  filterState: ConversationFilterState
  onConversationClick?: (conversation: ConversationSummary) => void
  className?: string
}

export const ConversationTable: React.FC<ConversationTableProps> = ({
  conversations,
  filteredConversations,
  filterState,
  onConversationClick,
  className = ''
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }



  const hasActiveFilters = filterState.search || filterState.outcome !== 'all' || filterState.journey || filterState.user
  const displayConversations = filteredConversations || conversations
  
  if (!conversations || conversations.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Recent Conversations</h3>
        </div>
        <div className="card-body text-center">
          <div className="text-muted">No conversations yet</div>
        </div>
      </div>
    )
  }

  if (hasActiveFilters && displayConversations.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Recent Conversations</h3>
          <div className="card-subtitle">
            No conversations match your filters. {conversations.length} total conversations available.
          </div>
        </div>
        <div className="card-body text-center">
          <div className="text-muted">Try adjusting your filters</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title">Recent Conversations</h3>
        <div className="card-subtitle">
          {hasActiveFilters ? (
            <span>
              Showing {displayConversations.length} of {conversations.length} conversations
              {filterState.search && <span> • Search: "{filterState.search}"</span>}
              {filterState.outcome !== 'all' && <span> • Outcome: {filterState.outcome}</span>}
              {filterState.journey && <span> • Journey: "{filterState.journey}"</span>}
              {filterState.user && <span> • User: "{filterState.user}"</span>}
            </span>
          ) : (
            <span>Showing all {conversations.length} conversations</span>
          )}
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-vcenter">
          <thead>
            <tr>
              <th>Conversation</th>
              <th>Feedback</th>
              <th>Outcome</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {displayConversations.map((conversation) => (
              <tr 
                key={conversation.promptId} 
                className={onConversationClick ? 'cursor-pointer' : ''}
                onClick={() => onConversationClick?.(conversation)}
              >
                <td>
                  <div className="d-flex flex-column">
                    <div className="fw-medium">
                      {filterState.search ? (
                        <span dangerouslySetInnerHTML={{
                          __html: highlightSearchTerm(conversation.promptId, filterState.search)
                        }} />
                      ) : (
                        conversation.promptId
                      )}
                    </div>
                    <div className="text-muted small">
                      User: {conversation.userId}
                    </div>
                    {conversation.journeyName && (
                      <div className="text-muted small">
                        Journey: {conversation.journeyName}
                        {conversation.journeyStep && ` → ${conversation.journeyStep}`}
                      </div>
                    )}
                    {conversation.tags && conversation.tags.length > 0 && (
                      <div className="mt-1">
                        {conversation.tags.map((tag, index) => (
                          <span key={index} className="badge badge-secondary me-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className="badge badge-outline">
                    {conversation.feedbackCount}
                  </span>
                </td>
                <td>
                  <span className={`badge ${conversation.outcome === 'positive' ? 'badge-success' : 'badge-danger'}`}>
                    {conversation.outcome}
                  </span>
                </td>
                <td>
                  <div className="text-muted">
                    {formatTimestamp(conversation.lastActivity)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 