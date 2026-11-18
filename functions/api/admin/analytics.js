
import { requireAdmin } from "./_auth.js";

function getISTDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function shiftDate(dateString, days) {
  const date = new Date(dateString + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);

    if (!auth.authorized) {
      return Response.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "7days";

    const allowedRanges = [
      "today",
      "yesterday",
      "7days",
      "30days",
      "month",
      "all"
    ];

    if (!allowedRanges.includes(range)) {
      return Response.json(
        { success: false, error: "Invalid date range" },
        { status: 400 }
      );
    }

    const today = getISTDate();

    let startDate = today;
    let endDate = today;

    switch (range) {
      case "yesterday":
        startDate = shiftDate(today, -1);
        endDate = startDate;
        break;

      case "7days":
        startDate = shiftDate(today, -6);
        break;

      case "30days":
        startDate = shiftDate(today, -29);
        break;

      case "month":
        startDate = today.slice(0, 7) + "-01";
        break;

      case "all":
        startDate = null;
        endDate = null;
        break;
    }

    
const dateCondition = range === "all"
  ? ""
  : " AND date(datetime(created_at, '+5 hours', '+30 minutes')) BETWEEN ? AND ?";


    const query = (sql) => {
      const statement = env.DB.prepare(sql);
      return range === "all"
        ? statement
        : statement.bind(startDate, endDate);
    };

    const visitors = await query(`
      SELECT COUNT(DISTINCT visitor_id) AS total
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND visitor_id IS NOT NULL
      ${dateCondition}
    `).first();

    const pageViews = await query(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'page_view'
      ${dateCondition}
    `).first();

    const productViews = await query(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'product_view'
      ${dateCondition}
    `).first();

    const buyClicks = await query(`
      SELECT COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = 'buy_click'
      ${dateCondition}
    `).first();

    const platforms = await query(`
      SELECT
        affiliate_platform AS platform,
        COUNT(*) AS clicks
      FROM analytics_events
      WHERE event_type = 'buy_click'
      ${dateCondition}
      GROUP BY affiliate_platform
      ORDER BY clicks DESC
    `).all();

    const sources = await query(`
      SELECT
        source,
        COUNT(*) AS visits
      FROM analytics_events
      WHERE event_type = 'page_view'
      ${dateCondition}
      GROUP BY source
      ORDER BY visits DESC
    `).all();

    const topProducts = await query(`
      SELECT
        product_id,
        product_title,
        COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'product_view'
        AND product_id IS NOT NULL
      ${dateCondition}
      GROUP BY product_id, product_title
      ORDER BY views DESC
      LIMIT 10
    `).all();

    const topClickedProducts = await query(`
      SELECT
        product_id,
        product_title,
        COUNT(*) AS clicks
      FROM analytics_events
      WHERE event_type = 'buy_click'
        AND product_id IS NOT NULL
      ${dateCondition}
      GROUP BY product_id, product_title
      ORDER BY clicks DESC
      LIMIT 10
    `).all();

    // Daily activity: selected range, or last 30 days for All Time
    let dailyCondition = dateCondition;
    let dailyStart = startDate;
    let dailyEnd = endDate;

    if (range === "all") {
      dailyStart = shiftDate(today, -29);
      dailyEnd = today;
      dailyCondition =
        " AND date(datetime(created_at, '+5 hours', '+30 minutes')) BETWEEN ? AND ?";
    }

    const dailyQuery = env.DB.prepare(`
      SELECT
        date(datetime(created_at, '+5 hours', '+30 minutes')) AS day,
        COUNT(DISTINCT CASE
          WHEN event_type = 'page_view' THEN visitor_id
        END) AS visitors,
        SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
        SUM(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) AS product_views,
        SUM(CASE WHEN event_type = 'buy_click' THEN 1 ELSE 0 END) AS buy_clicks
      FROM analytics_events
      WHERE 1 = 1
      ${dailyCondition}
      GROUP BY day
      ORDER BY day ASC
    `);

    const dailyTrends = await dailyQuery
      .bind(dailyStart, dailyEnd)
      .all();

    return Response.json({
      success: true,
      analytics: {
        date_range: range,
        start_date: startDate,
        end_date: endDate,
        total_visitors: visitors.total || 0,
        total_page_views: pageViews.total || 0,
        total_product_views: productViews.total || 0,
        total_buy_clicks: buyClicks.total || 0,
        platforms: platforms.results || [],
        traffic_sources: sources.results || [],
        top_products: topProducts.results || [],
        top_clicked_products: topClickedProducts.results || [],
        daily_trends: dailyTrends.results || []
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
