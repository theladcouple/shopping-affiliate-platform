
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

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT setting_key, setting_value FROM site_settings"
    ).all();

    const settings = Object.fromEntries(
      KEYS.map(key => [key, ""])
    );

    for (const row of result.results || []) {
      if (KEYS.includes(row.setting_key)) {
        settings[row.setting_key] = row.setting_value || "";
      }
    }

    return json({ success: true, settings });
  } catch (error) {
    return json({
      success: false,
      message: "Could not load settings."
    }, 500);
  }
}
