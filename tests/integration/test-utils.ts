import { createServer } from 'net'

/**
 * Set to track ports currently in use by tests to avoid conflicts
 */
const usedPorts = new Set<number>()

/**
 * Checks if a port is available for use
 * @param port - Port number to check
 * @returns Promise that resolves to true if port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.listen(port, () => {
      server.close(() => resolve(true))
    })
    
    server.on('error', () => resolve(false))
  })
}

/**
 * Gets an available port for testing, avoiding conflicts with other tests
 * @param preferredRange - Optional preferred range [min, max]
 * @returns Promise that resolves to an available port number
 */
export async function getAvailablePort(preferredRange?: [number, number]): Promise<number> {
  const [minPort, maxPort] = preferredRange || [30000, 60000]
  const maxAttempts = 100
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort
    
    // Skip if we've already allocated this port in current test run
    if (usedPorts.has(port)) {
      continue
    }
    
    // Check if port is actually available
    if (await isPortAvailable(port)) {
      usedPorts.add(port)
      return port
    }
  }
  
  throw new Error(`Could not find available port in range ${minPort}-${maxPort} after ${maxAttempts} attempts`)
}

/**
 * Releases a port back to the available pool
 * @param port - Port number to release
 */
export function releasePort(port: number): void {
  usedPorts.delete(port)
}

/**
 * Clears all tracked ports (useful for test cleanup)
 */
export function clearPortTracking(): void {
  usedPorts.clear()
} 