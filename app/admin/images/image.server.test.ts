import sharp from "sharp";
import { afterEach, expect, test, vi } from "vitest";

const { prismaMock, putPublicObjectMock } = vi.hoisted(() => {
  const putPublicObjectMock = vi.fn(async (pathname: string) => ({
    url: `https://cdn.test/${pathname}`,
    pathname,
  }));
  const prismaMock = {
    image: {
      create: vi.fn(async ({ data }: { data: { location: string; thumbnail: string } }) => ({
        id: 7,
        ...data,
      })),
    },
  };
  return { prismaMock, putPublicObjectMock };
});

vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));
vi.mock("~/libs/supabase/storage.server", () => ({ putPublicObject: putPublicObjectMock }));

afterEach(() => {
  vi.clearAllMocks();
});

async function expectUploadError(file: File, message: string) {
  const { createImageFromUpload } = await import("./image.server");
  try {
    await createImageFromUpload(file, "quotes");
    throw new Error("expected upload to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(400);
    await expect((error as Response).text()).resolves.toBe(message);
  }
  expect(putPublicObjectMock).not.toHaveBeenCalled();
  expect(prismaMock.image.create).not.toHaveBeenCalled();
}

test("rejects GIF uploads declared by MIME type", async () => {
  await expectUploadError(
    new File([Buffer.from("gif")], "photo.gif", { type: "image/gif" }),
    "GIF não suportado",
  );
});

test("rejects actual GIF bytes even when MIME-spoofed as PNG", async () => {
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  await expectUploadError(new File([gif], "photo.png", { type: "image/png" }), "GIF não suportado");
});

test("returns a controlled 400 for malformed image bytes", async () => {
  await expectUploadError(
    new File([Buffer.from("not-an-image")], "photo.png", { type: "image/png" }),
    "Arquivo de imagem inválido",
  );
});

test("returns a controlled 400 for unsupported image bytes", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  await expectUploadError(
    new File([svg], "photo.png", { type: "image/png" }),
    "Tipo de imagem não suportado",
  );
});

test("generates WebP print and thumbnail derivatives with immutable caching", async () => {
  const { createImageFromUpload } = await import("./image.server");
  const png = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const result = await createImageFromUpload(new File([png], "photo.png", { type: "image/png" }), "catalog");

  expect(putPublicObjectMock).toHaveBeenCalledTimes(2);
  const [printPath, printBody, printType, printOptions] = putPublicObjectMock.mock.calls[0] as unknown as [
    string,
    Buffer,
    string,
    { cacheControl: string },
  ];
  const [thumbPath, thumbBody, thumbType, thumbOptions] = putPublicObjectMock.mock.calls[1] as unknown as [
    string,
    Buffer,
    string,
    { cacheControl: string },
  ];
  expect(printPath).toMatch(/^catalog\/.*\.webp$/);
  expect(thumbPath).toMatch(/^catalog\/.*-thumb\.webp$/);
  await expect(sharp(printBody).metadata()).resolves.toMatchObject({ format: "webp", width: 640, height: 480 });
  await expect(sharp(thumbBody).metadata()).resolves.toMatchObject({ format: "webp", width: 320, height: 240 });
  expect(printType).toBe("image/webp");
  expect(thumbType).toBe("image/webp");
  expect(printOptions).toEqual({ cacheControl: "31536000, immutable" });
  expect(thumbOptions).toEqual({ cacheControl: "31536000, immutable" });

  expect(prismaMock.image.create).toHaveBeenCalledWith({
    data: {
      location: `https://cdn.test/${printPath}`,
      thumbnail: `https://cdn.test/${thumbPath}`,
    },
    select: { id: true, location: true, thumbnail: true },
  });
  expect(result).toEqual({
    id: 7,
    location: `https://cdn.test/${printPath}`,
    thumbnail: `https://cdn.test/${thumbPath}`,
  });
});
