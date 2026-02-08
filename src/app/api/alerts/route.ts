import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateAlertSchema } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = CreateAlertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        email: data.email,
        transactionType: data.transactionType,
        city: data.city,
        neighborhood: data.neighborhood,
        maxPrice: data.maxPrice,
        minSquareMeters: data.minSquareMeters,
        maxSquareMeters: data.maxSquareMeters,
        minBedrooms: data.minBedrooms,
        minParking: data.minParking,
        propertyType: data.propertyType,
        keywordsInclude: data.keywordsInclude || [],
        keywordsExclude: data.keywordsExclude || [],
        sendNoResults: data.sendNoResults,
        status: 'ACTIVE',
      },
    });

    console.log(`[ALERT] Created: ${alert.id}`);

    return NextResponse.json(
      { success: true, alertId: alert.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('[ALERT] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
