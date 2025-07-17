import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import { BilanDatabase, Event, EVENT_TYPES } from './database/schema.js'
import { VoteCastEvent } from '@mocksi/bilan-sdk'
import { BasicAnalyticsProcessor, DashboardData } from './analytics/basic-processor.js'

export interface ServerConfig {
  port?: number
  dbPath?: string
  cors?: boolean
}

interface EventsBody {
  events: any[]
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
 * Convert any SDK event to unified Event format
 */
function sdkEventToEvent(sdkEvent: any): Event {
  // Handle VoteCastEvent
  if (sdkEvent.eventType === 'vote_cast') {
    return voteCastEventToEvent(sdkEvent as VoteCastEvent)
  }
  
  // Handle other event types from SDK
  return {
    event_id: sdkEvent.eventId || crypto.randomUUID(),
    user_id: sdkEvent.userId,
    event_type: sdkEvent.eventType,
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

  constructor(config: ServerConfig = {}) {
    this.fastify = Fastify({ logger: true })
    this.db = new BilanDatabase(config.dbPath)
    this.analyticsProcessor = new BasicAnalyticsProcessor(this.db)
    
    this.setupRoutes()
    
    if (config.cors) {
      this.fastify.register(cors)
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async (request, reply) => {
      return { status: 'healthy', timestamp: Date.now() }
    })

    // Events ingestion endpoint - updated for v0.4.0 SDK compatibility
    this.fastify.post<{ Body: EventsBody }>('/api/events', async (request, reply) => {
      try {
        const { events } = request.body
        
        if (!Array.isArray(events)) {
          return reply.status(400).send({ error: 'Events must be an array' })
        }

        // Convert SDK events to unified Event format and insert
        for (const sdkEvent of events) {
          try {
            const unifiedEvent = sdkEventToEvent(sdkEvent)
            this.db.insertEvent(unifiedEvent)
          } catch (error) {
            this.fastify.log.error('Failed to insert event:', error)
            // Continue processing other events rather than failing completely
          }
        }

        // Clear dashboard cache when new events arrive
        this.dashboardCache.clear()

        return { success: true, processed: events.length }
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