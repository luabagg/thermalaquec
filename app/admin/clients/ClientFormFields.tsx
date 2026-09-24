import type { ReactNode } from "react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

import { formatPhone, formatPostalCode } from "./client-display";
import { BRAZIL_STATES, type ClientContent, type ClientField, type ClientFormErrors } from "./client-form";
import { TaxIdInput } from "./TaxIdInput";

type Props = {
  defaultValues?: Partial<ClientContent> | null;
  errors?: ClientFormErrors;
  /** Keeps ids unique when two client forms share a page. */
  idPrefix?: string;
};

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The client fields, without the form element. Name, city and state are the required ones.
 * Each input is named after its `ClientField`, which is what `parseClientForm` reads.
 */
export function ClientFormFields({ defaultValues, errors, idPrefix = "client" }: Props) {
  const values = defaultValues ?? {};
  const fieldErrors = errors?.fieldErrors ?? {};
  const id = (field: ClientField) => `${idPrefix}-${field}`;
  const errorProps = (field: ClientField) =>
    fieldErrors[field] ? { "aria-invalid": true, "aria-describedby": `${id(field)}-error` } : {};
  const text = (field: ClientField, label: string, props: Record<string, unknown> = {}, className?: string) => (
    <Field id={id(field)} label={label} error={fieldErrors[field]} className={className}>
      <Input id={id(field)} name={field} defaultValue={values[field] ?? ""} {...errorProps(field)} {...props} />
    </Field>
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
      {errors?.formError ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-6">
          {errors.formError}
        </p>
      ) : null}
      {text("name", "Nome", { required: true, autoComplete: "name" }, "sm:col-span-6")}

      <div className="grid gap-1 sm:col-span-3">
        <TaxIdInput id={id("taxId")} name={"taxId" satisfies ClientField} defaultValue={values.taxId ?? ""} {...errorProps("taxId")} />
        {fieldErrors.taxId ? (
          <p id={`${id("taxId")}-error`} className="text-sm text-destructive">
            {fieldErrors.taxId}
          </p>
        ) : null}
      </div>
      {text(
        "phone",
        "Telefone / WhatsApp (opcional)",
        { type: "tel", inputMode: "tel", autoComplete: "tel", defaultValue: formatPhone(values.phone), placeholder: "(54) 99999-9999" },
        "sm:col-span-3",
      )}
      {text("email", "E-mail (opcional)", { type: "email", autoComplete: "email" }, "sm:col-span-6")}

      {text(
        "postalCode",
        "CEP (opcional)",
        { inputMode: "numeric", autoComplete: "postal-code", defaultValue: formatPostalCode(values.postalCode), placeholder: "00000-000" },
        "sm:col-span-2",
      )}
      {text("city", "Cidade", { required: true, autoComplete: "address-level2" }, "sm:col-span-3")}
      <Field id={id("state")} label="UF" error={fieldErrors.state} className="sm:col-span-1">
        <select
          id={id("state")}
          name={"state" satisfies ClientField}
          required
          defaultValue={values.state ?? ""}
          autoComplete="address-level1"
          className={selectClass}
          {...errorProps("state")}
        >
          <option value="" disabled>
            UF
          </option>
          {BRAZIL_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </Field>

      {text("street", "Rua (opcional)", { autoComplete: "address-line1" }, "sm:col-span-4")}
      {text("number", "Número (opcional)", {}, "sm:col-span-2")}
      {text("complement", "Complemento (opcional)", { autoComplete: "address-line2" }, "sm:col-span-3")}
      {text("district", "Bairro (opcional)", {}, "sm:col-span-3")}

      <Field id={id("notes")} label="Observações (opcional)" error={fieldErrors.notes} className="sm:col-span-6">
        <textarea
          id={id("notes")}
          name={"notes" satisfies ClientField}
          rows={3}
          defaultValue={values.notes ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </Field>
    </div>
  );
}
