import { NextRequest, NextResponse } from "next/server";

export type UserRole = "citizen" | "admin" | "worker" | "volunteer";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const cookie = req.cookies.get("civora-session");
  if (!cookie?.value) return null;

  try {
    const decoded = Buffer.from(cookie.value, "base64").toString("utf-8");
    const session: SessionUser = JSON.parse(decoded);

    if (session.exp && Math.floor(Date.now() / 1000) > session.exp) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): { user: SessionUser } | { errorResponse: NextResponse } {
  const user = getSessionFromRequest(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export function requireRole(
  req: NextRequest,
  allowedRoles: Array<UserRole>
): { user: SessionUser } | { errorResponse: NextResponse } {
  const authResult = requireAuth(req);
  if ("errorResponse" in authResult) return authResult;

  const { user } = authResult;
  // Treat "volunteer" and "worker" as equivalent
  const effectiveRole = user.role === "worker" ? "volunteer" : user.role;
  const normalizedAllowed = allowedRoles.map(r => r === "worker" ? "volunteer" : r);

  if (!normalizedAllowed.includes(effectiveRole) && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Forbidden: requires one of [${allowedRoles.join(", ")}] role`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }
  return { user };
}
