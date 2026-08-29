import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("waitForPrintReadiness waits for image decode and fonts", async () => {
  const decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });

  const { waitForPrintReadiness } = await import("./print-readiness");
  const root = {
    querySelectorAll: () => [
      {
        decode,
      },
    ],
  } as unknown as ParentNode;

  await expect(waitForPrintReadiness(root, { timeoutMs: 50 })).resolves.toEqual({ timedOut: false });
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
