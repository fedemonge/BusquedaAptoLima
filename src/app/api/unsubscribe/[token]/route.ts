import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyUnsubscribeToken } from '@/lib/utils/tokens';

// GET shows a confirmation page (safe - no state change)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      return new NextResponse(
        generateHtmlResponse(
          'Invalid Link',
          'This unsubscribe link is invalid or has expired.',
          false
        ),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: { id: decoded.alertId },
    });

    if (!alert) {
      return new NextResponse(
        generateHtmlResponse(
          'Alert Not Found',
          'This alert no longer exists.',
          false
        ),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (alert.status === 'STOPPED') {
      return new NextResponse(
        generateHtmlResponse(
          'Already Stopped',
          'This alert has already been stopped.',
          true
        ),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Show confirmation page (no state change)
    return new NextResponse(
      generateConfirmationPage(token),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('[UNSUBSCRIBE] Error:', error);
    return new NextResponse(
      generateHtmlResponse(
        'Error',
        'Something went wrong. Please try again later.',
        false
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// POST performs the actual unsubscribe (state change)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const alert = await prisma.alert.findUnique({
      where: { id: decoded.alertId },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (alert.status === 'STOPPED') {
      return new NextResponse(
        generateHtmlResponse(
          'Already Stopped',
          'This alert has already been stopped.',
          true
        ),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    await prisma.alert.update({
      where: { id: decoded.alertId },
      data: { status: 'STOPPED' },
    });

    console.log(`[UNSUBSCRIBE] Alert stopped: ${decoded.alertId}`);

    return new NextResponse(
      generateHtmlResponse(
        'Alert Stopped',
        'Your daily apartment search has been stopped. You will no longer receive emails for this search.',
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('[UNSUBSCRIBE] Error:', error);
    return new NextResponse(
      generateHtmlResponse(
        'Error',
        'Something went wrong. Please try again later.',
        false
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateConfirmationPage(token: string): string {
  const safeToken = escapeHtml(token);
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Unsubscribe - Apartment Finder Alerts</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(to bottom, #eff6ff, #ffffff);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #111827; font-size: 24px; margin: 0 0 12px; }
    p { color: #6b7280; margin: 0 0 24px; line-height: 1.5; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-size: 16px;
    }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-cancel { background: #e5e7eb; color: #374151; margin-left: 12px; }
    .btn-cancel:hover { background: #d1d5db; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Stop Daily Search?</h1>
    <p>Are you sure you want to stop receiving daily apartment alerts? You can always create a new search later.</p>
    <form method="POST" action="/api/unsubscribe/${safeToken}">
      <button type="submit" class="btn btn-danger">Yes, Stop Alerts</button>
      <a href="/apartment-alerts" class="btn btn-cancel">Cancel</a>
    </form>
  </div>
</body>
</html>
`;
}

function generateHtmlResponse(
  title: string,
  message: string,
  success: boolean
): string {
  const color = success ? '#059669' : '#dc2626';
  const icon = success
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';

  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Apartment Finder Alerts</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(to bottom, #eff6ff, #ffffff);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: ${success ? '#dcfce7' : '#fee2e2'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: ${color};
    }
    h1 { color: #111827; font-size: 24px; margin: 0 0 12px; }
    p { color: #6b7280; margin: 0 0 24px; line-height: 1.5; }
    a {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg fill="none" stroke="${color}" viewBox="0 0 24 24">
        ${icon}
      </svg>
    </div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <a href="/apartment-alerts">Create New Alert</a>
  </div>
</body>
</html>
`;
}
