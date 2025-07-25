import React from 'react'
import { type ConversationContext, type BehaviorSignal } from '@/lib/context-utils'
import { TrendIndicator } from './TrendIndicator'

interface QualitySignalIndicatorProps {
  context: ConversationContext
  className?: string
}

export const QualitySignalIndicator: React.FC<QualitySignalIndicatorProps> = ({
  context,
  className = ''
}) => {
  const behaviorSignals = context.behaviorSignals || []
  
  // Calculate quality metrics
  const positiveSignals = behaviorSignals.filter(s => s.type === 'satisfaction' || s.type === 'success')
  const negativeSignals = behaviorSignals.filter(s => s.type === 'frustration' || s.type === 'confusion')
  
  const qualityScore = calculateQualityScore(context)
  const trustLevel = getTrustLevel(qualityScore)
  
  return (
    <div className={`quality-signal-indicator ${className}`}>
      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="h1 mb-2">
                <span className={`text-${getTrustColor(trustLevel)}`}>
                  {Math.round(qualityScore * 100)}%
                </span>
              </div>
              <div className="text-muted">Quality Score</div>
              <div className="mt-2">
                <span className={`badge badge-${getTrustColor(trustLevel)}`}>
                  {trustLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Positive Signals</span>
                <span className="badge bg-success text-white">
                  {positiveSignals.length}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted">Negative Signals</span>
                <span className="badge bg-danger text-white">
                  {negativeSignals.length}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Net Score</span>
                <span className={`badge ${positiveSignals.length > negativeSignals.length ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  {positiveSignals.length - negativeSignals.length > 0 ? '+' : ''}{positiveSignals.length - negativeSignals.length}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Quality Indicators</h6>
              <div className="space-y-2">
                <QualityIndicatorItem 
                  icon="⚡" 
                  label="Response Time" 
                  value={getResponseTimeQuality(context)}
                />
                <QualityIndicatorItem 
                  icon="🎯" 
                  label="Relevance" 
                  value={getRelevanceQuality(context)}
                />
                <QualityIndicatorItem 
                  icon="💭" 
                  label="Engagement" 
                  value={getEngagementQuality(context)}
                />
                <QualityIndicatorItem 
                  icon="🎪" 
                  label="Satisfaction" 
                  value={getSatisfactionQuality(context)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title">Signal Timeline</h6>
            </div>
            <div className="card-body">
              {behaviorSignals.length > 0 ? (
                <div className="timeline timeline-simple">
                  {behaviorSignals
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((signal, index) => (
                      <div key={index} className="timeline-item">
                        <div className={`timeline-badge ${getSignalBadgeColor(signal.type)}`}>
                          {getSignalEmoji(signal.type)}
                        </div>
                        <div className="timeline-content">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-medium text-capitalize">{signal.type}</span>
                            <span className="text-muted small">
                              {new Date(signal.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-muted small">
                            <span className={`badge badge-${getIntensityColor(signal.intensity)} me-2`}>
                              {signal.intensity}
                            </span>
                            {signal.indicators.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-muted">
                    <i className="fas fa-signal fa-2x mb-3"></i>
                    <h6>No Quality Signals</h6>
                    <p>No specific quality signals were detected during this conversation.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for quality indicators
const QualityIndicatorItem: React.FC<{
  icon: string
  label: string
  value: { score: number; status: string }
}> = ({ icon, label, value }) => (
  <div className="d-flex justify-content-between align-items-center mb-2">
    <div className="d-flex align-items-center">
      <span className="me-2">{icon}</span>
      <span className="small">{label}</span>
    </div>
    <div className="text-end">
      <div className="small fw-medium">{Math.round(value.score * 100)}%</div>
      <div className={`badge badge-${getStatusColor(value.status)}`}>
        {value.status}
      </div>
    </div>
  </div>
)

// Helper functions
function calculateQualityScore(context: ConversationContext): number {
  const baseScore = context.outcome === 'positive' ? 0.8 : 0.2
  const signals = context.behaviorSignals || []
  
  // Adjust score based on behavior signals
  let adjustment = 0
  signals.forEach(signal => {
    const intensity = signal.intensity === 'high' ? 0.3 : signal.intensity === 'medium' ? 0.2 : 0.1
    if (signal.type === 'satisfaction' || signal.type === 'success') {
      adjustment += intensity
    } else if (signal.type === 'frustration' || signal.type === 'confusion') {
      adjustment -= intensity
    }
  })
  
  return Math.max(0, Math.min(1, baseScore + adjustment))
}

function getTrustLevel(score: number): string {
  if (score >= 0.8) return 'excellent'
  if (score >= 0.6) return 'good'
  if (score >= 0.4) return 'fair'
  return 'poor'
}

function getTrustColor(level: string): string {
  switch (level) {
    case 'excellent': return 'success'
    case 'good': return 'info'
    case 'fair': return 'warning'
    case 'poor': return 'danger'
    default: return 'secondary'
  }
}

function getResponseTimeQuality(context: ConversationContext): { score: number; status: string } {
  // Use actual response time if available, otherwise estimate from context
  const responseTime = context.responseTime || 1000 // Default to 1000ms if not available
  
  // Calculate score based on response time thresholds
  // < 500ms = excellent (0.9-1.0)
  // < 1000ms = good (0.8-0.9)
  // < 2000ms = moderate (0.6-0.8)
  // >= 2000ms = slow (0.3-0.6)
  let score: number
  if (responseTime < 500) {
    score = 0.9 + (500 - responseTime) / 5000 // Scale to 0.9-1.0
  } else if (responseTime < 1000) {
    score = 0.8 + (1000 - responseTime) / 5000 // Scale to 0.8-0.9
  } else if (responseTime < 2000) {
    score = 0.6 + (2000 - responseTime) / 5000 // Scale to 0.6-0.8
  } else {
    score = Math.max(0.3, 0.6 - (responseTime - 2000) / 10000) // Scale down from 0.6, min 0.3
  }
  
  const status = score > 0.8 ? 'fast' : score > 0.6 ? 'moderate' : 'slow'
  return { score, status }
}

function getRelevanceQuality(context: ConversationContext): { score: number; status: string } {
  // Base relevance on outcome and feedback count
  let score = 0.5 // Base score
  
  // Factor in conversation outcome
  if (context.outcome === 'positive') {
    score += 0.3 // Positive outcome suggests good relevance
  } else {
    score -= 0.1 // Negative outcome suggests poor relevance
  }
  
  // Factor in feedback count (more feedback suggests engagement)
  const feedbackFactor = Math.min(context.feedbackCount * 0.05, 0.2) // Up to 0.2 bonus
  score += feedbackFactor
  
  // Factor in user actions (certain actions suggest relevance issues)
  if (context.userActions) {
    const regenerateActions = context.userActions.filter(action => action.type === 'regenerate').length
    const escalateActions = context.userActions.filter(action => action.type === 'escalate').length
    
    // Regenerate and escalate actions suggest relevance issues
    score -= (regenerateActions * 0.1) + (escalateActions * 0.15)
    
    // Copy and share actions suggest good relevance
    const copyActions = context.userActions.filter(action => action.type === 'copy').length
    const shareActions = context.userActions.filter(action => action.type === 'share').length
    score += (copyActions * 0.05) + (shareActions * 0.1)
  }
  
  // Clamp score to valid range
  score = Math.max(0, Math.min(1, score))
  
  const status = score > 0.8 ? 'relevant' : score > 0.6 ? 'mostly relevant' : 'off-topic'
  return { score, status }
}

function getEngagementQuality(context: ConversationContext): { score: number; status: string } {
  const duration = context.lastActivity - context.timestamp
  const actionCount = context.userActions?.length || 0
  
  // Score based on duration and actions
  const durationScore = Math.min(1, duration / 300000) // 5 minutes = 1.0
  const actionScore = Math.min(1, actionCount / 5) // 5 actions = 1.0
  const score = (durationScore + actionScore) / 2
  
  const status = score > 0.8 ? 'high' : score > 0.6 ? 'medium' : 'low'
  return { score, status }
}

function getSatisfactionQuality(context: ConversationContext): { score: number; status: string } {
  const signals = context.behaviorSignals || []
  const positiveSignals = signals.filter(s => s.type === 'satisfaction' || s.type === 'success')
  const negativeSignals = signals.filter(s => s.type === 'frustration')
  
  let score = context.outcome === 'positive' ? 0.7 : 0.3
  score += positiveSignals.length * 0.1
  score -= negativeSignals.length * 0.2
  score = Math.max(0, Math.min(1, score))
  
  const status = score > 0.8 ? 'satisfied' : score > 0.6 ? 'neutral' : 'dissatisfied'
  return { score, status }
}

function getSignalEmoji(type: string): string {
  switch (type) {
    case 'frustration': return '😤'
    case 'satisfaction': return '😊'
    case 'confusion': return '😕'
    case 'success': return '🎉'
    default: return '📊'
  }
}

function getSignalBadgeColor(type: string): string {
  switch (type) {
    case 'frustration': return 'bg-danger'
    case 'satisfaction': return 'bg-success'
    case 'confusion': return 'bg-warning'
    case 'success': return 'bg-success'
    default: return 'bg-secondary'
  }
}

function getIntensityColor(intensity: string): string {
  switch (intensity) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'secondary'
    default: return 'secondary'
  }
}

function getStatusColor(status: string): string {
  if (status.includes('good') || status.includes('excellent') || status.includes('fast') || status.includes('relevant') || status.includes('high') || status.includes('satisfied')) {
    return 'success'
  }
  if (status.includes('fair') || status.includes('moderate') || status.includes('medium') || status.includes('neutral')) {
    return 'warning'
  }
  return 'danger'
} 