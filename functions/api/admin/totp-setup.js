
import { requireAdmin } from "./_auth.js";
import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  createOtpUri
} from "./_totp.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);

    if (!auth.authorized) {
      return json(
        { success: false, error: auth.error },
        auth.status
      );
    }

    const admin = await env.DB.prepare(`
      SELECT totp_enabled, totp_pending_secret_enc
      FROM admin_users
      WHERE id = ?
      LIMIT 1
    `).bind(auth.admin.id).first();

    if (!admin) {
      return json({
        success: false,
        error: "Admin account not found"
      }, 404);
    }

    if (Number(admin.totp_enabled) === 1) {
      return json({
        success: false,
        error: "Authenticator is already enabled"
      }, 409);
    }

    let secret;

    if (admin.totp_pending_secret_enc) {
      secret = await decryptSecret(
        admin.totp_pending_secret_enc,
        env
      );
    } else {
      secret = generateTotpSecret();

      const encrypted = await encryptSecret(secret, env);

      await env.DB.prepare(`
        UPDATE admin_users
        SET totp_pending_secret_enc = ?
        WHERE id = ?
          AND totp_enabled = 0
      `).bind(encrypted, auth.admin.id).run();
    }

    return json({
      success: true,
      message: "Authenticator setup is ready",
      secret,
      otp_uri: createOtpUri(secret, auth.admin.email)
    });

  } catch (error) {
    console.error("TOTP_SETUP_ERROR:", error);

    return json({
      success: false,
      error: "Unable to start authenticator setup"
    }, 500);
  }
}
