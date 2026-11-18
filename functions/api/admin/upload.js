
import { requireAdmin } from "./_auth.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.authorized) {
    return json(
      { success: false, error: auth.error },
      auth.status
    );
  }

  if (!env.IMAGES) {
    return json({
      success: false,
      error: "Image storage is not configured"
    }, 500);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return json({
        success: false,
        error: "Please select an image"
      }, 400);
    }

    const allowedTypes = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif"
    };

    if (!allowedTypes[file.type]) {
      return json({
        success: false,
        error: "Only JPG, PNG, WEBP and AVIF images are allowed"
      }, 400);
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size <= 0 || file.size > maxSize) {
      return json({
        success: false,
        error: "Image must be smaller than 5 MB"
      }, 400);
    }

    const extension = allowedTypes[file.type];
    const filename = `${crypto.randomUUID()}.${extension}`;
    const key = `products/${filename}`;

    await env.IMAGES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable"
      }
    });

    return json({
      success: true,
      message: "Image uploaded successfully",
      image_url: `/images/${filename}`,
      filename
    }, 201);

  } catch (error) {
    console.error("IMAGE_UPLOAD_ERROR:", error);

    return json({
      success: false,
      error: "Unable to upload image"
    }, 500);
  }
}
