#!/usr/bin/env node
import { BilanServer } from './server'

const portEnv = process.env.PORT
const port = portEnv ? parseInt(portEnv, 10) : 3001

// Validate port number
if (portEnv && (isNaN(port) || port < 1 || port > 65535)) {
  console.error(`Invalid PORT environment variable: ${portEnv}. Must be a number between 1 and 65535.`)
  process.exit(1)
}

const config = {
  port,
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || './bilan.db'
}

const server = new BilanServer(config)

// Start server with error handling
server.start()
  .then(() => {
    console.log(`Server started on ${config.host}:${config.port}`)
  })
  .catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
}) 