import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("waitForPrintReadiness waits for image decode and fonts", async () => {
  const decode = vi.fn().mockResolvedValue(undefined);
  const ready = new Promise<void>(() => undefined);
  vi.stubGlobal("document", { fonts: { ready } });

  const { waitForPrintReadiness } = await import("./print-readiness");
  const root = {
    querySelectorAll: () => [
      {
        decode,
      },
    ],
  } as unknown as ParentNode;

  const readiness = waitForPrintReadiness(root, { timeoutMs: 50 });
  let settled = false;
  readiness.then(() => {
    settled = true;
  });

  await Promise.resolve();
  expect(settled).toBe(false);
  expect(decode).toHaveBeenCalledTimes(1);
});

test("waitForPrintReadiness resolves once fonts become ready", async () => {
  const decode = vi.fn().mockResolvedValue(undefined);
  let resolveFonts!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveFonts = resolve;
  });
  vi.stubGlobal("document", { fonts: { ready } });

  const { waitForPrintReadiness } = await import("./print-readiness");
  const root = {
    querySelectorAll: () => [
      {
        decode,
      },
    ],
  } as unknown as ParentNode;

  const readiness = waitForPrintReadiness(root, { timeoutMs: 50 });
  resolveFonts();

  await expect(readiness).resolves.toEqual({ timedOut: false });
  expect(decode).toHaveBeenCalledTimes(1);
});

test("waitForPrintReadiness times out instead of waiting forever", async () => {
  vi.stubGlobal("document", { fonts: { ready: new Promise<void>(() => undefined) } });

  const { waitForPrintReadiness } = await import("./print-readiness");
  const root = {
    querySelectorAll: () => [
      {
        decode: () => new Promise<void>(() => undefined),
      },
    ],
  } as unknown as ParentNode;

  await expect(waitForPrintReadiness(root, { timeoutMs: 1 })).resolves.toEqual({ timedOut: true });
});

test("waitForPrintReadiness tolerates image decode failures", async () => {
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });

  const { waitForPrintReadiness } = await import("./print-readiness");
  const root = {
    querySelectorAll: () => [
      {
        decode: vi.fn().mockRejectedValue(new Error("broken image")),
      },
    ],
  } as unknown as ParentNode;

  await expect(waitForPrintReadiness(root, { timeoutMs: 50 })).resolves.toEqual({ timedOut: false });
});
