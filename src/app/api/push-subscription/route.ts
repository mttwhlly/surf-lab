import { NextRequest, NextResponse } from 'next/server';
import { ensurePushSubscriptionsTable, savePushSubscription, deletePushSubscription } from '@/lib/db';
import { getLocation } from '@/lib/locations';
import type { PushCriteria } from '@/lib/push';

interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

function sanitizeCriteria(input: unknown): PushCriteria | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const c = input as Record<string, unknown>;
  const criteria: PushCriteria = {};

  for (const key of ['min_wave_height_ft', 'max_wave_height_ft', 'min_wave_period_sec', 'max_wind_speed_kts', 'min_score'] as const) {
    const value = c[key];
    if (typeof value === 'number' && Number.isFinite(value)) criteria[key] = value;
  }
  if (Array.isArray(c.tide_states) && c.tide_states.every((s) => typeof s === 'string')) {
    criteria.tide_states = c.tide_states as string[];
  }

  return Object.keys(criteria).length > 0 ? criteria : undefined;
}

export async function POST(request: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON; location?: string; criteria?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subscription, location } = body;
  const endpoint = subscription?.endpoint;

  if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'A valid push subscription is required' }, { status: 400 });
  }
  if (!location || !getLocation(location)) {
    return NextResponse.json({ error: 'A valid location is required' }, { status: 400 });
  }

  const criteria = sanitizeCriteria(body.criteria);

  try {
    await ensurePushSubscriptionsTable();
    await savePushSubscription({ endpoint, subscription, location, criteria });
  } catch (error) {
    console.error('❌ Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'An endpoint is required' }, { status: 400 });
  }

  try {
    await ensurePushSubscriptionsTable();
    await deletePushSubscription(body.endpoint);
  } catch (error) {
    console.error('❌ Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
