import { NextRequest, NextResponse } from 'next/server';
import { webhooks, auth } from '@/lib/pocketbase';

// GET /api/webhooks - List user's webhooks
export async function GET(request: NextRequest) {
  try {
    // For API routes, we need to check authentication differently
    // since we don't have access to the client-side auth state
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhookList = await webhooks.list();
    return NextResponse.json({ webhooks: webhookList });
  } catch (error: any) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      url,
      type,
      token,
      username,
      avatarUrl,
      fallbackUrl,
      fallbackType,
    } = body;

    // Validate required fields
    if (!url || !type) {
      return NextResponse.json(
        { error: 'URL and type are required' },
        { status: 400 }
      );
    }

    const webhook = await webhooks.create({
      name,
      url,
      type,
      token,
      username,
      avatarUrl,
      fallbackUrl,
      fallbackType,
    });

    return NextResponse.json({ webhook });
  } catch (error: any) {
    console.error('Failed to create webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create webhook' },
      { status: 500 }
    );
  }
}