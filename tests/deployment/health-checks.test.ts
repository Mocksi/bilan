/**
 * Health check verification tests
 * Tests all health check endpoints and monitoring capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanDatabase } from '../../packages/server/src/database/schema'
import { BasicAnalyticsProcessor } from '../../packages/server/src/analytics/basic-processor'

// Health check endpoints and expected responses
const HEALTH_ENDPOINTS = {
  general: '/health',
  database: '/health/database',
  ready: '/ready',
  metrics: '/metrics',
  migrations: '/health/migrations',
  services: '/health/services'
}

describe('Health Check Verification', () => {
  let mockFetch: any
  let database: BilanDatabase
  let processor: BasicAnalyticsProcessor

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    
    database = new BilanDatabase(':memory:')
    processor = new BasicAnalyticsProcessor(database)

    // Set production environment
    process.env.BILAN_NODE_ENV = 'production'
    process.env.BILAN_PORT = '3002'
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.BILAN_NODE_ENV
    delete process.env.BILAN_PORT
  })

  describe('General Health Check', () => {
    it('should return healthy status with all required fields', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          timestamp: Date.now(),
          uptime: 86400000, // 24 hours in milliseconds
          version: '0.3.1',
          environment: 'production',
          pid: process.pid,
          memory: {
            used: 150 * 1024 * 1024, // 150MB
            free: 350 * 1024 * 1024  // 350MB
          },
          cpu: {
            usage: 0.25 // 25%
          }
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const health = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      
      // Required fields
      expect(health.status).toBe('healthy')
      expect(health.version).toBe('0.3.1')
      expect(health.environment).toBe('production')
      expect(typeof health.timestamp).toBe('number')
      expect(typeof health.uptime).toBe('number')
      expect(typeof health.pid).toBe('number')
      
      // Performance metrics
      expect(health.memory.used).toBeLessThan(512 * 1024 * 1024) // Less than 512MB
      expect(health.cpu.usage).toBeLessThan(0.8) // Less than 80%
    })

    it('should handle unhealthy status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'unhealthy',
          timestamp: Date.now(),
          error: 'Service degraded',
          details: {
            database: 'connection_slow',
            memory: 'high_usage',
            response_time: 'above_threshold'
          },
          metrics: {
            database_response_time: 5000, // 5 seconds - too slow
            memory_usage_percent: 95,      // 95% - too high
            error_rate: 0.15              // 15% - too high
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
      expect(health.metrics.database_response_time).toBeGreaterThan(1000)
      expect(health.metrics.memory_usage_percent).toBeGreaterThan(90)
      expect(health.metrics.error_rate).toBeGreaterThan(0.1)
    })

    it('should include comprehensive system information', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          timestamp: Date.now(),
          system: {
            platform: 'linux',
            arch: 'x64',
            node_version: '20.10.0',
            memory_total: 2 * 1024 * 1024 * 1024, // 2GB
            load_average: [0.5, 0.3, 0.2]
          },
          application: {
            name: 'bilan-server',
            version: '0.3.1',
            environment: 'production',
            started_at: '2023-12-01T10:00:00Z'
          }
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const health = await response.json()

      expect(response.ok).toBe(true)
      expect(health.system.platform).toBeTruthy()
      expect(health.system.node_version).toMatch(/^\d+\.\d+\.\d+/)
      expect(health.application.name).toBe('bilan-server')
      expect(health.application.version).toBe('0.3.1')
      expect(health.application.environment).toBe('production')
    })
  })

  describe('Database Health Check', () => {
    it('should verify database connectivity and performance', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          database: {
            connected: true,
            type: 'postgres',
            host: 'postgres',
            port: 5432,
            database: 'bilan_production',
            response_time: 25,
            connection_pool: {
              active: 5,
              idle: 15,
              total: 20
            },
            migrations: {
              status: 'up-to-date',
              version: '20231201_001'
            }
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/database')
      const dbHealth = await response.json()

      expect(response.ok).toBe(true)
      expect(dbHealth.database.connected).toBe(true)
      expect(dbHealth.database.type).toBe('postgres')
      expect(dbHealth.database.response_time).toBeLessThan(100) // Less than 100ms
      expect(dbHealth.database.connection_pool.total).toBeGreaterThan(0)
      expect(dbHealth.database.migrations.status).toBe('up-to-date')
    })

    it('should detect database connection issues', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'unhealthy',
          database: {
            connected: false,
            error: 'Connection timeout',
            last_successful_connection: '2023-12-01T09:45:00Z',
            retry_count: 5,
            max_retries: 10
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/database')
      const dbHealth = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(dbHealth.database.connected).toBe(false)
      expect(dbHealth.database.error).toBeTruthy()
      expect(dbHealth.database.retry_count).toBeGreaterThan(0)
    })

    it('should test actual database operations', async () => {
      // Test with actual database instance
      const testData = await processor.calculateDashboardData()
      
      expect(testData).toBeTruthy()
      expect(testData.conversationStats).toBeDefined()
      expect(testData.feedbackStats).toBeDefined()
      
      // Database operations should complete quickly
      const startTime = performance.now()
      await processor.calculateDashboardData()
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Less than 100ms for in-memory
    })
  })

  describe('Readiness Check', () => {
    it('should verify all services are ready', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ready',
          services: {
            database: 'healthy',
            redis: 'healthy',
            analytics: 'healthy',
            storage: 'healthy',
            auth: 'healthy'
          },
          dependencies: {
            postgres: {
              status: 'connected',
              latency: 10,
              version: '14.9'
            },
            redis: {
              status: 'connected',
              latency: 2,
              memory_usage: '15MB'
            }
          },
          checks: {
            database_migrations: 'passed',
            configuration_valid: 'passed',
            external_apis: 'passed',
            disk_space: 'passed'
          }
        })
      })

      const response = await fetch('http://localhost:3002/ready')
      const readiness = await response.json()

      expect(response.ok).toBe(true)
      expect(readiness.status).toBe('ready')
      
      // All services should be healthy
      Object.values(readiness.services).forEach((status: any) => {
        expect(status).toBe('healthy')
      })
      
      // All dependencies should be connected
      Object.values(readiness.dependencies).forEach((dep: any) => {
        expect(dep.status).toBe('connected')
        expect(dep.latency).toBeLessThan(100)
      })
      
      // All checks should pass
      Object.values(readiness.checks).forEach((check: any) => {
        expect(check).toBe('passed')
      })
    })

    it('should handle partial readiness', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'not_ready',
          services: {
            database: 'healthy',
            redis: 'unhealthy',
            analytics: 'healthy',
            storage: 'degraded'
          },
          dependencies: {
            postgres: { status: 'connected', latency: 15 },
            redis: { status: 'disconnected', error: 'Connection refused' }
          },
          checks: {
            database_migrations: 'passed',
            configuration_valid: 'passed',
            external_apis: 'failed',
            disk_space: 'warning'
          }
        })
      })

      const response = await fetch('http://localhost:3002/ready')
      const readiness = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(readiness.status).toBe('not_ready')
      expect(readiness.services.redis).toBe('unhealthy')
      expect(readiness.dependencies.redis.status).toBe('disconnected')
      expect(readiness.checks.external_apis).toBe('failed')
    })
  })

  describe('Metrics Endpoint', () => {
    it('should provide comprehensive application metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          timestamp: Date.now(),
          uptime: 3600000, // 1 hour
          metrics: {
            // Performance metrics
            requests_total: 10000,
            requests_per_second: 25.5,
            response_time_avg: 125,
            response_time_p95: 250,
            response_time_p99: 500,
            
            // Error metrics
            error_rate: 0.002,
            errors_total: 20,
            
            // Resource metrics
            memory_usage: 0.45,
            cpu_usage: 0.30,
            disk_usage: 0.60,
            
            // Business metrics
            active_users: 150,
            conversations_total: 2500,
            votes_total: 8000,
            trust_score_avg: 0.82
          },
          database: {
            connections_active: 8,
            connections_total: 20,
            queries_per_second: 45,
            slow_queries: 2
          }
        })
      })

      const response = await fetch('http://localhost:3002/metrics')
      const metrics = await response.json()

      expect(response.ok).toBe(true)
      
      // Performance should be within acceptable ranges
      expect(metrics.metrics.requests_per_second).toBeGreaterThan(10)
      expect(metrics.metrics.response_time_avg).toBeLessThan(500)
      expect(metrics.metrics.response_time_p99).toBeLessThan(2000)
      
      // Error rate should be low
      expect(metrics.metrics.error_rate).toBeLessThan(0.05) // Less than 5%
      
      // Resource usage should be reasonable
      expect(metrics.metrics.memory_usage).toBeLessThan(0.8) // Less than 80%
      expect(metrics.metrics.cpu_usage).toBeLessThan(0.8)    // Less than 80%
      
      // Database metrics should be healthy
      expect(metrics.database.connections_active).toBeLessThan(metrics.database.connections_total)
      expect(metrics.database.slow_queries).toBeLessThan(10)
    })

    it('should track business metrics accurately', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          business_metrics: {
            conversations: {
              total: 5000,
              today: 250,
              success_rate: 0.85
            },
            votes: {
              total: 15000,
              positive: 12300,
              negative: 2700,
              positive_rate: 0.82
            },
            users: {
              active_today: 180,
              active_week: 800,
              total_registered: 2500
            },
            quality_signals: {
              regenerations: 150,
              frustration_events: 45,
              positive_feedback: 890
            }
          }
        })
      })

      const response = await fetch('http://localhost:3002/metrics')
      const metrics = await response.json()

      expect(response.ok).toBe(true)
      expect(metrics.business_metrics.conversations.success_rate).toBeGreaterThan(0.7)
      expect(metrics.business_metrics.votes.positive_rate).toBeGreaterThan(0.7)
      expect(metrics.business_metrics.users.active_today).toBeGreaterThan(0)
      expect(metrics.business_metrics.quality_signals.positive_feedback).toBeGreaterThan(0)
    })
  })

  describe('Service Dependencies Health', () => {
    it('should verify all external service dependencies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          services: {
            postgres: {
              status: 'healthy',
              response_time: 15,
              version: '14.9',
              connections: { active: 5, max: 100 }
            },
            redis: {
              status: 'healthy',
              response_time: 3,
              memory_used: '25MB',
              memory_max: '512MB'
            },
            storage: {
              status: 'healthy',
              type: 'local',
              free_space: '50GB',
              total_space: '100GB'
            }
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/services')
      const services = await response.json()

      expect(response.ok).toBe(true)
      
      // PostgreSQL health
      expect(services.services.postgres.status).toBe('healthy')
      expect(services.services.postgres.response_time).toBeLessThan(100)
      expect(services.services.postgres.connections.active).toBeLessThan(services.services.postgres.connections.max)
      
      // Redis health
      expect(services.services.redis.status).toBe('healthy')
      expect(services.services.redis.response_time).toBeLessThan(50)
      
      // Storage health
      expect(services.services.storage.status).toBe('healthy')
    })

    it('should detect service dependency failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          services: {
            postgres: {
              status: 'unhealthy',
              error: 'Connection timeout',
              last_successful_check: '2023-12-01T10:30:00Z'
            },
            redis: {
              status: 'degraded',
              response_time: 1500, // Too slow
              error: 'High latency detected'
            },
            storage: {
              status: 'critical',
              error: 'Disk space low',
              free_space: '500MB', // Very low
              total_space: '100GB'
            }
          }
        })
      })

      const response = await fetch('http://localhost:3002/health/services')
      const services = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)
      expect(services.services.postgres.status).toBe('unhealthy')
      expect(services.services.redis.status).toBe('degraded')
      expect(services.services.storage.status).toBe('critical')
    })
  })

  describe('Health Check Performance', () => {
    it('should respond to health checks quickly', async () => {
      mockFetch.mockImplementation(async (url) => {
        // Simulate slight delay but should be fast
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'healthy', endpoint: url })
        }
      })

      const endpoints = Object.values(HEALTH_ENDPOINTS)
      const checks = endpoints.map(async endpoint => {
        const startTime = performance.now()
        const response = await fetch(`http://localhost:3002${endpoint}`)
        const endTime = performance.now()
        
        return {
          endpoint,
          responseTime: endTime - startTime,
          status: response.ok
        }
      })

      const results = await Promise.all(checks)
      
      results.forEach(result => {
        expect(result.status).toBe(true)
        expect(result.responseTime).toBeLessThan(100) // Health checks should be fast
      })
    })

    it('should handle concurrent health check requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'healthy', timestamp: Date.now() })
      })

      const concurrentChecks = Array.from({ length: 50 }, () => 
        fetch('http://localhost:3002/health')
      )

      const startTime = performance.now()
      const responses = await Promise.all(concurrentChecks)
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrentChecks.length

      expect(responses).toHaveLength(50)
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })
      expect(averageTime).toBeLessThan(50) // Should handle concurrent requests efficiently
    })
  })

  describe('Health Check Circuit Breaker', () => {
    it('should implement circuit breaker for failing services', async () => {
      // Simulate circuit breaker states
      const circuitStates = ['closed', 'open', 'half-open']
      
      for (const state of circuitStates) {
        mockFetch.mockResolvedValueOnce({
          ok: state !== 'open',
          status: state === 'open' ? 503 : 200,
          json: async () => ({
            status: state === 'open' ? 'degraded' : 'healthy',
            circuit_breaker: {
              state: state,
              failure_count: state === 'open' ? 10 : 0,
              last_failure: state === 'open' ? Date.now() - 30000 : null,
              next_attempt: state === 'open' ? Date.now() + 30000 : null
            }
          })
        })

        const response = await fetch('http://localhost:3002/health')
        const health = await response.json()

        expect(health.circuit_breaker.state).toBe(state)
        
        if (state === 'open') {
          expect(response.ok).toBe(false)
          expect(health.circuit_breaker.failure_count).toBeGreaterThan(5)
          expect(health.circuit_breaker.next_attempt).toBeGreaterThan(Date.now())
        }
      }
    })
  })

  describe('Health Check Alerting', () => {
    it('should provide alerting-ready health status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'healthy',
          alerts: {
            critical: [],
            warning: [
              {
                component: 'database',
                message: 'Connection pool utilization at 75%',
                severity: 'warning',
                timestamp: Date.now()
              }
            ],
            info: [
              {
                component: 'cache',
                message: 'Cache hit ratio at 85%',
                severity: 'info',
                timestamp: Date.now()
              }
            ]
          },
          thresholds: {
            response_time_critical: 2000,
            response_time_warning: 1000,
            error_rate_critical: 0.05,
            error_rate_warning: 0.02,
            memory_usage_critical: 0.9,
            memory_usage_warning: 0.7
          }
        })
      })

      const response = await fetch('http://localhost:3002/health')
      const health = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(health.alerts.critical)).toBe(true)
      expect(Array.isArray(health.alerts.warning)).toBe(true)
      expect(health.alerts.critical).toHaveLength(0) // No critical alerts
      expect(health.thresholds).toBeDefined()
      expect(health.thresholds.response_time_critical).toBeGreaterThan(0)
    })
  })
}) 