import React from 'react'
import { ConversationSummary } from '@/lib/types'
import { ConversationFilterState } from './ConversationFilter'
import { formatTimestamp } from '@/lib/time-utils'

interface ConversationTableProps {
  conversations: ConversationSummary[]
  filterState: ConversationFilterState
  onConversationClick: (conversation: ConversationSummary) => void
  className?: string
}

interface HighlightedTextProps {
  text: string
  searchTerm: string
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, searchTerm }) => {
  if (!searchTerm || !text) {
    return <>{text}</>
  }

  // Escape regex special characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi')
  
  const parts = text.split(regex)
  
  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === searchTerm.toLowerCase()
        return isMatch ? (
          <mark key={index}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </>
  )
}

export const ConversationTable: React.FC<ConversationTableProps> = ({
  conversations,
  filterState,
  onConversationClick,
  className = ''
}) => {
  if (conversations.length === 0) {
    return (
      <div className={`text-center py-5 ${className}`}>
        <div className="text-muted">
          <i className="fas fa-comments fa-3x mb-3"></i>
          <h5>No conversations found</h5>
          <p>Try adjusting your filters or check back later for new conversations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`table-responsive ${className}`}>
      <table className="table table-hover">
        <thead className="table-light">
          <tr>
            <th>Conversation</th>
            <th>Outcome</th>
            <th>Feedback</th>
            <th>Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conversation) => (
            <tr 
              key={conversation.promptId}
              className="cursor-pointer"
              onClick={() => onConversationClick(conversation)}
            >
              <td>
                <div className="d-flex flex-column">
                  <div className="fw-medium">
                    {filterState.search ? (
                      <HighlightedText 
                        text={conversation.promptId} 
                        searchTerm={filterState.search} 
                      />
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
                    </div>
                  )}
                </div>
              </td>
              <td>
                <span className={`badge ${
                  conversation.outcome === 'positive' ? 'bg-success' : 'bg-danger'
                }`}>
                  {conversation.outcome}
                </span>
              </td>
              <td>
                <div className="d-flex flex-column">
                  <span className="fw-medium">{conversation.feedbackCount}</span>
                  <span className="text-muted small">feedback items</span>
                </div>
              </td>
              <td>
                <div className="d-flex flex-column">
                  <span className="small">{formatTimestamp(conversation.lastActivity)}</span>
                  <span className="text-muted small">last activity</span>
                </div>
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  <button 
                    type="button" 
                    className="btn btn-outline-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onConversationClick(conversation)
                    }}
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle export functionality
                    }}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 