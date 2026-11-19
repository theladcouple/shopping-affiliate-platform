
async function verifySignature(request, rawBody, appSecret) {
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const expected = Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return signature.slice(7) === expected;
}

async function sendInstagramMessage(env, recipientId, message) {
  const token = env.INSTAGRAM_PAGE_ACCESS_TOKEN;

  if (!token) {
    console.error("INSTAGRAM_PAGE_ACCESS_TOKEN is missing");
    return;
  }

  const response = await fetch(
    "https://graph.facebook.com/v27.0/me/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      }) + `&access_token=${encodeURIComponent(token)}`
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Instagram message error:", result);
  }
}

async function handleInstagramMessage(env, senderId, text) {
  const code = text.trim().replace(/^#/, "");

  const productResult = await env.DB.prepare(`
    SELECT id, title, slug, price
    FROM products
    WHERE status = 'published'
      AND (
        LOWER(slug) = LOWER(?)
        OR CAST(id AS TEXT) = ?
      )
    LIMIT 1
  `).bind(code, code).first();

  let reply;

  if (productResult) {
    const productUrl =
      "https://theladcouple.pages.dev/?product=" +
      encodeURIComponent(productResult.slug);

    reply =
      `नमस्कार! ❤️ तुमचा प्रॉडक्ट सापडला.\n\n` +
      `${productResult.title}\n` +
      `प्रॉडक्ट पाहण्यासाठी: ${productUrl}\n\n` +
      `आमची वेबसाइट: https://theladcouple.pages.dev/`;
  } else {
    reply =
      "नमस्कार! ❤️ प्रॉडक्ट कोड सापडला नाही. " +
      "कृपया योग्य प्रॉडक्ट कोड पाठवा.\n\n" +
      "वेबसाइट: https://theladcouple.pages.dev/";
  }

  await sendInstagramMessage(env, senderId, reply);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === env.INSTAGRAM_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();

  const valid = await verifySignature(
    request,
    rawBody,
    env.INSTAGRAM_APP_SECRET
  );

  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (body.object !== "instagram") {
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  for (const entry of body.entry || []) {
    const events = [
      ...(entry.messaging || []),
      ...(entry.changes || [])
        .filter((change) => change.field === "messages")
        .map((change) => change.value)
    ];

    for (const event of events) {
      const senderId = event.sender?.id;
      const message = event.message;
      const text = message?.text;

      if (
        !senderId ||
        !text ||
        message?.is_echo ||
        message?.is_self
      ) {
        continue;
      }

      try {
        await handleInstagramMessage(env, senderId, text);
      } catch (error) {
        console.error("Instagram webhook processing error:", error);
      }
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

