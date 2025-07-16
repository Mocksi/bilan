'use client'

import { VoteData } from '@/lib/types'
import { 
  getVoteRatingEmoji, 
  getVoteRatingBadgeClass, 
  truncateText, 
  formatTimestamp, 
  formatRelativeTime 
} from '@/lib/votes-utils'

interface VoteTableProps {
  votes: VoteData[]
  loading: boolean
  onVoteClick: (vote: VoteData) => void
  className?: string
}

export function VoteTable({ votes, loading, onVoteClick, className = '' }: VoteTableProps) {
  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Vote Details</h3>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-vcenter">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>User</th>
                  <th>Prompt</th>
                  <th>Comment</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="placeholder placeholder-sm col-6"></div></td>
                    <td><div className="placeholder placeholder-sm col-8"></div></td>
                    <td><div className="placeholder placeholder-sm col-10"></div></td>
                    <td><div className="placeholder placeholder-sm col-12"></div></td>
                    <td><div className="placeholder placeholder-sm col-6"></div></td>
                    <td><div className="placeholder placeholder-sm col-4"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (votes.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Vote Details</h3>
        </div>
        <div className="card-body text-center text-muted py-5">
          <div className="mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10v12"/>
              <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h3.5a2 2 0 0 1 2 2.5v1.38z"/>
            </svg>
          </div>
          <h3>No Votes Found</h3>
          <p>No votes match the current filters. Try adjusting your search criteria.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title">Vote Details</h3>
        <div className="card-actions">
          <span className="text-muted">
            {votes.length} vote{votes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th>Rating</th>
                <th>User</th>
                <th>Prompt</th>
                <th>Comment</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr key={vote.id} className="cursor-pointer" onClick={() => onVoteClick(vote)}>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="me-2" style={{ fontSize: '1.2em' }}>
                        {getVoteRatingEmoji(vote.value)}
                      </span>
                      <span className={getVoteRatingBadgeClass(vote.value)}>
                        {vote.value > 0 ? 'Positive' : vote.value < 0 ? 'Negative' : 'Neutral'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>
                        {vote.userId}
                      </div>
                      {vote.metadata?.sessionId && (
                        <small className="text-muted">
                          Session: {truncateText(vote.metadata.sessionId, 10)}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="fw-medium text-truncate" style={{ maxWidth: '200px' }}>
                        {vote.promptId}
                      </div>
                      {vote.metadata?.promptText && (
                        <small className="text-muted">
                          {truncateText(vote.metadata.promptText, 50)}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '250px' }}>
                      {vote.comment ? (
                        <div>
                          <div className="text-truncate">
                            {truncateText(vote.comment, 100)}
                          </div>
                          <small className="text-muted">
                            {vote.comment.length} characters
                          </small>
                        </div>
                      ) : (
                        <span className="text-muted">No comment</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="fw-medium">
                        {formatRelativeTime(vote.timestamp)}
                      </div>
                      <small className="text-muted">
                        {formatTimestamp(vote.timestamp)}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          onVoteClick(vote)
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      {vote.metadata?.journey && (
                        <span className="badge bg-info" title={`Journey: ${vote.metadata.journey}`}>
                          {vote.metadata.step || 'Journey'}
                        </span>
                      )}
                      {vote.metadata?.model && (
                        <span className="badge bg-secondary" title={`Model: ${vote.metadata.model}`}>
                          {vote.metadata.model}
                        </span>
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
  )
} 