import { NextRequest, NextResponse } from 'next/server';
import { webhooks } from '@/lib/pocketbase';

// GET /api/webhooks/[id] - Get a specific webhook
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhook = await webhooks.get(params.id);
    
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ webhook });
  } catch (error: any) {
    console.error('Failed to fetch webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/[id] - Update a webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const webhook = await webhooks.update(params.id, {
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
    console.error('Failed to update webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete a webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await webhooks.delete(params.id);

    return NextResponse.json({ message: 'Webhook deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}