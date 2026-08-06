import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  createCatalogItem,
  formatBRL,
  listCatalogItems,
  parseBRLToCents,
  slugifyCatalog,
} from "~/models/quotation.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Catálogo | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const items = await listCatalogItems();
  return json({ items });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return json({ error: "Nome obrigatório" }, { status: 400 });

  const descRaw = String(form.get("description") || "");
  const descriptionLines = descRaw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const priceRaw = String(form.get("price") || "");
  const defaultUnitPriceCents = priceRaw ? parseBRLToCents(priceRaw) : null;

  let slug = slugifyCatalog(name);
  // uniqueness: append timestamp fragment if needed handled by catch
  try {
    await createCatalogItem({
      slug,
      name,
      descriptionLines,
      defaultUnitPriceCents,
    });
  } catch {
    slug = `${slug}-${Date.now().toString(36)}`;
    await createCatalogItem({
      slug,
      name,
      descriptionLines,
      defaultUnitPriceCents,
    });
  }

  return json({ ok: true });
};

export default function AdminCatalog() {
  const { items } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-grow flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>{" "}
          / Catálogo
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Catálogo de orçamento</h1>
      </div>

      <Form method="post" className="grid gap-3 border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Produto</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="price">Preço unitário (opcional)</Label>
            <Input id="price" name="price" placeholder="0,00" />
          </div>
        </div>
        <div>
          <Label htmlFor="description">Descrição (uma linha por item)</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" className="w-fit">
          Adicionar ao catálogo
        </Button>
      </Form>

      <ul className="divide-y divide-border border border-border">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.defaultUnitPriceCents != null ? formatBRL(item.defaultUnitPriceCents) : "sem preço"}
              </p>
            </div>
            {Array.isArray(item.descriptionLines) && (item.descriptionLines as string[]).length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                {(item.descriptionLines as string[]).slice(0, 4).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">
            Catálogo vazio. Rode o seed ou adicione produtos.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
