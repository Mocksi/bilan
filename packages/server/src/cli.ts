#!/usr/bin/env node
import { BilanServer } from './server.js'

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || './bilan.db'
}

const server = new BilanServer(config)

server.start(config.port, config.host)

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
}) 