export type DoorState = 'OPEN' | 'CLOSED';
export type OperatingMode = 'ESP32' | 'SIMULATION';

export interface DoorStatus {
  device_id: string;
  device_name: string;
  current_state: DoorState;
  operating_mode: OperatingMode;
  is_online: boolean;
  open_duration_seconds: number;
  is_alert_active: boolean;
  alert_threshold_seconds: number;
  heartbeat_timeout_seconds: number;
  last_opened_at: string | null;
  last_event_at: string | null;
  last_seen_at: string | null;
  server_time: string;
}

export interface DoorEvent {
  id: number;
  device_id: string;
  state: DoorState;
  source: OperatingMode;
  event_timestamp: string;
  server_received_at: string;
  sequence_number?: number | null;
  idempotency_key?: string | null;
  duration_seconds?: number | null;
}

export interface EventsResponse {
  total: number;
  page: number;
  limit: number;
  events: DoorEvent[];
}

export interface HourlyActivity {
  hour: string;
  openings: number;
  duration_seconds: number;
}

export interface Statistics {
  date: string;
  openings_today: number;
  total_open_duration_seconds: number;
  longest_opening_seconds: number;
  current_open_duration_seconds: number;
  activity_chart: HourlyActivity[];
  events_count_today: number;
}

export interface AppSettings {
  alert_threshold_seconds: number;
  heartbeat_timeout_seconds: number;
  active_device_id: string;
}

export interface DeviceItem {
  id: string;
  name: string;
  current_state: DoorState;
  operating_mode: OperatingMode;
  is_online: boolean;
  last_event_at: string | null;
  last_seen_at: string | null;
  created_at?: string | null;
}


