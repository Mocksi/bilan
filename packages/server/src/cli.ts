#!/usr/bin/env node
import { BilanServer } from './server.js'

const portEnv = process.env.BILAN_PORT || process.env.PORT
const port = portEnv ? parseInt(portEnv, 10) : 3002

// Validate port number
if (portEnv && (isNaN(port) || port < 1 || port > 65535)) {
  console.error(`Invalid BILAN_PORT environment variable: ${portEnv}. Must be a number between 1 and 65535.`)
  process.exit(1)
}

// Validate API key
const apiKey = process.env.BILAN_API_KEY
const isDevelopmentMode = process.env.BILAN_DEV_MODE === 'true'

if (!isDevelopmentMode && (!apiKey || apiKey.trim() === '')) {
  console.error('Missing required BILAN_API_KEY environment variable.')
  console.error('Set BILAN_API_KEY to a secure API key, or set BILAN_DEV_MODE=true for development.')
  console.error('Generate a secure API key with: openssl rand -hex 32')
  process.exit(1)
}

const config = {
  port,
  dbPath: process.env.BILAN_DB_PATH || process.env.DB_PATH || './bilan.db',
  apiKey: process.env.BILAN_API_KEY,
  cors: true // Enable CORS for development
}

const server = new BilanServer(config)

// Start server with error handling
server.start()
  .then(() => {
    console.log(`Server started on port ${config.port}`)
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