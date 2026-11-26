
import {
  decryptSecret,
  verifyTotp
} from "./_totp.js";

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

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return json(
        { success: false, error: "Database is not configured" },
        503
      );
    }

    const body = await request.json();
    const { challenge_token, code } = body;

    if (
      typeof challenge_token !== "string" ||
      !/^[a-f0-9]{64}$/.test(challenge_token) ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)
    ) {
      return json({
        success: false,
        error: "Invalid login verification details"
      }, 400);
    }

    const challengeHash = await hashToken(challenge_token);

    const challenge = await env.DB.prepare(`
      SELECT
        c.token_hash,
        c.admin_id,
        c.expires_at,
        c.attempts,
        a.email,
        a.totp_secret_enc,
        a.totp_enabled
      FROM admin_login_challenges c
      INNER JOIN admin_users a
        ON a.id = c.admin_id
      WHERE c.token_hash = ?
      LIMIT 1
    `).bind(challengeHash).first();

    if (!challenge) {
      return json({
        success: false,
        error: "Login verification expired. Please login again."
      }, 401);
    }

    if (
      new Date(challenge.expires_at).getTime() <= Date.now() ||
      Number(challenge.attempts) >= 5 ||
      Number(challenge.totp_enabled) !== 1 ||
      !challenge.totp_secret_enc
    ) {
      await env.DB.prepare(`
        DELETE FROM admin_login_challenges
        WHERE token_hash = ?
      `).bind(challengeHash).run();

      return json({
        success: false,
        error: "Login verification expired. Please login again."
      }, 401);
    }

    const secret = await decryptSecret(
      challenge.totp_secret_enc,
      env
    );

    const valid = await verifyTotp(secret, code);

    if (!valid) {
      await env.DB.prepare(`
        UPDATE admin_login_challenges
        SET attempts = attempts + 1
        WHERE token_hash = ?
          AND attempts < 5
      `).bind(challengeHash).run();

      return json({
        success: false,
        error: "Incorrect OTP. Please try again."
      }, 401);
    }

    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionToken = toHex(randomBytes);
    const sessionHash = await hashToken(sessionToken);

    const sessionExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_sessions
        (admin_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      challenge.admin_id,
      sessionHash,
      sessionExpiresAt
    ).run();

    await env.DB.prepare(`
      DELETE FROM admin_login_challenges
      WHERE token_hash = ?
    `).bind(challengeHash).run();

    return json(
      {
        success: true,
        message: "Login successful",
        admin: { email: challenge.email }
      },
      200,
      {
        "Set-Cookie": `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
      }
    );

  } catch (error) {
    console.error("TOTP_LOGIN_ERROR:", error);

    return json({
      success: false,
      error: "OTP login failed. Please try again."
    }, 500);
  }
}
