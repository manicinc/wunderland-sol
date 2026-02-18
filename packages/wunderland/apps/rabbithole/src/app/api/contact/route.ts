import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/email';

interface ContactPayload {
  type: 'enterprise' | 'general' | 'waitlist';
  name?: string;
  email: string;
  company?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  let body: ContactPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.type) {
    return NextResponse.json({ error: 'Email and type are required' }, { status: 400 });
  }

  if (!['enterprise', 'general', 'waitlist'].includes(body.type)) {
    return NextResponse.json({ error: 'Invalid inquiry type' }, { status: 400 });
  }

  if (body.type !== 'waitlist' && !body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  try {
    const emailService = getEmailService();

    // Send internal notification to hi@rabbithole.inc
    await emailService.sendInternalNotification({
      type: body.type,
      name: body.name || 'Waitlist subscriber',
      email: body.email,
      company: body.company,
      message: body.message,
    });

    // Send auto-reply to submitter
    if (body.type === 'enterprise') {
      await emailService.sendEnterpriseInquiryConfirmation(body.email, body.name || 'there');
    } else if (body.type === 'general' || body.type === 'waitlist') {
      await emailService.sendContactAutoReply(body.email, body.name || 'there', body.type);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] Failed to process submission:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
