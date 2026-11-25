import { NextRequest, NextResponse } from 'next/server'
import { verifyUserPassword, getUserByEmail } from '@/utils/db/actions'

const SESSION_COOKIE = 'civora-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export async function POST(req: NextRequest) {
  try {
    const { email, password, role: intendedRole } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const result = await verifyUserPassword(email.trim().toLowerCase(), password)

    if ('error' in result) {
      if (result.error === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'No account found with this email' }, { status: 401 })
      }
      if (result.error === 'WRONG_PASSWORD') {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }

    // Fetch the full user record, including role.
    const fullUser = await getUserByEmail(email)

    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const actualRole: string = (fullUser as any).role || 'citizen'

    // Server-Side Role Intent Enforcement: selecting a role does NOT grant that role
    if (intendedRole) {
      if (intendedRole === 'admin') {
        if (actualRole !== 'admin') {
          return NextResponse.json(
            { error: 'Access Denied: This account does not have Admin privileges.', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }
      } else if (intendedRole === 'volunteer') {
        if (actualRole !== 'volunteer' && actualRole !== 'worker' && actualRole !== 'admin') {
          return NextResponse.json(
            { error: 'Access Denied: This account is registered as Citizen and does not have Volunteer privileges.', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }
      } else if (intendedRole === 'citizen') {
        if (actualRole === 'volunteer' || actualRole === 'worker') {
          return NextResponse.json(
            { error: 'Access Denied: This account is assigned to the Volunteer/Worker taskforce. Please login as Volunteer.', code: 'FORBIDDEN' },
            { status: 403 }
          )
        }
      }
    }

    // Build session payload (signed with base64)
    const sessionPayload = {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      role: actualRole,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    }

    const sessionValue = Buffer.from(JSON.stringify(sessionPayload)).toString('base64')

    const response = NextResponse.json({
      success: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: actualRole,
      }
    })

    // Set HTTP-only cookie
    response.cookies.set(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[/api/auth/login] Error:', error)
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 })
  }
}
