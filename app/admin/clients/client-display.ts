import type { ClientContent } from "./client-form";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** "(54) 99155-3618" for a stored phone with area code. */
export function formatPhone(phone: string | null | undefined) {
  const digits = digitsOnly(phone ?? "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

/** "95173-148" for a stored CEP. */
export function formatPostalCode(postalCode: string | null | undefined) {
  const digits = digitsOnly(postalCode ?? "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type ClientAddress = Pick<ClientContent, "street" | "number" | "complement" | "district" | "city" | "state">;

/** "Farroupilha/RS". */
export function formatCityState(client: Pick<ClientAddress, "city" | "state">) {
  return `${client.city}/${client.state}`;
}

/** "Rua X, 123, ap 2 - Centro, Farroupilha/RS", leaving out the parts that are empty. */
export function formatClientAddress(client: ClientAddress) {
  const streetLine = [client.street, client.number, client.complement].filter(Boolean).join(", ");
  const place = [client.district, formatCityState(client)].filter(Boolean).join(", ");
  return streetLine ? `${streetLine} - ${place}` : place;
}
