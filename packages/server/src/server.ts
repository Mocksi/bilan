import Fastify from 'fastify'
import cors from '@fastify/cors'
import { BilanDatabase } from './database/schema.js'
import { BasicAnalytics } from '@bilan/sdk'

export interface ServerConfig {
  port?: number
  host?: string
  dbPath?: string
  cors?: boolean
}

export class BilanServer {
  private fastify: any
  private db: BilanDatabase

  constructor(config: ServerConfig = {}) {
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
    this.fastify.post('/api/events', async (request: any, reply: any) => {
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
    this.fastify.get('/api/stats', async (request: any, reply: any) => {
      try {
        const { userId } = request.query
        
        if (!userId) {
          return reply.status(400).send({ error: 'Missing userId parameter' })
        }

        const events = this.db.getEventsByUser(userId)
        const stats = BasicAnalytics.calculateBasicStats(events)
        
        return stats
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Get prompt stats
    this.fastify.get('/api/stats/prompt/:promptId', async (request: any, reply: any) => {
      try {
        const { promptId } = request.params
        const { userId } = request.query
        
        if (!promptId) {
          return reply.status(400).send({ error: 'Missing promptId parameter' })
        }

        const events = userId ? 
          this.db.getEventsByPrompt(promptId).filter((e: any) => e.userId === userId) :
          this.db.getEventsByPrompt(promptId)
        const stats = BasicAnalytics.calculatePromptStats(events, promptId)
        
        return stats
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })

    // Get all events
    this.fastify.get('/api/events', async (request: any, reply: any) => {
      try {
        const { limit = 100, offset = 0 } = request.query
        const events = this.db.getAllEvents(parseInt(limit), parseInt(offset))
        
        return { events, total: events.length }
      } catch (error) {
        this.fastify.log.error(error)
        return reply.status(500).send({ error: 'Internal server error' })
      }
    })
  }

  async start(port: number = 3001, host: string = '0.0.0.0'): Promise<void> {
    try {
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