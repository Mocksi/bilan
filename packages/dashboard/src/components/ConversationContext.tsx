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
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Session Information</h6>
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td className="text-muted">Session ID</td>
                    <td>
                      {context.sessionId ? (
                        <code className="text-primary">{context.sessionId}</code>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Page URL</td>
                    <td>
                      {context.page ? (
                        <div className="text-break">
                          <a href={context.page} target="_blank" rel="noopener noreferrer" className="text-primary">
                            {context.page}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Referrer</td>
                    <td>
                      {context.referrer ? (
                        <div className="text-break">
                          <a href={context.referrer} target="_blank" rel="noopener noreferrer" className="text-primary">
                            {context.referrer}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">User Agent</td>
                    <td>
                      {context.userAgent ? (
                        <div className="text-break small">
                          <code>{context.userAgent}</code>
                        </div>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Journey Context</h6>
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td className="text-muted">Journey Name</td>
                    <td>
                      {context.journeyName ? (
                        <span className="badge badge-primary">{context.journeyName}</span>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Journey Step</td>
                    <td>
                      {context.journeyStep ? (
                        <span className="badge badge-info">{context.journeyStep}</span>
                      ) : (
                        <span className="text-muted">Not available</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">User ID</td>
                    <td>
                      <code className="text-primary">{conversation.userId}</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Conversation ID</td>
                    <td>
                      <code className="text-primary">{conversation.promptId}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Metadata</h6>
            </div>
            <div className="card-body">
              {context.metadata && Object.keys(context.metadata).length > 0 ? (
                <div>
                  <pre className="bg-light p-3 rounded">
                    {JSON.stringify(context.metadata, null, 2)}
                  </pre>
                  <div className="mt-3">
                    <small className="text-muted">
                      This metadata can be used for debugging, analytics, and understanding user context.
                    </small>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted">
                    <i className="fas fa-info-circle fa-2x mb-3"></i>
                    <h6>No Metadata Available</h6>
                    <p>No additional metadata was captured for this conversation.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Technical Details</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-muted">Timestamps</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted">Started</td>
                        <td>
                          <code>{new Date(context.timestamp).toISOString()}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Last Activity</td>
                        <td>
                          <code>{new Date(context.lastActivity).toISOString()}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Duration</td>
                        <td>
                          <span className="badge badge-info">
                            {Math.round((context.lastActivity - context.timestamp) / 1000)}s
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="col-md-6">
                  <h6 className="text-muted">Behavior Signals</h6>
                  {context.behaviorSignals && context.behaviorSignals.length > 0 ? (
                    <div className="space-y-2">
                      {context.behaviorSignals.map((signal, index) => (
                        <div key={index} className="border rounded p-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-medium">{signal.type}</span>
                            <span className={`badge ${
                              signal.intensity === 'high' ? 'badge-danger' : 
                              signal.intensity === 'medium' ? 'badge-warning' : 
                              'badge-secondary'
                            }`}>
                              {signal.intensity}
                            </span>
                          </div>
                          <div className="text-muted small mt-1">
                            {signal.indicators.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">No behavior signals captured</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 