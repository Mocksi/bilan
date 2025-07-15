import React from 'react'
import { ConversationSummary } from '@/lib/types'

export interface ConversationTableProps {
  conversations: ConversationSummary[]
  className?: string
}

export const ConversationTable: React.FC<ConversationTableProps> = ({
  conversations,
  className = ''
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getOutcomeBadge = (outcome: 'positive' | 'negative') => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full"
    const colorClasses = outcome === 'positive' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
    
    return `${baseClasses} ${colorClasses}`
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-gray-500">No conversations yet</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feedback
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <tr key={conversation.promptId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {conversation.promptId}
                    </div>
                    <div className="text-sm text-gray-500">
                      {conversation.userId}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {conversation.feedbackCount} 
                    <span className="text-gray-500 ml-1">
                      {conversation.feedbackCount === 1 ? 'response' : 'responses'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getOutcomeBadge(conversation.outcome)}>
                    {conversation.outcome}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(conversation.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 