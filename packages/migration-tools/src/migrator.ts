import { V3DataExtractor } from './extractor.js'
import { EventFormatConverter } from './converter.js'
import { V4DatabaseManager } from './v4-schema.js'
import { MigrationConfig, MigrationProgress, MigrationStats } from './types.js'

/**
 * Main migration orchestrator that handles the complete v0.3.x to v0.4.0 migration
 * Combines extraction, conversion, and database insertion
 */
export class BilanMigrator {
  private extractor: V3DataExtractor
  private converter: EventFormatConverter
  private v4Database: V4DatabaseManager
  private config: MigrationConfig

  constructor(config: MigrationConfig) {
    this.config = config
    this.extractor = new V3DataExtractor(config)
    this.converter = new EventFormatConverter()
    this.v4Database = new V4DatabaseManager(config)
  }

  /**
   * Perform the complete migration from v0.3.x to v0.4.0
   */
  async migrate(): Promise<MigrationStats> {
    console.log('🚀 Starting Bilan v0.3.x → v0.4.0 migration...')
    
    // Pre-migration validation
    const v3Validation = this.extractor.validateV3Database()
    if (!v3Validation.isValid) {
      throw new Error(`v0.3.x database validation failed: ${v3Validation.errors.join(', ')}`)
    }
    
    const progress = this.createProgressTracker()
    console.log(`📊 Migration scope: ${progress.total} events`)
    
    // Initialize statistics
    const stats: MigrationStats = {
      v3Stats: this.extractor.getV3Statistics(),
      v4Stats: {
        totalEvents: 0,
        eventTypes: {},
        uniqueUsers: 0,
        dateRange: { start: 0, end: 0 }
      },
      conversionSummary: {
        votesToVoteCast: 0,
        metadataPreserved: 0,
        contentPreserved: 0,
        errorsEncountered: 0
      }
    }
    
    // Process data in batches
    let totalProcessed = 0
    let batchCount = 0
    
    try {
      for await (const v3Batch of this.extractor.extractVoteEvents()) {
        batchCount++
        
        // Convert batch to v0.4.0 format
        const v4Events = this.converter.convertBatch(v3Batch)
        
        // Validate converted events
        const validationErrors: string[] = []
        for (const event of v4Events) {
          const validation = this.converter.validateV4Event(event)
          if (!validation.isValid) {
            validationErrors.push(...validation.errors)
            stats.conversionSummary.errorsEncountered++
          }
        }
        
        if (validationErrors.length > 0 && this.config.verbose) {
          console.warn(`⚠️  Batch ${batchCount} validation errors:`, validationErrors)
        }
        
        // Insert valid events into v0.4.0 database (skip invalid ones)
        const validEvents = v4Events.filter(event => {
          const validation = this.converter.validateV4Event(event)
          return validation.isValid
        })
        
        if (!this.config.dryRun) {
          this.v4Database.insertEventBatch(validEvents)
        }
        
        // Update statistics
        const conversionStats = this.converter.getConversionStats(v3Batch, validEvents)
        stats.conversionSummary.votesToVoteCast += conversionStats.totalConverted
        stats.conversionSummary.metadataPreserved += conversionStats.preservedMetadata
        stats.conversionSummary.contentPreserved += conversionStats.preservedContent
        
        totalProcessed += v3Batch.length
        
        // Progress update
        if (this.config.verbose) {
          console.log(`📈 Processed batch ${batchCount}: ${v3Batch.length} events (total: ${totalProcessed}/${progress.total})`)
        }
        
        // Calculate ETA
        const elapsedTime = Date.now() - progress.startTime
        const avgTimePerEvent = elapsedTime / totalProcessed
        const remainingEvents = progress.total - totalProcessed
        const estimatedTimeRemaining = remainingEvents * avgTimePerEvent
        
        if (totalProcessed % 5000 === 0) { // Update ETA every 5000 events
          console.log(`⏱️  Progress: ${totalProcessed}/${progress.total} (${Math.round(totalProcessed/progress.total*100)}%) - ETA: ${Math.round(estimatedTimeRemaining/1000)}s`)
        }
      }
      
      // Post-migration validation and statistics
      if (!this.config.dryRun) {
        const v4Validation = this.v4Database.validateV4Database()
        if (!v4Validation.isValid) {
          throw new Error(`v0.4.0 database validation failed: ${v4Validation.errors.join(', ')}`)
        }
        
        if (v4Validation.warnings.length > 0) {
          console.warn('⚠️  v0.4.0 database warnings:', v4Validation.warnings)
        }
        
        stats.v4Stats = this.v4Database.getV4Statistics()
      }
      
      console.log('✅ Migration completed successfully!')
      console.log(`📊 Final stats: ${stats.conversionSummary.votesToVoteCast} events converted, ${stats.conversionSummary.errorsEncountered} errors`)
      
      return stats
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * Perform a dry run of the migration without writing to database
   */
  async dryRun(): Promise<{
    totalEvents: number
    sampleConversions: Array<{
      originalId: string
      newEventId: string
      eventType: string
      propertiesCount: number
      hasContent: boolean
    }>
    estimatedSize: number
  }> {
    console.log('🔍 Performing migration dry run...')
    
    const samples: Array<{
      originalId: string
      newEventId: string
      eventType: string
      propertiesCount: number
      hasContent: boolean
    }> = []
    
    let totalEvents = 0
    let totalSize = 0
    
    // Process first few batches to get sample data
    let batchCount = 0
    for await (const v3Batch of this.extractor.extractVoteEvents()) {
      batchCount++
      totalEvents += v3Batch.length
      
      // Convert batch and collect samples
      const v4Events = this.converter.convertBatch(v3Batch)
      
      // Collect samples from first batch
      if (batchCount === 1) {
        for (let i = 0; i < Math.min(5, v4Events.length); i++) {
          const event = v4Events[i]
          samples.push({
            originalId: event.properties.original_id,
            newEventId: event.event_id,
            eventType: event.event_type,
            propertiesCount: Object.keys(event.properties).length,
            hasContent: !!(event.prompt_text || event.ai_response)
          })
        }
      }
      
      // Estimate size
      v4Events.forEach(event => {
        totalSize += JSON.stringify(event).length
      })
      
      // Only process first 3 batches for dry run
      if (batchCount >= 3) break
    }
    
    // Extrapolate total size
    const avgSizePerEvent = totalSize / Math.min(totalEvents, this.config.batchSize! * 3)
    const totalEstimatedSize = avgSizePerEvent * this.extractor.getTotalEventCount()
    
    console.log(`📊 Dry run complete: ${totalEvents} events processed (sample)`)
    console.log(`💾 Estimated database size: ${Math.round(totalEstimatedSize / 1024 / 1024)}MB`)
    
    return {
      totalEvents: this.extractor.getTotalEventCount(),
      sampleConversions: samples,
      estimatedSize: totalEstimatedSize
    }
  }

  /**
   * Preview the conversion of a single event
   */
  async previewConversion(eventId: string): Promise<{
    found: boolean
    preview?: ReturnType<EventFormatConverter['previewConversion']>
  }> {
    // Find the specific event
    for await (const v3Batch of this.extractor.extractVoteEvents()) {
      const event = v3Batch.find(e => e.id === eventId)
      if (event) {
        return {
          found: true,
          preview: this.converter.previewConversion(event)
        }
      }
    }
    
    return { found: false }
  }

  /**
   * Get migration progress tracker
   */
  private createProgressTracker(): MigrationProgress {
    return {
      phase: 'conversion',
      total: this.extractor.getTotalEventCount(),
      processed: 0,
      errors: [],
      startTime: Date.now()
    }
  }

  /**
   * Compare v0.3.x and v0.4.0 databases for validation
   */
  async validateMigration(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    comparison: {
      v3Events: number
      v4Events: number
      v3Users: number
      v4Users: number
      v3DateRange: { start: number; end: number }
      v4DateRange: { start: number; end: number }
    }
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    
    const v3Stats = this.extractor.getV3Statistics()
    const v4Stats = this.v4Database.getV4Statistics()
    
    // Compare event counts
    if (v3Stats.totalVotes !== v4Stats.totalEvents) {
      errors.push(`Event count mismatch: v0.3.x has ${v3Stats.totalVotes}, v0.4.0 has ${v4Stats.totalEvents}`)
    }
    
    // Compare user counts
    if (v3Stats.uniqueUsers !== v4Stats.uniqueUsers) {
      errors.push(`User count mismatch: v0.3.x has ${v3Stats.uniqueUsers}, v0.4.0 has ${v4Stats.uniqueUsers}`)
    }
    
    // Compare date ranges
    if (Math.abs(v3Stats.dateRange.start - v4Stats.dateRange.start) > 1000) { // 1 second tolerance
      warnings.push(`Date range start mismatch: v0.3.x starts at ${v3Stats.dateRange.start}, v0.4.0 starts at ${v4Stats.dateRange.start}`)
    }
    
    if (Math.abs(v3Stats.dateRange.end - v4Stats.dateRange.end) > 1000) { // 1 second tolerance
      warnings.push(`Date range end mismatch: v0.3.x ends at ${v3Stats.dateRange.end}, v0.4.0 ends at ${v4Stats.dateRange.end}`)
    }
    
    // Check that all events are vote_cast type
    const nonVoteCastEvents = Object.keys(v4Stats.eventTypes).filter(type => type !== 'vote_cast')
    if (nonVoteCastEvents.length > 0) {
      warnings.push(`Found unexpected event types in v0.4.0: ${nonVoteCastEvents.join(', ')}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      comparison: {
        v3Events: v3Stats.totalVotes,
        v4Events: v4Stats.totalEvents,
        v3Users: v3Stats.uniqueUsers,
        v4Users: v4Stats.uniqueUsers,
        v3DateRange: v3Stats.dateRange,
        v4DateRange: v4Stats.dateRange
      }
    }
  }

  /**
   * Close all database connections
   */
  close(): void {
    this.extractor.close()
    this.v4Database.close()
  }
} 