'use client'

import { useState } from 'react'
import { ConversationFilterState } from '@/lib/types'
import { Search, Filter, X, Calendar, Users, MessageSquare, Star, Tag } from 'lucide-react'

interface ConversationFilterProps {
  filters: ConversationFilterState
  onFiltersChange: (filters: ConversationFilterState) => void
  userOptions: string[]
  tagOptions: string[]
}

export function ConversationFilter({ 
  filters, 
  onFiltersChange, 
  userOptions, 
  tagOptions 
}: ConversationFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFilterChange = (key: keyof ConversationFilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    handleFilterChange('tags', newTags)
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      userId: '',
      minMessages: null,
      maxMessages: null,
      satisfactionScore: null,
      tags: [],
      startDate: null,
      endDate: null,
      status: 'all',
      sortBy: 'startTime',
      sortOrder: 'desc'
    })
  }

  const hasActiveFilters = 
    filters.search ||
    filters.userId ||
    filters.minMessages !== null ||
    filters.maxMessages !== null ||
    filters.satisfactionScore !== null ||
    filters.tags.length > 0 ||
    filters.startDate ||
    filters.endDate ||
    filters.status !== 'all'

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="h-4 w-4" />
            <span>Advanced</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations, users, or content..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User
          </label>
          <select
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All users</option>
            {userOptions.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All conversations</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <div className="flex space-x-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="startTime">Start Time</option>
              <option value="endTime">End Time</option>
              <option value="totalMessages">Message Count</option>
              <option value="averageResponseTime">Response Time</option>
              <option value="satisfactionScore">Satisfaction</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Message Count Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Count Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  placeholder="Min messages"
                  value={filters.minMessages || ''}
                  onChange={(e) => handleFilterChange('minMessages', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max messages"
                  value={filters.maxMessages || ''}
                  onChange={(e) => handleFilterChange('maxMessages', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Satisfaction Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Satisfaction Score
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              placeholder="0.0 - 1.0"
              value={filters.satisfactionScore || ''}
              onChange={(e) => handleFilterChange('satisfactionScore', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  } border`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Active filters:</span>
            <div className="flex flex-wrap gap-1">
              {filters.search && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Search: {filters.search}
                </span>
              )}
              {filters.userId && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  User: {filters.userId}
                </span>
              )}
              {filters.status !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Status: {filters.status}
                </span>
              )}
              {filters.minMessages !== null && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Min: {filters.minMessages} msgs
                </span>
              )}
              {filters.maxMessages !== null && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Max: {filters.maxMessages} msgs
                </span>
              )}
              {filters.satisfactionScore !== null && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Satisfaction: ≥{filters.satisfactionScore}
                </span>
              )}
              {filters.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Tag: {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 