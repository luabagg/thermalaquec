import { redirect } from "@remix-run/node";
import { expect, test, vi } from "vitest";

// Every admin loader and action must check the session before it reaches the database.
vi.mock("~/utils/require-admin.server", () => ({
  requireAdmin: vi.fn(async () => {
    throw redirect("/admin/login");
  }),
  requireAdminLoader: vi.fn(async () => {
    throw redirect("/admin/login");
  }),
}));
vi.mock("~/libs/prisma/client.server", () => ({
  default: new Proxy(
    {},
    {
      get() {
        throw new Error("database reached without an admin check");
      },
    },
  ),
}));

// Login, logout and the OAuth callback are the public entry points.
const PUBLIC = /admin\.(login|logout)/;
const modules = import.meta.glob<{ loader?: (args: unknown) => unknown; action?: (args: unknown) => unknown }>([
  "./admin.*.tsx",
  "./admin.*.ts",
  "!./**/*.test.*",
]);

const guarded = Object.entries(modules).filter(([path]) => !PUBLIC.test(path));

test("the admin route list is not empty", () => {
  expect(guarded.length).toBeGreaterThan(8);
});

test.each(guarded.map(([path, load]) => ({ path, load })))("$path requires an admin session", async ({ load }) => {
  const module = await load();
  const args = {
    request: new Request("http://localhost/admin/x", { method: "POST", body: new FormData() }),
    params: { id: "1" },
    context: {},
  };
  for (const handler of [module.loader, module.action]) {
    if (!handler) continue;
    await expect(Promise.resolve().then(() => handler(args))).rejects.toMatchObject({
      status: 302,
      headers: expect.objectContaining({}),
    });
  }
});
