import React from 'react'
import { ConversationSummary } from '@/lib/types'
import { type ConversationContext } from '@/lib/context-utils'
import { formatTimestamp } from '@/lib/time-utils'

interface ConversationTimelineProps {
  conversation: ConversationSummary
  context: ConversationContext
  className?: string
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  conversation,
  context,
  className = ''
}) => {
  const userActions = context.userActions || []
  const behaviorSignals = context.behaviorSignals || []
  
  // Create a combined timeline of all events
  const timelineEvents = [
    {
      type: 'start',
      timestamp: context.timestamp,
      title: 'Conversation Started',
      description: `User ${conversation.userId} initiated conversation`,
      icon: 'fa-play',
      color: 'bg-primary'
    },
    {
      type: 'prompt',
      timestamp: context.timestamp,
      title: 'Prompt Submitted',
      description: conversation.promptText || 'No prompt text available',
      icon: 'fa-comment',
      color: 'bg-info'
    },
    {
      type: 'response',
      timestamp: context.timestamp + 1000, // Simulated response time
      title: 'AI Response Generated',
      description: conversation.aiOutput || 'No AI response available',
      icon: 'fa-robot',
      color: 'bg-success'
    },
    ...userActions.map(action => ({
      type: 'action',
      timestamp: action.timestamp,
      title: `User ${action.type}`,
      description: action.details ? JSON.stringify(action.details) : `User performed ${action.type} action`,
      icon: getActionIcon(action.type),
      color: getActionColor(action.type)
    })),
    ...behaviorSignals.map(signal => ({
      type: 'signal',
      timestamp: signal.timestamp,
      title: `${signal.type} Signal`,
      description: `${signal.intensity} intensity: ${signal.indicators.join(', ')}`,
      icon: getSignalIcon(signal.type),
      color: getSignalColor(signal.type)
    })),
    {
      type: 'feedback',
      timestamp: context.lastActivity,
      title: 'Feedback Provided',
      description: conversation.comment || 'No feedback comment',
      icon: conversation.outcome === 'positive' ? 'fa-thumbs-up' : 'fa-thumbs-down',
      color: conversation.outcome === 'positive' ? 'bg-success' : 'bg-danger'
    }
  ]

  // Sort events by timestamp
  const sortedEvents = timelineEvents.sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className={`conversation-timeline ${className}`}>
      <div className="timeline">
        {sortedEvents.map((event, index) => (
          <div key={index} className="timeline-item">
            <div className={`timeline-badge ${event.color}`}>
              <i className={`fas ${event.icon}`}></i>
            </div>
            <div className="timeline-panel">
              <div className="timeline-heading">
                <h6 className="timeline-title">{event.title}</h6>
                <p className="text-muted small">
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
              <div className="timeline-body">
                {event.type === 'prompt' || event.type === 'response' ? (
                  <div className="bg-light p-2 rounded">
                    {event.description}
                  </div>
                ) : (
                  <p>{event.description}</p>
                )}
                {event.type === 'feedback' && conversation.outcome && (
                  <div className="mt-2">
                    <span className={`badge ${conversation.outcome === 'positive' ? 'badge-success' : 'badge-danger'}`}>
                      {conversation.outcome}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper functions for styling user actions
function getActionIcon(actionType: string): string {
  switch (actionType) {
    case 'regenerate':
      return 'fa-redo'
    case 'copy':
      return 'fa-copy'
    case 'share':
      return 'fa-share'
    case 'escalate':
      return 'fa-exclamation-triangle'
    case 'exit':
      return 'fa-sign-out-alt'
    default:
      return 'fa-user'
  }
}

function getActionColor(actionType: string): string {
  switch (actionType) {
    case 'regenerate':
      return 'bg-warning'
    case 'copy':
      return 'bg-success'
    case 'share':
      return 'bg-info'
    case 'escalate':
      return 'bg-danger'
    case 'exit':
      return 'bg-secondary'
    default:
      return 'bg-primary'
  }
}

function getSignalIcon(signalType: string): string {
  switch (signalType) {
    case 'frustration':
      return 'fa-angry'
    case 'satisfaction':
      return 'fa-smile'
    case 'confusion':
      return 'fa-question'
    case 'success':
      return 'fa-check'
    default:
      return 'fa-circle'
  }
}

function getSignalColor(signalType: string): string {
  switch (signalType) {
    case 'frustration':
      return 'bg-danger'
    case 'satisfaction':
      return 'bg-success'
    case 'confusion':
      return 'bg-warning'
    case 'success':
      return 'bg-success'
    default:
      return 'bg-secondary'
  }
} 