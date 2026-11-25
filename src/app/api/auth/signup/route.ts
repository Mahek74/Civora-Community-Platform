/**
 * POST /api/auth/signup
 * Creates a citizen account and starts an authenticated session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { SignupSchema } from '@/lib/validation/auth.schema'
import { createUserWithPassword } from '@/utils/db/actions'

const SESSION_COOKIE = 'civora-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input with Zod
    const parsed = SignupSchema.safeParse({ ...body, role: 'citizen' })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, name, password } = parsed.data

    const result = await createUserWithPassword(
      email.trim().toLowerCase(),
      name.trim(),
      password
    )

    if ('error' in result) {
      if (result.error === 'EMAIL_EXISTS') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
    }

    const user = result.user
    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'citizen',
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    }
    const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: sessionPayload.role,
      },
    }, { status: 201 })

    response.cookies.set(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[/api/auth/signup] Error:', error)
    return NextResponse.json({ error: 'Server error during signup' }, { status: 500 })
  }
}
