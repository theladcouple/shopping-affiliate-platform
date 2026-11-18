
import { requireAdmin } from "./_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid product data";
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return "Product title is required";
  }

  if (
    typeof body.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim())
  ) {
    return "Slug must contain lowercase letters, numbers and hyphens only";
  }

  if (!["draft", "published"].includes(body.status)) {
    return "Invalid product status";
  }

  for (const field of ["price", "original_price"]) {
    if (
      body[field] !== null &&
      body[field] !== undefined &&
      body[field] !== "" &&
      (
        typeof body[field] !== "number" ||
        !Number.isFinite(body[field]) ||
        body[field] < 0
      )
    ) {
      return `Invalid ${field}`;
    }
  }

  if (
    !Number.isInteger(Number(body.category_id)) ||
    Number(body.category_id) <= 0
  ) {
    return "Please select a category";
  }

  if (
    body.is_featured !== undefined &&
    ![true, false, 0, 1].includes(body.is_featured)
  ) {
    return "Invalid featured value";
  }

  for (const field of [
    "image_url",
    "amazon_url",
    "flipkart_url",
    "meesho_url"
  ]) {
    const value = body[field];

    if (value !== null && value !== undefined && value !== "") {
      try {
        const url = new URL(value);

        if (url.protocol !== "https:") {
          return `${field} must use HTTPS`;
        }
      } catch {
        return `Invalid ${field}`;
      }
    }
  }

  return null;
}

function optionalText(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function optionalNumber(value) {
  return value === null || value === undefined || value === ""
    ? null
    : Number(value);
}

function productValues(body) {
  return [
    body.title.trim(),
    body.slug.trim(),
    optionalText(body.description),
    optionalText(body.image_url),
    optionalNumber(body.price),
    optionalNumber(body.original_price),
    Number(body.category_id),
    optionalText(body.amazon_url),
    optionalText(body.flipkart_url),
    optionalText(body.meesho_url),
    body.is_featured ? 1 : 0,
    body.status
  ];
}

async function checkCategory(env, categoryId) {
  return await env.DB.prepare(`
    SELECT id, name, code
    FROM categories
    WHERE id = ? AND is_active = 1
  `).bind(Number(categoryId)).first();
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json(
      { success: false, error: auth.error },
      auth.status
    );
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        p.*,
        c.name AS category_name,
        c.code AS category_code
      FROM products p
      LEFT JOIN categories c
        ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();

    return json({
      success: true,
      products: result.results || []
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_GET_ERROR:", error);

    return json({
      success: false,
      error: "Unable to load products"
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json(
      { success: false, error: auth.error },
      auth.status
    );
  }

  try {
    const body = await request.json();

    const validationError = validateProduct(body);

    if (validationError) {
      return json({
        success: false,
        error: validationError
      }, 400);
    }

    const values = productValues(body);

    const category = await checkCategory(env, values[6]);

    if (!category) {
      return json({
        success: false,
        error: "Category not found or inactive"
      }, 400);
    }

    if (
      typeof category.code !== "string" ||
      !/^[A-Z0-9]{2,5}$/.test(category.code)
    ) {
      return json({
        success: false,
        error: "Category product code is missing or invalid"
      }, 400);
    }

    // Generate category-wise Product Code automatically.
    // The code is generated inside the INSERT statement.

    const result = await env.DB.prepare(`
      INSERT INTO products (
        title,
        slug,
        description,
        image_url,
        price,
        original_price,
        category_id,
        amazon_url,
        flipkart_url,
        meesho_url,
        is_featured,
        status,
        product_code
      )
      SELECT
        ?, ?, ?, ?, ?, ?,
        c.id,
        ?, ?, ?, ?, ?,
        c.code || '-' || printf(
          '%04d',
          COALESCE(
            (
              SELECT MAX(
                CAST(
                  SUBSTR(
                    p.product_code,
                    LENGTH(c.code) + 2
                  ) AS INTEGER
                )
              )
              FROM products p
              WHERE p.category_id = c.id
                AND p.product_code LIKE c.code || '-%'
            ),
            0
          ) + 1
        )
      FROM categories c
      WHERE c.id = ?
        AND c.is_active = 1
    `).bind(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[7],
      values[8],
      values[9],
      values[10],
      values[11],
      values[6]
    ).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Unable to generate product code for this category"
      }, 400);
    }

    const product = await env.DB.prepare(`
      SELECT id, title, product_code
      FROM products
      WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    return json({
      success: true,
      message: "Product created successfully",
      product_id: result.meta.last_row_id,
      product_code: product.product_code,
      product
    }, 201);

  } catch (error) {
    console.error("ADMIN_PRODUCTS_POST_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({
        success: false,
        error: "Duplicate product slug or product code"
      }, 409);
    }

    return json({
      success: false,
      error: "Unable to create product"
    }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json(
      { success: false, error: auth.error },
      auth.status
    );
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({
        success: false,
        error: "Valid product ID is required"
      }, 400);
    }

    const validationError = validateProduct(body);

    if (validationError) {
      return json({
        success: false,
        error: validationError
      }, 400);
    }

    const values = productValues(body);

    const category = await checkCategory(env, values[6]);

    if (!category) {
      return json({
        success: false,
        error: "Category not found or inactive"
      }, 400);
    }

    // Product Code is intentionally not updated.
    // Existing Product Code remains unchanged during editing.

    const result = await env.DB.prepare(`
      UPDATE products SET
        title = ?,
        slug = ?,
        description = ?,
        image_url = ?,
        price = ?,
        original_price = ?,
        category_id = ?,
        amazon_url = ?,
        flipkart_url = ?,
        meesho_url = ?,
        is_featured = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(...values, id).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Product not found"
      }, 404);
    }

    const product = await env.DB.prepare(`
      SELECT id, title, product_code
      FROM products
      WHERE id = ?
    `).bind(id).first();

    return json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_PUT_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({
        success: false,
        error: "This product slug already exists"
      }, 409);
    }

    return json({
      success: false,
      error: "Unable to update product"
    }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json(
      { success: false, error: auth.error },
      auth.status
    );
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({
        success: false,
        error: "Valid product ID is required"
      }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM products WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Product not found"
      }, 404);
    }

    return json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_DELETE_ERROR:", error);

    return json({
      success: false,
      error: "Unable to delete product"
    }, 500);
  }
}
