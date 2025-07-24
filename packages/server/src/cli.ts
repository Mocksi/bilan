#!/usr/bin/env node
import { config as dotenvConfig } from 'dotenv'
import { BilanServer } from './server.js'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env files
dotenvConfig({ path: '.env.local' })
dotenvConfig({ path: '.env' })

/**
 * Read a secret from environment variable or file (Docker secrets support)
 * Checks for VARNAME_FILE first, then falls back to VARNAME
 */
function readSecret(varName: string): string | undefined {
  const fileVar = `${varName}_FILE`
  const filePath = process.env[fileVar]
  
  if (filePath && fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf8').trim()
    } catch (error: any) {
      console.error(`Failed to read secret from file ${filePath}:`, error)
      return undefined
    }
  }
  
  return process.env[varName]
}

const port = parseInt(process.env.BILAN_PORT || process.env.PORT || '3002')
if (isNaN(port) || port <= 0 || port > 65535) {
  console.error('Invalid port number:', process.env.BILAN_PORT || process.env.PORT || '3002')
  process.exit(1)
}

// Validate API key (supports Docker secrets)
const apiKey = readSecret('BILAN_API_KEY')
const isDevelopmentMode = process.env.BILAN_DEV_MODE === 'true'

if (!isDevelopmentMode && (!apiKey || apiKey.trim() === '')) {
  console.error('Missing required BILAN_API_KEY environment variable or secret file.')
  console.error('Set BILAN_API_KEY to a secure API key, set BILAN_API_KEY_FILE to a secret file path,')
  console.error('or set BILAN_DEV_MODE=true for development.')
  console.error('Generate a secure API key with: openssl rand -hex 32')
  process.exit(1)
}

const config = {
  port,
  dbPath: process.env.BILAN_DB_PATH || process.env.DB_PATH || './bilan.db',
  apiKey,
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