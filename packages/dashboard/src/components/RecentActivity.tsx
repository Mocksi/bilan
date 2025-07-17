import React from 'react'
import Link from 'next/link'
import { DashboardData } from '@/lib/types'
import { ThumbsUpIcon, ThumbsDownIcon } from './icons'

interface RecentActivityProps {
  data: DashboardData
  className?: string
}

export function RecentActivity({ data, className = '' }: RecentActivityProps) {
  const { recentActivity } = data

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m ago`
    }
    if (hours < 24) {
      return `${hours}h ago`
    }
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getVoteIcon = (value: number) => {
    return value === 1 ? (
      <ThumbsUpIcon width={16} height={16} className="text-success" />
    ) : (
      <ThumbsDownIcon width={16} height={16} className="text-danger" />
    )
  }

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-subtitle">Latest user interactions and feedback</p>
        </div>
      </div>
      <div className="card-body">
        {recentActivity.recentVotes.length > 0 ? (
          <>
            <div className="divide-y">
              {recentActivity.recentVotes.slice(0, 5).map((vote, index) => (
                <div key={index} className="py-3">
                  <div className="d-flex align-items-center mb-2">
                    {getVoteIcon(vote.value)}
                    <span className="ms-2 fw-medium flex-fill">
                      {vote.metadata?.promptText 
                        ? truncateText(vote.metadata.promptText)
                        : 'No prompt text available'
                      }
                    </span>
                    <span className="text-muted small ms-2">
                      {formatTimeAgo(vote.timestamp)}
                    </span>
                  </div>
                  <div className="text-muted small">
                    User: <code className="text-reset">{vote.userId}</code>
                  </div>
                  {vote.comment && (
                    <div className="text-muted small mt-1 fst-italic">
                      "{vote.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end mt-3">
              <Link href="/votes" className="btn btn-sm btn-outline-primary">
                See more
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-5">
            <div className="text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                <path d="M12 2v20"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <h3>No recent activity</h3>
              <p>Recent votes and interactions will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 