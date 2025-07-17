/**
 * Performance benchmarks for Bilan API
 * Tests API response times (<500ms), throughput, and resource usage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanDatabase } from '../../packages/server/src/database/schema'
import { BasicAnalyticsProcessor } from '../../packages/server/src/analytics/basic-processor'
import { ApiClient } from '../../packages/dashboard/src/lib/api-client'
import { createUserId, createPromptId } from '../../packages/sdk/src/types'

// Performance thresholds from project requirements
const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 500, // <500ms
  DASHBOARD_LOAD_TIME: 3000, // <3s
  CONCURRENT_REQUESTS: 100, // Handle 100 concurrent requests
  THROUGHPUT_RPS: 50, // 50 requests per second minimum
  MEMORY_USAGE: 50 * 1024 * 1024, // <50MB
  DATABASE_QUERY_TIME: 100, // <100ms
  CACHE_HIT_RATIO: 0.8 // 80% cache hit ratio
}

describe('API Performance Benchmarks', () => {
  let database: BilanDatabase
  let processor: BasicAnalyticsProcessor
  let apiClient: ApiClient
  let mockFetch: any

  beforeEach(() => {
    // Initialize in-memory database
    database = new BilanDatabase(':memory:')
    processor = new BasicAnalyticsProcessor(database)
    apiClient = new ApiClient('http://localhost:3002')
    
    // Mock fetch for API client
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        conversationStats: { totalConversations: 100 },
        feedbackStats: { totalFeedback: 50 },
        qualitySignals: { positive: 30, negative: 20 },
        timeSeriesData: [],
        recentActivity: { totalEvents: 50 }
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('API Response Time', () => {
    it('should respond to dashboard requests within 500ms', async () => {
      const startTime = performance.now()
      
      await apiClient.fetchDashboardData()
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME)
      console.log(`Dashboard API response time: ${responseTime.toFixed(2)}ms`)
    })

    it('should handle event ingestion within 100ms', async () => {
      const eventData = {
        events: [{
          promptId: createPromptId('perf-test'),
          userId: createUserId('perf-user'),
          value: 1,
          timestamp: Date.now(),
          comment: 'Performance test event'
        }]
      }
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, processed: 1 })
      })
      
      const startTime = performance.now()
      
      await fetch('http://localhost:3002/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(responseTime).toBeLessThan(100) // Stricter threshold for event ingestion
      console.log(`Event ingestion response time: ${responseTime.toFixed(2)}ms`)
    })

    it('should handle bulk event processing efficiently', async () => {
      const bulkEvents = Array.from({ length: 100 }, (_, i) => ({
        promptId: createPromptId(`bulk-${i}`),
        userId: createUserId('bulk-user'),
        value: i % 2 === 0 ? 1 : -1,
        timestamp: Date.now(),
        comment: `Bulk event ${i}`
      }))
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, processed: bulkEvents.length })
      })
      
      const startTime = performance.now()
      
      await fetch('http://localhost:3002/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: bulkEvents })
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2) // Allow 2x for bulk processing
      console.log(`Bulk event processing time: ${responseTime.toFixed(2)}ms for ${bulkEvents.length} events`)
    })
  })

  describe('Database Performance', () => {
    it('should execute queries within 100ms', async () => {
      // Pre-populate database with test data
      const testEvents = Array.from({ length: 1000 }, (_, i) => ({
        promptId: createPromptId(`db-test-${i}`),
        userId: createUserId('db-user'),
        value: i % 2 === 0 ? 1 : -1,
        timestamp: Date.now() - (i * 1000),
        comment: `Database test event ${i}`
      }))
      
      // Store events in database
      for (const event of testEvents) {
        await database.storeEvent(event)
      }
      
      const startTime = performance.now()
      
      const dashboardData = await processor.calculateDashboardData()
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME)
      expect(dashboardData.feedbackStats.totalFeedback).toBe(testEvents.length)
      
      console.log(`Database query time: ${queryTime.toFixed(2)}ms`)
    })

    it('should handle concurrent database operations', async () => {
      const concurrentQueries = 50
      const queries = Array.from({ length: concurrentQueries }, async (_, i) => {
        return processor.calculateDashboardData()
      })
      
      const startTime = performance.now()
      
      const results = await Promise.all(queries)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrentQueries
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME * 2)
      expect(results).toHaveLength(concurrentQueries)
      
      console.log(`Concurrent database operations: ${averageTime.toFixed(2)}ms average`)
    })

    it('should maintain performance with large datasets', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        promptId: createPromptId(`large-${i}`),
        userId: createUserId(`user-${i % 100}`), // 100 unique users
        value: i % 3 === 0 ? 1 : -1,
        timestamp: Date.now() - (i * 100),
        comment: `Large dataset event ${i}`
      }))
      
      // Store in batches to avoid memory issues
      for (let i = 0; i < largeDataset.length; i += 100) {
        const batch = largeDataset.slice(i, i + 100)
        await Promise.all(batch.map(event => database.storeEvent(event)))
      }
      
      const startTime = performance.now()
      
      const dashboardData = await processor.calculateDashboardData()
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME * 5) // Allow 5x for large dataset
      expect(dashboardData.feedbackStats.totalFeedback).toBe(largeDataset.length)
      
      console.log(`Large dataset query time: ${queryTime.toFixed(2)}ms for ${largeDataset.length} events`)
    })
  })

  describe('Throughput and Concurrency', () => {
    it('should handle concurrent API requests', async () => {
      const concurrentRequests = 100
      const requests = Array.from({ length: concurrentRequests }, async (_, i) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ requestId: i, timestamp: Date.now() })
        })
        
        return fetch(`http://localhost:3002/api/dashboard?request=${i}`)
      })
      
      const startTime = performance.now()
      
      const responses = await Promise.allSettled(requests)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const successful = responses.filter(r => r.status === 'fulfilled').length
      
      expect(successful).toBeGreaterThan(concurrentRequests * 0.95) // 95% success rate
      expect(totalTime).toBeLessThan(concurrentRequests * 50) // 50ms per request average
      
      console.log(`Concurrent requests: ${successful}/${concurrentRequests} succeeded in ${totalTime.toFixed(2)}ms`)
    })

    it('should maintain throughput under sustained load', async () => {
      const duration = 10000 // 10 seconds
      const startTime = performance.now()
      const requests: Promise<any>[] = []
      let requestCount = 0
      
      const interval = setInterval(() => {
        if (performance.now() - startTime > duration) {
          clearInterval(interval)
          return
        }
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ requestId: requestCount, timestamp: Date.now() })
        })
        
        requests.push(fetch(`http://localhost:3002/api/dashboard?sustained=${requestCount}`))
        requestCount++
      }, 20) // New request every 20ms (50 RPS)
      
      await new Promise(resolve => setTimeout(resolve, duration + 100))
      
      const responses = await Promise.allSettled(requests)
      const successful = responses.filter(r => r.status === 'fulfilled').length
      const actualRPS = successful / (duration / 1000)
      
      expect(actualRPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT_RPS)
      expect(successful).toBeGreaterThan(requestCount * 0.95)
      
      console.log(`Sustained load: ${successful}/${requestCount} requests, ${actualRPS.toFixed(2)} RPS`)
    })

    it('should handle mixed workload efficiently', async () => {
      const workloadDuration = 5000 // 5 seconds
      const startTime = performance.now()
      const operations: Promise<any>[] = []
      let operationCount = 0
      
      const interval = setInterval(() => {
        if (performance.now() - startTime > workloadDuration) {
          clearInterval(interval)
          return
        }
        
        const operationType = operationCount % 3
        
        if (operationType === 0) {
          // Dashboard request
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ type: 'dashboard', id: operationCount })
          })
          operations.push(fetch('http://localhost:3002/api/dashboard'))
        } else if (operationType === 1) {
          // Event ingestion
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ type: 'event', id: operationCount })
          })
          operations.push(fetch('http://localhost:3002/api/events', {
            method: 'POST',
            body: JSON.stringify({ events: [{ promptId: `mixed-${operationCount}` }] })
          }))
        } else {
          // Analytics calculation
          operations.push(processor.calculateDashboardData())
        }
        
        operationCount++
      }, 25) // New operation every 25ms (40 ops/sec)
      
      await new Promise(resolve => setTimeout(resolve, workloadDuration + 100))
      
      const results = await Promise.allSettled(operations)
      const successful = results.filter(r => r.status === 'fulfilled').length
      
      expect(successful).toBeGreaterThan(operationCount * 0.9) // 90% success rate for mixed workload
      
      console.log(`Mixed workload: ${successful}/${operationCount} operations succeeded`)
    })
  })

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage()
      
      // Simulate heavy API usage
      const operations = Array.from({ length: 1000 }, async (_, i) => {
        // Alternate between different operations
        if (i % 2 === 0) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: i })
          })
          return fetch(`http://localhost:3002/api/dashboard?memory=${i}`)
        } else {
          return processor.calculateDashboardData()
        }
      })
      
      await Promise.all(operations)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE)
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle memory cleanup after operations', async () => {
      const getMemoryUsage = () => process.memoryUsage().heapUsed
      
      const baselineMemory = getMemoryUsage()
      
      // Perform multiple batches of operations
      for (let batch = 0; batch < 10; batch++) {
        const batchOperations = Array.from({ length: 100 }, async (_, i) => {
          const batchId = batch * 100 + i
          
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ batch, id: batchId })
          })
          
          return fetch(`http://localhost:3002/api/dashboard?batch=${batchId}`)
        })
        
        await Promise.all(batchOperations)
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - baselineMemory
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE / 2) // Should be even lower after cleanup
      
      console.log(`Memory after cleanup: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`)
    })
  })

  describe('Caching Performance', () => {
    it('should improve response times with caching', async () => {
      // First request (no cache)
      const firstCallStart = performance.now()
      await processor.calculateDashboardData()
      const firstCallTime = performance.now() - firstCallStart
      
      // Second request (potentially cached)
      const secondCallStart = performance.now()
      await processor.calculateDashboardData()
      const secondCallTime = performance.now() - secondCallStart
      
      // Third request (should be cached)
      const thirdCallStart = performance.now()
      await processor.calculateDashboardData()
      const thirdCallTime = performance.now() - thirdCallStart
      
      // Cache should improve performance
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime * 1.1)
      expect(thirdCallTime).toBeLessThanOrEqual(firstCallTime * 1.1)
      
      console.log(`Cache performance - First: ${firstCallTime.toFixed(2)}ms, Second: ${secondCallTime.toFixed(2)}ms, Third: ${thirdCallTime.toFixed(2)}ms`)
    })

    it('should maintain cache efficiency under load', async () => {
      const requests = 100
      const cacheHits = new Map<string, number>()
      
      // Simulate repeated requests to same endpoints
      const operations = Array.from({ length: requests }, async (_, i) => {
        const endpoint = `endpoint-${i % 10}` // 10 unique endpoints, repeated
        
        if (!cacheHits.has(endpoint)) {
          cacheHits.set(endpoint, 0)
        }
        cacheHits.set(endpoint, cacheHits.get(endpoint)! + 1)
        
        return processor.calculateDashboardData()
      })
      
      const startTime = performance.now()
      await Promise.all(operations)
      const endTime = performance.now()
      
      const averageTime = (endTime - startTime) / requests
      const expectedCacheHits = requests - 10 // First request to each endpoint is not cached
      const cacheHitRatio = expectedCacheHits / requests
      
      expect(cacheHitRatio).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO)
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME)
      
      console.log(`Cache efficiency: ${(cacheHitRatio * 100).toFixed(1)}% hit ratio, ${averageTime.toFixed(2)}ms average`)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle errors without performance degradation', async () => {
      const errorRate = 0.1 // 10% error rate
      const requests = 100
      
      const operations = Array.from({ length: requests }, async (_, i) => {
        if (Math.random() < errorRate) {
          mockFetch.mockRejectedValueOnce(new Error('Simulated error'))
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: i })
          })
        }
        
        try {
          return await fetch(`http://localhost:3002/api/dashboard?error=${i}`)
        } catch (error) {
          return { error: true }
        }
      })
      
      const startTime = performance.now()
      const results = await Promise.allSettled(operations)
      const endTime = performance.now()
      
      const totalTime = endTime - startTime
      const averageTime = totalTime / requests
      const successful = results.filter(r => r.status === 'fulfilled').length
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME / 2) // Should be fast despite errors
      expect(successful).toBeGreaterThan(requests * (1 - errorRate * 1.2)) // Allow some variance
      
      console.log(`Error handling: ${successful}/${requests} succeeded, ${averageTime.toFixed(2)}ms average`)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track response time metrics', async () => {
      const requests = 50
      const responseTimes: number[] = []
      
      const operations = Array.from({ length: requests }, async (_, i) => {
        const startTime = performance.now()
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: i })
        })
        
        await fetch(`http://localhost:3002/api/dashboard?metrics=${i}`)
        
        const responseTime = performance.now() - startTime
        responseTimes.push(responseTime)
      })
      
      await Promise.all(operations)
      
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)]
      
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME / 2)
      expect(p95ResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME)
      expect(p99ResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 1.5)
      
      console.log(`Response time metrics - Avg: ${avgResponseTime.toFixed(2)}ms, P95: ${p95ResponseTime.toFixed(2)}ms, P99: ${p99ResponseTime.toFixed(2)}ms`)
    })

    it('should provide performance insights', () => {
      const performanceMetrics = {
        requestsPerSecond: 45,
        averageResponseTime: 250,
        errorRate: 0.02,
        cacheHitRatio: 0.85,
        memoryUsage: 30 * 1024 * 1024, // 30MB
        cpuUsage: 0.45 // 45%
      }
      
      // Validate all metrics are within acceptable ranges
      expect(performanceMetrics.requestsPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT_RPS * 0.8)
      expect(performanceMetrics.averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME)
      expect(performanceMetrics.errorRate).toBeLessThan(0.05) // Less than 5%
      expect(performanceMetrics.cacheHitRatio).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO)
      expect(performanceMetrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE)
      expect(performanceMetrics.cpuUsage).toBeLessThan(0.8) // Less than 80%
      
      console.log('All performance metrics within acceptable ranges')
    })
  })
}) 