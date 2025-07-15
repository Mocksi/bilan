import React, { useState } from 'react'
import { ConversationSummary } from '@/lib/types'
import { type ConversationContext, enrichConversationContext, getConversationInsights, categorizeConversationByPattern, getPatternDescription } from '@/lib/context-utils'
import { formatTimestamp } from '@/lib/time-utils'
import { ConversationTags, ConversationTag } from './ConversationTags'
import { TrendIndicator } from './TrendIndicator'
import { ConversationContextPanel } from './ConversationContext'

interface ConversationDetailModalProps {
  conversation: ConversationSummary | null
  onClose: () => void
  onExport?: (conversation: ConversationSummary) => void
}

export const ConversationDetailModal: React.FC<ConversationDetailModalProps> = ({
  conversation,
  onClose,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'context' | 'similar'>('overview')
  const [tags, setTags] = useState<ConversationTag[]>([])

  if (!conversation) return null

  const context = enrichConversationContext(conversation, {
    promptText: conversation.promptText,
    aiOutput: conversation.aiOutput,
    comment: conversation.comment,
    journeyName: conversation.journeyName,
    journeyStep: conversation.journeyStep,
    page: conversation.page,
    metadata: conversation.metadata
  })

  const insights = getConversationInsights(context)
  const pattern = categorizeConversationByPattern(context)
  const sessionDuration = context.lastActivity - context.timestamp

  const handleExport = () => {
    if (onExport) {
      onExport(conversation)
    } else {
      // Default export behavior
      const exportData = {
        ...conversation,
        context,
        insights,
        pattern: pattern ? { type: pattern, description: getPatternDescription(pattern) } : null,
        exportedAt: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `conversation-${conversation.promptId}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="modal modal-blur fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Conversation Details</h4>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          
          <div className="modal-body">
            {/* Header Info */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title mb-1">{conversation.promptId}</h5>
                        <div className="text-muted small">User: {conversation.userId}</div>
                        {conversation.journeyName && (
                          <div className="text-muted small">
                            Journey: {conversation.journeyName}
                            {conversation.journeyStep && ` → ${conversation.journeyStep}`}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${conversation.outcome === 'positive' ? 'badge-success' : 'badge-danger'}`}>
                        {conversation.outcome}
                      </span>
                    </div>
                    
                    <div className="row">
                      <div className="col-6">
                        <div className="text-muted small">Feedback Count</div>
                        <div className="h4">{conversation.feedbackCount}</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted small">Session Duration</div>
                        <div className="h4">{Math.round(sessionDuration / 1000)}s</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Pattern Analysis</h6>
                    {pattern ? (
                      <div className="mb-3">
                        <span className="badge badge-info me-2">{pattern}</span>
                        <div className="text-muted small mt-1">
                          {getPatternDescription(pattern)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted">No specific pattern detected</div>
                    )}
                    
                    <div className="mt-3">
                      <h6 className="text-muted">Insights</h6>
                      {insights.length > 0 ? (
                        <div className="small">
                          {insights.map((insight, index) => (
                            <div key={index} className="mb-1">{insight}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted small">No insights available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Tags</h6>
                  <ConversationTags 
                    tags={tags}
                    onTagsChange={setTags}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
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
                      className={`nav-link ${activeTab === 'timeline' ? 'active' : ''}`}
                      onClick={() => setActiveTab('timeline')}
                    >
                      Timeline
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'context' ? 'active' : ''}`}
                      onClick={() => setActiveTab('context')}
                    >
                      Context
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'similar' ? 'active' : ''}`}
                      onClick={() => setActiveTab('similar')}
                    >
                      Similar
                    </button>
                  </li>
                </ul>
              </div>
              
              <div className="card-body">
                {activeTab === 'overview' && (
                  <ConversationOverview conversation={conversation} context={context} />
                )}
                {activeTab === 'timeline' && (
                  <ConversationTimeline conversation={conversation} context={context} />
                )}
                {activeTab === 'context' && (
                  <ConversationContextPanel conversation={conversation} context={context} />
                )}
                {activeTab === 'similar' && (
                  <SimilarConversations conversation={conversation} />
                )}
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={handleExport}>
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab Components
const ConversationOverview: React.FC<{ conversation: ConversationSummary; context: ConversationContext }> = ({ conversation, context }) => (
  <div className="row">
    <div className="col-md-6">
      <h6>Prompt</h6>
      <div className="border rounded p-3 mb-3 bg-light">
        {conversation.promptText || 'No prompt text available'}
      </div>
      
      <h6>AI Response</h6>
      <div className="border rounded p-3 mb-3 bg-light">
        {conversation.aiOutput || 'No AI response available'}
      </div>
    </div>
    
    <div className="col-md-6">
      <h6>User Feedback</h6>
      <div className="border rounded p-3 mb-3">
        {conversation.comment ? (
          <div>
            <span className={`badge ${conversation.outcome === 'positive' ? 'badge-success' : 'badge-danger'} me-2`}>
              {conversation.outcome}
            </span>
            <div className="mt-2">"{conversation.comment}"</div>
          </div>
        ) : (
          <div className="text-muted">No feedback comment provided</div>
        )}
      </div>
      
      <h6>Session Info</h6>
      <div className="row">
        <div className="col-6">
          <div className="text-muted small">Started</div>
          <div>{formatTimestamp(context.timestamp)}</div>
        </div>
        <div className="col-6">
          <div className="text-muted small">Last Activity</div>
          <div>{formatTimestamp(context.lastActivity)}</div>
        </div>
      </div>
    </div>
  </div>
)

const ConversationTimeline: React.FC<{ conversation: ConversationSummary; context: ConversationContext }> = ({ conversation, context }) => (
  <div className="timeline">
    <div className="timeline-item">
      <div className="timeline-badge bg-primary">
        <i className="fas fa-play"></i>
      </div>
      <div className="timeline-panel">
        <div className="timeline-heading">
          <h6 className="timeline-title">Conversation Started</h6>
          <p className="text-muted small">
            {formatTimestamp(context.timestamp)}
          </p>
        </div>
        <div className="timeline-body">
          <p>User {conversation.userId} initiated conversation</p>
          {conversation.journeyName && (
            <p className="text-muted small">Journey: {conversation.journeyName}</p>
          )}
        </div>
      </div>
    </div>
    
    <div className="timeline-item">
      <div className="timeline-badge bg-info">
        <i className="fas fa-comment"></i>
      </div>
      <div className="timeline-panel">
        <div className="timeline-heading">
          <h6 className="timeline-title">Prompt Submitted</h6>
          <p className="text-muted small">
            {formatTimestamp(context.timestamp)}
          </p>
        </div>
        <div className="timeline-body">
          <div className="bg-light p-2 rounded">
            {conversation.promptText || 'No prompt text available'}
          </div>
        </div>
      </div>
    </div>
    
    <div className="timeline-item">
      <div className="timeline-badge bg-success">
        <i className="fas fa-robot"></i>
      </div>
      <div className="timeline-panel">
        <div className="timeline-heading">
          <h6 className="timeline-title">AI Response Generated</h6>
          <p className="text-muted small">
            {formatTimestamp(context.timestamp + 1000)} {/* Simulated response time */}
          </p>
        </div>
        <div className="timeline-body">
          <div className="bg-light p-2 rounded">
            {conversation.aiOutput || 'No AI response available'}
          </div>
        </div>
      </div>
    </div>
    
    <div className="timeline-item">
      <div className={`timeline-badge ${conversation.outcome === 'positive' ? 'bg-success' : 'bg-danger'}`}>
        <i className={`fas ${conversation.outcome === 'positive' ? 'fa-thumbs-up' : 'fa-thumbs-down'}`}></i>
      </div>
      <div className="timeline-panel">
        <div className="timeline-heading">
          <h6 className="timeline-title">Feedback Provided</h6>
          <p className="text-muted small">
            {formatTimestamp(context.lastActivity)}
          </p>
        </div>
        <div className="timeline-body">
          <span className={`badge ${conversation.outcome === 'positive' ? 'badge-success' : 'badge-danger'} me-2`}>
            {conversation.outcome}
          </span>
          {conversation.comment && (
            <div className="mt-2">"{conversation.comment}"</div>
          )}
        </div>
      </div>
    </div>
  </div>
)

const ConversationContext: React.FC<{ conversation: ConversationSummary; context: ConversationContext }> = ({ conversation, context }) => (
  <div className="row">
    <div className="col-md-6">
      <h6>Session Context</h6>
      <table className="table table-sm">
        <tbody>
          <tr>
            <td>Session ID</td>
            <td>{context.sessionId || 'Not available'}</td>
          </tr>
          <tr>
            <td>Page</td>
            <td>{context.page || 'Not available'}</td>
          </tr>
          <tr>
            <td>Referrer</td>
            <td>{context.referrer || 'Not available'}</td>
          </tr>
          <tr>
            <td>User Agent</td>
            <td className="text-truncate" style={{ maxWidth: '200px' }}>
              {context.userAgent || 'Not available'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div className="col-md-6">
      <h6>Metadata</h6>
      {context.metadata && Object.keys(context.metadata).length > 0 ? (
        <pre className="bg-light p-3 rounded">
          {JSON.stringify(context.metadata, null, 2)}
        </pre>
      ) : (
        <div className="text-muted">No metadata available</div>
      )}
    </div>
  </div>
)

const SimilarConversations: React.FC<{ conversation: ConversationSummary }> = ({ conversation }) => (
  <div className="text-center py-4">
    <div className="text-muted">
      <i className="fas fa-search fa-2x mb-3"></i>
      <h6>Similar Conversations</h6>
      <p>This feature will be available in the SaaS platform with advanced pattern matching.</p>
    </div>
  </div>
) 