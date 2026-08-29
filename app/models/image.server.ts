import sharp from "sharp";

import prisma from "~/libs/prisma/client.server";
import { putPublicObject } from "~/libs/supabase/storage.server";

const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4_500_000; // under Vercel function body limit
const GENERATED_CACHE_CONTROL = "31536000, immutable";

async function toWebpDerivative(source: Buffer, maxSize: number) {
  return sharp(source)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function createImageFromUpload(file: File, folder: "quotes" | "catalog") {
  if (file.type === "image/gif") {
    throw new Response("GIF não suportado", { status: 400 });
  }
  if (!SUPPORTED.has(file.type)) {
    throw new Response("Tipo de imagem não suportado", { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    throw new Response("Imagem muito grande (máx ~4.5MB)", { status: 400 });
  }

  const base = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const source = Buffer.from(await file.arrayBuffer());
  let locationBuffer: Buffer;
  let thumbnailBuffer: Buffer;
  try {
    const metadata = await sharp(source).metadata();
    if (metadata.format === "gif") {
      throw new Response("GIF não suportado", { status: 400 });
    }
    if (!metadata.format || !SUPPORTED.has(`image/${metadata.format}`)) {
      throw new Response("Tipo de imagem não suportado", { status: 400 });
    }
    [locationBuffer, thumbnailBuffer] = await Promise.all([
      toWebpDerivative(source, 1600),
      toWebpDerivative(source, 320),
    ]);
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response("Arquivo de imagem inválido", { status: 400 });
  }
  const [uploaded, thumbnail] = await Promise.all([
    putPublicObject(`${base}.webp`, locationBuffer, "image/webp", { cacheControl: GENERATED_CACHE_CONTROL }),
    putPublicObject(`${base}-thumb.webp`, thumbnailBuffer, "image/webp", {
      cacheControl: GENERATED_CACHE_CONTROL,
    }),
  ]);

  return prisma.image.create({
    data: { location: uploaded.url, thumbnail: thumbnail.url },
    select: { id: true, location: true, thumbnail: true },
  });
}

export async function getImage(id: number) {
  return prisma.image.findUnique({ where: { id } });
}
