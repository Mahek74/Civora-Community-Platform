import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'civora-session'

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(SESSION_COOKIE)
    
    if (!cookie?.value) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    let session: any
    try {
      const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8')
      session = JSON.parse(decoded)
    } catch {
      // Invalid cookie format
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Check expiry
    if (!session.exp || Math.floor(Date.now() / 1000) > session.exp) {
      const response = NextResponse.json({ user: null }, { status: 200 })
      response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
      return response
    }

    return NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role || 'citizen',
      }
    })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
