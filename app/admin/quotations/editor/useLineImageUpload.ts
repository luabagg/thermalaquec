import { useCallback, useState } from "react";

import { uploadAdminImage } from "~/admin/images/upload-image";

import type { DraftEdit } from "./quotation-draft";

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
      const result = await uploadAdminImage(file, "quotes");
      setUploadingKey(null);
      if (!result.ok) {
        setErrors((current) => ({ ...current, [draftKey]: result.error }));
        return;
      }
      const { id, location, thumbnail } = result.image;
      onEdit({ type: "edit-line", draftKey, patch: { imageId: id, imageUrl: location, thumbnailUrl: thumbnail } });
    },
    [onEdit],
  );

  return { uploadingKey, errors, upload };
}
