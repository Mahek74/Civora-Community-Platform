import { NextResponse } from 'next/server'

// Demo login is permanently disabled. Real authentication via /api/auth/login is required.
export async function POST() {
  return NextResponse.json(
    { error: 'Demo access has been removed. Please log in with your account credentials.', code: 'DEMO_DISABLED' },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json(
    { error: 'Demo access has been removed.', code: 'DEMO_DISABLED' },
    { status: 410 }
  )
}
