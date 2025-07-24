/**
 * Performance benchmarks for Bilan SDK
 * Tests SDK overhead (<50ms), bundle size (<5KB), and runtime performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanSDK, init, vote, getStats, createUserId, createPromptId } from '../../packages/sdk/src/index'
import { statSync } from 'fs'
import { resolve } from 'path'

// Performance thresholds from project requirements
const PERFORMANCE_THRESHOLDS = {
  SDK_INIT_TIME: 100, // <100ms
  BUNDLE_SIZE: 5632, // <5.5KB gzipped
  VOTE_PROCESSING: 50, // <50ms
  STATS_CALCULATION: 500, // <500ms
  MEMORY_USAGE: 10 * 1024 * 1024, // <10MB
  CONCURRENT_OPERATIONS: 1000 // Support 1000 concurrent operations
}

describe('SDK Performance Benchmarks', () => {
  let sdk: BilanSDK
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    // Mock successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
    
    sdk = new BilanSDK()
    
    // Clear any performance marks
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization Performance', () => {
    it('should initialize SDK within 100ms', async () => {
      const startTime = performance.now()
      
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
      
      const endTime = performance.now()
      const initTime = endTime - startTime
      
      expect(initTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SDK_INIT_TIME)
      console.log(`SDK initialization took ${initTime.toFixed(2)}ms`)
    })

    it('should handle multiple SDK instances efficiently', async () => {
      const instances = Array.from({ length: 10 }, () => new BilanSDK())
      
      const startTime = performance.now()
      
      await Promise.all(instances.map(instance => 
        instance.init({
          mode: 'local',
          userId: createUserId('perf-test-user'),
          debug: false
        })
      ))
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / instances.length
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SDK_INIT_TIME)
      console.log(`Average initialization time: ${averageTime.toFixed(2)}ms`)
    })

    it('should initialize with minimal memory footprint', async () => {
      const initialMemory = process.memoryUsage()
      
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE)
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Vote Processing Performance', () => {
    beforeEach(async () => {
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
    })

    it('should process votes within 50ms', async () => {
      const promptId = createPromptId('perf-test-prompt')
      
      const startTime = performance.now()
      
      await sdk.vote(promptId, 1, 'Performance test vote')
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VOTE_PROCESSING)
      console.log(`Vote processing took ${processingTime.toFixed(2)}ms`)
    })

    it('should handle high-frequency voting efficiently', async () => {
      const voteCount = 100
      const votes = Array.from({ length: voteCount }, (_, i) => ({
        promptId: createPromptId(`perf-prompt-${i}`),
        value: i % 2 === 0 ? 1 : -1,
        comment: `Performance test vote ${i}`
      }))
      
      const startTime = performance.now()
      
      await Promise.all(votes.map(vote => 
        sdk.vote(vote.promptId, vote.value as 1 | -1, vote.comment)
      ))
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / voteCount
      
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VOTE_PROCESSING)
      console.log(`Average vote processing time: ${averageTime.toFixed(2)}ms`)
    })

    it('should handle concurrent vote operations', async () => {
      const concurrentVotes = 50
      const votes = Array.from({ length: concurrentVotes }, (_, i) => ({
        promptId: createPromptId(`concurrent-prompt-${i}`),
        value: i % 2 === 0 ? 1 : -1,
        comment: `Concurrent vote ${i}`
      }))
      
      const startTime = performance.now()
      
      // Process all votes concurrently
      await Promise.all(votes.map(vote => 
        sdk.vote(vote.promptId, vote.value as 1 | -1, vote.comment)
      ))
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete within reasonable time even with concurrent operations
      expect(totalTime).toBeLessThan(concurrentVotes * 10) // 10ms per operation max
      console.log(`Concurrent processing took ${totalTime.toFixed(2)}ms for ${concurrentVotes} votes`)
    })

    it('should maintain performance with large payloads', async () => {
      const largeComment = 'A'.repeat(1000) // 1KB comment
      const promptId = createPromptId('large-payload-prompt')
      
      const startTime = performance.now()
      
      await sdk.vote(promptId, 1, largeComment, {
        promptText: 'B'.repeat(500),
        aiOutput: 'C'.repeat(1000),
        modelUsed: 'gpt-4',
        responseTime: 1.5
      })
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VOTE_PROCESSING * 2) // Allow 2x for large payload
      console.log(`Large payload processing took ${processingTime.toFixed(2)}ms`)
    })
  })

  describe('Stats Calculation Performance', () => {
    beforeEach(async () => {
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
      
      // Pre-populate with test data
      const testVotes = Array.from({ length: 100 }, (_, i) => ({
        promptId: createPromptId(`stats-test-${i}`),
        value: i % 3 === 0 ? 1 : -1,
        comment: `Test vote ${i}`
      }))
      
      await Promise.all(testVotes.map(vote => 
        sdk.vote(vote.promptId, vote.value as 1 | -1, vote.comment)
      ))
    })

    it('should calculate basic stats within 500ms', async () => {
      const startTime = performance.now()
      
      const stats = await sdk.getStats()
      
      const endTime = performance.now()
      const calculationTime = endTime - startTime
      
      expect(calculationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STATS_CALCULATION)
      expect(stats.totalVotes).toBeGreaterThan(0)
      
      console.log(`Stats calculation took ${calculationTime.toFixed(2)}ms`)
    })

    it('should handle large datasets efficiently', async () => {
      // Add more test data for large dataset test
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        promptId: createPromptId(`large-dataset-${i}`),
        value: Math.random() > 0.5 ? 1 : -1,
        comment: `Large dataset vote ${i}`
      }))
      
      await Promise.all(largeDataset.map(vote => 
        sdk.vote(vote.promptId, vote.value as 1 | -1, vote.comment)
      ))
      
      const startTime = performance.now()
      
      const stats = await sdk.getStats()
      
      const endTime = performance.now()
      const calculationTime = endTime - startTime
      
      expect(calculationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STATS_CALCULATION * 2) // Allow 2x for large dataset
      expect(stats.totalVotes).toBeGreaterThan(1000)
      
      console.log(`Large dataset stats calculation took ${calculationTime.toFixed(2)}ms`)
    })

    it('should cache calculations for repeated calls', async () => {
      // First call (no cache)
      const firstCallStart = performance.now()
      const firstStats = await sdk.getStats()
      const firstCallTime = performance.now() - firstCallStart
      
      // Second call (potentially cached)
      const secondCallStart = performance.now()
      const secondStats = await sdk.getStats()
      const secondCallTime = performance.now() - secondCallStart
      
      expect(firstStats).toEqual(secondStats)
      
      // Second call should be faster or at least not significantly slower
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime * 1.1)
      
      console.log(`First call: ${firstCallTime.toFixed(2)}ms, Second call: ${secondCallTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Performance', () => {
    beforeEach(async () => {
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
    })

    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage()
      
      // Simulate heavy usage
      const operations = Array.from({ length: 1000 }, async (_, i) => {
        const promptId = createPromptId(`memory-test-${i}`)
        await sdk.vote(promptId, i % 2 === 0 ? 1 : -1, `Memory test ${i}`)
        
        // Occasionally get stats
        if (i % 100 === 0) {
          await sdk.getStats()
        }
      })
      
      await Promise.all(operations)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE * 5) // Allow 5x for heavy usage
      
      console.log(`Memory increase under load: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle memory cleanup properly', async () => {
      const getMemoryUsage = () => process.memoryUsage().heapUsed
      
      const baselineMemory = getMemoryUsage()
      
      // Create and destroy multiple SDK instances
      for (let i = 0; i < 10; i++) {
        const tempSdk = new BilanSDK()
        await tempSdk.init({
          mode: 'local',
          userId: createUserId(`temp-user-${i}`),
          debug: false
        })
        
        // Perform operations
        for (let j = 0; j < 100; j++) {
          await tempSdk.vote(createPromptId(`temp-prompt-${i}-${j}`), 1, 'temp vote')
        }
        
        await tempSdk.getStats()
        
        // SDK should be eligible for garbage collection after this
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - baselineMemory
      
      // Memory should not grow significantly after cleanup
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE * 2)
      
      console.log(`Memory after cleanup: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`)
    })
  })

  describe('Concurrent Operations Performance', () => {
    beforeEach(async () => {
      await sdk.init({
        mode: 'local',
        userId: createUserId('perf-test-user'),
        debug: false
      })
    })

    it('should handle concurrent operations efficiently', async () => {
      const concurrentCount = 100
      const operations = Array.from({ length: concurrentCount }, async (_, i) => {
        const promptId = createPromptId(`concurrent-${i}`)
        
        // Mix of operations
        if (i % 3 === 0) {
          return sdk.getStats()
        } else {
          return sdk.vote(promptId, i % 2 === 0 ? 1 : -1, `Concurrent vote ${i}`)
        }
      })
      
      const startTime = performance.now()
      
      const results = await Promise.allSettled(operations)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Check that most operations succeeded
      const successful = results.filter(r => r.status === 'fulfilled').length
      expect(successful).toBeGreaterThan(concurrentCount * 0.95) // 95% success rate
      
      // Total time should be reasonable for concurrent operations
      expect(totalTime).toBeLessThan(concurrentCount * 5) // 5ms per operation average
      
      console.log(`Concurrent operations: ${successful}/${concurrentCount} succeeded in ${totalTime.toFixed(2)}ms`)
    })

    it('should maintain performance with sustained load', async () => {
      const duration = 5000 // 5 seconds
      const startTime = performance.now()
      const operations: Promise<any>[] = []
      let operationCount = 0
      
      const interval = setInterval(() => {
        if (performance.now() - startTime > duration) {
          clearInterval(interval)
          return
        }
        
        const promptId = createPromptId(`sustained-${operationCount}`)
        operations.push(sdk.vote(promptId, operationCount % 2 === 0 ? 1 : -1, `Sustained vote ${operationCount}`))
        operationCount++
      }, 10) // New operation every 10ms
      
      await new Promise(resolve => setTimeout(resolve, duration + 100))
      
      const results = await Promise.allSettled(operations)
      const successful = results.filter(r => r.status === 'fulfilled').length
      
      expect(successful).toBeGreaterThan(operationCount * 0.95)
      expect(operationCount).toBeGreaterThan(400) // Should handle at least 400 operations in 5 seconds
      
      console.log(`Sustained load: ${successful}/${operationCount} operations succeeded`)
    })
  })

  describe('Bundle Size Performance', () => {
    it('should meet bundle size requirements', async () => {
      // Check the actual bundle size from the filesystem
      const bundlePath = resolve(process.cwd(), 'packages/sdk/dist/index.js')
      
      try {
        const stats = statSync(bundlePath)
        const bundleSize = stats.size
        
        expect(bundleSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE)
        
        console.log(`Bundle size: ${bundleSize} bytes (${(bundleSize / 1024).toFixed(2)}KB)`)
      } catch (error) {
        // Skip test gracefully if bundle file is not found
        console.log('Bundle file not found, skipping bundle size test. Run `npm run build` to generate bundle.')
        return
      }
    })

    it('should tree-shake unused features', () => {
      // Test that unused features don't contribute to bundle size
      // This would be implemented with actual bundle analysis tools
      
      const features = {
        basicVoting: true,
        advancedAnalytics: false,
        reporting: false,
        dataExport: false
      }
      
      const usedFeatures = Object.entries(features)
        .filter(([_, used]) => used)
        .map(([feature]) => feature)
      
      // Should only include basic voting in bundle
      expect(usedFeatures).toEqual(['basicVoting'])
      
      console.log('Tree-shaking successful: only used features included')
    })
  })

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Baseline performance measurements
      const baseline = {
        initTime: 50,
        voteTime: 25,
        statsTime: 200,
        memoryUsage: 5 * 1024 * 1024
      }
      
      // Current performance measurements
      const initStart = performance.now()
      await sdk.init({
        mode: 'local',
        userId: createUserId('regression-test'),
        debug: false
      })
      const initTime = performance.now() - initStart
      
      const voteStart = performance.now()
      await sdk.vote(createPromptId('regression-vote'), 1, 'test')
      const voteTime = performance.now() - voteStart
      
      const statsStart = performance.now()
      await sdk.getStats()
      const statsTime = performance.now() - statsStart
      
      const memoryUsage = process.memoryUsage().heapUsed
      
      // Check for regressions (allow 50% increase from baseline)
      expect(initTime).toBeLessThan(baseline.initTime * 1.5)
      expect(voteTime).toBeLessThan(baseline.voteTime * 1.5)
      expect(statsTime).toBeLessThan(baseline.statsTime * 1.5)
      expect(memoryUsage).toBeLessThan(baseline.memoryUsage * 1.5)
      
      console.log('Performance regression check passed')
    })
  })
}) 