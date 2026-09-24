import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createCatalogProduct, listCatalogCategories, listCatalogProducts, type ProductStatusFilter } from "~/admin/catalog/catalog.server";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Catálogo | ${SITE_NAME}`);

function parseStatusFilter(value: string | null): ProductStatusFilter {
  return value === "archived" || value === "all" ? value : "active";
}

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const status = parseStatusFilter(url.searchParams.get("status"));
  const search = url.searchParams.get("q") ?? "";
  const categoryId = Number(url.searchParams.get("category")) || null;
  const [products, categories] = await Promise.all([
    listCatalogProducts({ status, search, categoryId }),
    listCatalogCategories(),
  ]);
  return { products, categories, status, search, categoryId };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return data({ error: "Informe o nome do produto." }, { status: 400 });
  const product = await createCatalogProduct({
    name,
    brand: String(form.get("brand") ?? "").trim() || null,
    categoryId: Number(form.get("categoryId")) || null,
  });
  return redirect(`/admin/catalog/${product.id}`);
};

export default function CatalogList() {
  const { products, categories, status, search, categoryId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-grow flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>{" "}
          / Catálogo
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Catálogo de orçamento</h1>
      </div>

      <details open={Boolean(actionData)} className="border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          + Novo produto
        </summary>
        <Form method="post" className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="new-name">Nome</Label>
            <Input id="new-name" name="name" required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="new-brand">Marca (opcional)</Label>
            <Input id="new-brand" name="brand" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="new-category">Categoria</Label>
            <select id="new-category" name="categoryId" defaultValue={categoryId ?? ""} className={selectClass}>
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {actionData?.error ? <p className="text-sm text-destructive sm:col-span-3">{actionData.error}</p> : null}
          <div className="sm:col-span-3">
            <Button type="submit">Criar e editar</Button>
          </div>
        </Form>
      </details>

      <Form method="get" className="grid grid-cols-1 gap-3 border border-border p-4 sm:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="catalog-search">Buscar</Label>
          <Input id="catalog-search" name="q" defaultValue={search} placeholder="Produto, marca ou variante" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="catalog-category">Categoria</Label>
          <select id="catalog-category" name="category" defaultValue={categoryId ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="catalog-status">Status</Label>
          <select id="catalog-status" name="status" defaultValue={status} className={selectClass}>
            <option value="active">Ativos</option>
            <option value="archived">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </Form>

      <p className="text-sm text-muted-foreground">{products.length} produto(s)</p>
      <ul className="divide-y divide-border border border-border">
        {products.map((product) => (
          <li key={product.id}>
            <Link to={`/admin/catalog/${product.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
              {product.image ? (
                <img
                  src={product.image.thumbnail ?? product.image.location}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <span aria-hidden className="h-12 w-12 shrink-0 rounded border border-dashed border-border" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words font-medium">{product.name}</span>
                  {product.archivedAt ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Arquivado</span>
                  ) : null}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  {product.category ? (
                    <>
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: product.category.color }} />
                      {product.category.name}
                    </>
                  ) : (
                    "Sem categoria"
                  )}
                  {product.brand ? ` · ${product.brand}` : null}
                </span>
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {product._count.variants === 1 ? "1 variante" : `${product._count.variants} variantes`}
              </span>
            </Link>
          </li>
        ))}
        {products.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">Nenhum produto encontrado.</li>
        ) : null}
      </ul>
    </main>
  );
}
