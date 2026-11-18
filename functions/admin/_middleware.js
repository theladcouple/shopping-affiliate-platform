
async function hashToken(token) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Allow the public admin login page
  if (
    url.pathname === "/admin" ||
    url.pathname === "/admin/" ||
    url.pathname === "/admin/index.html"
  ) {
    return context.next();
  }

  const cookie = request.headers.get("Cookie") || "";

  const sessionCookie = cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("admin_session="));

  if (!sessionCookie || !env.DB) {
    return Response.redirect(
      new URL("/admin/", request.url).toString(),
      302
    );
  }

  const token = sessionCookie.substring("admin_session=".length);

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return Response.redirect(
      new URL("/admin/", request.url).toString(),
      302
    );
  }

  try {
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();

    const session = await env.DB.prepare(`
      SELECT id
      FROM admin_sessions
      WHERE token_hash = ?
        AND expires_at > ?
      LIMIT 1
    `).bind(tokenHash, now).first();

    if (!session) {
      return Response.redirect(
        new URL("/admin/", request.url).toString(),
        302
      );
    }

    return context.next();

  } catch (error) {
    console.error("ADMIN_MIDDLEWARE_ERROR:", error);

    return new Response("Authentication service unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
