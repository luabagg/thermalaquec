/** Storage folders. They are paths of stored objects, so their names stay as they are. */
export type ImageFolder = "quotes" | "catalog";

export type UploadedImage = { id: number; location: string; thumbnail: string | null };

const UPLOAD_FAILED = "Falha no envio da imagem";

/** Sends an image to the admin upload route. It answers with the stored image, or the reason it failed. */
export async function uploadAdminImage(
  file: File,
  folder: ImageFolder,
): Promise<{ ok: true; image: UploadedImage } | { ok: false; error: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  try {
    const response = await fetch("/admin/uploads", { method: "POST", body, credentials: "same-origin" });
    const answer = (await response.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
    if (!response.ok || answer.error || answer.id == null || !answer.location) {
      return { ok: false, error: answer.error ?? UPLOAD_FAILED };
    }
    return { ok: true, image: { id: answer.id, location: answer.location, thumbnail: answer.thumbnail ?? null } };
  } catch {
    return { ok: false, error: UPLOAD_FAILED };
  }
}

/** The small image an editor shows: the thumbnail, or the full image when it has none. */
export function imagePreviewUrl(image: { location: string; thumbnail: string | null } | null) {
  return image ? image.thumbnail ?? image.location : null;
}
