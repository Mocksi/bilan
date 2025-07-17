import React from 'react'
import { DashboardData } from '@/lib/types'
import { ThumbsUpIcon, ThumbsDownIcon } from './icons'

interface QualitySignalsProps {
  data: DashboardData
  className?: string
}

/**
 * QualitySignals component displays quality metrics including positive/negative feedback,
 * regenerations, and frustration signals with visual indicators and percentages.
 * 
 * @param data - Dashboard data containing quality signals
 * @param className - Optional CSS class name for styling
 */
export const QualitySignals: React.FC<QualitySignalsProps> = ({ data, className = '' }) => {
  const { qualitySignals } = data
  const total = qualitySignals.positive + qualitySignals.negative + qualitySignals.regenerations + qualitySignals.frustration
  
  const getPercentage = (value: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  }

  const signals = [
    {
      label: 'Positive',
      count: qualitySignals.positive,
      percentage: getPercentage(qualitySignals.positive),
      color: 'bg-success',
      icon: <ThumbsUpIcon width={16} height={16} className="text-success" />
    },
    {
      label: 'Negative',
      count: qualitySignals.negative,
      percentage: getPercentage(qualitySignals.negative),
      color: 'bg-danger',
      icon: <ThumbsDownIcon width={16} height={16} className="text-danger" />
    },
    {
      label: 'Regenerations',
      count: qualitySignals.regenerations,
      percentage: getPercentage(qualitySignals.regenerations),
      color: 'bg-warning',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
        </svg>
      )
    },
    {
      label: 'Frustration',
      count: qualitySignals.frustration,
      percentage: getPercentage(qualitySignals.frustration),
      color: 'bg-secondary',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 15s1.5-2 4-2 4 2 4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      )
    }
  ]

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Quality Signals</h3>
          <p className="card-subtitle">User feedback and interaction patterns</p>
        </div>
      </div>
      <div className="card-body">
        {total > 0 ? (
          <div className="row g-3">
            {signals.map((signal, index) => (
              <div key={index} className="col-6">
                <div className="d-flex align-items-center mb-2">
                  {signal.icon}
                  <span className="ms-2 fw-medium">{signal.label}</span>
                  <span className="ms-auto text-muted">({signal.count})</span>
                </div>
                <div className="progress mb-1" style={{ height: '8px' }}>
                  <div 
                    className={`progress-bar ${signal.color}`} 
                    style={{ width: `${signal.percentage}%` }}
                  ></div>
                </div>
                <div className="text-muted small">{signal.percentage}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="text-muted">
              <ThumbsUpIcon width={48} height={48} className="mb-3" />
              <h3>No quality signals</h3>
              <p>Quality signals will appear here when users interact with AI features.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 