#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

function getBundleSize() {
  try {
    // Build the SDK first
    execSync('npm run build', { cwd: join(projectRoot, 'packages/sdk'), stdio: 'inherit' })
    
    // Get the bundle size
    const bundlePath = join(projectRoot, 'packages/sdk/dist/index.js')
    const bundleSize = readFileSync(bundlePath).length
    
    // Get gzipped size
    const gzippedSize = execSync(`gzip -c "${bundlePath}" | wc -c`, { encoding: 'utf8' }).trim()
    
    return {
      raw: bundleSize,
      gzipped: parseInt(gzippedSize)
    }
  } catch (error) {
    console.error('Error calculating bundle size:', error.message)
    return { raw: 0, gzipped: 0 }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function updateReadme(gzippedSize) {
  const readmePath = join(projectRoot, 'README.md')
  const readme = readFileSync(readmePath, 'utf8')
  
  const formattedSize = formatSize(gzippedSize)
  // Fixed regex to match the entire badge link including any duplicated parts
  const badgeRegex = /\[\!\[Bundle Size\]\(https:\/\/img\.shields\.io\/badge\/Bundle%20Size-[^)]+\)\]\([^)]+\)(\([^)]+\))*(\([^)]+\))*/
  const newBadge = `[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-${formattedSize}%20gzipped-brightgreen?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/packages/sdk)`
  
  const updatedReadme = readme.replace(badgeRegex, newBadge)
  writeFileSync(readmePath, updatedReadme)
  
  console.log(`✅ Updated bundle size badge: ${formattedSize} gzipped`)
}

function main() {
  console.log('📦 Calculating bundle size...')
  const sizes = getBundleSize()
  
  if (sizes.gzipped > 0) {
    console.log(`Raw size: ${formatSize(sizes.raw)}`)
    console.log(`Gzipped: ${formatSize(sizes.gzipped)}`)
    updateReadme(sizes.gzipped)
  } else {
    console.error('❌ Failed to calculate bundle size')
    process.exit(1)
  }
}

main() 