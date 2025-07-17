/**
 * @fileoverview Bilan Migration Tools - v0.3.x to v0.4.0 migration utilities
 * 
 * This package provides tools for migrating Bilan analytics data from the
 * v0.3.x vote-centric schema to the v0.4.0 event-based schema.
 * 
 * @example
 * ```typescript
 * import { V3DataExtractor } from '@bilan/migration-tools'
 * 
 * const extractor = new V3DataExtractor({ sourceDbPath: './bilan.db' })
 * const validation = extractor.validateV3Database()
 * 
 * if (validation.isValid) {
 *   for await (const batch of extractor.extractVoteEvents()) {
 *     // Process batch of vote events
 *   }
 * }
 * ```
 */

export { V3DataExtractor } from './extractor.js'
export type {
  V3VoteEvent,
  V4Event,
  MigrationConfig,
  MigrationProgress,
  ValidationResult,
  MigrationStats
} from './types.js' 