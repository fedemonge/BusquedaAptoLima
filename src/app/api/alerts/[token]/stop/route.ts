import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyMagicLinkToken } from '@/lib/utils/tokens';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const alertId = params.token;
    const body = await request.json();
    const { token } = body;

    // Verify the magic link token
    const decoded = verifyMagicLinkToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 401 }
      );
    }

    // Verify the alert belongs to this email
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      select: { email: true },
    });

    if (!alert || alert.email !== decoded.email) {
      return NextResponse.json(
        { error: 'Alert not found or not authorized' },
        { status: 404 }
      );
    }

    // Stop the alert
    await prisma.alert.update({
      where: { id: alertId },
      data: { status: 'STOPPED' },
    });

    console.log(`[ALERT] Stopped: ${alertId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ALERT] Stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop alert' },
      { status: 500 }
    );
  }
}
