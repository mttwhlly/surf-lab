import { test, expect } from '@playwright/test';

const MOCK_REPORT = {
  id: 'surf_e2e_mock',
  timestamp: new Date().toISOString(),
  location: 'st-augustine',
  report: 'E2E MOCK REPORT: fun 3ft waves at Vilano Beach today.',
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
};

test('location page renders the shell and surfaces the report from /api/surf-report', async ({ page }) => {
  // The generation chain (surfability -> Bun AI -> DB write) is exercised by the
  // Vitest suite; here we only need the client-side fetch to resolve so the page
  // shell renders, without hitting live external services.
  await page.route('**/api/surf-report*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPORT) })
  );

  await page.goto('/st-augustine');

  await expect(page.getByText('Built by')).toBeVisible();
  await expect(page.getByText('view source')).toBeVisible();
  await expect(page.getByText(MOCK_REPORT.report)).toBeVisible();
});

test('unknown location slug 404s', async ({ page }) => {
  const response = await page.goto('/not-a-real-spot');
  expect(response?.status()).toBe(404);
});
