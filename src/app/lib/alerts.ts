import { Resend } from 'resend';

const NOTIFY_EMAIL = 'matt@mattwhalley.com';
const FROM_EMAIL = 'notifications@mattwhalley.com';

// Cron failures and AI degradation currently only reach console.error, which nobody
// reads unless they're already looking at the Actions tab. This reuses the same
// Resend setup as the "suggest a spot" notification email so a real failure surfaces
// without needing a new provider or credential.
export async function sendReliabilityAlert(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️ RESEND_API_KEY not set — skipping reliability alert: ${subject}`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `[Swells reliability] ${subject}`,
      text: body,
    });
    if (result.error) {
      console.error('❌ Resend API returned an error sending reliability alert:', JSON.stringify(result.error));
    }
  } catch (error) {
    // An alert failing to send should never take down the caller — it's a
    // notification, not the record of truth.
    console.error('❌ Error sending reliability alert email:', error);
  }
}
