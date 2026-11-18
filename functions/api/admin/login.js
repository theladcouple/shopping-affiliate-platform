
function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function toHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
      return false;
    }

    const iterations = Number(parts[1]);

    if (iterations !== 100000) {
      return false;
    }

    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );

    const actual = new Uint8Array(bits);

    if (actual.length !== expected.length) return false;

    let difference = 0;
    for (let i = 0; i < actual.length; i++) {
      difference |= actual[i] ^ expected[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

async function hashToken(token) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return toHex(new Uint8Array(bytes));
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return Response.json(
        { success: false, error: "Database is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 128
    ) {
      return Response.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const admin = await env.DB.prepare(
      "SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1"
    ).bind(email.trim().toLowerCase()).first();

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(randomBytes);
    const tokenHash = await hashToken(token);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.DB.prepare(
      "INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, ?)"
    ).bind(admin.id, tokenHash, expiresAt).run();

    return Response.json(
      {
        success: true,
        message: "Login successful",
        admin: { email: admin.email }
      },
      {
        headers: {
          "Set-Cookie": `admin_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
        }
      }
    );

  } catch (error) {
    console.error("ADMIN_LOGIN_ERROR:", error);

    return Response.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
