-- Migration: 001_create_events_table (PostgreSQL)
-- Description: Create unified events table for v0.4.0 event-based architecture
-- Author: Bilan Database Schema Team
-- Date: 2024-01-17

-- Create unified events table (v0.4.0)
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'turn_created', 'turn_completed', 'turn_failed',
        'user_action', 'vote_cast', 'journey_step',
        'conversation_started', 'conversation_ended',
        'regeneration_requested', 'frustration_detected'
    )),
    timestamp BIGINT NOT NULL CHECK (timestamp > 0),
    properties JSONB NOT NULL DEFAULT '{}',
    prompt_text TEXT,
    ai_response TEXT,
    
    -- Metadata for tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (time-series optimized)
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create GIN index for JSONB properties
CREATE INDEX IF NOT EXISTS idx_events_properties ON events USING GIN(properties);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
SELECT 'Events table created successfully' AS migration_status; 