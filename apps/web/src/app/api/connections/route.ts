import { NextRequest, NextResponse } from 'next/server';
import { connections } from '@/lib/pocketbase';

// GET /api/connections - List SSE connections
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const connectionList = await connections.list();
    return NextResponse.json({ connections: connectionList });
  } catch (error: any) {
    console.error('Failed to fetch connections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// POST /api/connections - Create a new connection record
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
    const { connectionId, userAgent, ipAddress } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const connection = await connections.create(
      connectionId,
      userAgent,
      ipAddress
    );

    return NextResponse.json({ connection });
  } catch (error: any) {
    console.error('Failed to create connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create connection' },
      { status: 500 }
    );
  }
}