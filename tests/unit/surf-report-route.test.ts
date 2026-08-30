import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { SurfReport } from '@/types/surf-report';
import { GET } from '@/api/surf-report/route';

const mockGetCachedReport = vi.fn();
const mockSaveReport = vi.fn();
const mockEnsureInitialized = vi.fn();

vi.mock('@/lib/db', () => ({
  getCachedReport: (...args: unknown[]) => mockGetCachedReport(...args),
  saveReport: (...args: unknown[]) => mockSaveReport(...args),
  ensureInitialized: (...args: unknown[]) => mockEnsureInitialized(...args),
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

const surfabilityFixture = {
  location: 'st-augustine',
  score: 72,
  details: {
    wave_height_ft: 3.5,
    wave_period_sec: 9,
    swell_direction_deg: 80,
    swell_direction_compass: 'E',
    swell_direction_text: 'East',
    swell_direction_description: 'Cross-shore E swell',
    wind_direction_deg: 270,
    wind_direction_compass: 'W',
    wind_direction_text: 'West',
    wind_direction_description: 'Offshore W wind',
    wind_speed_kts: 6,
    tide_state: 'Rising',
    tide_height_ft: 1.2,
  },
  weather: {
    water_temperature_c: 24,
    water_temperature_f: 75,
    air_temperature_c: 27,
    air_temperature_f: 81,
    weather_description: 'Clear',
  },
};

function makeCachedReport(overrides: Partial<SurfReport> = {}): SurfReport {
  return {
    id: 'surf_cached_1',
    timestamp: new Date().toISOString(),
    location: 'st-augustine',
    report: 'Cached surf report body',
    conditions: {
      wave_height_ft: 3,
      wave_period_sec: 9,
      wind_speed_kts: 5,
      wind_direction_deg: 270,
      tide_state: 'Rising',
      weather_description: 'Clear',
      surfability_score: 70,
    },
    recommendations: {
      board_type: 'Shortboard',
      skill_level: 'intermediate',
      best_spots: ['Vilano Beach'],
      timing_advice: 'Go now',
    },
    cached_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as SurfReport;
}

describe('GET /api/surf-report', () => {
  const fetchMock = vi.fn();
  const originalBunServiceUrl = process.env.BUN_SERVICE_URL;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    mockGetCachedReport.mockReset();
    mockSaveReport.mockReset().mockResolvedValue(undefined);
    mockEnsureInitialized.mockReset().mockResolvedValue(undefined);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalBunServiceUrl === undefined) delete process.env.BUN_SERVICE_URL;
    else process.env.BUN_SERVICE_URL = originalBunServiceUrl;
  });

  it('serves a fresh cached report without hitting any external service', async () => {
    const cached = makeCachedReport();
    mockGetCachedReport.mockResolvedValueOnce(cached);

    const req = new NextRequest('http://localhost:3000/api/surf-report?location=st-augustine');
    const res = await GET(req);
    const body = await res.json();

    expect(res.headers.get('X-Cache-Status')).toBe('hit');
    expect(body.id).toBe(cached.id);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSaveReport).not.toHaveBeenCalled();
  });

  it('generates a fresh report via the Bun service on cache miss and saves it', async () => {
    process.env.BUN_SERVICE_URL = 'https://bun.example.com';
    mockGetCachedReport.mockResolvedValueOnce(null);

    const bunReport = makeCachedReport({ id: 'surf_bun_1', location: 'st-augustine' });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(surfabilityFixture)) // /api/surfability
      .mockResolvedValueOnce(jsonResponse({ success: true, report: bunReport })); // Bun AI service

    const req = new NextRequest('http://localhost:3000/api/surf-report?location=st-augustine');
    const res = await GET(req);
    const body = await res.json();

    expect(res.headers.get('X-Cache-Status')).toBe('miss');
    expect(res.headers.get('X-Data-Source')).toBe('bun-ai-service-with-compass');
    expect(body.id).toBe('surf_bun_1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockSaveReport).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local template report when the Bun service is unavailable', async () => {
    delete process.env.BUN_SERVICE_URL;
    mockGetCachedReport.mockResolvedValueOnce(null);

    fetchMock.mockResolvedValueOnce(jsonResponse(surfabilityFixture)); // /api/surfability only

    const req = new NextRequest('http://localhost:3000/api/surf-report?location=st-augustine');
    const res = await GET(req);
    const body = await res.json();

    expect(res.headers.get('X-Data-Source')).toBe('local-fallback-with-compass');
    expect(body.generation_meta.backend).toBe('vercel-local-fallback');
    expect(body.report).toContain('St. Augustine');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockSaveReport).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown location slug', async () => {
    const req = new NextRequest('http://localhost:3000/api/surf-report?location=nowhereville');
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(mockGetCachedReport).not.toHaveBeenCalled();
  });
});
