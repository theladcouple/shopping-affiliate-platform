
function toHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return toHex(new Uint8Array(bytes));
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) {
      return Response.json(
        { success: false, error: "Database is not configured" },
        { status: 503 }
      );
    }

    const cookie = request.headers.get("Cookie") || "";

    const sessionCookie = cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("admin_session="));

    if (!sessionCookie) {
      return Response.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    const token = sessionCookie.substring("admin_session=".length);

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return Response.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();

    const session = await env.DB.prepare(`
      SELECT
        admin_users.id,
        admin_users.email
      FROM admin_sessions
      INNER JOIN admin_users
        ON admin_users.id = admin_sessions.admin_id
      WHERE admin_sessions.token_hash = ?
        AND admin_sessions.expires_at > ?
      LIMIT 1
    `).bind(tokenHash, now).first();

    if (!session) {
      return Response.json(
        { success: false, authenticated: false },
        { status: 401 }
      );
    }

    return Response.json(
      {
        success: true,
        authenticated: true,
        admin: {
          email: session.email
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("ADMIN_SESSION_ERROR:", error);

    return Response.json(
      { success: false, error: "Session verification failed" },
      { status: 500 }
    );
  }
}
