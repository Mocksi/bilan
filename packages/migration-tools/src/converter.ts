import { V3VoteEvent, V4Event } from './types.js'

/**
 * Converts v0.3.x vote events to v0.4.0 events
 * Preserves all metadata and relationships while transforming schema
 */
export class EventFormatConverter {
  
  /**
   * Convert a v0.3.x vote event to v0.4.0 event format
   */
  convertVoteToEvent(voteEvent: V3VoteEvent): V4Event {
    // Parse existing metadata
    let existingMetadata = {}
    try {
      existingMetadata = JSON.parse(voteEvent.metadata || '{}')
    } catch (error) {
      console.warn(`Failed to parse metadata for event ${voteEvent.id}:`, error)
      existingMetadata = {}
    }
    
    // Build properties object with all preserved data
    const properties = {
      // Original identifiers
      original_id: voteEvent.id,
      prompt_id: voteEvent.prompt_id,
      
      // Vote-specific data
      value: voteEvent.value,
      comment: voteEvent.comment,
      
      // AI response metadata
      model_used: voteEvent.model_used,
      response_time: voteEvent.response_time,
      
      // Preserve all existing metadata
      ...existingMetadata,
      
      // Add v0.4.0 metadata
      migrated_from: 'v0.3.x',
      migration_timestamp: Date.now(),
      event_source: 'vote_cast'
    }
    
    // Create v0.4.0 event
    const v4Event: V4Event = {
      event_id: this.generateEventId(voteEvent),
      user_id: voteEvent.user_id,
      event_type: 'vote_cast',
      timestamp: voteEvent.timestamp,
      properties,
      prompt_text: voteEvent.prompt_text,
      ai_response: voteEvent.ai_output
    }
    
    return v4Event
  }
  
  /**
   * Generate a deterministic event ID from v0.3.x data
   * This ensures no duplicates during migration
   */
  private generateEventId(voteEvent: V3VoteEvent): string {
    // Use original ID with prefix to ensure uniqueness
    return `migrated_${voteEvent.id}`
  }
  
  /**
   * Convert a batch of v0.3.x vote events to v0.4.0 events
   */
  convertBatch(voteEvents: V3VoteEvent[]): V4Event[] {
    return voteEvents.map(voteEvent => this.convertVoteToEvent(voteEvent))
  }
  
  /**
   * Validate that a v0.4.0 event has all required fields
   */
  validateV4Event(event: V4Event): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check required fields
    if (!event.event_id) {
      errors.push('Missing event_id')
    }
    
    if (!event.user_id) {
      errors.push('Missing user_id')
    }
    
    if (!event.event_type) {
      errors.push('Missing event_type')
    }
    
    if (!event.timestamp) {
      errors.push('Missing timestamp')
    }
    
    if (!event.properties) {
      errors.push('Missing properties')
    }
    
    // Validate event_type
    if (event.event_type !== 'vote_cast') {
      errors.push(`Invalid event_type: ${event.event_type}. Expected 'vote_cast' for migrated votes`)
    }
    
    // Validate properties structure
    if (event.properties) {
      if (!event.properties.original_id) {
        errors.push('Missing original_id in properties')
      }
      
      if (!event.properties.prompt_id) {
        errors.push('Missing prompt_id in properties')
      }
      
      if (event.properties.value !== 1 && event.properties.value !== -1) {
        errors.push(`Invalid vote value: ${event.properties.value}. Must be 1 or -1`)
      }
      
      if (!event.properties.migrated_from) {
        errors.push('Missing migrated_from in properties')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Get statistics about the conversion process
   */
  getConversionStats(originalEvents: V3VoteEvent[], convertedEvents: V4Event[]): {
    totalConverted: number
    preservedMetadata: number
    preservedContent: number
    eventTypes: Record<string, number>
  } {
    const stats = {
      totalConverted: convertedEvents.length,
      preservedMetadata: 0,
      preservedContent: 0,
      eventTypes: {} as Record<string, number>
    }
    
    // Count preserved metadata
    originalEvents.forEach(original => {
      if (original.metadata && original.metadata !== '{}') {
        stats.preservedMetadata++
      }
    })
    
    // Count preserved content
    convertedEvents.forEach(converted => {
      if (converted.prompt_text || converted.ai_response) {
        stats.preservedContent++
      }
    })
    
    // Count event types
    convertedEvents.forEach(event => {
      stats.eventTypes[event.event_type] = (stats.eventTypes[event.event_type] || 0) + 1
    })
    
    return stats
  }
  
  /**
   * Preview conversion without actually converting
   * Useful for dry runs and validation
   */
  previewConversion(voteEvent: V3VoteEvent): {
    originalData: {
      id: string
      userId: string
      promptId: string
      value: number
      hasComment: boolean
      hasMetadata: boolean
      hasPromptText: boolean
      hasAiOutput: boolean
    }
    convertedData: {
      eventId: string
      userId: string
      eventType: string
      timestamp: number
      propertiesCount: number
      hasPromptText: boolean
      hasAiResponse: boolean
    }
  } {
    const converted = this.convertVoteToEvent(voteEvent)
    
    return {
      originalData: {
        id: voteEvent.id,
        userId: voteEvent.user_id,
        promptId: voteEvent.prompt_id,
        value: voteEvent.value,
        hasComment: !!voteEvent.comment,
        hasMetadata: !!(voteEvent.metadata && voteEvent.metadata !== '{}'),
        hasPromptText: !!voteEvent.prompt_text,
        hasAiOutput: !!voteEvent.ai_output
      },
      convertedData: {
        eventId: converted.event_id,
        userId: converted.user_id,
        eventType: converted.event_type,
        timestamp: converted.timestamp,
        propertiesCount: Object.keys(converted.properties).length,
        hasPromptText: !!converted.prompt_text,
        hasAiResponse: !!converted.ai_response
      }
    }
  }
} 