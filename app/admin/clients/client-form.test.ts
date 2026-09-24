import { expect, test } from "vitest";

import { STALE_CLIENT_FORM_MESSAGE, parseClientForm } from "./client-form";

const BLANK_FORM = {
  name: "", taxId: "", phone: "", email: "", postalCode: "", street: "", number: "", complement: "", district: "", city: "", notes: "",
};

/** A client form as the current page submits it: every text field is present, even when empty. */
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...BLANK_FORM, ...fields })) data.set(key, value);
  return data;
}

test("only the name, city and state are required", () => {
  const result = parseClientForm(form({ name: "  Abel  ", city: "Farroupilha", state: "rs" }));

  expect(result).toEqual({
    ok: true,
    content: expect.objectContaining({ name: "Abel", city: "Farroupilha", state: "RS", taxId: null, phone: null, email: null }),
  });
});

test("a missing name, city or state is reported per field", () => {
  const result = parseClientForm(form({ name: "", city: "", state: "XX" }));

  expect(!result.ok && Object.keys(result.errors.fieldErrors ?? {}).sort()).toEqual(["city", "name", "state"]);
});

test("tax ids, phones and CEPs are stored without punctuation", () => {
  const result = parseClientForm(
    form({ name: "A", city: "B", state: "SP", taxId: "529.982.247-25", phone: "(54) 99155-3618", postalCode: "95173-148" }),
  );

  expect(result.ok && result.content).toMatchObject({ taxId: "52998224725", phone: "54991553618", postalCode: "95173148" });
});

test("an invalid tax id, phone, CEP or e-mail is rejected", () => {
  const result = parseClientForm(form({ name: "A", city: "B", state: "SP", taxId: "123", phone: "123", postalCode: "123", email: "nope" }));

  expect(!result.ok && Object.keys(result.errors.fieldErrors ?? {}).sort()).toEqual(["email", "phone", "postalCode", "taxId"]);
});

test("a phone typed with the Brazil country code is stored without it", () => {
  const result = parseClientForm(form({ name: "A", city: "B", state: "SP", phone: "+55 (54) 99155-3618" }));

  expect(result.ok && result.content.phone).toBe("54991553618");
});

// A page loaded before the tax id field was renamed posts it as "document". Saving that form would erase the
// stored tax id, so the parser refuses it.
test("a form without one of its text fields is refused, not saved with that field empty", () => {
  const olderPage = new FormData();
  for (const [key, value] of Object.entries({ ...BLANK_FORM, name: "A", city: "B", state: "SP" })) {
    if (key !== "taxId") olderPage.set(key, value);
  }
  olderPage.set("document", "52998224725");

  expect(parseClientForm(olderPage)).toEqual({ ok: false, errors: { formError: STALE_CLIENT_FORM_MESSAGE } });
});
