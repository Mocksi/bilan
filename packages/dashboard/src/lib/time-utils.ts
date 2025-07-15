import { TimeRange } from '@/components/TimeRangeSelector'

export const getTimeRangeInDays = (range: TimeRange): number => {
  switch (range) {
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    default:
      return 7
  }
}

export const getTimeRangeInMilliseconds = (range: TimeRange): number => {
  return getTimeRangeInDays(range) * 24 * 60 * 60 * 1000
}

export const getDateRange = (range: TimeRange): { start: Date; end: Date } => {
  const end = new Date()
  const start = new Date(end.getTime() - getTimeRangeInMilliseconds(range))
  
  return { start, end }
}

export const getPreviousDateRange = (range: TimeRange): { start: Date; end: Date } => {
  const currentRange = getDateRange(range)
  const rangeMs = getTimeRangeInMilliseconds(range)
  
  const end = new Date(currentRange.start.getTime())
  const start = new Date(end.getTime() - rangeMs)
  
  return { start, end }
}

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString()
}

export const formatDateRange = (range: TimeRange): string => {
  const { start, end } = getDateRange(range)
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
  }
  
  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`
}

export const isWithinTimeRange = (timestamp: number, range: TimeRange): boolean => {
  const { start } = getDateRange(range)
  return timestamp >= start.getTime()
}

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

export const formatDateShort = (date: string): string => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
} 