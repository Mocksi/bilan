'use client'

import React, { useState } from 'react'
import { VoteData } from '@/lib/types'
import { ThumbsUpIcon, ThumbsDownIcon } from '@/components/icons'
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

export const VoteTable: React.FC<VoteTableProps> = ({ votes, loading, onVoteClick, className = '' }) => {
  const [selectedVotes, setSelectedVotes] = useState<Set<string>>(new Set())

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVotes(new Set(votes.map(v => v.id)))
    } else {
      setSelectedVotes(new Set())
    }
  }

  const handleSelectVote = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedVotes)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedVotes(newSelected)
  }



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
            <ThumbsUpIcon width={48} height={48} />
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
                      {vote.promptText && (
                        <small className="text-muted">
                          {truncateText(vote.promptText, 50)}
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
                        <span className="badge bg-info text-white" title={`Journey: ${vote.metadata.journey}`}>
                          {vote.metadata.step || 'Journey'}
                        </span>
                      )}
                      {vote.model && (
                        <span className="badge bg-secondary text-white" title={`Model: ${vote.model}`}>
                          {vote.model}
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