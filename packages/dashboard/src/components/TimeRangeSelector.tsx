import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export type TimeRange = '7d' | '30d' | '90d'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const timeRanges: Array<{ value: TimeRange; label: string }> = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' }
  ]

  const handleRangeChange = (range: TimeRange) => {
    onChange(range)
  }

  return (
    <div className={`btn-group ${className}`} role="group" aria-label="Time range selector">
      {timeRanges.map((range) => (
        <button
          key={range.value}
          type="button"
          className={`btn ${value === range.value ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handleRangeChange(range.value)}
          aria-pressed={value === range.value}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

export const useTimeRange = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentRange = (searchParams.get('range') as TimeRange) || '30d'
  
  const setTimeRange = (range: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`?${params.toString()}`)
  }
  
  return { timeRange: currentRange, setTimeRange }
} 