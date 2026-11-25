import { NextResponse } from 'next/server'

const SESSION_COOKIE = 'civora-session'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' })
  
  // Clear the HTTP-only session cookie
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
