import { afterEach, expect, test, vi } from "vitest";

const { prismaMock, putPublicObjectMock, sharpMock } = vi.hoisted(() => {
  let sharpCallIndex = 0;
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
  const sharpMock = vi.fn(() => {
    const index = sharpCallIndex++;
    const chain: {
      rotate: ReturnType<typeof vi.fn>;
      resize: ReturnType<typeof vi.fn>;
      webp: ReturnType<typeof vi.fn>;
      toBuffer: ReturnType<typeof vi.fn>;
    } & Record<string, unknown> = {
      rotate: vi.fn(() => chain),
      resize: vi.fn(() => chain),
      webp: vi.fn(() => chain),
      toBuffer: vi.fn(async () => Buffer.from(index === 0 ? "print" : "thumb")),
    };
    return chain;
  });
  return { prismaMock, putPublicObjectMock, sharpMock };
});

vi.mock("sharp", () => ({ default: sharpMock }));
vi.mock("~/libs/prisma/client.server", () => ({ default: prismaMock }));
vi.mock("~/libs/supabase/storage.server", () => ({ putPublicObject: putPublicObjectMock }));

afterEach(() => {
  vi.clearAllMocks();
});

test("rejects GIF uploads at the boundary", async () => {
  const { createImageFromUpload } = await import("./image.server");
  const file = new File([Buffer.from("gif")], "photo.gif", { type: "image/gif" });

  try {
    await createImageFromUpload(file, "quotes");
    throw new Error("expected createImageFromUpload to reject GIF uploads");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(400);
    await expect((error as Response).text()).resolves.toBe("GIF não suportado");
  }
});

test("generates WebP print and thumbnail derivatives with immutable caching", async () => {
  const { createImageFromUpload } = await import("./image.server");
  const file = new File([Buffer.from("image-bytes")], "photo.png", { type: "image/png" });
  const result = await createImageFromUpload(file, "catalog");

  expect(sharpMock).toHaveBeenCalledTimes(2);
  const firstSharp = sharpMock.mock.results[0].value as {
    rotate: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    webp: ReturnType<typeof vi.fn>;
    toBuffer: ReturnType<typeof vi.fn>;
  };
  const secondSharp = sharpMock.mock.results[1].value as typeof firstSharp;

  expect(firstSharp.rotate).toHaveBeenCalledTimes(1);
  expect(firstSharp.resize).toHaveBeenCalledWith({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true,
  });
  expect(firstSharp.webp).toHaveBeenCalledWith({ quality: 82 });
  expect(firstSharp.toBuffer).toHaveBeenCalledTimes(1);

  expect(secondSharp.rotate).toHaveBeenCalledTimes(1);
  expect(secondSharp.resize).toHaveBeenCalledWith({
    width: 320,
    height: 320,
    fit: "inside",
    withoutEnlargement: true,
  });
  expect(secondSharp.webp).toHaveBeenCalledWith({ quality: 82 });
  expect(secondSharp.toBuffer).toHaveBeenCalledTimes(1);

  expect(putPublicObjectMock).toHaveBeenCalledTimes(2);
  const [printPath, printBody, printType, printOptions] = putPublicObjectMock.mock.calls[0] as unknown as [
    string,
    Buffer,
    string | undefined,
    { cacheControl?: string } | undefined,
  ];
  const [thumbPath, thumbBody, thumbType, thumbOptions] = putPublicObjectMock.mock.calls[1] as unknown as [
    string,
    Buffer,
    string | undefined,
    { cacheControl?: string } | undefined,
  ];
  expect(printPath).toMatch(/^catalog\/.*\.webp$/);
  expect(thumbPath).toMatch(/^catalog\/.*-thumb\.webp$/);
  expect(printBody).toBeInstanceOf(Buffer);
  expect(thumbBody).toBeInstanceOf(Buffer);
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
