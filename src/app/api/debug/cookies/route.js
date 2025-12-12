import { NextResponse } from 'next/server';

export async function GET(request) {
  const cookie = request.headers.get('cookie') || null;
  return NextResponse.json({ cookie }, { status: 200 });
}

