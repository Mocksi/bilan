import Database from 'better-sqlite3'
import { MigrationConfig, MigrationStats } from './types.js'

/**
 * Rollback manager for safe migration rollback procedures
 * Provides checkpoint creation and restoration capabilities
 */
export class RollbackManager {
  private config: MigrationConfig
  private checkpointPath: string

  constructor(config: MigrationConfig) {
    this.config = config
    this.checkpointPath = `${config.sourceDbPath}.checkpoint`
  }

  /**
   * Create a checkpoint of the original database before migration
   */
  async createCheckpoint(): Promise<void> {
    if (this.config.verbose) {
      console.log('📸 Creating pre-migration checkpoint...')
    }

    try {
      // Copy the original database to checkpoint location
      const fs = await import('fs')
      const path = await import('path')
      
      // Ensure source database exists
      if (!fs.existsSync(this.config.sourceDbPath)) {
        throw new Error(`Source database not found: ${this.config.sourceDbPath}`)
      }
      
      // Create checkpoint directory if needed
      const checkpointDir = path.dirname(this.checkpointPath)
      if (!fs.existsSync(checkpointDir)) {
        fs.mkdirSync(checkpointDir, { recursive: true })
      }
      
      // Copy database file
      fs.copyFileSync(this.config.sourceDbPath, this.checkpointPath)
      
      // Create checkpoint metadata
      const checkpointMeta = {
        created_at: new Date().toISOString(),
        original_path: this.config.sourceDbPath,
        checkpoint_path: this.checkpointPath,
        version: 'v0.3.x'
      }
      
      fs.writeFileSync(
        `${this.checkpointPath}.meta`,
        JSON.stringify(checkpointMeta, null, 2)
      )
      
      if (this.config.verbose) {
        console.log(`✅ Checkpoint created: ${this.checkpointPath}`)
      }
      
    } catch (error) {
      throw new Error(`Failed to create checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Restore from checkpoint (rollback migration)
   */
  async restoreFromCheckpoint(): Promise<void> {
    if (this.config.verbose) {
      console.log('🔄 Restoring from checkpoint...')
    }

    try {
      const fs = await import('fs')
      
      // Verify checkpoint exists
      if (!fs.existsSync(this.checkpointPath)) {
        throw new Error(`Checkpoint not found: ${this.checkpointPath}`)
      }
      
      // Verify checkpoint metadata
      const metaPath = `${this.checkpointPath}.meta`
      if (!fs.existsSync(metaPath)) {
        throw new Error(`Checkpoint metadata not found: ${metaPath}`)
      }
      
      const checkpointMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      
      // Backup current database if it exists
      if (fs.existsSync(this.config.sourceDbPath)) {
        const backupPath = `${this.config.sourceDbPath}.backup.${Date.now()}`
        fs.copyFileSync(this.config.sourceDbPath, backupPath)
        
        if (this.config.verbose) {
          console.log(`💾 Current database backed up to: ${backupPath}`)
        }
      }
      
      // Restore from checkpoint
      fs.copyFileSync(this.checkpointPath, this.config.sourceDbPath)
      
      if (this.config.verbose) {
        console.log('✅ Database restored from checkpoint')
        console.log(`📅 Checkpoint created: ${checkpointMeta.created_at}`)
      }
      
    } catch (error) {
      throw new Error(`Failed to restore from checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate checkpoint integrity
   */
  async validateCheckpoint(): Promise<{
    isValid: boolean
    errors: string[]
    metadata?: any
  }> {
    const errors: string[] = []
    
    try {
      const fs = await import('fs')
      
      // Check checkpoint file exists
      if (!fs.existsSync(this.checkpointPath)) {
        errors.push('Checkpoint file does not exist')
        return { isValid: false, errors }
      }
      
      // Check metadata file exists
      const metaPath = `${this.checkpointPath}.meta`
      if (!fs.existsSync(metaPath)) {
        errors.push('Checkpoint metadata file does not exist')
        return { isValid: false, errors }
      }
      
      // Parse and validate metadata
      let metadata
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      } catch (error) {
        errors.push('Invalid checkpoint metadata format')
        return { isValid: false, errors }
      }
      
      // Validate required metadata fields
      const requiredFields = ['created_at', 'original_path', 'checkpoint_path', 'version']
      for (const field of requiredFields) {
        if (!metadata[field]) {
          errors.push(`Missing metadata field: ${field}`)
        }
      }
      
      // Validate checkpoint database integrity
      try {
        const checkpointDb = new Database(this.checkpointPath, { readonly: true })
        
        // Check if events table exists
        const tableExists = checkpointDb.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='events'
        `).get()
        
        if (!tableExists) {
          errors.push('Checkpoint database is missing events table')
        }
        
        // Check basic data integrity
        const eventCount = checkpointDb.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
        if (eventCount.count === 0) {
          errors.push('Checkpoint database contains no events')
        }
        
        checkpointDb.close()
        
      } catch (error) {
        errors.push(`Checkpoint database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        metadata
      }
      
    } catch (error) {
      errors.push(`Checkpoint validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { isValid: false, errors }
    }
  }

  /**
   * Clean up checkpoint files
   */
  async cleanupCheckpoint(): Promise<void> {
    if (this.config.verbose) {
      console.log('🧹 Cleaning up checkpoint files...')
    }

    try {
      const fs = await import('fs')
      
      // Remove checkpoint file
      if (fs.existsSync(this.checkpointPath)) {
        fs.unlinkSync(this.checkpointPath)
      }
      
      // Remove metadata file
      const metaPath = `${this.checkpointPath}.meta`
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath)
      }
      
      if (this.config.verbose) {
        console.log('✅ Checkpoint files cleaned up')
      }
      
    } catch (error) {
      throw new Error(`Failed to cleanup checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get checkpoint information
   */
  async getCheckpointInfo(): Promise<{
    exists: boolean
    created_at?: string
    size?: number
    metadata?: any
  }> {
    try {
      const fs = await import('fs')
      
      if (!fs.existsSync(this.checkpointPath)) {
        return { exists: false }
      }
      
      const stats = fs.statSync(this.checkpointPath)
      
      let metadata
      const metaPath = `${this.checkpointPath}.meta`
      if (fs.existsSync(metaPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        } catch (error) {
          // Ignore metadata parsing errors
        }
      }
      
      return {
        exists: true,
        created_at: metadata?.created_at,
        size: stats.size,
        metadata
      }
      
    } catch (error) {
      return { exists: false }
    }
  }

  /**
   * Create a backup of the v0.4.0 database for rollback
   */
  async backupV4Database(): Promise<void> {
    if (this.config.verbose) {
      console.log('💾 Creating v0.4.0 database backup...')
    }

    try {
      const fs = await import('fs')
      
      if (!fs.existsSync(this.config.targetDbPath)) {
        throw new Error(`Target database not found: ${this.config.targetDbPath}`)
      }
      
      const backupPath = `${this.config.targetDbPath}.backup.${Date.now()}`
      fs.copyFileSync(this.config.targetDbPath, backupPath)
      
      if (this.config.verbose) {
        console.log(`✅ v0.4.0 database backed up to: ${backupPath}`)
      }
      
    } catch (error) {
      throw new Error(`Failed to backup v0.4.0 database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Rollback strategy: remove v0.4.0 database and restore v0.3.x from checkpoint
   */
  async performFullRollback(): Promise<void> {
    console.log('🔄 Performing full rollback...')
    
    try {
      const fs = await import('fs')
      
      // Step 1: Backup v0.4.0 database if it exists
      if (fs.existsSync(this.config.targetDbPath)) {
        await this.backupV4Database()
        
        // Remove v0.4.0 database
        fs.unlinkSync(this.config.targetDbPath)
        
        if (this.config.verbose) {
          console.log('🗑️  v0.4.0 database removed')
        }
      }
      
      // Step 2: Restore v0.3.x database from checkpoint
      await this.restoreFromCheckpoint()
      
      console.log('✅ Full rollback completed successfully')
      console.log('💡 Original v0.3.x database has been restored')
      
    } catch (error) {
      throw new Error(`Full rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify rollback success by comparing with checkpoint
   */
  async verifyRollback(): Promise<{
    isValid: boolean
    errors: string[]
    comparison?: {
      checkpointEvents: number
      restoredEvents: number
      checkpointUsers: number
      restoredUsers: number
    }
  }> {
    const errors: string[] = []
    
    try {
      const fs = await import('fs')
      
      // Check if restored database exists
      if (!fs.existsSync(this.config.sourceDbPath)) {
        errors.push('Restored database does not exist')
        return { isValid: false, errors }
      }
      
      // Check if checkpoint exists
      if (!fs.existsSync(this.checkpointPath)) {
        errors.push('Checkpoint does not exist for comparison')
        return { isValid: false, errors }
      }
      
      // Compare databases
      const checkpointDb = new Database(this.checkpointPath, { readonly: true })
      const restoredDb = new Database(this.config.sourceDbPath, { readonly: true })
      
      // Compare event counts
      const checkpointEvents = checkpointDb.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
      const restoredEvents = restoredDb.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
      
      if (checkpointEvents.count !== restoredEvents.count) {
        errors.push(`Event count mismatch: checkpoint=${checkpointEvents.count}, restored=${restoredEvents.count}`)
      }
      
      // Compare user counts
      const checkpointUsers = checkpointDb.prepare('SELECT COUNT(DISTINCT user_id) as count FROM events').get() as { count: number }
      const restoredUsers = restoredDb.prepare('SELECT COUNT(DISTINCT user_id) as count FROM events').get() as { count: number }
      
      if (checkpointUsers.count !== restoredUsers.count) {
        errors.push(`User count mismatch: checkpoint=${checkpointUsers.count}, restored=${restoredUsers.count}`)
      }
      
      checkpointDb.close()
      restoredDb.close()
      
      return {
        isValid: errors.length === 0,
        errors,
        comparison: {
          checkpointEvents: checkpointEvents.count,
          restoredEvents: restoredEvents.count,
          checkpointUsers: checkpointUsers.count,
          restoredUsers: restoredUsers.count
        }
      }
      
    } catch (error) {
      errors.push(`Rollback verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { isValid: false, errors }
    }
  }
} 