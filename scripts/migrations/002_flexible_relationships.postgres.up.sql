-- Migration: 002_flexible_relationships (PostgreSQL)
-- Description: Add flexible relationship fields for v0.4.1 contextual analytics
-- Author: Bilan v0.4.1 Development Team  
-- Date: 2024-01-18

-- Add optional relationship fields to events table
ALTER TABLE events ADD COLUMN journey_id VARCHAR(255);
ALTER TABLE events ADD COLUMN conversation_id VARCHAR(255);  
ALTER TABLE events ADD COLUMN turn_sequence INTEGER;
ALTER TABLE events ADD COLUMN turn_id VARCHAR(255);

-- Add indexes for relationship queries (performance optimized)
CREATE INDEX IF NOT EXISTS idx_events_journey ON events(journey_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_conversation ON events(conversation_id, turn_sequence, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_turn_context ON events(turn_id, timestamp);

-- Update existing events to populate relationship fields where possible
-- Existing conversation events
UPDATE events 
SET conversation_id = properties->>'conversationId'
WHERE event_type IN ('conversation_started', 'conversation_ended') 
  AND properties ? 'conversationId';

-- Existing journey events  
UPDATE events
SET journey_id = properties->>'journeyName'
WHERE event_type = 'journey_step'
  AND properties ? 'journeyName';

-- Populate turn_sequence for turn events where available
UPDATE events
SET turn_sequence = (properties->>'turn_sequence')::INTEGER
WHERE event_type IN ('turn_created', 'turn_completed', 'turn_failed')
  AND properties ? 'turn_sequence'
  AND (properties->>'turn_sequence')::INTEGER > 0;

-- Verify relationship population
SELECT 
  event_type,
  COUNT(*) as total_events,
  COUNT(journey_id) as with_journey,
  COUNT(conversation_id) as with_conversation,
  COUNT(turn_sequence) as with_turn_sequence,
  COUNT(CASE WHEN journey_id IS NOT NULL OR conversation_id IS NOT NULL THEN 1 END) as with_relationships
FROM events 
GROUP BY event_type
ORDER BY total_events DESC; 