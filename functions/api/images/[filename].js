
export async function onRequestGet({ params, env }) {
  const filename = params.filename;

  // Allow only generated image filenames.
  if (
    typeof filename !== "string" ||
    !/^[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/i.test(filename)
  ) {
    return new Response("Invalid image filename", {
      status: 400
    });
  }

  if (!env.IMAGES) {
    return new Response("Image storage is not configured", {
      status: 500
    });
  }

  try {
    const object = await env.IMAGES.get(`products/${filename}`);

    if (!object) {
      return new Response("Image not found", {
        status: 404
      });
    }

    const headers = new Headers();

    object.writeHttpMetadata(headers);

    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, {
      headers
    });

  } catch (error) {
    console.error("IMAGE_READ_ERROR:", error);

    return new Response("Unable to load image", {
      status: 500
    });
  }
}
