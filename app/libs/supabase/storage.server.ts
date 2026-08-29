import { createServiceRoleClient } from "~/libs/supabase/admin.server";

/** Bucket created in Supabase Storage for quotation/catalog images. */
export const QUOTE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "catalog";

export async function putPublicObject(
  pathname: string,
  body: File | Buffer | Blob | ArrayBuffer,
  contentType?: string,
  options?: { cacheControl?: string; upsert?: boolean },
) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(QUOTE_STORAGE_BUCKET).upload(pathname, body, {
    contentType,
    upsert: options?.upsert ?? false,
    cacheControl: options?.cacheControl ?? "3600",
  });

  if (error) {
    throw new Response(error.message || "Falha no upload", { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(QUOTE_STORAGE_BUCKET).getPublicUrl(data.path);
  return { url: publicData.publicUrl, pathname: data.path };
}

export async function deleteObject(pathOrUrl: string) {
  const supabase = createServiceRoleClient();
  const path = pathFromStorageUrl(pathOrUrl);
  const { error } = await supabase.storage.from(QUOTE_STORAGE_BUCKET).remove([path]);
  if (error) {
    throw new Response(error.message || "Falha ao remover arquivo", { status: 500 });
  }
}

/** Accepts a storage object path or a full public URL. */
function pathFromStorageUrl(pathOrUrl: string) {
  if (!pathOrUrl.includes("://")) return pathOrUrl.replace(/^\//, "");
  const marker = `/object/public/${QUOTE_STORAGE_BUCKET}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx >= 0) return decodeURIComponent(pathOrUrl.slice(idx + marker.length));
  // S3-style or signed URLs — best-effort last path segments after bucket
  try {
    const u = new URL(pathOrUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const bucketIdx = parts.indexOf(QUOTE_STORAGE_BUCKET);
    if (bucketIdx >= 0 && bucketIdx < parts.length - 1) {
      return decodeURIComponent(parts.slice(bucketIdx + 1).join("/"));
    }
  } catch {
    /* fall through */
  }
  return pathOrUrl;
}
