const DEFAULT_TIMEOUT_MS = 4000;

type PrintReadinessOptions = {
  timeoutMs?: number;
};

function waitForImage(image: HTMLImageElement) {
  if (typeof image.decode === "function") {
    return image.decode().catch(() => undefined);
  }

  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const settle = () => resolve();
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });
  });
}

async function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map((image) => waitForImage(image as HTMLImageElement)));
}

async function waitForFonts() {
  if (typeof document === "undefined") return;
  const ready = document.fonts?.ready;
  if (!ready) return;
  await ready.catch(() => undefined);
}

export async function waitForPrintReadiness(
  root: ParentNode | null,
  options?: PrintReadinessOptions,
): Promise<{ timedOut: boolean }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const readiness = (async () => {
    if (root) {
      await waitForImages(root);
    }
    await waitForFonts();
  })().catch(() => undefined);

  const timedOut = await Promise.race([
    readiness.then(() => false),
    new Promise<boolean>((resolve) => {
      globalThis.setTimeout(() => resolve(true), Math.max(0, timeoutMs));
    }),
  ]);

  return { timedOut };
}
