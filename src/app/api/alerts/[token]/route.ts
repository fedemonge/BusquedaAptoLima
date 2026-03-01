import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyMagicLinkToken } from '@/lib/utils/tokens';
import { UpdateAlertSchema } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Verify the magic link token
    const decoded = verifyMagicLinkToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 401 }
      );
    }

    // Get alerts for this email (all fields for editing)
    const alerts = await prisma.alert.findMany({
      where: { email: decoded.email },
      select: {
        id: true,
        transactionType: true,
        city: true,
        neighborhood: true,
        maxPrice: true,
        minSquareMeters: true,
        maxSquareMeters: true,
        minBedrooms: true,
        minParking: true,
        propertyTypes: true,
        keywordsInclude: true,
        keywordsExclude: true,
        sendNoResults: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ email: decoded.email, alerts });
  } catch (error) {
    console.error('[ALERT] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Verify the magic link token
    const decoded = verifyMagicLinkToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const result = UpdateAlertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { alertId, ...updateData } = result.data;

    // Verify the alert belongs to this user
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      select: { email: true, status: true },
    });

    if (!alert || alert.email !== decoded.email) {
      return NextResponse.json(
        { error: 'Alert not found or not authorized' },
        { status: 404 }
      );
    }

    if (alert.status === 'STOPPED') {
      return NextResponse.json(
        { error: 'Cannot edit a stopped alert' },
        { status: 400 }
      );
    }

    // Build update payload (convert undefined to skip, null to clear)
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data,
    });

    console.log(`[ALERT] Updated: ${alertId}`);

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    console.error('[ALERT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
