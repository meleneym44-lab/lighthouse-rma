// app/api/send-email/route.js
import { NextResponse } from 'next/server';
import { sendRMAEmail } from '@/lib/email';
import {
  deviceReceivedEmail,
  diagnosticCompleteEmail,
  quoteReadyEmail,
  repairInProgressEmail,
  calibrationInProgressEmail,
  deviceShippedEmail,
} from '@/lib/email-templates';

const templateMap = {
  received: deviceReceivedEmail,
  diagnostic_complete: diagnosticCompleteEmail,
  quote_ready: quoteReadyEmail,
  repair_in_progress: repairInProgressEmail,
  calibration_in_progress: calibrationInProgressEmail,
  shipped: deviceShippedEmail,
};

export async function POST(request) {
  try {
    const { status, customerEmail, customerName, serialNumber, rmaNumber, trackingNumber } = await request.json();

    if (!status || !customerEmail || !customerName || !rmaNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const templateFn = templateMap[status];
    if (!templateFn) {
      return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 });
    }

    const { subject, html } = status === 'shipped'
      ? templateFn(customerName, serialNumber, rmaNumber, trackingNumber)
      : templateFn(customerName, serialNumber, rmaNumber);

    await sendRMAEmail(customerEmail, subject, html);

    return NextResponse.json({ success: true, message: `Email sent for status: ${status}` });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send email: ' + error.message }, { status: 500 });
  }
}
