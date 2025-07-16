import React from 'react'

export type TrendDirection = 'improving' | 'declining' | 'stable'

interface TrendIndicatorProps {
  trend: TrendDirection
  value?: string | number
  className?: string
  showIcon?: boolean
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  value,
  className = '',
  showIcon = true
}) => {
  const getTrendConfig = (trend: TrendDirection) => {
    switch (trend) {
      case 'improving':
        return {
          color: 'text-success',
          icon: '↑',
          label: 'improving'
        }
      case 'declining':
        return {
          color: 'text-danger',
          icon: '↓',
          label: 'declining'
        }
      case 'stable':
        return {
          color: 'text-muted',
          icon: '→',
          label: 'stable'
        }
    }
  }

  const config = getTrendConfig(trend)

  return (
    <span className={`${config.color} ${className}`} title={`Trend: ${config.label}`}>
      {showIcon && <span className="me-1">{config.icon}</span>}
      {value && <span>{value}</span>}
      {!value && <span>{config.label}</span>}
    </span>
  )
}

interface WeekOverWeekProps {
  current: number
  previous: number
  formatter?: (value: number) => string
  className?: string
}

export const WeekOverWeekComparison: React.FC<WeekOverWeekProps> = ({
  current,
  previous,
  formatter = (value) => value.toString(),
  className = ''
}) => {
  const difference = current - previous
  const percentChange = previous !== 0 ? ((difference / previous) * 100) : 0
  
  let trend: TrendDirection = 'stable'
  if (Math.abs(percentChange) >= 5) {
    trend = percentChange > 0 ? 'improving' : 'declining'
  }
  
  const changeText = percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`
  
  return (
    <div className={`small ${className}`}>
      <TrendIndicator 
        trend={trend} 
        value={changeText}
        className="fw-medium"
      />
      <span className="text-muted ms-1">vs last week</span>
    </div>
  )
} 