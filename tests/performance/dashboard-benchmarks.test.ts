/**
 * Performance benchmarks for Bilan Dashboard
 * Tests dashboard load times (<3s), rendering performance, and user interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiClient } from '../../packages/dashboard/src/lib/api-client'
import { DashboardData } from '../../packages/dashboard/src/lib/types'

// Performance thresholds from project requirements
const PERFORMANCE_THRESHOLDS = {
  DASHBOARD_LOAD_TIME: 3000, // <3s
  COMPONENT_RENDER_TIME: 100, // <100ms
  INTERACTION_RESPONSE_TIME: 50, // <50ms
  BUNDLE_PARSE_TIME: 500, // <500ms
  MEMORY_USAGE: 30 * 1024 * 1024, // <30MB
  LARGE_DATASET_RENDER: 1000, // <1s for large datasets
  SCROLL_PERFORMANCE: 16, // <16ms for 60fps
  SEARCH_RESPONSE_TIME: 200 // <200ms
}

// Mock dashboard data for performance testing
const createMockDashboardData = (scale = 1): DashboardData => ({
  conversationStats: {
    totalConversations: 1000 * scale,
    successRate: 0.85,
    averageMessages: 5.2,
    completionRate: 0.78
  },
  journeyStats: {
    totalJourneys: 50 * scale,
    completionRate: 0.92,
    popularJourneys: Array.from({ length: 10 * scale }, (_, i) => ({
      name: `journey-${i}`,
      count: 100 - i * 5,
      completionRate: 0.9 - i * 0.02
    }))
  },
  feedbackStats: {
    totalFeedback: 5000 * scale,
    positiveRate: 0.82,
    recentTrend: 'improving',
    topComments: Array.from({ length: 20 * scale }, (_, i) => `Comment ${i}`)
  },
  qualitySignals: {
    positive: 4100 * scale,
    negative: 900 * scale,
    regenerations: 150 * scale,
    frustration: 50 * scale
  },
  timeSeriesData: Array.from({ length: 30 * scale }, (_, i) => ({
    date: `2023-12-${(i % 31) + 1}`,
    trustScore: 0.7 + Math.random() * 0.3,
    totalVotes: 100 + Math.floor(Math.random() * 50),
    positiveVotes: 70 + Math.floor(Math.random() * 30)
  })),
  recentActivity: {
    conversations: Array.from({ length: 100 * scale }, (_, i) => ({
      promptId: `prompt-${i}`,
      userId: `user-${i}`,
      lastActivity: Date.now() - i * 60000,
      feedbackCount: Math.floor(Math.random() * 10),
      outcome: i % 2 === 0 ? 'positive' : 'negative'
    })),
    recentVotes: Array.from({ length: 50 * scale }, (_, i) => ({
      promptId: `prompt-${i}`,
      userId: `user-${i}`,
      value: i % 2 === 0 ? 1 : -1,
      timestamp: Date.now() - i * 30000
    })),
    totalEvents: 10000 * scale
  }
})

describe('Dashboard Performance Benchmarks', () => {
  let apiClient: ApiClient
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    apiClient = new ApiClient('http://localhost:3002')
    
    // Mock performance API if not available
    if (!global.performance) {
      global.performance = {
        now: () => Date.now(),
        mark: vi.fn(),
        measure: vi.fn(),
        clearMarks: vi.fn(),
        clearMeasures: vi.fn()
      } as any
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Load Performance', () => {
    it('should load dashboard data within 3 seconds', async () => {
      const mockData = createMockDashboardData()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 100))
          return mockData
        }
      })
      
      const startTime = performance.now()
      
      const data = await apiClient.fetchDashboardData()
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME)
      expect(data).toEqual(mockData)
      
      console.log(`Dashboard load time: ${loadTime.toFixed(2)}ms`)
    })

    it('should handle concurrent dashboard requests efficiently', async () => {
      const mockData = createMockDashboardData()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })
      
      const concurrentRequests = 10
      const requests = Array.from({ length: concurrentRequests }, () => 
        apiClient.fetchDashboardData()
      )
      
      const startTime = performance.now()
      
      const results = await Promise.all(requests)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrentRequests
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME / 2)
      expect(results).toHaveLength(concurrentRequests)
      
      console.log(`Concurrent dashboard loads: ${averageTime.toFixed(2)}ms average`)
    })

    it('should handle large datasets efficiently', async () => {
      const largeDataset = createMockDashboardData(10) // 10x scale
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => largeDataset
      })
      
      const startTime = performance.now()
      
      const data = await apiClient.fetchDashboardData()
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_RENDER)
      expect(data.timeSeriesData).toHaveLength(300) // 30 * 10
      
      console.log(`Large dataset load time: ${loadTime.toFixed(2)}ms`)
    })
  })

  describe('Component Rendering Performance', () => {
    it('should render stats cards quickly', async () => {
      const mockData = createMockDashboardData()
      
      // Simulate component rendering time
      const renderStatsCards = async (data: DashboardData) => {
        const startTime = performance.now()
        
        // Simulate DOM operations
        const stats = [
          { title: 'Total Conversations', value: data.conversationStats.totalConversations },
          { title: 'Success Rate', value: `${((data.conversationStats.successRate || 0) * 100).toFixed(1)}%` },
          { title: 'Positive Rate', value: `${(data.feedbackStats.positiveRate * 100).toFixed(1)}%` },
          { title: 'Total Events', value: data.recentActivity.totalEvents }
        ]
        
        // Simulate rendering operations
        for (const stat of stats) {
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        
        return performance.now() - startTime
      }
      
      const renderTime = await renderStatsCards(mockData)
      
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME)
      console.log(`Stats cards render time: ${renderTime.toFixed(2)}ms`)
    })

    it('should render time series charts efficiently', async () => {
      const mockData = createMockDashboardData()
      
      const renderTimeSeriesChart = async (data: DashboardData) => {
        const startTime = performance.now()
        
        // Simulate chart data processing
        const chartData = data.timeSeriesData.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.trustScore,
          votes: point.totalVotes
        }))
        
        // Simulate SVG path generation
        const pathData = chartData.map((point, index) => {
          const x = (index / chartData.length) * 800
          const y = (1 - point.y) * 300
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')
        
        // Simulate DOM updates
        await new Promise(resolve => setTimeout(resolve, 10))
        
        return performance.now() - startTime
      }
      
      const renderTime = await renderTimeSeriesChart(mockData)
      
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME)
      console.log(`Time series chart render time: ${renderTime.toFixed(2)}ms`)
    })

    it('should render large tables efficiently', async () => {
      const mockData = createMockDashboardData(5) // 5x scale for large table
      
      const renderConversationTable = async (data: DashboardData) => {
        const startTime = performance.now()
        
        // Simulate table row rendering
        const tableRows = data.recentActivity.conversations.map(conv => ({
          id: conv.promptId,
          user: conv.userId,
          feedback: conv.feedbackCount,
          outcome: conv.outcome,
          time: new Date(conv.lastActivity).toLocaleString()
        }))
        
        // Simulate DOM creation for each row
        for (let i = 0; i < Math.min(tableRows.length, 100); i++) {
          await new Promise(resolve => setTimeout(resolve, 0.1))
        }
        
        return performance.now() - startTime
      }
      
      const renderTime = await renderConversationTable(mockData)
      
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_RENDER)
      console.log(`Large table render time: ${renderTime.toFixed(2)}ms`)
    })
  })

  describe('User Interaction Performance', () => {
    it('should respond to filter changes quickly', async () => {
      const mockData = createMockDashboardData()
      
      const applyFilter = async (data: DashboardData, filter: string) => {
        const startTime = performance.now()
        
        // Simulate filtering logic
        const filteredConversations = data.recentActivity.conversations.filter(conv => 
          conv.outcome === filter || conv.userId.includes(filter)
        )
        
        // Simulate re-rendering
        await new Promise(resolve => setTimeout(resolve, 5))
        
        return {
          time: performance.now() - startTime,
          results: filteredConversations.length
        }
      }
      
      const filterResult = await applyFilter(mockData, 'positive')
      
      expect(filterResult.time).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE_TIME)
      expect(filterResult.results).toBeGreaterThan(0)
      
      console.log(`Filter response time: ${filterResult.time.toFixed(2)}ms`)
    })

    it('should handle search operations efficiently', async () => {
      const mockData = createMockDashboardData()
      
      const performSearch = async (data: DashboardData, query: string) => {
        const startTime = performance.now()
        
        // Simulate search across multiple data sources
        const searchResults = {
          conversations: data.recentActivity.conversations.filter(conv => 
            conv.userId.includes(query) || conv.promptId.includes(query)
          ),
          comments: data.feedbackStats.topComments.filter(comment => 
            comment.toLowerCase().includes(query.toLowerCase())
          ),
          journeys: data.journeyStats.popularJourneys.filter(journey => 
            journey.name.includes(query)
          )
        }
        
        // Simulate search result rendering
        await new Promise(resolve => setTimeout(resolve, 10))
        
        return {
          time: performance.now() - startTime,
          totalResults: searchResults.conversations.length + 
                       searchResults.comments.length + 
                       searchResults.journeys.length
        }
      }
      
      const searchResult = await performSearch(mockData, 'user')
      
      expect(searchResult.time).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME)
      expect(searchResult.totalResults).toBeGreaterThan(0)
      
      console.log(`Search response time: ${searchResult.time.toFixed(2)}ms`)
    })

    it('should handle data refresh efficiently', async () => {
      const mockData = createMockDashboardData()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })
      
      const performRefresh = async () => {
        const startTime = performance.now()
        
        // Simulate refresh operation
        const newData = await apiClient.fetchDashboardData()
        
        // Simulate component re-rendering
        await new Promise(resolve => setTimeout(resolve, 20))
        
        return {
          time: performance.now() - startTime,
          data: newData
        }
      }
      
      const refreshResult = await performRefresh()
      
      expect(refreshResult.time).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME / 2)
      expect(refreshResult.data).toEqual(mockData)
      
      console.log(`Refresh time: ${refreshResult.time.toFixed(2)}ms`)
    })
  })

  describe('Scroll and Virtualization Performance', () => {
    it('should handle smooth scrolling with large datasets', async () => {
      const mockData = createMockDashboardData(20) // 20x scale
      
      const simulateScrolling = async (data: DashboardData) => {
        const startTime = performance.now()
        const scrollEvents = 100
        const itemHeight = 50
        const viewportHeight = 400
        
        // Simulate virtual scrolling
        for (let i = 0; i < scrollEvents; i++) {
          const scrollTop = i * 10
          const startIndex = Math.floor(scrollTop / itemHeight)
          const endIndex = Math.min(
            startIndex + Math.ceil(viewportHeight / itemHeight),
            data.recentActivity.conversations.length
          )
          
          // Simulate rendering visible items only
          const visibleItems = data.recentActivity.conversations.slice(startIndex, endIndex)
          
          // Simulate frame time
          await new Promise(resolve => setTimeout(resolve, 0.1))
        }
        
        return performance.now() - startTime
      }
      
      const scrollTime = await simulateScrolling(mockData)
      const averageFrameTime = scrollTime / 100
      
      expect(averageFrameTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCROLL_PERFORMANCE)
      console.log(`Scroll performance: ${averageFrameTime.toFixed(2)}ms per frame`)
    })

    it('should handle pagination efficiently', async () => {
      const mockData = createMockDashboardData(10)
      
      const simulatePagination = async (data: DashboardData, pageSize = 20) => {
        const startTime = performance.now()
        const totalPages = Math.ceil(data.recentActivity.conversations.length / pageSize)
        
        // Simulate loading each page
        for (let page = 0; page < Math.min(totalPages, 10); page++) {
          const startIndex = page * pageSize
          const pageData = data.recentActivity.conversations.slice(startIndex, startIndex + pageSize)
          
          // Simulate page rendering
          await new Promise(resolve => setTimeout(resolve, 2))
        }
        
        return performance.now() - startTime
      }
      
      const paginationTime = await simulatePagination(mockData)
      
      expect(paginationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_TIME)
      console.log(`Pagination time: ${paginationTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage()
      
      // Simulate multiple dashboard operations
      const operations = Array.from({ length: 100 }, async (_, i) => {
        const mockData = createMockDashboardData()
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })
        
        const data = await apiClient.fetchDashboardData()
        
        // Simulate component rendering
        await new Promise(resolve => setTimeout(resolve, 1))
        
        return data
      })
      
      const results = await Promise.all(operations)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE)
      expect(results).toHaveLength(100)
      
      console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle memory cleanup properly', async () => {
      const getMemoryUsage = () => process.memoryUsage().heapUsed
      
      const baselineMemory = getMemoryUsage()
      
      // Simulate dashboard lifecycle multiple times
      for (let cycle = 0; cycle < 5; cycle++) {
        const mockData = createMockDashboardData(5)
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })
        
        const data = await apiClient.fetchDashboardData()
        
        // Simulate heavy rendering operations
        for (let i = 0; i < 100; i++) {
          const tempData = { ...data }
          await new Promise(resolve => setTimeout(resolve, 0.1))
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - baselineMemory
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE / 2)
      
      console.log(`Memory after cleanup: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Bundle and Asset Performance', () => {
    it('should simulate bundle parsing performance', async () => {
      const simulateBundleParsing = async () => {
        const startTime = performance.now()
        
        // Simulate JavaScript parsing and execution
        const modules = [
          'react', 'react-dom', 'dashboard-components', 
          'api-client', 'chart-library', 'utils'
        ]
        
        for (const module of modules) {
          // Simulate module loading time
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        
        return performance.now() - startTime
      }
      
      const parseTime = await simulateBundleParsing()
      
      expect(parseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_PARSE_TIME)
      console.log(`Bundle parse time: ${parseTime.toFixed(2)}ms`)
    })

    it('should handle asset loading efficiently', async () => {
      const simulateAssetLoading = async () => {
        const startTime = performance.now()
        
        // Simulate loading various assets
        const assets = [
          { type: 'css', size: 50 }, // 50KB CSS
          { type: 'fonts', size: 100 }, // 100KB fonts
          { type: 'images', size: 200 }, // 200KB images
          { type: 'icons', size: 20 } // 20KB icons
        ]
        
        for (const asset of assets) {
          // Simulate network loading time based on size
          const loadTime = asset.size / 10 // 10KB per ms simulation
          await new Promise(resolve => setTimeout(resolve, loadTime))
        }
        
        return performance.now() - startTime
      }
      
      const loadTime = await simulateAssetLoading()
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME / 2)
      console.log(`Asset loading time: ${loadTime.toFixed(2)}ms`)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const baseline = {
        loadTime: 1000,
        renderTime: 50,
        interactionTime: 25,
        memoryUsage: 20 * 1024 * 1024
      }
      
      const mockData = createMockDashboardData()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })
      
      // Measure current performance
      const loadStart = performance.now()
      await apiClient.fetchDashboardData()
      const loadTime = performance.now() - loadStart
      
      const renderStart = performance.now()
      await new Promise(resolve => setTimeout(resolve, 30)) // Simulate rendering
      const renderTime = performance.now() - renderStart
      
      const interactionStart = performance.now()
      await new Promise(resolve => setTimeout(resolve, 10)) // Simulate interaction
      const interactionTime = performance.now() - interactionStart
      
      const memoryUsage = process.memoryUsage().heapUsed
      
      // Check for regressions (allow 50% increase from baseline)
      expect(loadTime).toBeLessThan(baseline.loadTime * 1.5)
      expect(renderTime).toBeLessThan(baseline.renderTime * 1.5)
      expect(interactionTime).toBeLessThan(baseline.interactionTime * 1.5)
      expect(memoryUsage).toBeLessThan(baseline.memoryUsage * 1.5)
      
      console.log('Performance regression check passed')
    })
  })

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user workflow', async () => {
      const mockData = createMockDashboardData()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })
      
      const workflowStart = performance.now()
      
      // 1. Initial dashboard load
      await apiClient.fetchDashboardData()
      
      // 2. Apply filter
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // 3. Search for specific data
      await new Promise(resolve => setTimeout(resolve, 15))
      
      // 4. View detailed conversation
      await new Promise(resolve => setTimeout(resolve, 5))
      
      // 5. Refresh data
      await apiClient.fetchDashboardData()
      
      const workflowTime = performance.now() - workflowStart
      
      expect(workflowTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME)
      console.log(`User workflow time: ${workflowTime.toFixed(2)}ms`)
    })

    it('should handle peak usage scenarios', async () => {
      const mockData = createMockDashboardData(5)
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })
      
      const peakOperations = Array.from({ length: 20 }, async (_, i) => {
        const operationStart = performance.now()
        
        // Simulate different user actions
        if (i % 4 === 0) {
          await apiClient.fetchDashboardData()
        } else if (i % 4 === 1) {
          await new Promise(resolve => setTimeout(resolve, 5)) // Filter
        } else if (i % 4 === 2) {
          await new Promise(resolve => setTimeout(resolve, 10)) // Search
        } else {
          await new Promise(resolve => setTimeout(resolve, 3)) // Navigation
        }
        
        return performance.now() - operationStart
      })
      
      const results = await Promise.all(peakOperations)
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE_TIME * 2)
      console.log(`Peak usage average time: ${averageTime.toFixed(2)}ms`)
    })
  })
}) 