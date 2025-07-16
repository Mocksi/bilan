import React from 'react'
import { ConversationSummary } from '@/lib/types'
import { type ConversationContext } from '@/lib/context-utils'

interface ConversationContextProps {
  conversation: ConversationSummary
  context: ConversationContext
  className?: string
}

export const ConversationContextPanel: React.FC<ConversationContextProps> = ({
  conversation,
  context,
  className = ''
}) => {
  return (
    <div className={`conversation-context ${className}`}>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="rounded shadow-lg bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <h6 className="text-xl font-bold">Session Information</h6>
            </div>
            <div className="px-6 py-4">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.sessionId ? (
                        <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{context.sessionId}</code>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page URL</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.page ? (
                        <div className="break-words">
                          <a href={context.page} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {context.page}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.referrer ? (
                        <div className="break-words">
                          <a href={context.referrer} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {context.referrer}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.userAgent ? (
                        <div className="break-words text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{context.userAgent}</code>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="rounded shadow-lg bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <h6 className="text-xl font-bold">Journey Context</h6>
            </div>
            <div className="px-6 py-4">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey Name</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.journeyName ? (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-sm bg-blue-100 text-blue-800">{context.journeyName}</span>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey Step</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {context.journeyStep ? (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-sm bg-green-100 text-green-800">{context.journeyStep}</span>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{conversation.userId}</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation ID</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{conversation.promptId}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="rounded shadow-lg bg-white">
          <div className="px-6 py-4 border-b border-gray-200">
            <h6 className="text-xl font-bold">Metadata</h6>
          </div>
          <div className="px-6 py-4">
            {context.metadata && Object.keys(context.metadata).length > 0 ? (
              <div>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(context.metadata, null, 2)}
                </pre>
                <div className="mt-3">
                  <small className="text-gray-500">
                    This metadata can be used for debugging, analytics, and understanding user context.
                  </small>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <i className="fas fa-info-circle text-2xl mb-3"></i>
                  <h6 className="text-base font-medium mb-2">No Metadata Available</h6>
                  <p>No additional metadata was captured for this conversation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="rounded shadow-lg bg-white">
          <div className="px-6 py-4 border-b border-gray-200">
            <h6 className="text-xl font-bold">Technical Details</h6>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h6 className="text-gray-500 font-medium mb-3">Timestamps</h6>
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{new Date(context.timestamp).toISOString()}</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{new Date(context.lastActivity).toISOString()}</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-sm bg-green-100 text-green-800">
                          {Math.round((context.lastActivity - context.timestamp) / 1000)}s
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex-1">
                <h6 className="text-gray-500 font-medium mb-3">Behavior Signals</h6>
                {context.behaviorSignals && context.behaviorSignals.length > 0 ? (
                  <div className="space-y-2">
                    {context.behaviorSignals.map((signal, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{signal.type}</span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-sm ${
                            signal.intensity === 'high' ? 'bg-red-100 text-red-800' : 
                            signal.intensity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {signal.intensity}
                          </span>
                        </div>
                        <div className="text-gray-500 text-sm mt-1">
                          {signal.indicators.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No behavior signals captured</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 