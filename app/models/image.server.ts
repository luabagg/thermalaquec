import prisma from "~/libs/prisma/client.server";
import { putPublicObject } from "~/libs/supabase/storage.server";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 4_500_000; // under Vercel function body limit

export async function createImageFromUpload(file: File, folder: "quotes" | "catalog") {
  if (!ALLOWED.has(file.type)) {
    throw new Response("Tipo de imagem não suportado", { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    throw new Response("Imagem muito grande (máx ~4.5MB)", { status: 400 });
  }
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const pathname = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const uploaded = await putPublicObject(pathname, file, file.type);
  return prisma.image.create({
    data: { location: uploaded.url },
    select: { id: true, location: true },
  });
}

export async function getImage(id: number) {
  return prisma.image.findUnique({ where: { id } });
}
