import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyMagicLinkToken } from '@/lib/utils/tokens';

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

    // Get alerts for this email
    const alerts = await prisma.alert.findMany({
      where: { email: decoded.email },
      select: {
        id: true,
        transactionType: true,
        city: true,
        neighborhood: true,
        maxPrice: true,
        minBedrooms: true,
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
