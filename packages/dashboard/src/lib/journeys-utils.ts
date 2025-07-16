import { JourneyData, JourneyFilterState, JourneyExport } from './types'

/**
 * Filter journeys based on filter state
 */
export function filterJourneys(
  journeys: JourneyData[],
  filters: Partial<JourneyFilterState>
): JourneyData[] {
  return journeys.filter(journey => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = 
        journey.id.toLowerCase().includes(searchTerm) ||
        journey.name.toLowerCase().includes(searchTerm) ||
        journey.description?.toLowerCase().includes(searchTerm) ||
        journey.userId.toLowerCase().includes(searchTerm) ||
        journey.steps.some(step => 
          step.name.toLowerCase().includes(searchTerm)
        ) ||
        journey.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )
      
      if (!matchesSearch) return false
    }

    // User filter
    if (filters.userId && journey.userId !== filters.userId) {
      return false
    }

    // Journey name filter
    if (filters.journeyName && journey.name !== filters.journeyName) {
      return false
    }

    // Status filter
    if (filters.status && filters.status !== 'all' && journey.status !== filters.status) {
      return false
    }

    // Step count filters
    if (filters.minSteps !== null && filters.minSteps !== undefined && journey.steps.length < filters.minSteps) {
      return false
    }
    if (filters.maxSteps !== null && filters.maxSteps !== undefined && journey.steps.length > filters.maxSteps) {
      return false
    }

    // Completion rate filter
    if (filters.minCompletionRate !== null && filters.minCompletionRate !== undefined && journey.completionRate < filters.minCompletionRate) {
      return false
    }

    // Satisfaction score filter
    if (filters.satisfactionScore !== null && filters.satisfactionScore !== undefined && journey.satisfactionScore !== undefined) {
      if (journey.satisfactionScore < filters.satisfactionScore) {
        return false
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        journey.tags.includes(tag)
      )
      if (!hasMatchingTag) return false
    }

    // Date range filters
    if (filters.startDate) {
      if (journey.startTime < filters.startDate.getTime()) {
        return false
      }
    }
    if (filters.endDate) {
      if (journey.startTime > filters.endDate.getTime()) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort journeys based on sort criteria
 */
export function sortJourneys(
  journeys: JourneyData[],
  sortBy: JourneyFilterState['sortBy'],
  sortOrder: JourneyFilterState['sortOrder']
): JourneyData[] {
  return [...journeys].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'startTime':
        comparison = a.startTime - b.startTime
        break
      case 'endTime':
        const aEndTime = a.endTime || Date.now()
        const bEndTime = b.endTime || Date.now()
        comparison = aEndTime - bEndTime
        break
      case 'completionRate':
        comparison = a.completionRate - b.completionRate
        break
      case 'totalTimeSpent':
        comparison = a.totalTimeSpent - b.totalTimeSpent
        break
      case 'satisfactionScore':
        const aScore = a.satisfactionScore || 0
        const bScore = b.satisfactionScore || 0
        comparison = aScore - bScore
        break
      default:
        comparison = a.startTime - b.startTime
    }

    return sortOrder === 'desc' ? -comparison : comparison
  })
}

/**
 * Calculate journey statistics
 */
export function calculateJourneyStats(journeys: JourneyData[]) {
  if (journeys.length === 0) {
    return {
      totalJourneys: 0,
      activeJourneys: 0,
      completedJourneys: 0,
      abandonedJourneys: 0,
      averageCompletionRate: 0,
      averageTimeToComplete: 0,
      averageSteps: 0,
      averageSatisfactionScore: 0,
      uniqueUsers: 0,
      uniqueJourneyTypes: 0
    }
  }

  const activeJourneys = journeys.filter(j => j.status === 'active').length
  const completedJourneys = journeys.filter(j => j.status === 'completed').length
  const abandonedJourneys = journeys.filter(j => j.status === 'abandoned').length
  
  const averageCompletionRate = journeys.reduce((sum, j) => sum + j.completionRate, 0) / journeys.length
  const averageTimeToComplete = journeys.reduce((sum, j) => sum + j.totalTimeSpent, 0) / journeys.length
  const averageSteps = journeys.reduce((sum, j) => sum + j.steps.length, 0) / journeys.length
  
  const journeysWithSatisfaction = journeys.filter(j => j.satisfactionScore !== undefined)
  const averageSatisfactionScore = journeysWithSatisfaction.length > 0
    ? journeysWithSatisfaction.reduce((sum, j) => sum + (j.satisfactionScore || 0), 0) / journeysWithSatisfaction.length
    : 0

  const uniqueUsers = new Set(journeys.map(j => j.userId)).size
  const uniqueJourneyTypes = new Set(journeys.map(j => j.name)).size

  return {
    totalJourneys: journeys.length,
    activeJourneys,
    completedJourneys,
    abandonedJourneys,
    averageCompletionRate,
    averageTimeToComplete,
    averageSteps,
    averageSatisfactionScore,
    uniqueUsers,
    uniqueJourneyTypes
  }
}

/**
 * Get journey duration in milliseconds
 */
export function getJourneyDuration(journey: JourneyData): number {
  if (!journey.endTime) {
    return Date.now() - journey.startTime
  }
  return journey.endTime - journey.startTime
}

/**
 * Format journey duration for display
 */
export function formatJourneyDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Get journey status color class
 */
export function getJourneyStatusColorClass(status: 'active' | 'completed' | 'abandoned'): string {
  switch (status) {
    case 'active':
      return 'text-blue-600 bg-blue-100'
    case 'completed':
      return 'text-green-600 bg-green-100'
    case 'abandoned':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Get completion rate color class
 */
export function getCompletionRateColorClass(rate: number): string {
  if (rate >= 0.8) return 'text-green-600 bg-green-100'
  if (rate >= 0.6) return 'text-yellow-600 bg-yellow-100'
  if (rate >= 0.4) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

/**
 * Get satisfaction color class
 */
export function getSatisfactionColorClass(score?: number): string {
  if (score === undefined) return 'text-gray-600 bg-gray-100'
  if (score >= 0.8) return 'text-green-600 bg-green-100'
  if (score >= 0.6) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

/**
 * Calculate step completion percentage
 */
export function calculateStepCompletion(journey: JourneyData): number {
  if (journey.steps.length === 0) return 0
  return (journey.completedSteps.length / journey.steps.length) * 100
}

/**
 * Get current step information
 */
export function getCurrentStepInfo(journey: JourneyData) {
  if (!journey.currentStepId) {
    return journey.status === 'completed' ? 'Completed' : 'Not started'
  }
  
  const currentStep = journey.steps.find(step => step.id === journey.currentStepId)
  return currentStep ? `Step ${currentStep.order}: ${currentStep.name}` : 'Unknown step'
}

/**
 * Calculate journey progress percentage
 */
export function calculateJourneyProgress(journey: JourneyData): number {
  if (journey.status === 'completed') return 100
  if (journey.status === 'abandoned') return calculateStepCompletion(journey)
  
  const totalSteps = journey.steps.length
  const completedSteps = journey.completedSteps.length
  
  if (totalSteps === 0) return 0
  return (completedSteps / totalSteps) * 100
}

/**
 * Identify bottleneck steps
 */
export function identifyBottlenecks(journeys: JourneyData[]): Array<{
  stepId: string
  stepName: string
  journeyName: string
  dropoffRate: number
  averageTimeSpent: number
  affectedJourneys: number
}> {
  const stepStats = new Map<string, {
    stepId: string
    stepName: string
    journeyName: string
    totalAttempts: number
    completions: number
    totalTimeSpent: number
    journeyCount: number
  }>()

  journeys.forEach(journey => {
    journey.steps.forEach(step => {
      const key = `${journey.name}-${step.id}`
      if (!stepStats.has(key)) {
        stepStats.set(key, {
          stepId: step.id,
          stepName: step.name,
          journeyName: journey.name,
          totalAttempts: 0,
          completions: 0,
          totalTimeSpent: 0,
          journeyCount: 0
        })
      }
      
      const stats = stepStats.get(key)!
      stats.totalAttempts++
      stats.journeyCount++
      
      if (journey.completedSteps.includes(step.id)) {
        stats.completions++
      }
      
      // Estimate time spent on step (this would come from actual tracking)
      stats.totalTimeSpent += step.averageTimeSpent || 0
    })
  })

  return Array.from(stepStats.values())
    .map(stats => ({
      stepId: stats.stepId,
      stepName: stats.stepName,
      journeyName: stats.journeyName,
      dropoffRate: stats.totalAttempts > 0 ? 1 - (stats.completions / stats.totalAttempts) : 0,
      averageTimeSpent: stats.totalAttempts > 0 ? stats.totalTimeSpent / stats.totalAttempts : 0,
      affectedJourneys: stats.journeyCount
    }))
    .filter(bottleneck => bottleneck.dropoffRate > 0.3) // Only show significant bottlenecks
    .sort((a, b) => b.dropoffRate - a.dropoffRate)
}

/**
 * Export journeys to CSV format
 */
export function exportJourneysToCSV(journeys: JourneyData[]): string {
  const headers = [
    'ID',
    'Name',
    'Description',
    'User ID',
    'Status',
    'Start Time',
    'End Time',
    'Duration',
    'Total Steps',
    'Completed Steps',
    'Completion Rate',
    'Current Step',
    'Satisfaction Score',
    'Tags'
  ]

  const csvData = journeys.map(journey => {
    const duration = getJourneyDuration(journey)
    const currentStep = getCurrentStepInfo(journey)

    return [
      journey.id,
      journey.name,
      journey.description || '',
      journey.userId,
      journey.status,
      new Date(journey.startTime).toISOString(),
      journey.endTime ? new Date(journey.endTime).toISOString() : '',
      formatJourneyDuration(duration),
      journey.steps.length.toString(),
      journey.completedSteps.length.toString(),
      `${(journey.completionRate * 100).toFixed(1)}%`,
      currentStep,
      journey.satisfactionScore?.toFixed(2) || '',
      journey.tags.join('; ')
    ]
  })

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  return csvContent
}

/**
 * Export journeys to JSON format
 */
export function exportJourneysToJSON(journeys: JourneyData[]): string {
  const exportData: JourneyExport[] = journeys.map(journey => ({
    id: journey.id,
    name: journey.name,
    description: journey.description,
    userId: journey.userId,
    startTime: new Date(journey.startTime).toISOString(),
    endTime: journey.endTime ? new Date(journey.endTime).toISOString() : undefined,
    status: journey.status,
    completionRate: journey.completionRate,
    totalTimeSpent: journey.totalTimeSpent,
    satisfactionScore: journey.satisfactionScore,
    tags: journey.tags,
    steps: journey.steps.map(step => ({
      id: step.id,
      name: step.name,
      type: step.type,
      order: step.order,
      isRequired: step.isRequired,
      completed: journey.completedSteps.includes(step.id),
      timeSpent: step.averageTimeSpent
    }))
  }))

  return JSON.stringify(exportData, null, 2)
}

/**
 * Get unique values for filter options
 */
export function getUniqueJourneyFilterValues(journeys: JourneyData[]) {
  const users = Array.from(new Set(journeys.map(j => j.userId))).sort()
  const journeyNames = Array.from(new Set(journeys.map(j => j.name))).sort()
  const tags = Array.from(new Set(journeys.flatMap(j => j.tags))).sort()
  const statuses = Array.from(new Set(journeys.map(j => j.status))).sort()

  return { users, journeyNames, tags, statuses }
}

/**
 * Get journey summary text
 */
export function getJourneySummary(journey: JourneyData): string {
  const progress = calculateJourneyProgress(journey)
  const stepInfo = getCurrentStepInfo(journey)
  
  if (journey.status === 'completed') {
    return `Completed all ${journey.steps.length} steps`
  } else if (journey.status === 'abandoned') {
    return `Abandoned at ${progress.toFixed(0)}% completion`
  } else {
    return `${progress.toFixed(0)}% complete - ${stepInfo}`
  }
} 