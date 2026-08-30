import { test, expect } from '@playwright/test';

// https://github.com/mttwhlly/swells/issues/36 — route currently crashes mid-render
// (satori layout error) on every request; unskip once that's fixed.
test.fixme('/api/og renders an OG image', async ({ request }) => {
  const res = await request.get('/api/og?height=4-5&condition=Good&wind=8&temp=74');

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/');
});
