import { createServiceRoleClient } from "~/libs/supabase/admin.server";

/** The Supabase Storage bucket that holds quotation and catalog images. */
export const IMAGE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "catalog";

export async function putPublicObject(
  pathname: string,
  body: File | Buffer | Blob | ArrayBuffer,
  contentType?: string,
  options?: { cacheControl?: string; upsert?: boolean },
) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(IMAGE_STORAGE_BUCKET).upload(pathname, body, {
    contentType,
    upsert: options?.upsert ?? false,
    cacheControl: options?.cacheControl ?? "3600",
  });

  if (error) {
    throw new Response(error.message || "Falha no upload", { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(IMAGE_STORAGE_BUCKET).getPublicUrl(data.path);
  return { url: publicData.publicUrl, pathname: data.path };
}
