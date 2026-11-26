
import { requireAdmin } from "./_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function validateCategory(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid category data";
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return "Category name is required";
  }

  if (
    typeof body.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim())
  ) {
    return "Slug must contain lowercase letters, numbers and hyphens only";
  }

  if (
    body.is_active !== undefined &&
    ![0, 1, true, false].includes(body.is_active)
  ) {
    return "Invalid active status";
  }

  if (
    body.sort_order !== undefined &&
    (!Number.isInteger(Number(body.sort_order)) ||
     Number(body.sort_order) < 0)
  ) {
    return "Sort order must be a non-negative number";
  }

  if (body.image_url && body.image_url.trim()) {
    try {
      const url = new URL(body.image_url.trim());

      if (url.protocol !== "https:") {
        return "Image URL must use HTTPS";
      }
    } catch {
      return "Invalid image URL";
    }
  }
  if (
    body.show_in_men !== undefined &&
    ![0, 1, true, false].includes(body.show_in_men)
  ) {
    return "Invalid Men visibility";
  }

  if (
    body.show_in_women !== undefined &&
    ![0, 1, true, false].includes(body.show_in_women)
  ) {
    return "Invalid Women visibility";
  }
  return null;
}

// Generate a unique code for every new category.
async function generateCategoryCode(env, slug) {
  const base = slug
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");

  let code = base;
  let counter = 2;

  while (true) {
    const existing = await env.DB.prepare(`
      SELECT id FROM categories
      WHERE code = ?
      LIMIT 1
    `).bind(code).first();

    if (!existing) {
      return code;
    }

    code = `${base}${counter}`;
    counter++;
  }
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT *
      FROM categories
      ORDER BY sort_order ASC, name ASC
    `).all();

    return json({
      success: true,
      categories: result.results || []
    });
  } catch (error) {
    console.error("ADMIN_CATEGORIES_GET_ERROR:", error);

    return json({
      success: false,
      error: "Unable to load categories"
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json({ success: false, error: auth.error }, auth.status);
  }

  try {
    const body = await request.json();
    const error = validateCategory(body);

    if (error) {
      return json({ success: false, error }, 400);
    }

    // Automatically generate a unique category code.
    const categoryCode = await generateCategoryCode(env, body.slug.trim());

    const result = await env.DB.prepare(`
      INSERT INTO categories (
        name, slug, code, description, image_url, is_active, sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name.trim(),
      body.slug.trim(),
      categoryCode,
      typeof body.description === "string"
        ? body.description.trim() || null : null,
      typeof body.image_url === "string"
        ? body.image_url.trim() || null : null,
      body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
      body.sort_order === undefined ? 0 : Number(body.sort_order)
    ).run();

    return json({
      success: true,
      message: "Category created successfully",
      category_id: result.meta.last_row_id,
      category_code: categoryCode
    }, 201);

  } catch (error) {
    console.error("ADMIN_CATEGORIES_POST_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({
        success: false,
        error: "This category slug or code already exists"
      }, 409);
    }

    return json({
      success: false,
      error: "Unable to create category"
    }, 500);
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
    const error = validateCategory(body);

    if (!Number.isInteger(id) || id <= 0) {
      return json({
        success: false,
        error: "Valid category ID is required"
      }, 400);
    }

    if (error) {
      return json({ success: false, error }, 400);
    }

    // Existing category code is intentionally preserved.
    const result = await env.DB.prepare(`
      UPDATE categories SET
        name = ?,
        slug = ?,
        description = ?,
        image_url = ?,
        is_active = ?,
        sort_order = ?,
        show_in_men = COALESCE(?, show_in_men),
        show_in_women = COALESCE(?, show_in_women)
      WHERE id = ?
    `).bind(
      body.name.trim(),
      body.slug.trim(),
      typeof body.description === "string"
        ? body.description.trim() || null : null,
      typeof body.image_url === "string"
        ? body.image_url.trim() || null : null,
      body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
      body.sort_order === undefined ? 0 : Number(body.sort_order),
      body.show_in_men === undefined
        ? null : (body.show_in_men ? 1 : 0),
      body.show_in_women === undefined
        ? null : (body.show_in_women ? 1 : 0),
      id
    ).run();
      body.name.trim(),
      body.slug.trim(),
      typeof body.description === "string"
        ? body.description.trim() || null : null,
      typeof body.image_url === "string"
        ? body.image_url.trim() || null : null,
      body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
      body.sort_order === undefined ? 0 : Number(body.sort_order),
      id
    ).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Category not found"
      }, 404);
    }

    return json({
      success: true,
      message: "Category updated successfully"
    });

  } catch (error) {
    console.error("ADMIN_CATEGORIES_PUT_ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return json({
        success: false,
        error: "This category slug already exists"
      }, 409);
    }

    return json({
      success: false,
      error: "Unable to update category"
    }, 500);
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
      return json({
        success: false,
        error: "Valid category ID is required"
      }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM categories WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        error: "Category not found"
      }, 404);
    }

    return json({
      success: true,
      message: "Category deleted successfully"
    });

  } catch (error) {
    console.error("ADMIN_CATEGORIES_DELETE_ERROR:", error);

    return json({
      success: false,
      error: "Unable to delete category"
    }, 500);
  }
}
