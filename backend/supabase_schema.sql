-- =============================================================================
-- DoorGuard Smart Door & Gate Monitoring System
-- Production Schema for Supabase PostgreSQL
-- Project Ref: cdidxtqahszehqhfepyg
-- =============================================================================

-- 1. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default application settings
INSERT INTO public.app_settings (key, value)
VALUES 
    ('alert_threshold_seconds', '10'),
    ('heartbeat_timeout_seconds', '30')
ON CONFLICT (key) DO NOTHING;

-- 2. Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_state VARCHAR(10) NOT NULL DEFAULT 'CLOSED',
    operating_mode VARCHAR(20) NOT NULL DEFAULT 'ESP32',
    last_seen_at TIMESTAMPTZ,
    last_event_at TIMESTAMPTZ,
    last_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed primary hardware device
INSERT INTO public.devices (id, name, current_state, operating_mode)
VALUES ('esp32_main_gate', 'Main Gate', 'CLOSED', 'ESP32')
ON CONFLICT (id) DO NOTHING;

-- 3. Door Events Table
CREATE TABLE IF NOT EXISTS public.door_events (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    state VARCHAR(10) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(20) NOT NULL DEFAULT 'ESP32',
    sequence_number BIGINT,
    idempotency_key VARCHAR(128) UNIQUE,
    duration_seconds DOUBLE PRECISION
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS ix_door_events_device_id ON public.door_events(device_id);
CREATE INDEX IF NOT EXISTS ix_door_events_event_timestamp ON public.door_events(event_timestamp);
CREATE INDEX IF NOT EXISTS ix_door_events_server_received_at ON public.door_events(server_received_at);
CREATE INDEX IF NOT EXISTS ix_door_events_source ON public.door_events(source);
CREATE INDEX IF NOT EXISTS idx_device_event_time ON public.door_events(device_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_source_event_time ON public.door_events(source, event_timestamp DESC);

-- Enable Supabase Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.door_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for dashboard & telemetry)
CREATE POLICY "Allow public read access on app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access on devices" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Allow public read access on door_events" ON public.door_events FOR SELECT USING (true);

-- Allow service_role / authenticated insert & update
CREATE POLICY "Allow service_role full access on app_settings" ON public.app_settings FOR ALL USING (true);
CREATE POLICY "Allow service_role full access on devices" ON public.devices FOR ALL USING (true);
CREATE POLICY "Allow service_role full access on door_events" ON public.door_events FOR ALL USING (true);

-- Enable Supabase Realtime for door_events & devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.door_events;
