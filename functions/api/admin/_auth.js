
async function hashToken(token) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function requireAdmin(request, env) {
  if (!env.DB) {
    return {
      authorized: false,
      status: 503,
      error: "Database is not configured"
    };
  }

  const cookie = request.headers.get("Cookie") || "";

  const sessionCookie = cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("admin_session="));

  if (!sessionCookie) {
    return {
      authorized: false,
      status: 401,
      error: "Please login first"
    };
  }

  const token = sessionCookie.substring("admin_session=".length);

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return {
      authorized: false,
      status: 401,
      error: "Invalid session"
    };
  }

  try {
    const tokenHash = await hashToken(token);

    const session = await env.DB.prepare(`
      SELECT admin_users.id, admin_users.email
      FROM admin_sessions
      INNER JOIN admin_users
        ON admin_users.id = admin_sessions.admin_id
      WHERE admin_sessions.token_hash = ?
        AND admin_sessions.expires_at > ?
      LIMIT 1
    `).bind(tokenHash, new Date().toISOString()).first();

    if (!session) {
      return {
        authorized: false,
        status: 401,
        error: "Session expired. Please login again"
      };
    }

    return {
      authorized: true,
      admin: session
    };

  } catch (error) {
    console.error("ADMIN_AUTH_ERROR:", error);

    return {
      authorized: false,
      status: 503,
      error: "Authentication service unavailable"
    };
  }
}
