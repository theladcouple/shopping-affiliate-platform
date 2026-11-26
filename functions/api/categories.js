export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        name,
        slug,
        description,
        image_url,
        sort_order,
        show_in_men,
        show_in_women,
        show_in_others
      FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `).all();

    return Response.json(
      {
        success: true,
        categories: result.results || []
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("PUBLIC_CATEGORIES_GET_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load categories"
      },
      { status: 500 }
    );
  }
}
