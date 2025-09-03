import { NextRequest, NextResponse } from 'next/server';
import { history } from '@/lib/pocketbase';

// GET /api/notifications - List notification history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');

    const notifications = await history.list(page, perPage);
    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Send a new notification
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
    const { message, webhookConfig, connectionId } = body;

    // Validate message
    if (!message || !message.title || !message.body) {
      return NextResponse.json(
        { error: 'Message with title and body is required' },
        { status: 400 }
      );
    }

    // Get user ID from auth (this would need to be implemented properly)
    // For now, we'll pass it through in the request
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Forward to SSE server
    const sseServerUrl = process.env.SSE_SERVER_URL || process.env.NEXT_PUBLIC_SSE_SERVER_URL;
    if (!sseServerUrl) {
      return NextResponse.json(
        { error: 'SSE server URL not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${sseServerUrl}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        connectionId,
        message,
        webhookConfig,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to send notification' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to send notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}