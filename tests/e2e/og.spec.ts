import { test, expect } from '@playwright/test';

test('/api/og renders an OG image', async ({ request }) => {
  const res = await request.get('/api/og?height=4-5&condition=Good&wind=8&temp=74');

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/');
});
