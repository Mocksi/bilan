'use client'

import { ConversationData } from '@/lib/types'
import { 
  getConversationStatus, 
  getConversationDuration, 
  formatConversationDuration,
  getSatisfactionColorClass,
  getStatusColorClass,
  extractTopics
} from '@/lib/conversations-utils'
import { 
  X, 
  MessageSquare, 
  Clock, 
  User, 
  Calendar, 
  Star, 
  Tag,
  Copy,
  Download,
  ExternalLink
} from 'lucide-react'

interface ConversationDetailModalProps {
  conversation: ConversationData | null
  isOpen: boolean
  onClose: () => void
}

export function ConversationDetailModal({ 
  conversation, 
  isOpen, 
  onClose 
}: ConversationDetailModalProps) {
  if (!isOpen || !conversation) return null

  const status = getConversationStatus(conversation)
  const duration = getConversationDuration(conversation)
  const topics = extractTopics(conversation)

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const exportConversation = () => {
    const exportData = {
      id: conversation.id,
      userId: conversation.userId,
      startTime: new Date(conversation.startTime).toISOString(),
      endTime: conversation.endTime ? new Date(conversation.endTime).toISOString() : null,
      totalMessages: conversation.totalMessages,
      averageResponseTime: conversation.averageResponseTime,
      satisfactionScore: conversation.satisfactionScore,
      tags: conversation.tags,
      status,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString()
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversation.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Conversation Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {conversation.id}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportConversation}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Conversation Metadata */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">User</div>
                  <div className="text-sm text-gray-500">{conversation.userId}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Messages</div>
                  <div className="text-sm text-gray-500">{conversation.totalMessages}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Duration</div>
                  <div className="text-sm text-gray-500">{formatConversationDuration(duration)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Started</div>
                  <div className="text-sm text-gray-500">{formatTimestamp(conversation.startTime)}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">Status</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(status)}`}>
                  {status}
                </span>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">Satisfaction Score</div>
                {conversation.satisfactionScore !== undefined ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSatisfactionColorClass(conversation.satisfactionScore)}`}>
                    <Star className="h-3 w-3 mr-1" />
                    {(conversation.satisfactionScore * 100).toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">Not rated</span>
                )}
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">Avg Response Time</div>
                <span className="text-sm text-gray-500">
                  {formatResponseTime(conversation.averageResponseTime)}
                </span>
              </div>
            </div>

            {/* Tags and Topics */}
            <div className="mt-4 space-y-3">
              {conversation.tags.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {conversation.tags.map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {topics.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2">Detected Topics</div>
                  <div className="flex flex-wrap gap-1">
                    {topics.map(topic => (
                      <span 
                        key={topic}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Messages</h3>
            <div className="space-y-4">
              {conversation.messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.role === 'user' ? 'User' : 'Assistant'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(message.content)}
                          className={`${
                            message.role === 'user' ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                          }`}
                          title="Copy message"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    {message.metadata && Object.keys(message.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-opacity-20">
                        <details className="text-xs">
                          <summary className={`cursor-pointer ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            Metadata
                          </summary>
                          <pre className="mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(message.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Metadata */}
          {conversation.metadata && Object.keys(conversation.metadata).length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Metadata</h3>
              <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(conversation.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 