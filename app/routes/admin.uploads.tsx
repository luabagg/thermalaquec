import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createImageFromUpload } from "~/models/image.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const form = await request.formData();
  const file = form.get("file");
  const folderRaw = String(form.get("folder") || "quotes");
  const folder = folderRaw === "catalog" ? "catalog" : "quotes";
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Arquivo obrigatório" }, { status: 400 });
  }
  const image = await createImageFromUpload(file, folder);
  return json({ id: image.id, location: image.location, thumbnail: image.thumbnail });
};
