import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendMagicLinkEmail } from '@/lib/email';
import { generateMagicLinkUrl } from '@/lib/utils/tokens';
import { MAGIC_LINK_CONFIG } from '@/lib/config/constants';

const RequestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await prisma.magicLinkRequest.count({
      where: {
        email,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequests >= MAGIC_LINK_CONFIG.MAX_REQUESTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user has any alerts
    const alertCount = await prisma.alert.count({
      where: { email },
    });

    if (alertCount === 0) {
      // Still send a success response to prevent email enumeration
      // but don't actually send an email
      console.log(`[MAGIC_LINK] No alerts for: ${email}`);
      return NextResponse.json({ success: true });
    }

    // Record the request
    await prisma.magicLinkRequest.create({
      data: { email },
    });

    // Generate and send magic link
    const magicLinkUrl = generateMagicLinkUrl(email);
    const sent = await sendMagicLinkEmail(email, magicLinkUrl);

    if (!sent) {
      console.error(`[MAGIC_LINK] Failed to send to: ${email}`);
      // Still return success to prevent enumeration
    }

    console.log(`[MAGIC_LINK] Sent to: ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MAGIC_LINK] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
