import { describe, it, expect, beforeEach } from 'vitest'
import { EventFormatConverter } from '../src/converter.js'
import { V3VoteEvent, V4Event } from '../src/types.js'

describe('EventFormatConverter', () => {
  let converter: EventFormatConverter

  beforeEach(() => {
    converter = new EventFormatConverter()
  })

  describe('convertVoteToEvent', () => {
    it('should convert a basic vote event to v0.4.0 format', () => {
      const v3Event: V3VoteEvent = {
        id: 'vote-123',
        user_id: 'user-456',
        prompt_id: 'prompt-789',
        value: 1,
        comment: 'Great response!',
        timestamp: 1642634400000,
        metadata: '{"journeyName": "onboarding"}',
        prompt_text: 'Help me write code',
        ai_output: 'Here is some code',
        model_used: 'gpt-4',
        response_time: 2.5
      }

      const v4Event = converter.convertVoteToEvent(v3Event)

      expect(v4Event.event_id).toBe('migrated_vote-123')
      expect(v4Event.user_id).toBe('user-456')
      expect(v4Event.event_type).toBe('vote_cast')
      expect(v4Event.timestamp).toBe(1642634400000)
      expect(v4Event.prompt_text).toBe('Help me write code')
      expect(v4Event.ai_response).toBe('Here is some code')
      
      expect(v4Event.properties.original_id).toBe('vote-123')
      expect(v4Event.properties.prompt_id).toBe('prompt-789')
      expect(v4Event.properties.value).toBe(1)
      expect(v4Event.properties.comment).toBe('Great response!')
      expect(v4Event.properties.model_used).toBe('gpt-4')
      expect(v4Event.properties.response_time).toBe(2.5)
      expect(v4Event.properties.journeyName).toBe('onboarding')
      expect(v4Event.properties.migrated_from).toBe('v0.3.x')
      expect(v4Event.properties.event_source).toBe('vote_cast')
      expect(v4Event.properties.migration_timestamp).toBeTypeOf('number')
    })

    it('should handle null values correctly', () => {
      const v3Event: V3VoteEvent = {
        id: 'vote-123',
        user_id: 'user-456',
        prompt_id: 'prompt-789',
        value: -1,
        comment: null,
        timestamp: 1642634400000,
        metadata: '{}',
        prompt_text: null,
        ai_output: null,
        model_used: null,
        response_time: null
      }

      const v4Event = converter.convertVoteToEvent(v3Event)

      expect(v4Event.event_id).toBe('migrated_vote-123')
      expect(v4Event.user_id).toBe('user-456')
      expect(v4Event.event_type).toBe('vote_cast')
      expect(v4Event.timestamp).toBe(1642634400000)
      expect(v4Event.prompt_text).toBe(null)
      expect(v4Event.ai_response).toBe(null)
      
      expect(v4Event.properties.original_id).toBe('vote-123')
      expect(v4Event.properties.prompt_id).toBe('prompt-789')
      expect(v4Event.properties.value).toBe(-1)
      expect(v4Event.properties.comment).toBe(null)
      expect(v4Event.properties.model_used).toBe(null)
      expect(v4Event.properties.response_time).toBe(null)
      expect(v4Event.properties.migrated_from).toBe('v0.3.x')
    })

    it('should handle malformed metadata gracefully', () => {
      const v3Event: V3VoteEvent = {
        id: 'vote-123',
        user_id: 'user-456',
        prompt_id: 'prompt-789',
        value: 1,
        comment: 'Test',
        timestamp: 1642634400000,
        metadata: 'invalid json {',
        prompt_text: 'Test prompt',
        ai_output: 'Test response',
        model_used: 'gpt-4',
        response_time: 1.0
      }

      const v4Event = converter.convertVoteToEvent(v3Event)

      expect(v4Event.properties.original_id).toBe('vote-123')
      expect(v4Event.properties.migrated_from).toBe('v0.3.x')
      // Should not have any properties from the malformed metadata
      expect(v4Event.properties.journeyName).toBeUndefined()
    })

    it('should preserve complex metadata', () => {
      const v3Event: V3VoteEvent = {
        id: 'vote-123',
        user_id: 'user-456',
        prompt_id: 'prompt-789',
        value: 1,
        comment: 'Test',
        timestamp: 1642634400000,
        metadata: '{"journeyName": "onboarding", "context": "debugging", "attempt": 3, "flags": {"experimental": true}}',
        prompt_text: 'Test prompt',
        ai_output: 'Test response',
        model_used: 'gpt-4',
        response_time: 1.0
      }

      const v4Event = converter.convertVoteToEvent(v3Event)

      expect(v4Event.properties.journeyName).toBe('onboarding')
      expect(v4Event.properties.context).toBe('debugging')
      expect(v4Event.properties.attempt).toBe(3)
      expect(v4Event.properties.flags).toEqual({ experimental: true })
      expect(v4Event.properties.migrated_from).toBe('v0.3.x')
    })
  })

  describe('convertBatch', () => {
    it('should convert multiple events in a batch', () => {
      const v3Events: V3VoteEvent[] = [
        {
          id: 'vote-1',
          user_id: 'user-1',
          prompt_id: 'prompt-1',
          value: 1,
          comment: 'Good',
          timestamp: 1000,
          metadata: '{}',
          prompt_text: 'Test 1',
          ai_output: 'Response 1',
          model_used: 'gpt-4',
          response_time: 1.0
        },
        {
          id: 'vote-2',
          user_id: 'user-2',
          prompt_id: 'prompt-2',
          value: -1,
          comment: 'Bad',
          timestamp: 2000,
          metadata: '{"context": "test"}',
          prompt_text: 'Test 2',
          ai_output: 'Response 2',
          model_used: 'gpt-3.5-turbo',
          response_time: 2.0
        }
      ]

      const v4Events = converter.convertBatch(v3Events)

      expect(v4Events).toHaveLength(2)
      expect(v4Events[0].event_id).toBe('migrated_vote-1')
      expect(v4Events[0].user_id).toBe('user-1')
      expect(v4Events[0].event_type).toBe('vote_cast')
      expect(v4Events[0].properties.value).toBe(1)
      
      expect(v4Events[1].event_id).toBe('migrated_vote-2')
      expect(v4Events[1].user_id).toBe('user-2')
      expect(v4Events[1].event_type).toBe('vote_cast')
      expect(v4Events[1].properties.value).toBe(-1)
      expect(v4Events[1].properties.context).toBe('test')
    })
  })

  describe('validateV4Event', () => {
    it('should validate a correct v0.4.0 event', () => {
      const v4Event: V4Event = {
        event_id: 'migrated_vote-123',
        user_id: 'user-456',
        event_type: 'vote_cast',
        timestamp: 1642634400000,
        properties: {
          original_id: 'vote-123',
          prompt_id: 'prompt-789',
          value: 1,
          comment: 'Test',
          migrated_from: 'v0.3.x'
        },
        prompt_text: 'Test prompt',
        ai_response: 'Test response'
      }

      const validation = converter.validateV4Event(v4Event)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const v4Event: V4Event = {
        event_id: '',
        user_id: '',
        event_type: 'vote_cast',
        timestamp: 1642634400000,
        properties: {
          original_id: 'vote-123',
          prompt_id: 'prompt-789',
          value: 1,
          migrated_from: 'v0.3.x'
        },
        prompt_text: null,
        ai_response: null
      }

      const validation = converter.validateV4Event(v4Event)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Missing event_id')
      expect(validation.errors).toContain('Missing user_id')
    })

    it('should detect invalid vote values', () => {
      const v4Event: V4Event = {
        event_id: 'migrated_vote-123',
        user_id: 'user-456',
        event_type: 'vote_cast',
        timestamp: 1642634400000,
        properties: {
          original_id: 'vote-123',
          prompt_id: 'prompt-789',
          value: 5, // Invalid value
          migrated_from: 'v0.3.x'
        },
        prompt_text: null,
        ai_response: null
      }

      const validation = converter.validateV4Event(v4Event)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Invalid vote value: 5. Must be 1 or -1')
    })

    it('should detect invalid event type', () => {
      const v4Event: V4Event = {
        event_id: 'migrated_vote-123',
        user_id: 'user-456',
        event_type: 'invalid_type',
        timestamp: 1642634400000,
        properties: {
          original_id: 'vote-123',
          prompt_id: 'prompt-789',
          value: 1,
          migrated_from: 'v0.3.x'
        },
        prompt_text: null,
        ai_response: null
      }

      const validation = converter.validateV4Event(v4Event)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Invalid event_type: invalid_type. Expected \'vote_cast\' for migrated votes')
    })
  })

  describe('getConversionStats', () => {
    it('should calculate conversion statistics correctly', () => {
      const v3Events: V3VoteEvent[] = [
        {
          id: 'vote-1',
          user_id: 'user-1',
          prompt_id: 'prompt-1',
          value: 1,
          comment: 'Good',
          timestamp: 1000,
          metadata: '{"journeyName": "onboarding"}',
          prompt_text: 'Test 1',
          ai_output: 'Response 1',
          model_used: 'gpt-4',
          response_time: 1.0
        },
        {
          id: 'vote-2',
          user_id: 'user-2',
          prompt_id: 'prompt-2',
          value: -1,
          comment: 'Bad',
          timestamp: 2000,
          metadata: '{}',
          prompt_text: null,
          ai_output: null,
          model_used: null,
          response_time: null
        }
      ]

      const v4Events = converter.convertBatch(v3Events)
      const stats = converter.getConversionStats(v3Events, v4Events)

      expect(stats.totalConverted).toBe(2)
      expect(stats.preservedMetadata).toBe(1) // Only first event has non-empty metadata
      expect(stats.preservedContent).toBe(1) // Only first event has content
      expect(stats.eventTypes['vote_cast']).toBe(2)
    })
  })

  describe('previewConversion', () => {
    it('should provide a preview of the conversion', () => {
      const v3Event: V3VoteEvent = {
        id: 'vote-123',
        user_id: 'user-456',
        prompt_id: 'prompt-789',
        value: 1,
        comment: 'Great response!',
        timestamp: 1642634400000,
        metadata: '{"journeyName": "onboarding"}',
        prompt_text: 'Help me write code',
        ai_output: 'Here is some code',
        model_used: 'gpt-4',
        response_time: 2.5
      }

      const preview = converter.previewConversion(v3Event)

      expect(preview.originalData.id).toBe('vote-123')
      expect(preview.originalData.userId).toBe('user-456')
      expect(preview.originalData.promptId).toBe('prompt-789')
      expect(preview.originalData.value).toBe(1)
      expect(preview.originalData.hasComment).toBe(true)
      expect(preview.originalData.hasMetadata).toBe(true)
      expect(preview.originalData.hasPromptText).toBe(true)
      expect(preview.originalData.hasAiOutput).toBe(true)

      expect(preview.convertedData.eventId).toBe('migrated_vote-123')
      expect(preview.convertedData.userId).toBe('user-456')
      expect(preview.convertedData.eventType).toBe('vote_cast')
      expect(preview.convertedData.timestamp).toBe(1642634400000)
      expect(preview.convertedData.propertiesCount).toBeGreaterThan(5)
      expect(preview.convertedData.hasPromptText).toBe(true)
      expect(preview.convertedData.hasAiResponse).toBe(true)
    })
  })
}) 