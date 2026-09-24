import { useCallback, useState } from "react";

import type { DraftEdit } from "./quotation-draft";

type UploadedImage = { id: number; location: string | null; thumbnail: string | null };

const UPLOAD_FAILED = "Falha no envio da imagem";

async function uploadQuotationImage(file: File): Promise<{ ok: true; image: UploadedImage } | { ok: false; error: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", "quotes");
  const response = await fetch("/admin/uploads", { method: "POST", body, credentials: "same-origin" });
  const answer = (await response.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
  if (!response.ok || answer.error || answer.id == null) return { ok: false, error: answer.error ?? UPLOAD_FAILED };
  return { ok: true, image: { id: answer.id, location: answer.location ?? null, thumbnail: answer.thumbnail ?? null } };
}

/** Uploads one line image at a time and puts the stored image on the line. */
export function useLineImageUpload(onEdit: (edit: DraftEdit) => void) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const upload = useCallback(
    async (draftKey: string, file: File) => {
      setErrors((current) => {
        const next = { ...current };
        delete next[draftKey];
        return next;
      });
      setUploadingKey(draftKey);
      try {
        const result = await uploadQuotationImage(file);
        if (!result.ok) {
          setErrors((current) => ({ ...current, [draftKey]: result.error }));
          return;
        }
        const { id, location, thumbnail } = result.image;
        onEdit({ type: "edit-line", draftKey, patch: { imageId: id, imageUrl: location, thumbnailUrl: thumbnail } });
      } catch {
        setErrors((current) => ({ ...current, [draftKey]: UPLOAD_FAILED }));
      } finally {
        setUploadingKey(null);
      }
    },
    [onEdit],
  );

  return { uploadingKey, errors, upload };
}
