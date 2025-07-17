import React from 'react'

export interface MetricCardProps {
  title: string
  value: string | number
  icon: string
  description?: string
  trend?: {
    direction: 'up' | 'down' | 'stable'
    value: string
  }
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  className = ''
}) => {
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'stable':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      case 'stable':
        return '→'
      default:
        return '→'
    }
  }

    return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className="h2">{icon}</div>
          </div>
          <div className="ms-3 flex-fill">
            <dl className="mb-0">
              <dt className="small text-muted">{title}</dt>
              <dd className="h4 mb-0">{value}</dd>
            </dl>
          </div>
        </div>
        {(description || trend) && (
          <div className="mt-3 d-flex align-items-center justify-content-between">
            {description && (
              <div className="small text-muted">{description}</div>
            )}
            {trend && (
              <div className={`small fw-medium ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)} {trend.value}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 