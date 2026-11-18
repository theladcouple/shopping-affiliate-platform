
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

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
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  const toBase64 = bytes =>
    btoa(String.fromCharCode(...bytes));

  return `pbkdf2_sha256$100000$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.SETUP_SECRET) {
      return Response.json(
        { success: false, error: "Setup is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password, setupSecret } = body;

    if (
      typeof setupSecret !== "string" ||
      setupSecret !== env.SETUP_SECRET
    ) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12 ||
      password.length > 128
    ) {
      return Response.json(
        { success: false, error: "Valid email and password of at least 12 characters are required" },
        { status: 400 }
      );
    }

    const existing = await env.DB
      .prepare("SELECT id FROM admin_users LIMIT 1")
      .first();

    if (existing) {
      return Response.json(
        { success: false, error: "Admin account already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      "INSERT INTO admin_users (email, password_hash) VALUES (?, ?)"
    ).bind(email.trim().toLowerCase(), passwordHash).run();

    return Response.json({
      success: true,
      message: "Admin account created successfully"
    });

   } catch (error) {
    console.error("ADMIN_SETUP_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
        errorName: error?.name || "UnknownError"
      },
      { status: 500 }
    );
  }
}
