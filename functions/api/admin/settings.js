
import { requireAdmin } from "./_auth.js";

const KEYS = [
  "site_name",
  "logo_url",
  "contact_email",
  "contact_phone",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "seo_title",
  "seo_description"
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function emptySettings() {
  return Object.fromEntries(KEYS.map(key => [key, ""]));
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth) return auth;

  try {
    const result = await env.DB.prepare(
      "SELECT setting_key, setting_value FROM site_settings"
    ).all();

    const settings = emptySettings();

    for (const row of result.results || []) {
      if (KEYS.includes(row.setting_key)) {
        settings[row.setting_key] = row.setting_value || "";
      }
    }

    return json({ success: true, settings });
  } catch (error) {
    return json({ success: false, message: "Could not load settings." }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth) return auth;

  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid settings data." }, 400);
    }

    const settings = {};

    for (const key of KEYS) {
      const value = body[key] ?? "";

      if (typeof value !== "string") {
        return json({ success: false, message: `Invalid value: ${key}` }, 400);
      }

      settings[key] = value.trim();
    }

    const limits = {
      site_name: 100,
      logo_url: 1000,
      contact_email: 254,
      contact_phone: 30,
      instagram_url: 500,
      facebook_url: 500,
      youtube_url: 500,
      seo_title: 200,
      seo_description: 300
    };

    for (const key of KEYS) {
      if (settings[key].length > limits[key]) {
        return json({ success: false, message: `${key} is too long.` }, 400);
      }
    }

    const urlKeys = [
      "logo_url",
      "instagram_url",
      "facebook_url",
      "youtube_url"
    ];

    for (const key of urlKeys) {
      if (settings[key]) {
        try {
          const url = new URL(settings[key]);
          if (url.protocol !== "https:") throw new Error();
        } catch {
          return json({
            success: false,
            message: `${key} must be a valid HTTPS URL.`
          }, 400);
        }
      }
    }

    if (
      settings.contact_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email)
    ) {
      return json({ success: false, message: "Invalid contact email." }, 400);
    }

    for (const key of KEYS) {
      await env.DB.prepare(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT(setting_key)
        DO UPDATE SET setting_value = excluded.setting_value
      `).bind(key, settings[key]).run();
    }

    return json({
      success: true,
      message: "Settings saved successfully."
    });
  } catch (error) {
    return json({ success: false, message: "Could not save settings." }, 500);
  }
}
