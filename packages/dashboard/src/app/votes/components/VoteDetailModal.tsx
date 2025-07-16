'use client'

import { VoteData } from '@/lib/types'
import { 
  getVoteRatingEmoji, 
  getVoteRatingBadgeClass, 
  formatTimestamp 
} from '@/lib/votes-utils'

interface VoteDetailModalProps {
  vote: VoteData | null
  onClose: () => void
}

export function VoteDetailModal({ vote, onClose }: VoteDetailModalProps) {
  if (!vote) return null

  return (
    <div className="modal modal-blur fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <div className="d-flex align-items-center">
                <span className="me-2" style={{ fontSize: '1.5em' }}>
                  {getVoteRatingEmoji(vote.value)}
                </span>
                Vote Details
              </div>
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              {/* Vote Rating */}
              <div className="col-md-6">
                <label className="form-label">Rating</label>
                <div>
                  <span className={getVoteRatingBadgeClass(vote.value)}>
                    {vote.value > 0 ? 'Positive' : vote.value < 0 ? 'Negative' : 'Neutral'} ({vote.value})
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="col-md-6">
                <label className="form-label">Time</label>
                <div className="text-muted">
                  {formatTimestamp(vote.timestamp)}
                </div>
              </div>

              {/* User ID */}
              <div className="col-md-6">
                <label className="form-label">User ID</label>
                <div className="text-muted font-monospace">
                  {vote.userId}
                </div>
              </div>

              {/* Prompt ID */}
              <div className="col-md-6">
                <label className="form-label">Prompt ID</label>
                <div className="text-muted font-monospace">
                  {vote.promptId}
                </div>
              </div>

              {/* Session ID */}
              {vote.metadata?.sessionId && (
                <div className="col-md-6">
                  <label className="form-label">Session ID</label>
                  <div className="text-muted font-monospace">
                    {vote.metadata.sessionId}
                  </div>
                </div>
              )}

              {/* Model */}
              {vote.metadata?.model && (
                <div className="col-md-6">
                  <label className="form-label">Model</label>
                  <div className="text-muted">
                    {vote.metadata.model}
                  </div>
                </div>
              )}

              {/* Journey */}
              {vote.metadata?.journey && (
                <div className="col-md-6">
                  <label className="form-label">Journey</label>
                  <div className="text-muted">
                    {vote.metadata.journey}
                    {vote.metadata.step && (
                      <span className="ms-2 badge bg-info">
                        {vote.metadata.step}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Response Time */}
              {vote.metadata?.responseTime && (
                <div className="col-md-6">
                  <label className="form-label">Response Time</label>
                  <div className="text-muted">
                    {vote.metadata.responseTime}ms
                  </div>
                </div>
              )}

              {/* Comment */}
              {vote.comment && (
                <div className="col-12">
                  <label className="form-label">Comment</label>
                  <div className="card">
                    <div className="card-body">
                      <p className="mb-0">{vote.comment}</p>
                      <small className="text-muted">
                        {vote.comment.length} characters
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Text */}
              {vote.metadata?.promptText && (
                <div className="col-12">
                  <label className="form-label">Prompt Text</label>
                  <div className="card">
                    <div className="card-body">
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                        {vote.metadata.promptText}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Output */}
              {vote.metadata?.aiOutput && (
                <div className="col-12">
                  <label className="form-label">AI Output</label>
                  <div className="card">
                    <div className="card-body">
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                        {vote.metadata.aiOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Metadata */}
              {vote.metadata && Object.keys(vote.metadata).length > 0 && (
                <div className="col-12">
                  <label className="form-label">
                    Additional Metadata
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary ms-2"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(vote.metadata, null, 2))
                      }}
                    >
                      Copy JSON
                    </button>
                  </label>
                  <div className="card">
                    <div className="card-body">
                      <pre className="mb-0" style={{ fontSize: '0.8em', maxHeight: '200px', overflow: 'auto' }}>
                        {JSON.stringify(vote.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  const voteData = {
                    id: vote.id,
                    promptId: vote.promptId,
                    userId: vote.userId,
                    rating: vote.value > 0 ? 'positive' : vote.value < 0 ? 'negative' : 'neutral',
                    value: vote.value,
                    comment: vote.comment,
                    timestamp: new Date(vote.timestamp).toISOString(),
                    ...vote.metadata
                  }
                  navigator.clipboard.writeText(JSON.stringify(voteData, null, 2))
                }}
              >
                Copy Vote Data
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
    </div>
  )
} 