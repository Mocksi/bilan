import React, { ReactNode } from 'react'

/**
 * Props for the StatsCard component
 */
export interface StatsCardProps {
  /** The title/label of the statistic */
  title: string
  /** The main value to display */
  value: string | number
  /** Optional change information with value and label */
  change?: {
    value: number
    label: string
  }
  /** Optional icon to display */
  icon?: ReactNode
  /** Optional trend indicator */
  trend?: 'up' | 'down' | 'stable'
  /** Optional description text */
  description?: string
  /** Optional CSS class name for styling */
  className?: string
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  trend, 
  description, 
  className = '' 
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        )
      case 'down':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        )
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success'
      case 'down':
        return 'text-danger'
      default:
        return 'text-muted'
    }
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="text-muted text-uppercase small">{title}</div>
          {icon && (
            <div className="ms-auto text-muted">
              {icon}
            </div>
          )}
        </div>
        <div className="d-flex align-items-baseline">
          <div className="h3 mb-0 me-2">{value}</div>
          {change && (
            <div className="ms-auto">
              <div className={`d-flex align-items-center ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="ms-1">
                  {change.value > 0 ? '+' : ''}{change.value}% {change.label}
                </span>
              </div>
            </div>
          )}
        </div>
        {description && (
          <div className="text-muted mt-1">
            <small>{description}</small>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsCard 