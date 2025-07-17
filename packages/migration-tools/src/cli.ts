#!/usr/bin/env node

import { Command } from 'commander'
import { V3DataExtractor } from './extractor.js'
import { MigrationConfig } from './types.js'

const program = new Command()

program
  .name('bilan-migrate')
  .description('Migration tools for upgrading Bilan from v0.3.x to v0.4.0')
  .version('0.4.0')

program
  .command('validate')
  .description('Validate v0.3.x database integrity')
  .option('--db-path <path>', 'Path to v0.3.x database file', './bilan.db')
  .option('--verbose', 'Enable verbose output', false)
  .action(async (options) => {
    console.log('🔍 Validating v0.3.x database...')
    
    const config: MigrationConfig = {
      sourceDbPath: options.dbPath,
      targetDbPath: '',
      verbose: options.verbose
    }
    
    try {
      const extractor = new V3DataExtractor(config)
      const validation = extractor.validateV3Database()
      
      if (validation.isValid) {
        console.log('✅ Database validation passed')
        console.log(`📊 Found ${validation.summary.totalEvents} events`)
        console.log(`📅 Date range: ${new Date(validation.summary.dateRange.start).toISOString()} to ${new Date(validation.summary.dateRange.end).toISOString()}`)
        
        if (validation.warnings.length > 0) {
          console.log('⚠️  Warnings:')
          validation.warnings.forEach(warning => console.log(`   - ${warning}`))
        }
      } else {
        console.log('❌ Database validation failed')
        console.log('🚨 Errors:')
        validation.errors.forEach(error => console.log(`   - ${error}`))
        
        if (validation.warnings.length > 0) {
          console.log('⚠️  Warnings:')
          validation.warnings.forEach(warning => console.log(`   - ${warning}`))
        }
        
        process.exit(1)
      }
      
      extractor.close()
      
    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  })

program
  .command('stats')
  .description('Show statistics about v0.3.x database')
  .option('--db-path <path>', 'Path to v0.3.x database file', './bilan.db')
  .option('--verbose', 'Enable verbose output', false)
  .action(async (options) => {
    console.log('📊 Analyzing v0.3.x database...')
    
    const config: MigrationConfig = {
      sourceDbPath: options.dbPath,
      targetDbPath: '',
      verbose: options.verbose
    }
    
    try {
      const extractor = new V3DataExtractor(config)
      const stats = extractor.getV3Statistics()
      
      console.log('📈 Database Statistics:')
      console.log(`   Total votes: ${stats.totalVotes}`)
      console.log(`   Unique users: ${stats.uniqueUsers}`)
      console.log(`   Unique prompts: ${stats.uniquePrompts}`)
      console.log(`   Date range: ${new Date(stats.dateRange.start).toISOString()} to ${new Date(stats.dateRange.end).toISOString()}`)
      
      if (options.verbose) {
        console.log('\n🔍 Detailed Analysis:')
        console.log(`   Average votes per user: ${(stats.totalVotes / stats.uniqueUsers).toFixed(2)}`)
        console.log(`   Average votes per prompt: ${(stats.totalVotes / stats.uniquePrompts).toFixed(2)}`)
        console.log(`   Data collection period: ${Math.round((stats.dateRange.end - stats.dateRange.start) / (1000 * 60 * 60 * 24))} days`)
      }
      
      extractor.close()
      
    } catch (error) {
      console.error('❌ Stats analysis failed:', error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  })

program
  .command('extract')
  .description('Extract v0.3.x data (dry run)')
  .option('--db-path <path>', 'Path to v0.3.x database file', './bilan.db')
  .option('--batch-size <size>', 'Batch size for extraction', '1000')
  .option('--verbose', 'Enable verbose output', false)
  .action(async (options) => {
    console.log('🔄 Extracting v0.3.x data (dry run)...')
    
    const config: MigrationConfig = {
      sourceDbPath: options.dbPath,
      targetDbPath: '',
      batchSize: parseInt(options.batchSize),
      verbose: options.verbose,
      dryRun: true
    }
    
    try {
      const extractor = new V3DataExtractor(config)
      const progress = extractor.createProgressTracker()
      
      console.log(`📊 Starting extraction of ${progress.total} events...`)
      
      let batchCount = 0
      let eventCount = 0
      
      for await (const batch of extractor.extractVoteEvents()) {
        batchCount++
        eventCount += batch.length
        
        if (batchCount === 1) {
          console.log('🔍 Sample from first batch:')
          console.log(`   Event ID: ${batch[0].id}`)
          console.log(`   User ID: ${batch[0].user_id}`)
          console.log(`   Prompt ID: ${batch[0].prompt_id}`)
          console.log(`   Value: ${batch[0].value}`)
          console.log(`   Timestamp: ${new Date(batch[0].timestamp).toISOString()}`)
          console.log(`   Has comment: ${batch[0].comment ? 'Yes' : 'No'}`)
          console.log(`   Has prompt text: ${batch[0].prompt_text ? 'Yes' : 'No'}`)
          console.log(`   Has AI output: ${batch[0].ai_output ? 'Yes' : 'No'}`)
          console.log(`   Model used: ${batch[0].model_used || 'Unknown'}`)
          console.log(`   Response time: ${batch[0].response_time || 'Unknown'}`)
          
          let metadata = {}
          try {
            metadata = JSON.parse(batch[0].metadata)
          } catch (e) {
            metadata = { error: 'Invalid JSON' }
          }
          console.log(`   Metadata: ${JSON.stringify(metadata)}`)
        }
        
        console.log(`   Processed batch ${batchCount}: ${batch.length} events (total: ${eventCount})`)
      }
      
      console.log(`✅ Extraction complete: ${eventCount} events in ${batchCount} batches`)
      
      extractor.close()
      
    } catch (error) {
      console.error('❌ Extraction failed:', error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  })

program.parse(process.argv) 