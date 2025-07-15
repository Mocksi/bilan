import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface ConversationFilterState {
  search: string
  outcome: 'all' | 'positive' | 'negative'
  journey: string
  user: string
}

interface ConversationFilterProps {
  onFilterChange: (filters: ConversationFilterState) => void
  className?: string
}

export const ConversationFilter: React.FC<ConversationFilterProps> = ({
  onFilterChange,
  className = ''
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<ConversationFilterState>({
    search: searchParams.get('search') || '',
    outcome: (searchParams.get('outcome') as ConversationFilterState['outcome']) || 'all',
    journey: searchParams.get('journey') || '',
    user: searchParams.get('user') || ''
  })

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const updateFilters = (newFilters: Partial<ConversationFilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    
    // Update URL parameters
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      outcome: 'all' as const,
      journey: '',
      user: ''
    }
    setFilters(clearedFilters)
    
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    params.delete('outcome')
    params.delete('journey')
    params.delete('user')
    router.push(`?${params.toString()}`)
  }

  const hasActiveFilters = filters.search || filters.outcome !== 'all' || filters.journey || filters.user

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title">Filter Conversations</h3>
          <div className="d-flex align-items-center">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-sm btn-outline-secondary me-2"
              >
                Clear filters
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-sm btn-outline-primary"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="card-body">
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-md-6">
              <label className="form-label">Search conversations</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search prompt text, AI responses, or comments..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>

            {/* Outcome Filter */}
            <div className="col-md-6">
              <label className="form-label">Outcome</label>
              <select
                className="form-select"
                value={filters.outcome}
                onChange={(e) => updateFilters({ outcome: e.target.value as ConversationFilterState['outcome'] })}
              >
                <option value="all">All outcomes</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>

            {/* Journey Filter */}
            <div className="col-md-6">
              <label className="form-label">Journey</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., checkout, onboarding, support..."
                value={filters.journey}
                onChange={(e) => updateFilters({ journey: e.target.value })}
              />
            </div>

            {/* User Filter */}
            <div className="col-md-6">
              <label className="form-label">User</label>
              <input
                type="text"
                className="form-control"
                placeholder="Filter by user ID..."
                value={filters.user}
                onChange={(e) => updateFilters({ user: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const useConversationFilter = () => {
  const searchParams = useSearchParams()
  
  const filters: ConversationFilterState = {
    search: searchParams.get('search') || '',
    outcome: (searchParams.get('outcome') as ConversationFilterState['outcome']) || 'all',
    journey: searchParams.get('journey') || '',
    user: searchParams.get('user') || ''
  }
  
  return filters
} 