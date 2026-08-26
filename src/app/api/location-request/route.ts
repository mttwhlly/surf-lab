import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ensureLocationRequestsTable, saveLocationRequest } from '@/lib/db';

const NOTIFY_EMAIL = 'matt@mattwhalley.com';
const FROM_EMAIL = 'notifications@mattwhalley.com';

export async function POST(request: NextRequest) {
  let body: { spotName?: string; cityState?: string; email?: string; company?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Honeypot: bots fill every field, real users never see this one
  if (body.company) {
    return NextResponse.json({ success: true });
  }

  const spotName = body.spotName?.trim();
  const cityState = body.cityState?.trim();
  const email = body.email?.trim();

  if (!spotName || !cityState) {
    return NextResponse.json({ error: 'Spot name and city/state are required' }, { status: 400 });
  }

  const id = crypto.randomUUID();

  try {
    await ensureLocationRequestsTable();
    await saveLocationRequest({ id, spotName, cityState, email });
  } catch (error) {
    console.error('❌ Error saving location request:', error);
    return NextResponse.json({ error: 'Failed to save request' }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New spot suggestion: ${spotName}`,
        text: `Spot: ${spotName}\nLocation: ${cityState}\nEmail: ${email || '(not provided)'}`,
      });
    } catch (error) {
      // Email is a notification, not the record of truth — the DB row above already succeeded
      console.error('❌ Error sending location request email:', error);
    }
  }

  return NextResponse.json({ success: true });
}
