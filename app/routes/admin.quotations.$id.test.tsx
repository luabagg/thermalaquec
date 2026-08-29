import { expect, test, vi } from "vitest";

const { requireAdminMock, saveQuotationMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  saveQuotationMock: vi.fn(),
}));

vi.mock("~/utils/require-admin.server", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("~/models/quotation.server", () => ({
  saveQuotation: saveQuotationMock,
  getQuotation: vi.fn(),
  listCatalogItems: vi.fn(),
}));

function buildRequest(form: FormData) {
  return new Request("http://localhost/admin/quotations/42", {
    method: "POST",
    body: form,
  });
}

test("action returns JSON for save and forwards the revision token", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1", email: "rep@example.com" } });
  saveQuotationMock.mockResolvedValueOnce({ ok: true, quotationId: 42, revision: 9 });

  const { action } = await import("./admin.quotations.$id");
  const form = new FormData();
  form.set("intent", "save");
  form.set("revision", "9");
  form.set("title", " Heat pump quote ");
  form.set("issuedAt", "2026-08-29");
  form.set("status", "final");
  form.set("location", " Rua Central ");
  form.set("document", " 12.345.678/0001-90 ");
  form.set("notes", "Note");
  form.set("lineCount", "1");
  form.set("line.0.name", " Boiler ");
  form.set("line.0.quantity", "2");
  form.set("line.0.description", "Install");
  form.set("line.0.price", "123,45");
  form.set("paymentCount", "1");
  form.set("pay.0.label", " Cash ");
  form.set("pay.0.amount", "999,00");
  form.set("pay.0.detail", " upfront ");

  const response = await action({ request: buildRequest(form), params: { id: "42" } } as never);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, quotationId: 42, revision: 9 });
  expect(saveQuotationMock).toHaveBeenCalledWith({
    quotationId: 42,
    ownerUserId: "user-1",
    revision: 9,
    intent: "save",
    title: " Heat pump quote ",
    issuedAt: new Date("2026-08-29T12:00:00"),
    status: "final",
    location: " Rua Central ",
    document: " 12.345.678/0001-90 ",
    notes: "Note",
    lines: [
      {
        name: "Boiler",
        quantity: 2,
        descriptionLines: ["Install"],
        unitPriceCents: 12345,
        catalogItemId: null,
        imageId: null,
      },
    ],
    paymentOptions: [
      {
        label: "Cash",
        amountCents: 99900,
        detail: " upfront ",
      },
    ],
  });
});

test("action returns a print target in JSON for save-and-print", async () => {
  requireAdminMock.mockResolvedValueOnce({ user: { id: "user-1", email: "rep@example.com" } });
  saveQuotationMock.mockResolvedValueOnce({
    ok: true,
    quotationId: 42,
    revision: 10,
    redirectTo: "/admin/quotations/42/print?autoprint=1",
  });

  const { action, shouldRevalidate } = await import("./admin.quotations.$id");
  const form = new FormData();
  form.set("intent", "save-print");
  form.set("revision", "10");
  form.set("title", "Quote");

  const response = await action({ request: buildRequest(form), params: { id: "42" } } as never);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    quotationId: 42,
    revision: 10,
    redirectTo: "/admin/quotations/42/print?autoprint=1",
  });
  expect(shouldRevalidate({ actionResult: { ok: true }, defaultShouldRevalidate: true } as never)).toBe(false);
  expect(shouldRevalidate({ actionResult: { ok: false, status: 404, error: "Not found" }, defaultShouldRevalidate: true } as never)).toBe(false);
  expect(shouldRevalidate({ actionResult: undefined, defaultShouldRevalidate: true } as never)).toBe(true);
});
