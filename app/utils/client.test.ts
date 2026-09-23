import { expect, test } from "vitest";

import { formatClientAddress, formatPhone, isValidTaxId, parseClientForm } from "./client";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

test("only the name, city and state are required", () => {
  const result = parseClientForm(form({ name: "  Abel  ", city: "Farroupilha", state: "rs" }));

  expect(result).toEqual({
    ok: true,
    data: expect.objectContaining({ name: "Abel", city: "Farroupilha", state: "RS", document: null, phone: null, email: null }),
  });
});

test("a missing name, city or state is reported per field", () => {
  const result = parseClientForm(form({ name: "", city: "", state: "XX" }));

  expect(result.ok).toBe(false);
  expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["city", "name", "state"]);
});

test("documents, phones and CEPs are stored without punctuation", () => {
  const result = parseClientForm(
    form({ name: "A", city: "B", state: "SP", document: "529.982.247-25", phone: "(54) 99155-3618", postalCode: "95173-148" }),
  );

  expect(result.ok && result.data).toMatchObject({ document: "52998224725", phone: "54991553618", postalCode: "95173148" });
});

test("tax ids must carry valid check digits", () => {
  expect(isValidTaxId("52998224725")).toBe(true);
  expect(isValidTaxId("52998224724")).toBe(false);
  expect(isValidTaxId("11111111111")).toBe(false);
  expect(isValidTaxId("11222333000181")).toBe(true);
  expect(isValidTaxId("11222333000182")).toBe(false);
});

test("the 2026 alphanumeric CNPJ is accepted", () => {
  // Example published by the Receita Federal.
  expect(isValidTaxId("12ABC34501DE35")).toBe(true);
  expect(isValidTaxId("12ABC34501DE36")).toBe(false);
});

test("an invalid document, phone, CEP or e-mail is rejected", () => {
  const result = parseClientForm(
    form({ name: "A", city: "B", state: "SP", document: "123", phone: "123", postalCode: "123", email: "nope" }),
  );

  expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["document", "email", "phone", "postalCode"]);
});

test("addresses print only the parts that exist", () => {
  const base = { street: null, number: null, complement: null, district: null, city: "Farroupilha", state: "RS" };

  expect(formatClientAddress(base)).toBe("Farroupilha/RS");
  expect(formatClientAddress({ ...base, street: "Rua A", number: "10", district: "Centro" })).toBe(
    "Rua A, 10 - Centro, Farroupilha/RS",
  );
  expect(formatPhone("54991553618")).toBe("(54) 99155-3618");
});

test("a phone typed with the Brazil country code is stored without it", () => {
  const result = parseClientForm(form({ name: "A", city: "B", state: "SP", phone: "+55 (54) 99155-3618" }));

  expect(result.ok && result.data.phone).toBe("54991553618");
});
