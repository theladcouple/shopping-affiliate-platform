
export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.description,
        p.category_id,
        p.product_code,
        p.image_url,
        p.price,
        p.original_price,
        p.amazon_url,
        p.flipkart_url,
        p.meesho_url,
        p.is_featured,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.is_featured DESC, p.created_at DESC
    `).all();

    return Response.json({
      success: true,
      products: result.results || []
    });

  } catch (error) {
    console.error("Products API Error:", error);

    return Response.json({
      success: false,
      error: "Unable to load products"
    }, { status: 500 });
  }
}
