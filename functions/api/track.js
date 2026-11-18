
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    const allowedEvents = [
      "page_view",
      "product_view",
      "buy_click"
    ];

    if (!allowedEvents.includes(data.event_type)) {
      return Response.json(
        { success: false, error: "Invalid event type" },
        { status: 400 }
      );
    }

    await env.DB.prepare(`
      INSERT INTO analytics_events (
        event_type,
        visitor_id,
        session_id,
        source,
        medium,
        campaign,
        page_path,
        product_id,
        product_title,
        affiliate_platform
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.event_type,
      data.visitor_id || null,
      data.session_id || null,
      data.source || null,
      data.medium || null,
      data.campaign || null,
      data.page_path || null,
      data.product_id || null,
      data.product_title || null,
      data.affiliate_platform || null
    ).run();

    return Response.json({ success: true });

  } catch (error) {
    return Response.json(
      { success: false, error: "Tracking failed" },
      { status: 500 }
    );
  }
}
