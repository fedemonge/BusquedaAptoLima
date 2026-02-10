import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const LookupSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Look up active alerts by email.
 * POST /api/alerts/lookup
 * Body: { email: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const result = LookupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const alerts = await prisma.alert.findMany({
      where: { email, status: 'ACTIVE' },
      select: {
        id: true,
        transactionType: true,
        city: true,
        neighborhood: true,
        maxPrice: true,
        minBedrooms: true,
        minSquareMeters: true,
        maxSquareMeters: true,
        minParking: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('[LOOKUP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to look up alerts' },
      { status: 500 }
    );
  }
}
