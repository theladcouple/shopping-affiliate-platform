
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

  if (typeof body.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim())) {
    return "Slug must contain lowercase letters, numbers and hyphens only";
  }

  if (!["draft", "published"].includes(body.status)) {
    return "Invalid product status";
  }

  for (const field of ["price", "original_price"]) {
    if (
      body[field] !== null &&
      body[field] !== undefined &&
      (typeof body[field] !== "number" ||
       !Number.isFinite(body[field]) ||
       body[field] < 0)
    ) {
      return `Invalid ${field}`;
    }
  }

  if (
    body.category_id !== null &&
    body.category_id !== undefined &&
    (!Number.isInteger(Number(body.category_id)) ||
     Number(body.category_id) <= 0)
  ) {
    return "Invalid category";
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
    body.category_id === null || body.category_id === undefined ||
      body.category_id === ""
      ? null
      : Number(body.category_id),
    optionalText(body.amazon_url),
    optionalText(body.flipkart_url),
    optionalText(body.meesho_url),
    body.is_featured ? 1 : 0,
    body.status
  ];
}

async function checkCategory(env, categoryId) {
  if (categoryId === null || categoryId === undefined || categoryId === "") {
    return true;
  }

  const category = await env.DB.prepare(
    "SELECT id FROM categories WHERE id = ?"
  ).bind(Number(categoryId)).first();

  return Boolean(category);
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        p.*,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();

    return json({
      success: true,
      products: result.results || []
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_GET_ERROR:", error);
    return json({ success: false, error: "Unable to load products" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const body = await request.json();
    const validationError = validateProduct(body);

    if (validationError) {
      return json({ success: false, error: validationError }, 400);
    }

    const values = productValues(body);

    if (!(await checkCategory(env, values[6]))) {
      return json({ success: false, error: "Category not found" }, 400);
    }

    const result = await env.DB.prepare(`
      INSERT INTO products (
        title, slug, description, image_url,
        price, original_price, category_id,
        amazon_url, flipkart_url, meesho_url,
        is_featured, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(...values).run();

    return json({
      success: true,
      message: "Product created successfully",
      product_id: result.meta.last_row_id
    }, 201);

  } catch (error) {
    console.error("ADMIN_PRODUCTS_POST_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({ success: false, error: "This product slug already exists" }, 409);
    }

    return json({ success: false, error: "Unable to create product" }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({ success: false, error: "Valid product ID is required" }, 400);
    }

    const validationError = validateProduct(body);

    if (validationError) {
      return json({ success: false, error: validationError }, 400);
    }

    const values = productValues(body);

    if (!(await checkCategory(env, values[6]))) {
      return json({ success: false, error: "Category not found" }, 400);
    }

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
      return json({ success: false, error: "Product not found" }, 404);
    }

    return json({
      success: true,
      message: "Product updated successfully"
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_PUT_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({ success: false, error: "This product slug already exists" }, 409);
    }

    return json({ success: false, error: "Unable to update product" }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return json({ success: false, error: "Valid product ID is required" }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM products WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({ success: false, error: "Product not found" }, 404);
    }

    return json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("ADMIN_PRODUCTS_DELETE_ERROR:", error);
    return json({ success: false, error: "Unable to delete product" }, 500);
  }
}
