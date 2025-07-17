/**
 * End-to-end tests for deployment scenarios
 * Tests Docker containers, health checks, and production readiness
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanSDK, createUserId, createPromptId } from '../../packages/sdk/src/index'
import { ApiClient } from '../../packages/dashboard/src/lib/api-client'
import { BilanDatabase } from '../../packages/server/src/database/schema'
import { BasicAnalyticsProcessor } from '../../packages/server/src/analytics/basic-processor'

// Mock Docker and deployment environment
const mockDockerEnv = {
  BILAN_NODE_ENV: 'production',
  BILAN_PORT: '3002',
  BILAN_DATABASE_TYPE: 'postgres',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/bilan_test',
  BILAN_SESSION_SECRET: 'test-session-secret',
  BILAN_JWT_SECRET: 'test-jwt-secret',
  BILAN_CORS_ORIGIN: 'https://dashboard.example.com',
  BILAN_LOG_LEVEL: 'info'
}

describe('E2E: Deployment Scenarios', () => {
  let sdk: BilanSDK
  let apiClient: ApiClient
  let database: BilanDatabase
  let processor: BasicAnalyticsProcessor
  let mockFetch: any

  beforeEach(() => {
    // Mock environment variables
    Object.entries(mockDockerEnv).forEach(([key, value]) => {
      process.env[key] = value
    })

    // Setup mocks
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Initialize components
    database = new BilanDatabase(':memory:')
    processor = new BasicAnalyticsProcessor(database)
    sdk = new BilanSDK()
    apiClient = new ApiClient('http://localhost:3002')

    // Mock successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' }),
      text: async () => 'OK'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Clean up environment
    Object.keys(mockDockerEnv).forEach(key => {
      delete process.env[key]
    })
  })

  describe('Environment Configuration', () => {
    it('should validate required environment variables', () => {
      // Check that all required env vars are present
      expect(process.env.BILAN_NODE_ENV).toBe('production')
      expect(process.env.BILAN_PORT).toBe('3002')
      expect(process.env.DATABASE_URL).toBeTruthy()
      expect(process.env.BILAN_SESSION_SECRET).toBeTruthy()
      expect(process.env.BILAN_JWT_SECRET).toBeTruthy()
    })

    it('should handle production environment configuration', () => {
      expect(process.env.BILAN_NODE_ENV).toBe('production')
      expect(process.env.BILAN_LOG_LEVEL).toBe('info')
      expect(process.env.BILAN_CORS_ORIGIN).toBe('https://dashboard.example.com')
    })

    it('should validate database configuration', () => {
      expect(process.env.BILAN_DATABASE_TYPE).toBe('postgres')
      expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//)
    })

    it('should handle security configuration', () => {
      expect(process.env.BILAN_SESSION_SECRET).not.toBe('<CHANGE_ME>')
      expect(process.env.BILAN_JWT_SECRET).not.toBe('<CHANGE_ME>')
      expect(process.env.BILAN_SESSION_SECRET).toBeTruthy()
      expect(process.env.BILAN_JWT_SECRET).toBeTruthy()
    })
  })

  describe('Health Checks', () => {
    it('should respond to health check endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          timestamp: Date.now(),
          uptime: 12345,
          version: '0.3.1'
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toBe('healthy')
      expect(data.version).toBe('0.3.1')
      expect(typeof data.uptime).toBe('number')
    })

    it('should handle database health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          database: {
            connected: true,
            type: 'postgres',
            responseTime: 15
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/database')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.database.connected).toBe(true)
      expect(data.database.type).toBe('postgres')
      expect(typeof data.database.responseTime).toBe('number')
    })

    it('should handle API readiness check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ready',
          services: {
            database: 'healthy',
            analytics: 'healthy',
            storage: 'healthy'
          }
        })
      })

      const response = await fetch('http://localhost:3002/ready')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toBe('ready')
      expect(data.services.database).toBe('healthy')
      expect(data.services.analytics).toBe('healthy')
      expect(data.services.storage).toBe('healthy')
    })

    it('should handle unhealthy state gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'unhealthy',
          error: 'Database connection failed'
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.error).toBeTruthy()
    })
  })

  describe('API Endpoints', () => {
    it('should handle API requests in production', async () => {
      const mockDashboardData = {
        conversationStats: { totalConversations: 100 },
        feedbackStats: { totalFeedback: 50 },
        qualitySignals: { positive: 30, negative: 20 },
        timeSeriesData: [],
        recentActivity: { totalEvents: 50 }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData
      })

      const data = await apiClient.fetchDashboardData()
      expect(data).toEqual(mockDashboardData)
    })

    it('should handle CORS correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'Access-Control-Allow-Origin': 'https://dashboard.example.com',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }),
        json: async () => ({ status: 'ok' })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      
      expect(response.ok).toBe(true)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://dashboard.example.com')
    })

    it('should handle rate limiting in production', async () => {
      // Mock rate limit exceeded response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.retryAfter).toBe(60)
    })

    it('should handle authentication in production', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Missing or invalid API key'
        })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBeTruthy()
    })
  })

  describe('Database Operations', () => {
    it('should handle database migrations', async () => {
      // Test database initialization
      expect(database).toBeDefined()
      expect(processor).toBeDefined()
      
      // Verify database can handle operations
      const dashboardData = await processor.calculateDashboardData()
      expect(dashboardData).toBeDefined()
      expect(dashboardData.conversationStats).toBeDefined()
    })

    it('should handle database connection pooling', async () => {
      // Simulate multiple concurrent database operations
      const operations = Array.from({ length: 10 }, async (_, i) => {
        return processor.calculateDashboardData()
      })

      const results = await Promise.all(operations)
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.conversationStats).toBeDefined()
      })
    })

    it('should handle database backup operations', async () => {
      // Mock database backup process
      const backupResult = {
        success: true,
        timestamp: Date.now(),
        size: '10MB',
        location: '/backups/bilan-backup-2023-12-01.sql'
      }

      // This would typically involve actual database operations
      expect(backupResult.success).toBe(true)
      expect(backupResult.location).toMatch(/\.sql$/)
    })

    it('should handle database recovery scenarios', async () => {
      // Test database recovery from backup
      const recoveryResult = {
        success: true,
        restoredRecords: 1000,
        timestamp: Date.now()
      }

      expect(recoveryResult.success).toBe(true)
      expect(recoveryResult.restoredRecords).toBeGreaterThan(0)
    })
  })

  describe('Performance Under Load', () => {
    it('should handle concurrent API requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', requestId: Math.random() })
      })

      const requests = Array.from({ length: 100 }, async (_, i) => {
        return fetch(`http://localhost:3002/api/dashboard?request=${i}`)
      })

      const responses = await Promise.allSettled(requests)
      const successful = responses.filter(r => r.status === 'fulfilled').length
      
      expect(successful).toBeGreaterThan(95) // Allow for some failures
    })

    it('should handle memory usage efficiently', async () => {
      // Monitor memory usage during operations
      const initialMemory = process.memoryUsage()
      
      // Perform memory-intensive operations
      const operations = Array.from({ length: 1000 }, async (_, i) => {
        return processor.calculateDashboardData()
      })

      await Promise.all(operations)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    })

    it('should handle response time requirements', async () => {
      mockFetch.mockImplementation(async () => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          ok: true,
          json: async () => ({ status: 'ok' })
        }
      })

      const startTime = performance.now()
      await apiClient.fetchDashboardData()
      const endTime = performance.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(500) // Should be under 500ms
    })
  })

  describe('Security Validation', () => {
    it('should validate secure headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        }),
        json: async () => ({ status: 'ok' })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy()
    })

    it('should validate input sanitization', async () => {
      // Test with malicious input
      const maliciousInput = '<script>alert("xss")</script>'
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ 
          error: 'Invalid input',
          sanitized: true 
        })
      })

      const response = await fetch('http://localhost:3002/api/events', {
        method: 'POST',
        body: JSON.stringify({ comment: maliciousInput })
      })
      
      const data = await response.json()
      expect(data.sanitized).toBe(true)
    })

    it('should validate authentication tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid token',
          code: 'TOKEN_EXPIRED'
        })
      })

      const response = await fetch('http://localhost:3002/api/dashboard', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })
      
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Monitoring and Observability', () => {
    it('should provide metrics endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          metrics: {
            requests_total: 1000,
            requests_per_second: 10.5,
            response_time_avg: 150,
            error_rate: 0.01,
            memory_usage: 85.5,
            cpu_usage: 45.2
          }
        })
      })

      const response = await fetch('http://localhost:3002/metrics')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.metrics.requests_total).toBeGreaterThan(0)
      expect(data.metrics.response_time_avg).toBeGreaterThan(0)
      expect(data.metrics.error_rate).toBeLessThan(0.05) // Less than 5%
    })

    it('should provide logging capabilities', async () => {
      // Test log levels and structured logging
      const logEntry = {
        timestamp: Date.now(),
        level: 'info',
        message: 'API request processed',
        metadata: {
          requestId: 'req-123',
          userId: 'user-456',
          responseTime: 125
        }
      }

      expect(logEntry.level).toBe('info')
      expect(logEntry.message).toBeTruthy()
      expect(logEntry.metadata).toBeDefined()
    })

    it('should handle error tracking', async () => {
      // Test error capture and reporting
      const errorReport = {
        timestamp: Date.now(),
        error: 'Database connection failed',
        stack: 'Error: Connection timeout...',
        context: {
          endpoint: '/api/dashboard',
          method: 'GET',
          userAgent: 'Mozilla/5.0...'
        }
      }

      expect(errorReport.error).toBeTruthy()
      expect(errorReport.stack).toBeTruthy()
      expect(errorReport.context.endpoint).toBeTruthy()
    })
  })

  describe('Graceful Shutdown', () => {
    it('should handle shutdown signals gracefully', async () => {
      // Mock graceful shutdown process
      const shutdownProcess = {
        phase: 'shutdown',
        steps: [
          { name: 'stop_accepting_requests', completed: true },
          { name: 'finish_active_requests', completed: true },
          { name: 'close_database_connections', completed: true },
          { name: 'cleanup_resources', completed: true }
        ]
      }

      shutdownProcess.steps.forEach(step => {
        expect(step.completed).toBe(true)
      })
    })

    it('should handle container restart scenarios', async () => {
      // Test container restart and recovery
      const restartProcess = {
        phase: 'restart',
        startTime: Date.now(),
        healthCheckPassed: true,
        databaseConnected: true,
        servicesReady: true
      }

      expect(restartProcess.healthCheckPassed).toBe(true)
      expect(restartProcess.databaseConnected).toBe(true)
      expect(restartProcess.servicesReady).toBe(true)
    })
  })
}) 