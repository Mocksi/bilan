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

interface ConversationEvent {
  eventId: string
  eventType: 'conversation_started' | 'conversation_ended'
  timestamp: number
  userId: string
  properties: {
    conversationId: string
    duration?: number
    messageCount?: number
    context?: string
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

interface JourneyEvent {
  eventId: string
  eventType: 'journey_step'
  timestamp: number
  userId: string
  properties: {
    journeyId: string
    journeyName?: string
    stepName?: string
    stepIndex?: number
    totalSteps?: number
    isCompleted?: boolean
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

interface QualitySignalEvent {
  eventId: string
  eventType: 'regeneration_requested' | 'frustration_detected'
  timestamp: number
  userId: string
  properties: {
    context?: string
    reason?: string
    [key: string]: any
  }
  promptText?: string
  aiResponse?: string
}

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Port number for the server to listen on (default: 3000) */
  port?: number
  /** Path to the SQLite database file (default: './bilan.db') */
  dbPath?: string
  /** Enable CORS middleware for cross-origin requests (default: false) */
  cors?: boolean
  /** API key for authentication on protected endpoints */
  apiKey?: string
  /** Maximum number of requests per time window for rate limiting (default: 100) */
  rateLimitMax?: number
  /** Time window for rate limiting (default: '1 minute') */
  rateLimitTimeWindow?: string
}

/**
 * Union type for all possible SDK event types
 */
type SdkEvent = VoteCastEvent | TurnEvent | UserActionEvent | ConversationEvent | JourneyEvent | QualitySignalEvent

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
    case 'conversation_started':
      serverEventType = EVENT_TYPES.CONVERSATION_STARTED
      break
    case 'conversation_ended':
      serverEventType = EVENT_TYPES.CONVERSATION_ENDED
      break
    case 'journey_step':
      serverEventType = EVENT_TYPES.JOURNEY_STEP
      break
    case 'regeneration_requested':
      serverEventType = EVENT_TYPES.REGENERATION_REQUESTED
      break
    case 'frustration_detected':
      serverEventType = EVENT_TYPES.FRUSTRATION_DETECTED
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

  /**
   * API key authentication middleware
   */
  private async authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers.authorization?.replace('Bearer ', '')
    
    // Check if API key is required
    const isDevelopmentMode = process.env.BILAN_DEV_MODE === 'true'
    
    if (!this.config.apiKey && !isDevelopmentMode) {
      return reply.status(500).send({ error: 'Server misconfiguration: API key required but not configured' })
    }
    
    // Allow requests without API key only in explicit development mode
    if (!this.config.apiKey && isDevelopmentMode) {
      return
    }
    
    if (!apiKey) {
      return reply.status(401).send({ error: 'Missing API key' })
    }
    
    // Validate API key against configured value
    if (apiKey !== this.config.apiKey) {
      return reply.status(401).send({ error: 'Invalid API key' })
    }
  }

  private setupMiddleware(): void {
    // Configure CORS if enabled
    if (this.config.cors) {
      const corsOptions = {
        origin: process.env.BILAN_CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3004'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: process.env.BILAN_CORS_CREDENTIALS === 'true'
      }
      this.fastify.register(cors, corsOptions)
    }
    
    // Configure rate limiting
    this.fastify.register(rateLimit, {
      global: false, // Don't apply globally, configure per route
      max: this.config.rateLimitMax || 100,
      timeWindow: this.config.rateLimitTimeWindow || '1 minute',
      keyGenerator: (request) => {
        return request.headers.authorization || request.ip
      }
    })
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Enhanced event ingestion endpoint with rate limiting and validation
    this.fastify.post('/api/events', {
      config: {
        rateLimit: {
          max: this.config.rateLimitMax || 100,
          timeWindow: this.config.rateLimitTimeWindow || '1 minute'
        }
      },
      preHandler: this.authenticateApiKey.bind(this)
    }, async (request, reply) => {
      try {
        const body = request.body as any
        let events: SdkEvent[] = []
        
        // Handle both single event and batch
        if (Array.isArray(body)) {
          events = body
        } else if (body.events && Array.isArray(body.events)) {
          events = body.events
        } else {
          events = [body]
        }

        // Validate batch size
        if (events.length > 1000) {
          return reply.status(400).send({
            error: 'Batch size too large',
            message: 'Maximum 1000 events per request'
          })
        }

        const results = {
          processed: 0,
          skipped: 0,
          errors: 0,
          eventIds: [] as string[]
        }

        // Check for existing event IDs in database before processing
        const incomingEventIds = events.map(event => event.eventId).filter(Boolean)
        const existingEventIds = new Set<string>()
        
        if (incomingEventIds.length > 0) {
          // Query database for existing event IDs
          const placeholders = incomingEventIds.map(() => '?').join(', ')
          const existingEvents = this.db.query(
            `SELECT event_id FROM events WHERE event_id IN (${placeholders})`,
            incomingEventIds
          )
          
          existingEvents.forEach(row => {
            existingEventIds.add(row.event_id)
          })
        }

        // Process each event
        for (const sdkEvent of events) {
          try {
            // Validate required fields
            if (!sdkEvent.eventId || !sdkEvent.eventType || !sdkEvent.userId) {
              results.errors++
              continue
            }

            // Check for duplicate event_id in database
            if (existingEventIds.has(sdkEvent.eventId)) {
              results.skipped++
              continue
            }

            // Check for duplicate event_id within current batch
            if (results.eventIds.includes(sdkEvent.eventId)) {
              results.skipped++
              continue
            }

            // Convert SDK event to database event
            const dbEvent = sdkEventToEvent(sdkEvent)
            
            // Validate and insert
            if (validateEvent(dbEvent)) {
              this.db.insertEvent(dbEvent)
              results.processed++
              results.eventIds.push(sdkEvent.eventId)
              // Add to existing set to prevent duplicates in subsequent iterations
              existingEventIds.add(sdkEvent.eventId)
            } else {
              results.errors++
            }
          } catch (error) {
            results.errors++
            this.fastify.log.error('Error processing event:', error)
          }
        }

        return reply.send({
          success: true,
          message: `Processed ${results.processed} events`,
          stats: {
            processed: results.processed,
            skipped: results.skipped,
            errors: results.errors,
            total: events.length
          }
        })

      } catch (error) {
        this.fastify.log.error('Error in POST /api/events:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to process events'
        })
      }
    })

    // Main dashboard data endpoint
    this.fastify.get('/api/dashboard', async (request, reply) => {
      try {
        const { start, end, range } = request.query as {
          start?: string
          end?: string
          range?: string
        }

        let startDate: Date | undefined
        let endDate: Date | undefined
        
        if (start) startDate = new Date(start)
        if (end) endDate = new Date(end)
          
        const dashboardData = await this.analyticsProcessor.calculateDashboardData(startDate, endDate)
        return reply.send(dashboardData)

      } catch (error) {
        this.fastify.log.error('Error in GET /api/dashboard:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to fetch dashboard data'
        })
      }
    })

    // Enhanced events listing endpoint with pagination and filtering
    this.fastify.get('/api/events', {
      preHandler: this.authenticateApiKey.bind(this)  // Add authentication
    }, async (request, reply) => {
      try {
        const {
          limit = '50',
          offset = '0',
          timeRange = '30d',
          eventType,
          userId,
          search
        } = request.query as {
          limit?: string
          offset?: string
          timeRange?: string
          eventType?: string
          userId?: string
          search?: string
        }

        const limitNum = Math.min(parseInt(limit, 10), 1000) // Cap at 1000
        const offsetNum = parseInt(offset, 10)

        // Calculate date range
        const now = new Date()
        let startDate: Date
        
        switch (timeRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '365d':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          case 'ALL':
            startDate = new Date(0) // Start of epoch to get all events
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }

        // Build database-level filters for better performance
        const dbFilters: any = {
          limit: limitNum,
          offset: offsetNum,
          startTimestamp: startDate.getTime()
        }

        // Add event type filter if specified
        if (eventType) {
          const eventTypes = eventType.split(',').map(type => type.trim())
          dbFilters.eventType = eventTypes.length === 1 ? eventTypes[0] : eventTypes
        }

        // Add user filter if specified
        if (userId) {
          dbFilters.userId = userId
        }

        // Get filtered events from database with proper pagination
        let paginatedEvents = this.db.getEvents(dbFilters)

        // Apply search filter if needed (this requires in-memory filtering for now)
        let totalCount = paginatedEvents.length
        if (search) {
          const searchLower = search.toLowerCase()
          paginatedEvents = paginatedEvents.filter(event => {
            const promptText = event.prompt_text?.toLowerCase() || ''
            const aiResponse = event.ai_response?.toLowerCase() || ''
            const comment = event.properties.comment?.toLowerCase() || ''
            
            return promptText.includes(searchLower) || 
                   aiResponse.includes(searchLower) || 
                   comment.includes(searchLower)
          })
          
          // For search queries, we need to get total count differently
          // This is a limitation - search queries may not show accurate totals
          if (paginatedEvents.length === limitNum) {
            this.fastify.log.warn('Search results may be incomplete due to pagination limits. Consider implementing full-text search for better performance.')
          }
          totalCount = paginatedEvents.length + (offsetNum > 0 ? offsetNum : 0)
        } else {
          // For non-search queries, get accurate total count
          const countFilters = { ...dbFilters }
          delete countFilters.limit
          delete countFilters.offset
          totalCount = this.db.getEventsCount(countFilters)
        }

        return reply.send({
          events: paginatedEvents,
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: (offsetNum + limitNum) < totalCount
        })

      } catch (error) {
        this.fastify.log.error('Error in GET /api/events:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to fetch events'
        })
          }
    })

    // Vote analytics endpoint
    this.fastify.get('/api/analytics/votes', {
      preHandler: this.authenticateApiKey.bind(this)  // Add authentication
    }, async (request, reply) => {
      try {
        const { timeRange = '30d' } = request.query as { timeRange?: string }

        // Calculate date range
        const now = new Date()
        let startDate: Date
        
        switch (timeRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '365d':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          case 'ALL':
            startDate = new Date(0)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }

        const events = this.db.getEvents({ 
          eventType: 'vote_cast',
          startTimestamp: startDate.getTime(),
          limit: 10000  // Keep high limit for analytics but with database filtering
        })

        const voteEvents = events.filter(event => event.properties.value !== undefined)
        const positiveVotes = voteEvents.filter(event => event.properties.value > 0)
        const negativeVotes = voteEvents.filter(event => event.properties.value < 0)
        const commentsCount = voteEvents.filter(event => event.properties.comment).length

        // Calculate daily trends
        const dailyMap = new Map<string, { positive: number; negative: number; total: number }>()
        
        voteEvents.forEach(event => {
          const date = new Date(event.timestamp).toISOString().split('T')[0]
          const current = dailyMap.get(date) || { positive: 0, negative: 0, total: 0 }
          
          current.total++
          if (event.properties.value > 0) current.positive++
          else current.negative++
          
          dailyMap.set(date, current)
        })

        const dailyTrends = Array.from(dailyMap.entries())
          .map(([date, stats]) => ({
            date,
            totalVotes: stats.total,
            positiveVotes: stats.positive,
            negativeVotes: stats.negative,
            positiveRate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Calculate hourly distribution
        const hourlyMap = new Map<number, { positive: number; negative: number; total: number }>()
        
        voteEvents.forEach(event => {
          const hour = new Date(event.timestamp).getHours()
          const current = hourlyMap.get(hour) || { positive: 0, negative: 0, total: 0 }
          
          current.total++
          if (event.properties.value > 0) current.positive++
          else current.negative++
          
          hourlyMap.set(hour, current)
        })

        const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
          const stats = hourlyMap.get(hour) || { positive: 0, negative: 0, total: 0 }
          return {
            hour,
            totalVotes: stats.total,
            positiveVotes: stats.positive,
            negativeVotes: stats.negative,
            positiveRate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0
          }
        })

        // User behavior analysis
        const userVotesMap = new Map<string, { positive: number; negative: number; total: number; lastActivity: number }>()
        
        voteEvents.forEach(event => {
          const current = userVotesMap.get(event.user_id) || { positive: 0, negative: 0, total: 0, lastActivity: 0 }
          
          current.total++
          if (event.properties.value > 0) current.positive++
          else current.negative++
          current.lastActivity = Math.max(current.lastActivity, event.timestamp)
          
          userVotesMap.set(event.user_id, current)
        })

        const topUsers = Array.from(userVotesMap.entries())
          .map(([userId, stats]) => ({
            userId,
            totalVotes: stats.total,
            positiveVotes: stats.positive,
            negativeVotes: stats.negative,
            positiveRate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0,
            lastActivity: stats.lastActivity
          }))
          .sort((a, b) => b.totalVotes - a.totalVotes)
          .slice(0, 10)

        // Prompt performance analysis
        const promptVotesMap = new Map<string, { positive: number; negative: number; total: number; promptText?: string }>()
        
        voteEvents.forEach(event => {
          const promptId = event.properties.promptId || 'unknown'
          const current = promptVotesMap.get(promptId) || { positive: 0, negative: 0, total: 0 }
          
          current.total++
          if (event.properties.value > 0) current.positive++
          else current.negative++
          if (event.prompt_text) current.promptText = event.prompt_text
          
          promptVotesMap.set(promptId, current)
        })

        const topPrompts = Array.from(promptVotesMap.entries())
          .map(([promptId, stats]) => ({
            promptId,
            promptText: stats.promptText,
            totalVotes: stats.total,
            positiveVotes: stats.positive,
            negativeVotes: stats.negative,
            positiveRate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0
          }))
          .sort((a, b) => b.totalVotes - a.totalVotes)
          .slice(0, 10)

        // Comment analysis
        const comments = voteEvents
          .filter(event => event.properties.comment)
          .map(event => ({
            comment: event.properties.comment,
            vote: event.properties.value,
            timestamp: event.timestamp,
            userId: event.user_id
          }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10)

        const userVotes = Array.from(userVotesMap.values())
        const totalUsers = userVotes.length
        const voteCounts = userVotes.map(u => u.total)
        const averageVotesPerUser = totalUsers > 0 ? voteCounts.reduce((a, b) => a + b, 0) / totalUsers : 0
        const medianVotesPerUser = totalUsers > 0 ? voteCounts.sort((a, b) => a - b)[Math.floor(totalUsers / 2)] : 0

        const analytics = {
          overview: {
            totalVotes: voteEvents.length,
            positiveVotes: positiveVotes.length,
            negativeVotes: negativeVotes.length,
            positiveRate: voteEvents.length > 0 ? (positiveVotes.length / voteEvents.length) * 100 : 0,
            averageRating: voteEvents.length > 0 ? voteEvents.reduce((sum, event) => sum + event.properties.value, 0) / voteEvents.length : 0,
            commentsCount,
            uniqueUsers: userVotesMap.size,
            uniquePrompts: promptVotesMap.size
          },
          trends: {
            daily: dailyTrends,
            hourly: hourlyTrends
          },
          userBehavior: {
            topUsers,
            votingPatterns: {
              averageVotesPerUser,
              medianVotesPerUser,
              powerUsers: userVotes.filter(u => u.total > 10).length,
              oneTimeVoters: userVotes.filter(u => u.total === 1).length
            }
          },
          promptPerformance: {
            topPrompts,
            performanceMetrics: {
              averagePositiveRate: topPrompts.length > 0 ? topPrompts.reduce((sum, p) => sum + p.positiveRate, 0) / topPrompts.length : 0,
              bestPerformingPrompt: topPrompts.length > 0 ? topPrompts[0].promptId : '',
              worstPerformingPrompt: topPrompts.length > 0 ? topPrompts[topPrompts.length - 1].promptId : '',
              promptsWithoutVotes: 0 // We only track prompts that have votes
            }
          },
          commentAnalysis: {
            totalComments: commentsCount,
            averageCommentLength: comments.length > 0 ? comments.reduce((sum, c) => sum + c.comment.length, 0) / comments.length : 0,
            topComments: comments,
            sentimentAnalysis: {
              positive: comments.filter(c => c.vote > 0).length,
              negative: comments.filter(c => c.vote < 0).length,
              neutral: 0
            },
            commonThemes: [] // Basic implementation doesn't include theme analysis
          }
        }

        return reply.send(analytics)

      } catch (error) {
        this.fastify.log.error('Error in GET /api/analytics/votes:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to fetch vote analytics'
        })
      }
    })

    // Turn analytics endpoint
    this.fastify.get('/api/analytics/turns', {
      preHandler: this.authenticateApiKey.bind(this)  // Add authentication
    }, async (request, reply) => {
      try {
        const { timeRange = '30d' } = request.query as { timeRange?: string }

        // Calculate date range
        const now = new Date()
        let startDate: Date
        
        switch (timeRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '365d':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          case 'ALL':
            startDate = new Date(0)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }

        const events = this.db.getEvents({ 
          eventType: ['turn_completed', 'turn_failed'],
          startTimestamp: startDate.getTime(),
          limit: 10000  // Keep high limit for analytics but with database filtering
        })

        const completedTurns = events.filter(event => event.event_type === 'turn_completed')
        const failedTurns = events.filter(event => event.event_type === 'turn_failed')
        const turnsWithFeedback = events.filter(event => event.properties.voteValue !== undefined)

        // Calculate daily trends
        const dailyMap = new Map<string, { completed: number; failed: number; total: number }>()
        
        events.forEach(event => {
          const date = new Date(event.timestamp).toISOString().split('T')[0]
          const current = dailyMap.get(date) || { completed: 0, failed: 0, total: 0 }
          
          current.total++
          if (event.event_type === 'turn_completed') current.completed++
          else current.failed++
          
          dailyMap.set(date, current)
        })

        const dailyTrends = Array.from(dailyMap.entries())
          .map(([date, stats]) => ({
            date,
            totalTurns: stats.total,
            completedTurns: stats.completed,
            failedTurns: stats.failed,
            successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Calculate hourly distribution
        const hourlyMap = new Map<number, { completed: number; failed: number; total: number }>()
        
        events.forEach(event => {
          const hour = new Date(event.timestamp).getHours()
          const current = hourlyMap.get(hour) || { completed: 0, failed: 0, total: 0 }
          
          current.total++
          if (event.event_type === 'turn_completed') current.completed++
          else current.failed++
          
          hourlyMap.set(hour, current)
        })

        const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
          const stats = hourlyMap.get(hour) || { completed: 0, failed: 0, total: 0 }
          return {
            hour,
            totalTurns: stats.total,
            completedTurns: stats.completed,
            failedTurns: stats.failed,
            successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
          }
        })

        // User behavior analysis
        const userTurnsMap = new Map<string, { completed: number; failed: number; total: number; totalResponseTime: number }>()
        
        events.forEach(event => {
          const current = userTurnsMap.get(event.user_id) || { completed: 0, failed: 0, total: 0, totalResponseTime: 0 }
          
          current.total++
          if (event.event_type === 'turn_completed') current.completed++
          else current.failed++
          
          const responseTime = event.properties.responseTime || event.properties.response_time || 0
          current.totalResponseTime += responseTime
          
          userTurnsMap.set(event.user_id, current)
        })

        const topUsers = Array.from(userTurnsMap.entries())
          .map(([userId, stats]) => ({
            userId,
            totalTurns: stats.total,
            completedTurns: stats.completed,
            averageResponseTime: stats.total > 0 ? stats.totalResponseTime / stats.total : 0,
            successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
          }))
          .sort((a, b) => b.totalTurns - a.totalTurns)
          .slice(0, 10)

        // Response time distribution
        const responseTimeBuckets = new Map<string, number>([
          ['<100ms', 0],
          ['100-500ms', 0],
          ['500ms-1s', 0],
          ['1-2s', 0],
          ['2-5s', 0],
          ['>5s', 0]
        ])

        completedTurns.forEach(event => {
          const time = (event.properties.responseTime || event.properties.response_time || 0) // Already in ms
          if (time < 100) responseTimeBuckets.set('<100ms', responseTimeBuckets.get('<100ms')! + 1)
          else if (time < 500) responseTimeBuckets.set('100-500ms', responseTimeBuckets.get('100-500ms')! + 1)
          else if (time < 1000) responseTimeBuckets.set('500ms-1s', responseTimeBuckets.get('500ms-1s')! + 1)
          else if (time < 2000) responseTimeBuckets.set('1-2s', responseTimeBuckets.get('1-2s')! + 1)
          else if (time < 5000) responseTimeBuckets.set('2-5s', responseTimeBuckets.get('2-5s')! + 1)
          else responseTimeBuckets.set('>5s', responseTimeBuckets.get('>5s')! + 1)
        })

        const totalResponseTimeEvents = completedTurns.length
        const responseTimeDistribution = Array.from(responseTimeBuckets.entries()).map(([bucket, count]) => ({
          bucket,
          count,
          percentage: totalResponseTimeEvents > 0 ? (count / totalResponseTimeEvents) * 100 : 0
        }))

        // Calculate average response time (response times are already in milliseconds)
        const totalResponseTime = completedTurns.reduce((sum, event) => {
          return sum + (event.properties.responseTime || event.properties.response_time || 0)
        }, 0)
        const averageResponseTime = completedTurns.length > 0 ? (totalResponseTime / completedTurns.length) : 0 // Already in ms

        const analytics = {
          overview: {
            totalTurns: events.length,
            completedTurns: completedTurns.length,
            failedTurns: failedTurns.length,
            turnsWithFeedback: turnsWithFeedback.length,
            averageResponseTime,
            uniqueUsers: userTurnsMap.size,
            successRate: events.length > 0 ? (completedTurns.length / events.length) * 100 : 0
          },
          trends: {
            daily: dailyTrends,
            hourly: hourlyTrends
          },
          userBehavior: {
            topUsers
          },
          performance: {
            responseTimeDistribution,
            errorTypes: [] // Could be enhanced to categorize error types from failed turns
          }
        }

        return reply.send(analytics)

      } catch (error) {
        this.fastify.log.error('Error in GET /api/analytics/turns:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to fetch turn analytics'
        })
      }
    })

    // Overview analytics endpoint
    this.fastify.get('/api/analytics/overview', {
      preHandler: this.authenticateApiKey.bind(this)  // Add authentication
    }, async (request, reply) => {
      try {
        const { timeRange = '30d' } = request.query as { timeRange?: string }

        // Calculate date range
        const now = new Date()
        let startDate: Date
        
        switch (timeRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '365d':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          case 'ALL':
            startDate = new Date(0)
            break
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }

        const events = this.db.getEvents({ 
          startTimestamp: startDate.getTime(),
          limit: 10000  // Keep high limit for analytics but with database filtering
        })

        const eventsByType = new Map<string, number>()
        const userIds = new Set<string>()

        events.forEach(event => {
          eventsByType.set(event.event_type, (eventsByType.get(event.event_type) || 0) + 1)
          userIds.add(event.user_id)
        })

        const overview = {
          totalEvents: events.length,
          totalUsers: userIds.size,
          eventTypes: Array.from(eventsByType.entries()).map(([type, count]) => ({ type, count })),
          timeRange,
          dateRange: {
            start: startDate.toISOString(),
            end: now.toISOString()
          }
        }

        return reply.send(overview)

      } catch (error) {
        this.fastify.log.error('Error in GET /api/analytics/overview:', error)
        return reply.status(500).send({
          error: 'Internal server error',
          message: 'Failed to fetch overview analytics'
        })
      }
    })

    // Legacy endpoints (keeping for backward compatibility)
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

  async start(port?: number): Promise<void> {
    const actualPort = port || this.config.port || 3000
    try {
      await this.fastify.listen({ port: actualPort, host: '0.0.0.0' })
      console.log(`🚀 Bilan server running on port ${actualPort}`)
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