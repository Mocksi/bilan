import React from 'react'
import { type ConversationContext, type BehaviorSignal } from '@/lib/context-utils'
import { TrendIndicator } from './TrendIndicator'

interface UserBehaviorIndicatorsProps {
  context: ConversationContext
  className?: string
}

export const UserBehaviorIndicators: React.FC<UserBehaviorIndicatorsProps> = ({
  context,
  className = ''
}) => {
  const behaviorSignals = context.behaviorSignals || []
  const userActions = context.userActions || []
  
  const getSignalIcon = (signal: BehaviorSignal): string => {
    switch (signal.type) {
      case 'frustration':
        return '😤'
      case 'satisfaction':
        return '😊'
      case 'confusion':
        return '😕'
      case 'success':
        return '🎉'
      default:
        return '📊'
    }
  }
  
  const getSignalColor = (signal: BehaviorSignal): string => {
    switch (signal.type) {
      case 'frustration':
        return 'text-danger'
      case 'satisfaction':
        return 'text-success'
      case 'confusion':
        return 'text-warning'
      case 'success':
        return 'text-success'
      default:
        return 'text-muted'
    }
  }
  
  const getIntensityBadge = (intensity: BehaviorSignal['intensity']): string => {
    switch (intensity) {
      case 'high':
        return 'badge-danger'
      case 'medium':
        return 'badge-warning'
      case 'low':
        return 'badge-secondary'
      default:
        return 'badge-secondary'
    }
  }
  
  const getActionIcon = (actionType: string): string => {
    switch (actionType) {
      case 'regenerate':
        return '🔄'
      case 'copy':
        return '📋'
      case 'share':
        return '📤'
      case 'escalate':
        return '🚨'
      case 'exit':
        return '🚪'
      default:
        return '👆'
    }
  }
  
  const sessionDuration = context.lastActivity - context.timestamp
  const durationMinutes = Math.round(sessionDuration / 60000)
  
  return (
    <div className={`user-behavior-indicators ${className}`}>
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Behavior Signals</h6>
            </div>
            <div className="card-body">
              {behaviorSignals.length > 0 ? (
                <div className="space-y-3">
                  {behaviorSignals.map((signal, index) => (
                    <div key={index} className="d-flex align-items-start mb-3">
                      <div className="me-3">
                        <span className={`fs-4 ${getSignalColor(signal)}`}>
                          {getSignalIcon(signal)}
                        </span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-medium text-capitalize">{signal.type}</span>
                          <span className={`badge ${getIntensityBadge(signal.intensity)}`}>
                            {signal.intensity}
                          </span>
                        </div>
                        <div className="text-muted small">
                          {signal.indicators.join(', ')}
                        </div>
                        <div className="text-muted small">
                          {new Date(signal.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted">
                    <i className="fas fa-chart-line fa-2x mb-3"></i>
                    <h6>No Behavior Signals</h6>
                    <p>No significant behavior patterns detected for this conversation.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">User Actions</h6>
            </div>
            <div className="card-body">
              {userActions.length > 0 ? (
                <div className="space-y-2">
                  {userActions.map((action, index) => (
                    <div key={index} className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <span className="me-2 fs-5">{getActionIcon(action.type)}</span>
                        <div>
                          <span className="fw-medium text-capitalize">{action.type}</span>
                          <div className="text-muted small">
                            {new Date(action.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      {action.details && (
                        <div className="text-muted small">
                          <code>{JSON.stringify(action.details, null, 2)}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted">
                    <i className="fas fa-mouse-pointer fa-2x mb-3"></i>
                    <h6>No User Actions</h6>
                    <p>No specific user actions were recorded during this conversation.</p>
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
              <h6 className="card-title">Session Analysis</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="h4 mb-1">{durationMinutes}m</div>
                    <div className="text-muted small">Session Duration</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="h4 mb-1">{userActions.length}</div>
                    <div className="text-muted small">User Actions</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="h4 mb-1">{behaviorSignals.length}</div>
                    <div className="text-muted small">Behavior Signals</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <div className="h4 mb-1">{context.feedbackCount}</div>
                    <div className="text-muted small">Feedback Count</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h6 className="text-muted">Engagement Pattern</h6>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Engagement Level:</span>
                  <span>
                    {userActions.length > 3 ? (
                      <span className="badge badge-success">High</span>
                    ) : userActions.length > 1 ? (
                      <span className="badge badge-warning">Medium</span>
                    ) : (
                      <span className="badge badge-secondary">Low</span>
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <span>Session Quality:</span>
                  <span>
                    {behaviorSignals.some(s => s.type === 'frustration') ? (
                      <span className="badge badge-danger">Problematic</span>
                    ) : behaviorSignals.some(s => s.type === 'success') ? (
                      <span className="badge badge-success">Excellent</span>
                    ) : (
                      <span className="badge badge-info">Normal</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 