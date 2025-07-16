'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConversationData, ConversationFilterState } from '@/lib/types'
import { useConversationAnalytics, useConversations } from '@/lib/api-client'
import { 
  filterConversations, 
  sortConversations, 
  getUniqueFilterValues,
  exportConversationsToCSV,
  exportConversationsToJSON
} from '@/lib/conversations-utils'

import { ConversationsOverview } from './components/ConversationsOverview'
import { ConversationTrends } from './components/ConversationTrends'
import { ConversationFilter } from './components/ConversationFilter'
import { ConversationTable } from './components/ConversationTable'
import { ConversationDetailModal } from './components/ConversationDetailModal'

import { 
  MessageSquare, 
  TrendingUp, 
  Filter, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

function ConversationsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [timeRange, setTimeRange] = useState('7d')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  
  const [filters, setFilters] = useState<ConversationFilterState>({
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

  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Fetch analytics data
  const { 
    data: analytics, 
    loading: analyticsLoading, 
    error: analyticsError, 
    refresh: refreshAnalytics 
  } = useConversationAnalytics(timeRange)

  // Fetch conversations data
  const { 
    data: conversationsData, 
    loading: conversationsLoading, 
    error: conversationsError, 
    refresh: refreshConversations 
  } = useConversations(filters, currentPage, pageSize)

  // Get filter options
  const filterOptions = conversationsData?.conversations 
    ? getUniqueFilterValues(conversationsData.conversations)
    : { users: [], tags: [], topics: [] }

  // Handle tab change
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Handle conversation selection
  const handleConversationClick = (conversation: ConversationData) => {
    setSelectedConversation(conversation)
    setShowDetailModal(true)
  }

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    if (!conversationsData?.conversations) return

    try {
      let content: string
      let filename: string
      let mimeType: string

      if (format === 'csv') {
        content = exportConversationsToCSV(conversationsData.conversations)
        filename = `conversations-${new Date().toISOString().split('T')[0]}.csv`
        mimeType = 'text/csv'
      } else {
        content = exportConversationsToJSON(conversationsData.conversations)
        filename = `conversations-${new Date().toISOString().split('T')[0]}.json`
        mimeType = 'application/json'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    refreshAnalytics()
    refreshConversations()
  }

  // Tabs configuration
  const tabs = [
    { id: 'overview', name: 'Overview', icon: MessageSquare },
    { id: 'trends', name: 'Trends', icon: TrendingUp },
    { id: 'conversations', name: 'Conversations', icon: Filter }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations Analytics</h1>
          <p className="text-gray-600 mt-1">
            Analyze multi-turn chat interactions and conversation patterns
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Error States */}
      {analyticsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">Failed to load analytics: {analyticsError}</p>
          </div>
        </div>
      )}

      {conversationsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">Failed to load conversations: {conversationsError}</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div>
            {analyticsLoading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : analytics ? (
              <ConversationsOverview analytics={analytics} />
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
                  <p className="text-gray-500">Analytics data will appear here once conversations are recorded.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <div>
            {analyticsLoading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-80 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : analytics ? (
              <ConversationTrends analytics={analytics} />
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No trend data available</h3>
                  <p className="text-gray-500">Trend data will appear here once conversations are recorded.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="space-y-6">
            <ConversationFilter
              filters={filters}
              onFiltersChange={setFilters}
              userOptions={filterOptions.users}
              tagOptions={filterOptions.tags}
            />
            
            <ConversationTable
              conversations={conversationsData?.conversations || []}
              loading={conversationsLoading}
              onConversationClick={handleConversationClick}
              currentPage={currentPage}
              totalPages={conversationsData?.totalPages || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <ConversationDetailModal
        conversation={selectedConversation}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedConversation(null)
        }}
      />
    </div>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    }>
      <ConversationsContent />
    </Suspense>
  )
} 