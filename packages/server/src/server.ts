import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import { BilanDatabase } from './database/schema.js'
import { BasicAnalytics } from '@bilan/sdk'
import { createPromptId } from '@bilan/sdk'

export interface ServerConfig {
  port?: number
  dbPath?: string
  cors?: boolean
}

interface EventsBody {
  events: any[]
}

interface StatsQuery {
  userId?: string
}

interface EventsQuery {
  limit?: string
  offset?: string
}

interface PromptParams {
  promptId: string
}

export class BilanServer {
  private fastify: FastifyInstance
  private db: BilanDatabase
  private config: ServerConfig

  constructor(config: ServerConfig = {}) {
    this.config = config
    this.fastify = Fastify({ logger: true })
    this.db = new BilanDatabase(config.dbPath)
    
    this.setupRoutes()
    this.setupCors(config.cors !== false)
  }

  private setupCors(enabled: boolean): void {
    if (enabled) {
      this.fastify.register(cors, {
        origin: true
      })
    }
  }

  private setupRoutes(): void {
    // Health check
    this.fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Submit events
    this.fastify.post<{ Body: EventsBody }>('/api/events', async (request: FastifyRequest<{ Body: EventsBody }>, reply: FastifyReply) => {
      try {
        const { events } = request.body
        
        if (!events || !Array.isArray(events)) {
          return reply.status(400).send({ error: 'Events must be an array' })
        }

        for (const event of events) {
          if (!event.userId || !event.promptId || event.value === undefined) {
            return reply.status(400).send({ error: 'Missing required fields' })
          }
          
          this.db.insertEvent(event)
        }

        return { success: true, count: events.length }
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Get user stats
    this.fastify.get<{ Querystring: StatsQuery }>('/api/stats', async (request: FastifyRequest<{ Querystring: StatsQuery }>, reply: FastifyReply) => {
      try {
        const { userId } = request.query
        
        if (!userId) {
          return reply.status(400).send({ error: 'Missing userId parameter' })
        }

        const events = this.db.getEvents({ userId })
        const stats = BasicAnalytics.calculateBasicStats(events)
        
        return stats
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Get prompt stats
    this.fastify.get<{ Params: PromptParams; Querystring: StatsQuery }>('/api/stats/prompt/:promptId', async (request: FastifyRequest<{ Params: PromptParams; Querystring: StatsQuery }>, reply: FastifyReply) => {
      try {
        const { promptId } = request.params
        const { userId } = request.query
        
        if (!promptId) {
          return reply.status(400).send({ error: 'Missing promptId parameter' })
        }

        // Use simplified filtering
        const events = this.db.getEvents({ promptId, userId })
        const stats = BasicAnalytics.calculatePromptStats(events, createPromptId(promptId))
        
        return stats
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Get all events
    this.fastify.get<{ Querystring: EventsQuery }>('/api/events', async (request: FastifyRequest<{ Querystring: EventsQuery }>, reply: FastifyReply) => {
      try {
        const { limit = '100', offset = '0' } = request.query
        const limitNum = parseInt(limit, 10)
        const offsetNum = parseInt(offset, 10)
        
        const events = this.db.getEvents({ limit: limitNum, offset: offsetNum })
        const total = this.db.getEventsCount()
        
        return { events, total }
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
  }

  async start(): Promise<void> {
    try {
      const port = this.config.port || 3001
      const host = '0.0.0.0' // Always listen on all interfaces
      
      await this.fastify.listen({ port, host })
      console.log(`Bilan server listening on http://${host}:${port}`)
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    await this.fastify.close()
    this.db.close()
  }
} 