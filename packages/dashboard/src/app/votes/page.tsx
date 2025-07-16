'use client'

import { useState, Suspense } from 'react'
import { Navigation, BreadcrumbItem } from '@/components/Navigation'
import { TimeRangeSelector, useTimeRange, TimeRange } from '@/components/TimeRangeSelector'
import { useVoteAnalytics } from '@/lib/api-client'
import { VoteData, VoteFilterState } from '@/lib/types'
import { VotesOverview } from './components/VotesOverview'
import { VoteTrends } from './components/VoteTrends'
import { VoteFilter } from './components/VoteFilter'
import { VoteTable } from './components/VoteTable'
import { VoteDetailModal } from './components/VoteDetailModal'
import { CommentAnalysis } from './components/CommentAnalysis'
import { PromptPerformance } from './components/PromptPerformance'
import { votesToCSV, downloadFile } from '@/lib/votes-utils'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Votes' }
]

function VotesPageContent() {
  const { timeRange, setTimeRange } = useTimeRange()
  const { data: analytics, loading, error, refresh } = useVoteAnalytics(timeRange)
  const [selectedVote, setSelectedVote] = useState<VoteData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'details' | 'comments' | 'prompts'>('overview')
  const [filters, setFilters] = useState<VoteFilterState>({
    search: '',
    rating: 'all',
    user: '',
    prompt: '',
    timeRange: '7d',
    hasComment: null,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  })

  // Mock vote data for table (in real implementation, this would come from API)
  const [votes] = useState<VoteData[]>([
    {
      id: '1',
      promptId: 'prompt-123',
      userId: 'user-456',
      value: 1,
      comment: 'Great response, very helpful!',
      timestamp: Date.now() - 3600000,
      metadata: {
        promptText: 'What is the capital of France?',
        aiOutput: 'The capital of France is Paris.',
        responseTime: 250,
        model: 'gpt-4',
        sessionId: 'session-789'
      }
    },
    {
      id: '2',
      promptId: 'prompt-124',
      userId: 'user-789',
      value: -1,
      comment: 'Not accurate, needs improvement',
      timestamp: Date.now() - 7200000,
      metadata: {
        promptText: 'Explain quantum computing',
        aiOutput: 'Quantum computing uses quantum mechanics...',
        responseTime: 450,
        model: 'gpt-4',
        sessionId: 'session-101'
      }
    }
  ])

  const handleExport = () => {
    const csvContent = votesToCSV(votes)
    downloadFile(csvContent, `votes-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  }

  const handleRefresh = () => {
    refresh()
  }

  return (
    <Navigation breadcrumbs={breadcrumbs}>
      {/* Header */}
      <div className="page-header">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Votes Analytics</h2>
            <div className="text-muted mt-1">
              Individual feedback and rating events
            </div>
          </div>
          <div className="col-auto">
            <div className="d-flex gap-2">
              <button
                onClick={handleExport}
                className="btn btn-outline-primary"
                disabled={loading || votes.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
              <button onClick={handleRefresh} className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Refresh
              </button>
              <Suspense fallback={<div className="btn btn-outline-primary">Loading...</div>}>
                <TimeRangeSelector 
                  value={timeRange}
                  onChange={setTimeRange}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <div className="d-flex">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="alert-icon">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <div>
              <h4 className="alert-title">Error loading votes data</h4>
              <div className="text-muted">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'trends' ? 'active' : ''}`}
                onClick={() => setActiveTab('trends')}
              >
                Trends
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                Vote Details
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                Comments
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'prompts' ? 'active' : ''}`}
                onClick={() => setActiveTab('prompts')}
              >
                Prompts
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <VotesOverview analytics={analytics} loading={loading} />
        )}

        {activeTab === 'trends' && (
          <VoteTrends analytics={analytics} loading={loading} />
        )}

        {activeTab === 'details' && (
          <div className="row">
            <div className="col-md-4">
              <VoteFilter 
                onFilterChange={setFilters}
                className="mb-4"
              />
            </div>
            <div className="col-md-8">
              <VoteTable 
                votes={votes}
                loading={loading}
                onVoteClick={setSelectedVote}
              />
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <CommentAnalysis analytics={analytics} loading={loading} />
        )}

        {activeTab === 'prompts' && (
          <PromptPerformance analytics={analytics} loading={loading} />
        )}
      </div>

      {/* Vote Detail Modal */}
      <VoteDetailModal 
        vote={selectedVote}
        onClose={() => setSelectedVote(null)}
      />
    </Navigation>
  )
}

export default function VotesPage() {
  return (
    <Suspense fallback={<div>Loading votes page...</div>}>
      <VotesPageContent />
    </Suspense>
  )
} 