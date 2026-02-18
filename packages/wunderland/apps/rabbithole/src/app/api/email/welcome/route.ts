import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email';

export async function POST(req: NextRequest) {
  let body: { email: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const emailService = getEmailService();
    await emailService.sendWelcomeEmail(body.email, body.name);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[email/welcome] Failed to send welcome email:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
