
import { requireAdmin } from "./_auth.js";
import {
  decryptSecret,
  verifyTotp
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

    const body = await request.json();

    if (
      typeof body.code !== "string" ||
      !/^\d{6}$/.test(body.code)
    ) {
      return json({
        success: false,
        error: "Enter a valid 6-digit OTP"
      }, 400);
    }

    const admin = await env.DB.prepare(`
      SELECT totp_enabled, totp_pending_secret_enc
      FROM admin_users
      WHERE id = ?
      LIMIT 1
    `).bind(auth.admin.id).first();

    if (!admin || Number(admin.totp_enabled) === 1) {
      return json({
        success: false,
        error: "Authenticator setup is unavailable"
      }, 400);
    }

    if (!admin.totp_pending_secret_enc) {
      return json({
        success: false,
        error: "Please start authenticator setup first"
      }, 400);
    }

    const secret = await decryptSecret(
      admin.totp_pending_secret_enc,
      env
    );

    const valid = await verifyTotp(secret, body.code);

    if (!valid) {
      return json({
        success: false,
        error: "Incorrect OTP. Please try again."
      }, 401);
    }

    const result = await env.DB.prepare(`
      UPDATE admin_users
      SET
        totp_secret_enc = totp_pending_secret_enc,
        totp_pending_secret_enc = NULL,
        totp_enabled = 1
      WHERE id = ?
        AND totp_enabled = 0
        AND totp_pending_secret_enc = ?
    `).bind(
      auth.admin.id,
      admin.totp_pending_secret_enc
    ).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Setup could not be completed. Please try again."
      }, 409);
    }

    return json({
      success: true,
      message: "Google Authenticator enabled successfully"
    });

  } catch (error) {
    console.error("TOTP_VERIFY_ERROR:", error);

    return json({
      success: false,
      error: "Unable to verify OTP"
    }, 500);
  }
}
