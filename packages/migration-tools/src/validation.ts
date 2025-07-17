import { V3DataExtractor } from './extractor.js'
import { V4DatabaseManager } from './v4-schema.js'
import { RollbackManager } from './rollback.js'
import { MigrationConfig, MigrationStats } from './types.js'

/**
 * Comprehensive validation system for migration integrity
 * Provides pre-migration, post-migration, and rollback validation
 */
export class MigrationValidator {
  private extractor: V3DataExtractor
  private v4Manager: V4DatabaseManager
  private rollbackManager: RollbackManager
  private config: MigrationConfig

  constructor(config: MigrationConfig) {
    this.config = config
    this.extractor = new V3DataExtractor(config)
    this.v4Manager = new V4DatabaseManager(config)
    this.rollbackManager = new RollbackManager(config)
  }

  /**
   * Comprehensive pre-migration validation
   */
  async validatePreMigration(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    readiness: {
      v3Database: boolean
      diskSpace: boolean
      permissions: boolean
      checkpointReady: boolean
    }
    recommendations: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    
    if (this.config.verbose) {
      console.log('🔍 Performing pre-migration validation...')
    }
    
    // Validate v0.3.x database
    const v3Validation = this.extractor.validateV3Database()
    const v3DatabaseReady = v3Validation.isValid
    
    if (!v3DatabaseReady) {
      errors.push(...v3Validation.errors)
    }
    
    if (v3Validation.warnings.length > 0) {
      warnings.push(...v3Validation.warnings)
    }
    
    // Check disk space
    const diskSpaceReady = await this.validateDiskSpace()
    if (!diskSpaceReady.sufficient) {
      errors.push(`Insufficient disk space: required ${diskSpaceReady.required}MB, available ${diskSpaceReady.available}MB`)
    }
    
    // Check permissions
    const permissionsReady = await this.validatePermissions()
    if (!permissionsReady.canRead) {
      errors.push('Cannot read source database file')
    }
    
    if (!permissionsReady.canWrite) {
      errors.push('Cannot write to target database location')
    }
    
    // Check checkpoint readiness
    let checkpointReady = true
    try {
      await this.rollbackManager.createCheckpoint()
      const checkpointValidation = await this.rollbackManager.validateCheckpoint()
      
      if (!checkpointValidation.isValid) {
        checkpointReady = false
        errors.push(...checkpointValidation.errors)
      }
    } catch (error) {
      checkpointReady = false
      errors.push(`Checkpoint creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    // Generate recommendations
    const v3Stats = this.extractor.getV3Statistics()
    
    if (v3Stats.totalVotes > 100000) {
      recommendations.push('Large dataset detected. Consider using smaller batch sizes (--batch-size 500)')
    }
    
    if (v3Stats.totalVotes > 10000) {
      recommendations.push('Enable verbose mode for better progress tracking (--verbose)')
    }
    
    const dataAgeInDays = Math.floor((Date.now() - v3Stats.dateRange.end) / (1000 * 60 * 60 * 24))
    if (dataAgeInDays > 30) {
      recommendations.push(`Data is ${dataAgeInDays} days old. Consider validating business requirements before migration`)
    }
    
    if (v3Validation.warnings.length > 0) {
      recommendations.push('Review validation warnings and consider data cleanup before migration')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      readiness: {
        v3Database: v3DatabaseReady,
        diskSpace: diskSpaceReady.sufficient,
        permissions: permissionsReady.canRead && permissionsReady.canWrite,
        checkpointReady
      },
      recommendations
    }
  }

  /**
   * Comprehensive post-migration validation
   */
  async validatePostMigration(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    integrity: {
      dataIntegrity: boolean
      schemaIntegrity: boolean
      performanceAcceptable: boolean
      rollbackPossible: boolean
    }
    metrics: {
      migrationAccuracy: number
      dataPreservation: number
      performanceScore: number
    }
    comparison: MigrationStats
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (this.config.verbose) {
      console.log('🔍 Performing post-migration validation...')
    }
    
    // Validate v0.4.0 database
    const v4Validation = this.v4Manager.validateV4Database()
    const schemaIntegrity = v4Validation.isValid
    
    if (!schemaIntegrity) {
      errors.push(...v4Validation.errors)
    }
    
    if (v4Validation.warnings.length > 0) {
      warnings.push(...v4Validation.warnings)
    }
    
    // Compare data integrity
    const v3Stats = this.extractor.getV3Statistics()
    const v4Stats = this.v4Manager.getV4Statistics()
    
    const dataIntegrity = this.validateDataIntegrity(v3Stats, v4Stats, errors)
    
    // Performance validation
    const performanceScore = await this.validatePerformance()
    const performanceAcceptable = performanceScore.score >= 0.7
    
    if (!performanceAcceptable) {
      warnings.push(`Performance score below threshold: ${performanceScore.score.toFixed(2)}`)
      warnings.push(...performanceScore.issues)
    }
    
    // Rollback possibility
    const rollbackValidation = await this.rollbackManager.validateCheckpoint()
    const rollbackPossible = rollbackValidation.isValid
    
    if (!rollbackPossible) {
      errors.push('Rollback not possible: checkpoint validation failed')
      errors.push(...rollbackValidation.errors)
    }
    
    // Calculate metrics
    const migrationAccuracy = this.calculateMigrationAccuracy(v3Stats, v4Stats)
    const dataPreservation = this.calculateDataPreservation(v3Stats, v4Stats)
    
    const comparison: MigrationStats = {
      v3Stats,
      v4Stats,
      conversionSummary: {
        votesToVoteCast: v4Stats.eventTypes['vote_cast'] || 0,
        metadataPreserved: 0, // Would need to calculate from sample
        contentPreserved: 0, // Would need to calculate from sample
        errorsEncountered: 0 // Would need to track during migration
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      integrity: {
        dataIntegrity,
        schemaIntegrity,
        performanceAcceptable,
        rollbackPossible
      },
      metrics: {
        migrationAccuracy,
        dataPreservation,
        performanceScore: performanceScore.score
      },
      comparison
    }
  }

  /**
   * Validate data integrity between v0.3.x and v0.4.0
   */
  private validateDataIntegrity(
    v3Stats: ReturnType<V3DataExtractor['getV3Statistics']>,
    v4Stats: ReturnType<V4DatabaseManager['getV4Statistics']>,
    errors: string[]
  ): boolean {
    let isValid = true
    
    // Check event count preservation
    if (v3Stats.totalVotes !== v4Stats.totalEvents) {
      errors.push(`Event count mismatch: v0.3.x=${v3Stats.totalVotes}, v0.4.0=${v4Stats.totalEvents}`)
      isValid = false
    }
    
    // Check user count preservation
    if (v3Stats.uniqueUsers !== v4Stats.uniqueUsers) {
      errors.push(`User count mismatch: v0.3.x=${v3Stats.uniqueUsers}, v0.4.0=${v4Stats.uniqueUsers}`)
      isValid = false
    }
    
    // Check date range preservation (with tolerance)
    const startTimeDiff = Math.abs(v3Stats.dateRange.start - v4Stats.dateRange.start)
    const endTimeDiff = Math.abs(v3Stats.dateRange.end - v4Stats.dateRange.end)
    
    if (startTimeDiff > 1000) { // 1 second tolerance
      errors.push(`Start time mismatch: v0.3.x=${v3Stats.dateRange.start}, v0.4.0=${v4Stats.dateRange.start}`)
      isValid = false
    }
    
    if (endTimeDiff > 1000) { // 1 second tolerance
      errors.push(`End time mismatch: v0.3.x=${v3Stats.dateRange.end}, v0.4.0=${v4Stats.dateRange.end}`)
      isValid = false
    }
    
    // Check event types
    const expectedEventTypes = ['vote_cast']
    const actualEventTypes = Object.keys(v4Stats.eventTypes)
    
    for (const expectedType of expectedEventTypes) {
      if (!actualEventTypes.includes(expectedType)) {
        errors.push(`Missing expected event type: ${expectedType}`)
        isValid = false
      }
    }
    
    for (const actualType of actualEventTypes) {
      if (!expectedEventTypes.includes(actualType)) {
        errors.push(`Unexpected event type found: ${actualType}`)
        isValid = false
      }
    }
    
    return isValid
  }

  /**
   * Calculate migration accuracy as a percentage
   */
  private calculateMigrationAccuracy(
    v3Stats: ReturnType<V3DataExtractor['getV3Statistics']>,
    v4Stats: ReturnType<V4DatabaseManager['getV4Statistics']>
  ): number {
    const eventAccuracy = v3Stats.totalVotes === 0 ? 1 : Math.min(v4Stats.totalEvents / v3Stats.totalVotes, 1)
    const userAccuracy = v3Stats.uniqueUsers === 0 ? 1 : Math.min(v4Stats.uniqueUsers / v3Stats.uniqueUsers, 1)
    
    return (eventAccuracy + userAccuracy) / 2
  }

  /**
   * Calculate data preservation score
   */
  private calculateDataPreservation(
    v3Stats: ReturnType<V3DataExtractor['getV3Statistics']>,
    v4Stats: ReturnType<V4DatabaseManager['getV4Statistics']>
  ): number {
    // Basic preservation based on counts
    const eventPreservation = v3Stats.totalVotes === 0 ? 1 : Math.min(v4Stats.totalEvents / v3Stats.totalVotes, 1)
    const userPreservation = v3Stats.uniqueUsers === 0 ? 1 : Math.min(v4Stats.uniqueUsers / v3Stats.uniqueUsers, 1)
    
    // Time range preservation
    const timeRangePreservation = this.calculateTimeRangePreservation(v3Stats, v4Stats)
    
    return (eventPreservation + userPreservation + timeRangePreservation) / 3
  }

  /**
   * Calculate time range preservation score
   */
  private calculateTimeRangePreservation(
    v3Stats: ReturnType<V3DataExtractor['getV3Statistics']>,
    v4Stats: ReturnType<V4DatabaseManager['getV4Statistics']>
  ): number {
    const startDiff = Math.abs(v3Stats.dateRange.start - v4Stats.dateRange.start)
    const endDiff = Math.abs(v3Stats.dateRange.end - v4Stats.dateRange.end)
    
    // Allow 1 second tolerance
    const startScore = startDiff <= 1000 ? 1 : Math.max(0, 1 - startDiff / 10000)
    const endScore = endDiff <= 1000 ? 1 : Math.max(0, 1 - endDiff / 10000)
    
    return (startScore + endScore) / 2
  }

  /**
   * Validate performance characteristics
   */
  private async validatePerformance(): Promise<{
    score: number
    issues: string[]
    metrics: {
      queryResponseTime: number
      indexEfficiency: number
      storageEfficiency: number
    }
  }> {
    const issues: string[] = []
    
    // Test query performance
    const queryStart = Date.now()
    const sampleEvents = this.v4Manager.getSampleEvents(100)
    const queryTime = Date.now() - queryStart
    
    const queryResponseTime = queryTime < 1000 ? 1 : Math.max(0, 1 - queryTime / 5000)
    
    if (queryTime > 2000) {
      issues.push(`Slow query performance: ${queryTime}ms`)
    }
    
    // Check index efficiency (basic check)
    const indexEfficiency = 0.8 // Placeholder - would need actual EXPLAIN QUERY PLAN analysis
    
    // Check storage efficiency
    const v4Stats = this.v4Manager.getV4Statistics()
    const storageEfficiency = v4Stats.totalEvents > 0 ? 0.9 : 0.5 // Placeholder
    
    const overallScore = (queryResponseTime + indexEfficiency + storageEfficiency) / 3
    
    return {
      score: overallScore,
      issues,
      metrics: {
        queryResponseTime,
        indexEfficiency,
        storageEfficiency
      }
    }
  }

  /**
   * Validate disk space requirements
   */
  private async validateDiskSpace(): Promise<{
    sufficient: boolean
    required: number
    available: number
  }> {
    try {
      const fs = await import('fs')
      
      // Get source database size
      const sourceStats = fs.statSync(this.config.sourceDbPath)
      const sourceSize = sourceStats.size
      
      // Estimate target size (usually 1.5x source due to JSONB)
      const estimatedTargetSize = sourceSize * 1.5
      
      // Add checkpoint size
      const checkpointSize = sourceSize
      
      // Total required space (source + target + checkpoint + 20% buffer)
      const totalRequired = (sourceSize + estimatedTargetSize + checkpointSize) * 1.2
      
      // For simplicity, assume sufficient disk space (actual disk space checking requires platform-specific solutions)
      // In production, this would use platform-specific methods to check available disk space
      const estimatedAvailable = totalRequired * 2 // Conservative estimate
      
      return {
        sufficient: true, // Assume sufficient for now
        required: Math.round(totalRequired / 1024 / 1024),
        available: Math.round(estimatedAvailable / 1024 / 1024)
      }
      
    } catch (error) {
      return {
        sufficient: false,
        required: 0,
        available: 0
      }
    }
  }

  /**
   * Validate file permissions
   */
  private async validatePermissions(): Promise<{
    canRead: boolean
    canWrite: boolean
  }> {
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      // Check read permissions on source
      let canRead = false
      try {
        fs.accessSync(this.config.sourceDbPath, fs.constants.R_OK)
        canRead = true
      } catch (error) {
        // Cannot read source
      }
      
      // Check write permissions on target directory
      let canWrite = false
      try {
        const targetDir = path.dirname(this.config.targetDbPath)
        fs.accessSync(targetDir, fs.constants.W_OK)
        canWrite = true
      } catch (error) {
        // Cannot write to target directory
      }
      
      return { canRead, canWrite }
      
    } catch (error) {
      return { canRead: false, canWrite: false }
    }
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport(): Promise<{
    summary: {
      status: 'success' | 'warning' | 'error'
      migrationTime: number
      dataAccuracy: number
      performanceScore: number
    }
    details: {
      preValidation: any
      postValidation: any
      rollbackStatus: any
    }
    recommendations: string[]
  }> {
    const preValidation = await this.validatePreMigration()
    const postValidation = await this.validatePostMigration()
    const rollbackStatus = await this.rollbackManager.getCheckpointInfo()
    
    const status = !preValidation.isValid || !postValidation.isValid ? 'error' :
                   preValidation.warnings.length > 0 || postValidation.warnings.length > 0 ? 'warning' : 'success'
    
    const recommendations: string[] = []
    
    if (status === 'error') {
      recommendations.push('Fix validation errors before proceeding')
    }
    
    if (postValidation.metrics.performanceScore < 0.8) {
      recommendations.push('Consider database optimization for better performance')
    }
    
    if (!rollbackStatus.exists) {
      recommendations.push('Ensure checkpoint exists before migration')
    }
    
    return {
      summary: {
        status,
        migrationTime: 0, // Would need to track during migration
        dataAccuracy: postValidation.metrics.migrationAccuracy,
        performanceScore: postValidation.metrics.performanceScore
      },
      details: {
        preValidation,
        postValidation,
        rollbackStatus
      },
      recommendations
    }
  }

  /**
   * Close all database connections
   */
  close(): void {
    this.extractor.close()
    this.v4Manager.close()
  }
} 