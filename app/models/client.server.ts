import { Prisma } from "@prisma/client";

import prisma from "~/libs/prisma/client.server";
import type { ClientField, ClientInput } from "~/utils/client";

export type ClientMutationResult =
  | { ok: true; client: { id: number } }
  | { ok: false; fieldErrors: Partial<Record<ClientField, string>> };

/** Every stored client field the forms and the printed quotation use. */
export const clientFieldsSelect = {
  id: true,
  name: true,
  document: true,
  phone: true,
  email: true,
  postalCode: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  notes: true,
} satisfies Prisma.ClientSelect;

const DUPLICATE_DOCUMENT = { document: "Já existe um cliente com este CPF/CNPJ." };

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function saveClient(write: () => Promise<{ id: number }>): Promise<ClientMutationResult> {
  try {
    return { ok: true, client: await write() };
  } catch (error) {
    // document is the only unique column besides the id.
    if (isUniqueViolation(error)) return { ok: false, fieldErrors: DUPLICATE_DOCUMENT };
    throw error;
  }
}

export function createClient(data: ClientInput) {
  return saveClient(() => prisma.client.create({ data, select: { id: true } }));
}

export function updateClient(id: number, data: ClientInput) {
  return saveClient(() => prisma.client.update({ where: { id }, data, select: { id: true } }));
}

/** Searches by name, city or document, ignoring case. */
export function listClients(search?: string) {
  const term = search?.trim();
  return prisma.client.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { city: { contains: term, mode: "insensitive" } },
            { document: { contains: term.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || term } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { quotations: true } } },
  });
}

/** The client choices of the quotation editor, with the fields its preview prints. */
export function listClientOptions() {
  return prisma.client.findMany({ orderBy: { name: "asc" }, select: clientFieldsSelect });
}

export function getClient(id: number) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      quotations: {
        orderBy: { issuedAt: "desc" },
        select: { id: true, issuedAt: true, status: true, ownerUserId: true },
      },
    },
  });
}

/** Deletes a client that has no quotations. A client with quotations stays, so their documents keep a recipient. */
export async function deleteClient(id: number): Promise<{ ok: true } | { ok: false; error: "has_quotations" | "not_found" }> {
  // The RESTRICT foreign key still guards a quotation created between the count and the delete.
  if ((await prisma.quotation.count({ where: { clientId: id } })) > 0) return { ok: false, error: "has_quotations" };
  const deleted = await prisma.client.deleteMany({ where: { id } });
  return deleted.count ? { ok: true } : { ok: false, error: "not_found" };
}
