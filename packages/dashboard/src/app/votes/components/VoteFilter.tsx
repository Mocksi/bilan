'use client'

import { useState } from 'react'
import { VoteFilterState } from '@/lib/types'

interface VoteFilterProps {
  onFilterChange: (filters: VoteFilterState) => void
  className?: string
}

export function VoteFilter({ onFilterChange, className = '' }: VoteFilterProps) {
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

  const handleFilterChange = (key: keyof VoteFilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: VoteFilterState = {
      search: '',
      rating: 'all',
      user: '',
      prompt: '',
      timeRange: '7d',
      hasComment: null,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.rating !== 'all' ||
    filters.user !== '' ||
    filters.prompt !== '' ||
    filters.hasComment !== null

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title">Filter Votes</h3>
        {hasActiveFilters && (
          <div className="card-actions">
            <button
              onClick={clearFilters}
              className="btn btn-sm btn-outline-secondary"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Search */}
          <div className="col-md-6">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search votes, users, prompts, comments..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Rating Filter */}
          <div className="col-md-6">
            <label className="form-label">Rating</label>
            <select
              className="form-select"
              value={filters.rating}
              onChange={(e) => handleFilterChange('rating', e.target.value)}
            >
              <option value="all">All Ratings</option>
              <option value="positive">Positive Only</option>
              <option value="negative">Negative Only</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="col-md-6">
            <label className="form-label">User</label>
            <input
              type="text"
              className="form-control"
              placeholder="Filter by user ID..."
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            />
          </div>

          {/* Prompt Filter */}
          <div className="col-md-6">
            <label className="form-label">Prompt</label>
            <input
              type="text"
              className="form-control"
              placeholder="Filter by prompt ID..."
              value={filters.prompt}
              onChange={(e) => handleFilterChange('prompt', e.target.value)}
            />
          </div>

          {/* Comment Filter */}
          <div className="col-md-6">
            <label className="form-label">Comments</label>
            <select
              className="form-select"
              value={filters.hasComment === null ? 'all' : filters.hasComment ? 'with' : 'without'}
              onChange={(e) => {
                const value = e.target.value === 'all' ? null : e.target.value === 'with'
                handleFilterChange('hasComment', value)
              }}
            >
              <option value="all">All Votes</option>
              <option value="with">With Comments</option>
              <option value="without">Without Comments</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="col-md-6">
            <label className="form-label">Time Range</label>
            <select
              className="form-select"
              value={filters.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="col-md-6">
            <label className="form-label">Sort By</label>
            <select
              className="form-select"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="timestamp">Time</option>
              <option value="rating">Rating</option>
              <option value="user">User</option>
              <option value="prompt">Prompt</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="col-md-6">
            <label className="form-label">Sort Order</label>
            <select
              className="form-select"
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex flex-wrap gap-2">
              <small className="text-muted me-2">Active filters:</small>
              
              {filters.search && (
                <span className="badge bg-primary">
                  Search: "{filters.search}"
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.65em' }}
                    onClick={() => handleFilterChange('search', '')}
                  ></button>
                </span>
              )}

              {filters.rating !== 'all' && (
                <span className="badge bg-info">
                  Rating: {filters.rating}
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.65em' }}
                    onClick={() => handleFilterChange('rating', 'all')}
                  ></button>
                </span>
              )}

              {filters.user && (
                <span className="badge bg-success">
                  User: {filters.user}
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.65em' }}
                    onClick={() => handleFilterChange('user', '')}
                  ></button>
                </span>
              )}

              {filters.prompt && (
                <span className="badge bg-warning">
                  Prompt: {filters.prompt}
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.65em' }}
                    onClick={() => handleFilterChange('prompt', '')}
                  ></button>
                </span>
              )}

              {filters.hasComment !== null && (
                <span className="badge bg-secondary">
                  {filters.hasComment ? 'With Comments' : 'Without Comments'}
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-1"
                    style={{ fontSize: '0.65em' }}
                    onClick={() => handleFilterChange('hasComment', null)}
                  ></button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 