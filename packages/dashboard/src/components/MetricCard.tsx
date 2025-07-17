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
    <div className={`relative flex flex-col min-w-0 bg-white border border-black/10 rounded-lg ${className}`} style={{ boxShadow: 'rgba(31, 41, 55, 0.04) 0px 2px 4px 0px' }}>
      <div className="py-4 px-5 flex-1">
        <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="text-3xl">{icon}</div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-4 flex items-center justify-between">
          {description && (
            <div className="text-sm text-gray-600">{description}</div>
          )}
          {trend && (
            <div className={`text-sm font-medium ${getTrendColor(trend.direction)}`}>
              {getTrendIcon(trend.direction)} {trend.value}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
} 