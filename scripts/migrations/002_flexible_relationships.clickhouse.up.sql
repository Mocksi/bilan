-- Migration: 002_flexible_relationships
-- Description: Add flexible relationship fields for v0.4.1 contextual analytics (ClickHouse)
-- Author: Bilan v0.4.1 Development Team  
-- Date: 2024-01-18

-- Add optional relationship fields to events table (ClickHouse-specific types)
ALTER TABLE events ADD COLUMN journey_id LowCardinality(String) DEFAULT '';
ALTER TABLE events ADD COLUMN conversation_id LowCardinality(String) DEFAULT '';  
ALTER TABLE events ADD COLUMN turn_sequence Nullable(Int32) DEFAULT NULL;
ALTER TABLE events ADD COLUMN turn_id String DEFAULT '';

-- Update existing events to populate relationship fields where possible
-- Existing conversation events (ClickHouse ALTER TABLE UPDATE syntax)
ALTER TABLE events UPDATE conversation_id = JSONExtractString(properties, 'conversationId')
WHERE event_type IN ('conversation_started', 'conversation_ended') 
  AND JSONHas(properties, 'conversationId')
  AND JSONExtractString(properties, 'conversationId') != '';

-- Existing journey events  
ALTER TABLE events UPDATE journey_id = JSONExtractString(properties, 'journeyName')
WHERE event_type = 'journey_step'
  AND JSONHas(properties, 'journeyName')
  AND JSONExtractString(properties, 'journeyName') != '';

-- Populate turn_sequence for turn events where available (with safe casting)
ALTER TABLE events UPDATE turn_sequence = multiIf(
  -- Check if turn_sequence exists and is valid
  JSONHas(properties, 'turn_sequence')
    AND match(trim(JSONExtractString(properties, 'turn_sequence')), '^[0-9]+$')
    AND toInt32OrZero(trim(JSONExtractString(properties, 'turn_sequence'))) > 0,
  toInt32(trim(JSONExtractString(properties, 'turn_sequence'))),
  NULL
)
WHERE event_type IN ('turn_created', 'turn_completed', 'turn_failed')
  AND JSONHas(properties, 'turn_sequence')
  AND trim(JSONExtractString(properties, 'turn_sequence')) != ''
  AND match(trim(JSONExtractString(properties, 'turn_sequence')), '^[0-9]+$');

-- Create indexes for relationship queries (ClickHouse MergeTree compatible)
-- Note: ClickHouse indexes are created automatically based on ORDER BY in table definition
-- For existing tables, we can use data skipping indexes

-- Journey-based queries optimization
ALTER TABLE events ADD INDEX idx_journey_timestamp journey_id TYPE minmax GRANULARITY 1;

-- Conversation-based queries optimization  
ALTER TABLE events ADD INDEX idx_conversation_sequence (conversation_id, turn_sequence) TYPE minmax GRANULARITY 1;

-- Turn context queries optimization
ALTER TABLE events ADD INDEX idx_turn_context turn_id TYPE minmax GRANULARITY 1;

-- Verify relationship population (ClickHouse-compatible aggregation)
SELECT 
  event_type,
  count() as total_events,
  countIf(journey_id != '') as with_journey,
  countIf(conversation_id != '') as with_conversation,
  countIf(turn_sequence IS NOT NULL) as with_turn_sequence,
  countIf(journey_id != '' OR conversation_id != '') as with_relationships
FROM events 
GROUP BY event_type
ORDER BY total_events DESC
SETTINGS allow_experimental_analyzer = 1;

-- Performance optimization: Suggest reordering table for better compression
-- (This is a suggestion for manual execution after migration)
/*
OPTIMIZE TABLE events FINAL;

-- Consider recreating table with optimal ORDER BY for relationship queries:
-- ORDER BY (user_id, toDate(timestamp), event_type, journey_id, conversation_id)
*/ 