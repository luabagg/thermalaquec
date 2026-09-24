// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { STALE_CLIENT_FORM_MESSAGE, parseClientForm, type ClientContent } from "./client-form";
import { ClientFormFields } from "./ClientFormFields";

afterEach(cleanup);

function submitted(defaultValues?: Partial<ClientContent>) {
  const { container } = render(
    <form>
      <ClientFormFields defaultValues={defaultValues} />
    </form>,
  );
  return new FormData(container.querySelector("form")!);
}

// An update stores every client field the parser reads. A field the form names differently would be saved empty.
test("the parser reads back every field the client form submits", () => {
  const client: ClientContent = {
    name: "Condomínio Jardim",
    taxId: "52998224725",
    phone: "54991553618",
    email: "financeiro@exemplo.com.br",
    postalCode: "95173148",
    street: "Rua Paulo Tartarotti",
    number: "1012",
    complement: "Sala 3",
    district: "Bela Vista",
    city: "Farroupilha",
    state: "RS",
    notes: "Portão lateral",
  };

  expect(parseClientForm(submitted(client))).toEqual({ ok: true, content: client });
});

test("a new, empty client form gets field errors, not the stale-page message", () => {
  const parsed = parseClientForm(submitted());

  expect(parsed.ok).toBe(false);
  expect(!parsed.ok && parsed.errors.formError).toBeUndefined();
  expect(!parsed.ok && Object.keys(parsed.errors.fieldErrors ?? {}).sort()).toEqual(["city", "name", "state"]);
});

test("the stale-page message shows above the fields", () => {
  const { getByRole } = render(<ClientFormFields errors={{ formError: STALE_CLIENT_FORM_MESSAGE }} />);

  expect(getByRole("alert").textContent).toBe(STALE_CLIENT_FORM_MESSAGE);
});
