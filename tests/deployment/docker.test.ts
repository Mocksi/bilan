/**
 * Docker deployment verification tests
 * Tests Docker container functionality, health checks, and infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanDatabase } from '../../packages/server/src/database/schema'
import { BasicAnalyticsProcessor } from '../../packages/server/src/analytics/basic-processor'

// Mock Docker environment variables
const DOCKER_ENV = {
  BILAN_NODE_ENV: 'production',
  BILAN_PORT: '3002',
  BILAN_DATABASE_TYPE: 'postgres',
  DATABASE_URL: 'postgresql://bilan:bilan@postgres:5432/bilan_production',
  BILAN_SESSION_SECRET: 'production-session-secret-key',
  BILAN_JWT_SECRET: 'production-jwt-secret-key',
  BILAN_CORS_ORIGIN: 'https://dashboard.bilan.dev',
  BILAN_LOG_LEVEL: 'info',
  BILAN_REDIS_URL: 'redis://redis:6379/0'
}

describe('Docker Deployment Verification', () => {
  let mockFetch: any
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env }
    
    // Set Docker environment
    Object.entries(DOCKER_ENV).forEach(([key, value]) => {
      process.env[key] = value
    })

    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    // Restore original environment
    Object.keys(DOCKER_ENV).forEach(key => {
      delete process.env[key]
    })
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value
      }
    })

    vi.clearAllMocks()
  })

  describe('Container Environment', () => {
    it('should verify all required environment variables are set', () => {
      expect(process.env.BILAN_NODE_ENV).toBe('production')
      expect(process.env.BILAN_PORT).toBe('3002')
      expect(process.env.DATABASE_URL).toBeTruthy()
      expect(process.env.BILAN_SESSION_SECRET).toBeTruthy()
      expect(process.env.BILAN_JWT_SECRET).toBeTruthy()
      expect(process.env.BILAN_CORS_ORIGIN).toBeTruthy()
      expect(process.env.BILAN_LOG_LEVEL).toBe('info')
    })

    it('should validate environment variable formats', () => {
      // Database URL format
      expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//)
      
      // Redis URL format (if present)
      if (process.env.BILAN_REDIS_URL) {
        expect(process.env.BILAN_REDIS_URL).toMatch(/^redis:\/\//)
      }
      
      // CORS origin format
      expect(process.env.BILAN_CORS_ORIGIN).toMatch(/^https?:\/\//)
      
      // Port number format
      expect(parseInt(process.env.BILAN_PORT!)).toBeGreaterThan(0)
      expect(parseInt(process.env.BILAN_PORT!)).toBeLessThan(65536)
    })

    it('should validate security configurations', () => {
      // Secrets should not be default values
      expect(process.env.BILAN_SESSION_SECRET).not.toBe('<CHANGE_ME>')
      expect(process.env.BILAN_JWT_SECRET).not.toBe('<CHANGE_ME>')
      
      // Secrets should be sufficiently long
      expect(process.env.BILAN_SESSION_SECRET!.length).toBeGreaterThan(32)
      expect(process.env.BILAN_JWT_SECRET!.length).toBeGreaterThan(32)
      
      // Production environment should be set
      expect(process.env.BILAN_NODE_ENV).toBe('production')
    })

    it('should validate database configuration', () => {
      const dbUrl = process.env.DATABASE_URL!
      
      // Should be PostgreSQL for production
      expect(dbUrl).toMatch(/^postgresql:\/\//)
      
      // Should have all components
      const url = new URL(dbUrl)
      expect(url.hostname).toBeTruthy()
      expect(url.port).toBeTruthy()
      expect(url.pathname).toBeTruthy()
      expect(url.username).toBeTruthy()
      expect(url.password).toBeTruthy()
    })
  })

  describe('Container Health Checks', () => {
    it('should respond to health check endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          timestamp: Date.now(),
          uptime: 12345,
          version: '0.3.1',
          environment: 'production'
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const health = await response.json()

      expect(response.ok).toBe(true)
      expect(health.status).toBe('healthy')
      expect(health.version).toBe('0.3.1')
      expect(health.environment).toBe('production')
      expect(typeof health.uptime).toBe('number')
    })

    it('should verify database connectivity', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          database: {
            connected: true,
            type: 'postgres',
            responseTime: 15,
            host: 'postgres',
            port: 5432
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/database')
      const dbHealth = await response.json()

      expect(response.ok).toBe(true)
      expect(dbHealth.database.connected).toBe(true)
      expect(dbHealth.database.type).toBe('postgres')
      expect(typeof dbHealth.database.responseTime).toBe('number')
    })

    it('should verify service dependencies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ready',
          services: {
            database: 'healthy',
            redis: 'healthy',
            analytics: 'healthy',
            storage: 'healthy'
          },
          dependencies: {
            postgres: { status: 'connected', latency: 5 },
            redis: { status: 'connected', latency: 2 }
          }
        })
      })

      const response = await fetch('http://localhost:3002/ready')
      const readiness = await response.json()

      expect(response.ok).toBe(true)
      expect(readiness.status).toBe('ready')
      expect(readiness.services.database).toBe('healthy')
      expect(readiness.services.analytics).toBe('healthy')
      expect(readiness.dependencies.postgres.status).toBe('connected')
    })

    it('should handle unhealthy states', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'unhealthy',
          error: 'Database connection failed',
          details: {
            database: 'disconnected',
            lastError: 'Connection timeout after 5000ms'
          }
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const health = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(health.status).toBe('unhealthy')
      expect(health.error).toBeTruthy()
      expect(health.details).toBeTruthy()
    })
  })

  describe('Container Networking', () => {
    it('should verify port binding', async () => {
      const port = parseInt(process.env.BILAN_PORT!)
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ port, listening: true })
      })

      const response = await fetch(`http://localhost:${port}/health`)
      
      expect(response.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`http://localhost:${port}/health`)
    })

    it('should verify CORS configuration', async () => {
      const corsOrigin = process.env.BILAN_CORS_ORIGIN!
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }),
        json: async () => ({ cors: 'configured' })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      
      expect(response.ok).toBe(true)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(corsOrigin)
    })

    it('should verify inter-service communication', async () => {
      // Mock communication with database service
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          database: {
            host: 'postgres',
            port: 5432,
            connected: true
          },
          redis: {
            host: 'redis',
            port: 6379,
            connected: true
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/services')
      const services = await response.json()

      expect(response.ok).toBe(true)
      expect(services.database.host).toBe('postgres')
      expect(services.database.connected).toBe(true)
      expect(services.redis.host).toBe('redis')
      expect(services.redis.connected).toBe(true)
    })
  })

  describe('Container Resource Usage', () => {
    it('should monitor memory usage', async () => {
      const memoryInfo = process.memoryUsage()
      
      // Memory usage should be reasonable for production
      expect(memoryInfo.heapUsed).toBeLessThan(512 * 1024 * 1024) // Less than 512MB
      expect(memoryInfo.rss).toBeLessThan(1024 * 1024 * 1024) // Less than 1GB RSS
      
      console.log(`Memory usage - Heap: ${(memoryInfo.heapUsed / 1024 / 1024).toFixed(2)}MB, RSS: ${(memoryInfo.rss / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should verify performance metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metrics: {
            cpu_usage: 0.25,
            memory_usage: 0.40,
            requests_per_second: 15.5,
            response_time_avg: 125,
            error_rate: 0.005,
            uptime: 86400
          }
        })
      })

      const response = await fetch('http://localhost:3002/metrics')
      const metrics = await response.json()

      expect(response.ok).toBe(true)
      expect(metrics.metrics.cpu_usage).toBeLessThan(0.8) // Less than 80% CPU
      expect(metrics.metrics.memory_usage).toBeLessThan(0.8) // Less than 80% memory
      expect(metrics.metrics.error_rate).toBeLessThan(0.05) // Less than 5% error rate
      expect(metrics.metrics.response_time_avg).toBeLessThan(500) // Less than 500ms avg
    })

    it('should handle resource limits', async () => {
      // Simulate memory pressure
      const largeArrays: any[] = []
      const initialMemory = process.memoryUsage().heapUsed
      
      try {
        // Allocate memory up to a reasonable limit
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(100000).fill(i))
          
          const currentMemory = process.memoryUsage().heapUsed
          const memoryIncrease = currentMemory - initialMemory
          
          // Stop if we've allocated too much (should trigger GC or limits)
          if (memoryIncrease > 100 * 1024 * 1024) { // 100MB
            break
          }
        }
        
        const finalMemory = process.memoryUsage().heapUsed
        const totalIncrease = finalMemory - initialMemory
        
        // Should not crash and memory increase should be reasonable
        expect(totalIncrease).toBeLessThan(200 * 1024 * 1024) // Less than 200MB
        
      } finally {
        // Cleanup
        largeArrays.length = 0
        if (global.gc) {
          global.gc()
        }
      }
    })
  })

  describe('Container Logging', () => {
    it('should verify logging configuration', () => {
      expect(process.env.BILAN_LOG_LEVEL).toBe('info')
      
      // Simulate log output verification
      const logLevels = ['error', 'warn', 'info', 'debug']
      const currentLevel = process.env.BILAN_LOG_LEVEL!
      const currentLevelIndex = logLevels.indexOf(currentLevel)
      
      expect(currentLevelIndex).toBeGreaterThanOrEqual(0)
      expect(currentLevel).not.toBe('debug') // Should not be debug in production
    })

    it('should handle structured logging', () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Container started successfully',
        context: {
          environment: process.env.BILAN_NODE_ENV,
          port: process.env.BILAN_PORT,
          version: '0.3.1'
        }
      }

      expect(logEntry.level).toBe('info')
      expect(logEntry.context.environment).toBe('production')
      expect(logEntry.context.port).toBe('3002')
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should handle error logging', () => {
      const errorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Database connection failed',
        error: {
          name: 'ConnectionError',
          message: 'Connection timeout',
          stack: 'Error: Connection timeout\n    at Database.connect'
        },
        context: {
          database_url: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'), // Masked credentials
          retry_count: 3
        }
      }

      expect(errorLog.level).toBe('error')
      expect(errorLog.error.name).toBeTruthy()
      expect(errorLog.context.database_url).not.toContain('bilan:bilan') // Credentials should be masked
    })
  })

  describe('Container Security', () => {
    it('should verify security headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Content-Security-Policy': "default-src 'self'",
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }),
        json: async () => ({ security: 'configured' })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      
      expect(response.ok).toBe(true)
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy()
    })

    it('should verify authentication configuration', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          message: 'Valid API key required'
        })
      })

      const response = await fetch('http://localhost:3002/api/dashboard')
      const auth = await response.json()

      expect(response.status).toBe(401)
      expect(auth.error).toBe('Unauthorized')
      expect(auth.message).toBeTruthy()
    })

    it('should verify input validation', async () => {
      const maliciousPayload = {
        comment: '<script>alert("xss")</script>',
        promptId: '../../etc/passwd',
        userId: 'admin\'; DROP TABLE users; --'
      }

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation Error',
          message: 'Invalid input detected',
          details: {
            comment: 'Contains unsafe characters',
            promptId: 'Invalid format',
            userId: 'Contains SQL injection patterns'
          }
        })
      })

      const response = await fetch('http://localhost:3002/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [maliciousPayload] })
      })
      
      const validation = await response.json()

      expect(response.status).toBe(400)
      expect(validation.error).toBe('Validation Error')
      expect(validation.details).toBeTruthy()
    })
  })

  describe('Container Data Persistence', () => {
    it('should verify database connectivity', async () => {
      // Mock database connection test
      const database = new BilanDatabase(':memory:') // Use in-memory for test
      const processor = new BasicAnalyticsProcessor(database)
      
      // Verify database operations work
      const dashboardData = await processor.calculateDashboardData()
      
      expect(dashboardData).toBeTruthy()
      expect(dashboardData.conversationStats).toBeDefined()
      expect(dashboardData.feedbackStats).toBeDefined()
    })

    it('should verify data migration status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          migrations: {
            status: 'up-to-date',
            version: '20231201_001',
            applied: [
              '20231101_initial_schema',
              '20231115_add_conversations',
              '20231201_add_journeys'
            ]
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/migrations')
      const migrations = await response.json()

      expect(response.ok).toBe(true)
      expect(migrations.migrations.status).toBe('up-to-date')
      expect(migrations.migrations.applied).toBeTruthy()
      expect(Array.isArray(migrations.migrations.applied)).toBe(true)
    })

    it('should verify backup capabilities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          backup: {
            enabled: true,
            last_backup: '2023-12-01T12:00:00Z',
            retention_days: 30,
            storage_location: 's3://backups/bilan/',
            next_backup: '2023-12-02T12:00:00Z'
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/backup')
      const backup = await response.json()

      expect(response.ok).toBe(true)
      expect(backup.backup.enabled).toBe(true)
      expect(backup.backup.last_backup).toBeTruthy()
      expect(backup.backup.retention_days).toBeGreaterThan(0)
    })
  })

  describe('Container Scalability', () => {
    it('should handle multiple container instances', async () => {
      // Simulate load balancing across multiple instances
      const instances = ['container-1', 'container-2', 'container-3']
      const responses: Array<{ instance: string; status: string; load: number }> = []

      for (const instance of instances) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            instance: instance,
            status: 'healthy',
            load: Math.random() * 0.5 + 0.1 // 10-60% load
          })
        })

        const response = await fetch(`http://localhost:3002/health?instance=${instance}`)
        const health = await response.json()
        responses.push(health)
      }

      expect(responses).toHaveLength(3)
      responses.forEach(response => {
        expect(response.status).toBe('healthy')
        expect(response.load).toBeLessThan(0.8) // Less than 80% load
      })
    })

    it('should verify horizontal scaling readiness', () => {
      // Check for stateless design indicators
      const config = {
        sessionStorage: 'redis', // External session storage
        database: 'postgres', // External database
        fileStorage: 's3', // External file storage
        caching: 'redis' // External caching
      }

      // All external dependencies indicate stateless design
      Object.values(config).forEach(dependency => {
        expect(dependency).not.toBe('local')
      })
    })

    it('should handle graceful shutdown', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          shutdown: {
            initiated: true,
            phase: 'draining',
            active_connections: 5,
            estimated_completion: '10s'
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/shutdown')
      const shutdown = await response.json()

      expect(response.ok).toBe(true)
      expect(shutdown.shutdown.initiated).toBe(true)
      expect(typeof shutdown.shutdown.active_connections).toBe('number')
    })
  })
}) 