
import { requireAdmin } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    // Check admin login
    const auth = await requireAdmin(request, env);

    if (!auth.authorized) {
      return Response.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Total unique visitors
    const visitors = await env.DB.prepare(`
      SELECT COUNT(DISTINCT visitor_id) AS total
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND visitor_id IS NOT NULL
    `).first();

    // Total page views
    const pageViews = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'page_view'
    `).first();

    // Total product views
    const productViews = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'product_view'
    `).first();

    // Total Buy Now clicks
    const buyClicks = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'buy_click'
    `).first();

    // Platform-wise clicks
    const platforms = await env.DB.prepare(`
      SELECT
        affiliate_platform AS platform,
        COUNT(*) AS clicks
      FROM analytics_events
      WHERE event_type = 'buy_click'
      GROUP BY affiliate_platform
      ORDER BY clicks DESC
    `).all();

    // Traffic sources
    const sources = await env.DB.prepare(`
      SELECT
        source,
        COUNT(*) AS visits
      FROM analytics_events
      WHERE event_type = 'page_view'
      GROUP BY source
      ORDER BY visits DESC
    `).all();

    // Most viewed products
    const topProducts = await env.DB.prepare(`
      SELECT
        product_id,
        product_title,
        COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'product_view'
      GROUP BY product_id, product_title
      ORDER BY views DESC
      LIMIT 10
    `).all();

    return Response.json({
      success: true,
      analytics: {
        total_visitors: visitors.total,
        total_page_views: pageViews.total,
        total_product_views: productViews.total,
        total_buy_clicks: buyClicks.total,
        platforms: platforms.results || [],
        traffic_sources: sources.results || [],
        top_products: topProducts.results || []
      }
    });

  } catch (error) {
    console.error("ANALYTICS_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load analytics"
      },
      { status: 500 }
    );
  }
}

