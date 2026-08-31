import { NextRequest, NextResponse } from 'next/server';
import { ensurePushSubscriptionsTable, savePushSubscription, deletePushSubscription } from '@/lib/db';
import { getLocation } from '@/lib/locations';

interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON; location?: string };
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

  try {
    await ensurePushSubscriptionsTable();
    await savePushSubscription({ endpoint, subscription, location });
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
