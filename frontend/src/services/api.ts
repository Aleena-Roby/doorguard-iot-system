import { DoorStatus, Statistics, EventsResponse, AppSettings, DoorState, DeviceItem } from '../types';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMsg = errorJson.error;
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getStatus: (deviceId?: string) => {
    const q = deviceId ? `/api/status?device_id=${encodeURIComponent(deviceId)}` : '/api/status';
    return fetchJson<DoorStatus>(q);
  },
  
  getStats: (deviceId?: string) => {
    const q = deviceId ? `/api/stats?device_id=${encodeURIComponent(deviceId)}` : '/api/stats';
    return fetchJson<Statistics>(q);
  },
  
  getEvents: (page: number = 1, limit: number = 20, source?: string, deviceId?: string) => {
    let query = `/api/events?page=${page}&limit=${limit}`;
    if (source) {
      query += `&source=${source}`;
    }
    if (deviceId) {
      query += `&device_id=${encodeURIComponent(deviceId)}`;
    }
    return fetchJson<EventsResponse>(query);
  },

  getDevices: () => fetchJson<{ devices: DeviceItem[] }>('/api/devices'),

  createDevice: (id: string, name: string, operatingMode: string = 'ESP32') =>
    fetchJson<{ status: string; device: DeviceItem }>('/api/devices', {
      method: 'POST',
      body: JSON.stringify({ id, name, operating_mode: operatingMode }),
    }),

  deleteDevice: (deviceId: string) =>
    fetchJson<{ status: string; message: string }>(`/api/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    }),

  getSettings: () => fetchJson<AppSettings>('/api/settings'),

  updateSettings: (thresholdSeconds: number) =>
    fetchJson<{ status: string; settings: AppSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ alert_threshold_seconds: thresholdSeconds }),
    }),

  getHealth: () => fetchJson<{ status: string; database: string }>('/api/health'),

  getCsvExportUrl: (deviceId?: string, source?: string) => {
    let url = `${BASE_URL}/api/events/export`;
    const params = [];
    if (deviceId) params.push(`device_id=${encodeURIComponent(deviceId)}`);
    if (source) params.push(`source=${encodeURIComponent(source)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return url;
  },
};


