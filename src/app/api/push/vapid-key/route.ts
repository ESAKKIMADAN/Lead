import { NextResponse } from 'next/server';

// Returns the VAPID public key so the client can fetch it at runtime
// instead of requiring it to be baked into the JS bundle at build time.
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 });
  }
  return NextResponse.json({ publicKey: key });
}
