
async function hashToken(token) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  try {
    const cookie = request.headers.get("Cookie") || "";

    const sessionCookie = cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("admin_session="));

    if (sessionCookie && env.DB) {
      const token = sessionCookie.substring("admin_session=".length);

      if (/^[a-f0-9]{64}$/.test(token)) {
        const tokenHash = await hashToken(token);

        await env.DB.prepare(
          "DELETE FROM admin_sessions WHERE token_hash = ?"
        ).bind(tokenHash).run();
      }
    }

    return Response.json(
      {
        success: true,
        message: "Logout successful"
      },
      {
        headers: {
          "Set-Cookie": "admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("ADMIN_LOGOUT_ERROR:", error);

    return Response.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
