import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { BilanDatabase, Event, EVENT_TYPES, EventType, validateEvent } from './database/schema.js'
import { BasicAnalyticsProcessor, DashboardData } from './analytics/basic-processor.js'

/**
 * SDK Event types for API compatibility (local definitions)
 */
interface VoteCastEvent {
  eventId: string
  eventType: 'vote_cast'
  timestamp: number
  userId: string
  properties: {
    promptId: string
    value: 1 | -1
    comment?: string
    responseTime?: number
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

interface TurnEvent {
  eventId: string
  eventType: 'turn_started' | 'turn_completed' | 'turn_failed'
  timestamp: number
  userId: string
  properties: {
    turnId: string
    modelUsed?: string
    conversationId?: string
    responseTime?: number
    status?: 'success' | 'failed'
    errorType?: string
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

interface UserActionEvent {
  eventId: string
  eventType: 'user_action'
  timestamp: number
  userId: string
  properties: {
    actionType: string
    context?: string
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

export interface ServerConfig {
  port?: number
  dbPath?: string
  cors?: boolean
  apiKey?: string
  rateLimitMax?: number
  rateLimitTimeWindow?: string
}

/**
 * Union type for all possible SDK event types
 */
type SdkEvent = VoteCastEvent | TurnEvent | UserActionEvent

interface EventsBody {
  events: SdkEvent[]
}

interface DashboardQuery {
  start?: string
  end?: string
  range?: string
}

/**
 * Convert VoteCastEvent from SDK to unified Event format
 */
function voteCastEventToEvent(voteCastEvent: VoteCastEvent): Event {
  return {
    event_id: voteCastEvent.eventId,
    user_id: voteCastEvent.userId,
    event_type: EVENT_TYPES.VOTE_CAST,
    timestamp: voteCastEvent.timestamp,
    properties: voteCastEvent.properties,
    prompt_text: voteCastEvent.promptText || null,
    ai_response: voteCastEvent.aiResponse || null
  }
}

/**
 * Convert SDK event to unified Event format with required eventId
 */
function sdkEventToEvent(sdkEvent: SdkEvent): Event {
  // Require eventId to be present to avoid duplicates on reprocessing
  if (!sdkEvent.eventId) {
    throw new Error('eventId is required for all SDK events')
  }
  
  // Handle VoteCastEvent
  if (sdkEvent.eventType === 'vote_cast') {
    return voteCastEventToEvent(sdkEvent as VoteCastEvent)
  }
  
  // Handle other event types from SDK - map to server event types
  let serverEventType: EventType
  switch (sdkEvent.eventType) {
    case 'turn_started':
      serverEventType = EVENT_TYPES.TURN_CREATED
      break
    case 'turn_completed':
      serverEventType = EVENT_TYPES.TURN_COMPLETED
      break
    case 'turn_failed':
      serverEventType = EVENT_TYPES.TURN_FAILED
      break
    case 'user_action':
      serverEventType = EVENT_TYPES.USER_ACTION
      break
    default:
      serverEventType = EVENT_TYPES.USER_ACTION // fallback
  }
  
  return {
    event_id: sdkEvent.eventId,
    user_id: sdkEvent.userId,
    event_type: serverEventType,
    timestamp: sdkEvent.timestamp,
    properties: sdkEvent.properties || {},
    prompt_text: sdkEvent.promptText || null,
    ai_response: sdkEvent.aiResponse || null
  }
}

export class BilanServer {
  private fastify: FastifyInstance
  private db: BilanDatabase
  private analyticsProcessor: BasicAnalyticsProcessor
  private dashboardCache = new Map<string, { data: DashboardData; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private config: ServerConfig

  constructor(config: ServerConfig = {}) {
    this.config = config
    this.fastify = Fastify({ logger: true })
    this.db = new BilanDatabase(config.dbPath)
    this.analyticsProcessor = new BasicAnalyticsProcessor(this.db)
    
    this.setupMiddleware()
    this.setupRoutes()
  }
  
  private setupMiddleware(): void {
    // Configure CORS if enabled
    if (this.config.cors) {
      const corsOptions = {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
      }
      this.fastify.register(cors, corsOptions)
    }
    
    // Configure rate limiting
    this.fastify.register(rateLimit, {
      max: this.config.rateLimitMax || 100,
      timeWindow: this.config.rateLimitTimeWindow || '1 minute',
      keyGenerator: (request) => {
        return request.headers.authorization || request.ip
      }
    })
    
    // Authentication middleware for protected endpoints
    this.fastify.addHook('onRequest', async (request, reply) => {
      const protectedPaths = ['/api/events', '/api/analytics']
      const isProtectedPath = protectedPaths.some(path => request.url.startsWith(path))
      
      if (isProtectedPath && this.config.apiKey) {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          reply.status(401).send({ error: 'Missing or invalid authorization header' })
          return
        }
        
        const token = authHeader.substring(7)
        if (token !== this.config.apiKey) {
          reply.status(401).send({ error: 'Invalid API key' })
          return
        }
      }
    })
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async (request, reply) => {
      return { status: 'healthy', timestamp: Date.now() }
    })

    // Enhanced events ingestion endpoint - v0.4.0 with validation, rate limiting, and authentication
    this.fastify.post<{ Body: EventsBody }>('/api/events', async (request, reply) => {
      try {
        const { events } = request.body
        
        // Input validation
        if (!events) {
          return reply.status(400).send({ error: 'Missing events in request body' })
        }
        
        if (!Array.isArray(events)) {
          return reply.status(400).send({ error: 'Events must be an array' })
        }
        
        if (events.length === 0) {
          return reply.status(400).send({ error: 'Events array cannot be empty' })
        }
        
        if (events.length > 1000) {
          return reply.status(400).send({ error: 'Too many events in single request (max: 1000)' })
        }

        let processedCount = 0
        let skippedCount = 0
        let errorCount = 0
        
        // Convert SDK events to unified Event format and insert with enhanced validation
        for (const sdkEvent of events) {
          try {
            // Basic SDK event validation
            if (!sdkEvent.eventId || !sdkEvent.userId || !sdkEvent.eventType) {
              this.fastify.log.warn('Skipping event with missing required fields:', sdkEvent)
              errorCount++
              continue
            }
            
            const unifiedEvent = sdkEventToEvent(sdkEvent)
            
            // Validate using schema validation functions
            const validation = validateEvent(unifiedEvent)
            if (!validation.valid) {
              this.fastify.log.warn('Skipping invalid event:', validation.errors)
              errorCount++
              continue
            }
            
            // Check for duplicate event_id before insertion
            const existingEvent = this.db.queryOne(
              'SELECT event_id FROM events WHERE event_id = ?',
              [unifiedEvent.event_id]
            )
            
            if (!existingEvent) {
              this.db.insertEvent(unifiedEvent)
              processedCount++
            } else {
              this.fastify.log.debug(`Skipping duplicate event: ${unifiedEvent.event_id}`)
              skippedCount++
            }
          } catch (error) {
            this.fastify.log.error('Failed to process event:', error)
            errorCount++
            // Continue processing other events rather than failing completely
          }
        }

        // Clear dashboard cache when new events arrive
        this.dashboardCache.clear()

        return { 
          success: true, 
          total: events.length,
          processed: processedCount,
          skipped: skippedCount,
          errors: errorCount
        }
      } catch (error) {
        this.fastify.log.error('Error in POST /api/events:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Dashboard data endpoint with caching
    this.fastify.get<{ Querystring: DashboardQuery }>('/api/dashboard', async (request, reply) => {
      try {
        const { start, end, range } = request.query
        
        // Parse date range
        let startDate: Date | undefined
        let endDate: Date | undefined
        
        if (range) {
          const now = new Date()
          switch (range) {
            case '7d':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              endDate = now
              break
            case '30d':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              endDate = now
              break
            case '90d':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              endDate = now
              break
          }
        } else if (start && end) {
          startDate = new Date(start)
          endDate = new Date(end)
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return reply.status(400).send({ error: 'Invalid date format' })
          }
        }

        // Check cache
        const cacheKey = `${startDate?.getTime() || 'all'}-${endDate?.getTime() || 'all'}`
        const cached = this.dashboardCache.get(cacheKey)
        
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
          return cached.data
        }

        // Calculate fresh dashboard data with date filtering
        const dashboardData = await this.analyticsProcessor.calculateDashboardData(startDate, endDate)
        
        // Update cache
        this.dashboardCache.set(cacheKey, {
          data: dashboardData,
          timestamp: Date.now()
        })

        return dashboardData
      } catch (error) {
        this.fastify.log.error('Error in GET /api/dashboard:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Legacy endpoints for backward compatibility
    this.fastify.get('/api/stats', async (request, reply) => {
      try {
        const { userId } = request.query as { userId?: string }
        
        if (!userId) {
          return reply.status(400).send({ error: 'Missing userId parameter' })
        }

        const events = this.db.getVoteEvents({ userId })
        const totalVotes = events.length
        const positiveVotes = events.filter(e => e.value > 0).length
        const stats = {
          totalVotes,
          positiveVotes,
          negativeVotes: totalVotes - positiveVotes,
          positiveRate: totalVotes > 0 ? (positiveVotes / totalVotes) * 100 : 0
        }
        
        return stats
      } catch (error) {
        this.fastify.log.error('Error in GET /api/stats:', error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    this.fastify.get('/api/prompts/:promptId/stats', async (request, reply) => {
      try {
        const { promptId } = request.params as { promptId: string }
        const { userId } = request.query as { userId?: string }
        
        if (!promptId) {
          return reply.status(400).send({ error: 'Missing promptId parameter' })
        }

        // Use simplified filtering
        const events = this.db.getVoteEvents({ promptId, userId })
        const totalVotes = events.length
        const positiveVotes = events.filter(e => e.value > 0).length
        const stats = {
          promptId,
          totalVotes,
          positiveVotes,
          negativeVotes: totalVotes - positiveVotes,
          positiveRate: totalVotes > 0 ? (positiveVotes / totalVotes) * 100 : 0,
          recentComments: events.filter(e => e.comment).slice(0, 5).map(e => e.comment)
        }
        
        return stats
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
  }

  async start(port: number = 3000): Promise<void> {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' })
      console.log(`🚀 Bilan server running on port ${port}`)
    } catch (error) {
      this.fastify.log.error(error)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    await this.fastify.close()
    this.db.close()
  }
}

// Export for testing
export { voteCastEventToEvent, sdkEventToEvent } 