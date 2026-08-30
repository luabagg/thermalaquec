import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  archiveCatalogFamily,
  createCatalogFamily,
  deleteCatalogFamily,
  getCatalogDeletionEligibilityByIds,
  getCatalogFamilyDetail,
  listCatalogSummaries,
  restoreCatalogFamily,
  updateCatalogFamilyAggregate,
} from "~/models/catalog.server";
import {
  catalogMutationErrorResponse,
  parseCatalogStatus,
  toStringArray,
} from "~/utils/catalog-admin";
import { formatBRL, parseBRLToCents, slugifyCatalog } from "~/utils/quotation";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction = () => buildNoIndexMeta(`Catálogo | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const status = parseCatalogStatus(url.searchParams.get("status"));
  const search = url.searchParams.get("q")?.trim() ?? "";
  const items = await listCatalogSummaries({ status, search });
  const eligibilityById = await getCatalogDeletionEligibilityByIds(items.map((item) => item.id));
  const eligibility = items.flatMap((item) => {
    const itemEligibility = eligibilityById.get(item.id);
    return itemEligibility ? [{ id: item.id, ...itemEligibility }] : [];
  });
  return json({ items, status, search, eligibility });
};

function buildAggregateFromDetail(
  item: NonNullable<Awaited<ReturnType<typeof getCatalogFamilyDetail>>>,
  imageId: number | null,
) {
  return {
    id: item.id,
    expectedUpdatedAt: item.updatedAt.toISOString(),
    family: {
      slug: item.slug,
      name: item.name,
      nameTemplate: item.nameTemplate,
      descriptionLines: toStringArray(item.descriptionLines),
      defaultUnitPriceCents: item.defaultUnitPriceCents,
      imageId,
    },
    options: item.options.map((option, optionIndex) => ({
      id: option.id,
      clientKey: `option-${option.id}`,
      name: option.name,
      slug: option.slug,
      placement: option.placement,
      sortOrder: option.sortOrder ?? optionIndex,
      values: option.values.map((value, valueIndex) => ({
        id: value.id,
        clientKey: `value-${value.id}`,
        label: value.label,
        slug: value.slug,
        titleFragment: value.titleFragment,
        descriptionLines: toStringArray(value.descriptionLines),
        sortOrder: value.sortOrder ?? valueIndex,
      })),
    })),
    variants: item.variants.map((variant, variantIndex) => ({
      id: variant.id,
      clientKey: `variant-${variant.id ?? variantIndex}`,
      valueClientKeys: variant.values.map((entry) => `value-${entry.optionValueId}`),
      sku: variant.sku,
      active: variant.active,
      nameOverride: variant.nameOverride,
      descriptionLinesOverride: variant.descriptionLinesOverride
        ? toStringArray(variant.descriptionLinesOverride)
        : null,
      unitPriceCents: variant.unitPriceCents,
      imageId: variant.imageId,
    })),
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "create");

  if (intent === "set-image") {
    const catalogItemId = Number(form.get("catalogItemId"));
    const imageId = Number(form.get("imageId"));
    const expectedUpdatedAt = String(form.get("expectedUpdatedAt") || "");
    if (!Number.isFinite(catalogItemId) || !Number.isFinite(imageId) || !expectedUpdatedAt) {
      return json({ error: "Dados inválidos" }, { status: 400 });
    }
    const item = await getCatalogFamilyDetail(catalogItemId);
    if (!item) return json({ error: "Produto não encontrado" }, { status: 404 });
    const result = await updateCatalogFamilyAggregate({
      ...buildAggregateFromDetail(item, imageId),
      expectedUpdatedAt,
    });
    if (!result.ok) return catalogMutationErrorResponse(result);
    return json({ ok: true });
  }

  if (intent === "archive" || intent === "restore" || intent === "delete") {
    const id = Number(form.get("id"));
    const expectedUpdatedAt = String(form.get("expectedUpdatedAt") || "");
    if (!Number.isFinite(id) || !expectedUpdatedAt) {
      return json({ error: "Dados inválidos" }, { status: 400 });
    }
    const result =
      intent === "archive"
        ? await archiveCatalogFamily(id, expectedUpdatedAt)
        : intent === "restore"
          ? await restoreCatalogFamily(id, expectedUpdatedAt)
          : await deleteCatalogFamily(id, expectedUpdatedAt);
    if (!result.ok) return catalogMutationErrorResponse(result);
    return json({ ok: true });
  }

  const name = String(form.get("name") || "").trim();
  if (!name) return json({ error: "Nome obrigatório" }, { status: 400 });

  const descRaw = String(form.get("description") || "");
  const descriptionLines = descRaw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const priceRaw = String(form.get("price") || "");
  const defaultUnitPriceCents = priceRaw ? parseBRLToCents(priceRaw) : null;

  let slug = slugifyCatalog(name);
  try {
    await createCatalogFamily({
      slug,
      name,
      nameTemplate: null,
      descriptionLines,
      defaultUnitPriceCents,
      imageId: null,
    });
  } catch {
    slug = `${slug}-${Date.now().toString(36)}`;
    await createCatalogFamily({
      slug,
      name,
      nameTemplate: null,
      descriptionLines,
      defaultUnitPriceCents,
      imageId: null,
    });
  }

  return json({ ok: true });
};

export default function AdminCatalog() {
  const { items, status, search, eligibility } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const eligibilityById = new Map(eligibility.map((entry) => [entry.id, entry]));

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if ("ok" in fetcher.data && fetcher.data.ok) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  async function handleImageUpload(
    catalogItemId: number,
    expectedUpdatedAt: string,
    file: File,
  ) {
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[catalogItemId];
      return next;
    });
    setUploadingId(catalogItemId);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "catalog");
      const res = await fetch("/admin/uploads", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || data.error || data.id == null) {
        setUploadErrors((prev) => ({
          ...prev,
          [catalogItemId]: data.error ?? "Falha no envio da imagem",
        }));
        return;
      }
      fetcher.submit(
        {
          intent: "set-image",
          catalogItemId: String(catalogItemId),
          imageId: String(data.id),
          expectedUpdatedAt,
        },
        { method: "post" },
      );
    } catch {
      setUploadErrors((prev) => ({
        ...prev,
        [catalogItemId]: "Falha no envio da imagem",
      }));
    } finally {
      setUploadingId(null);
    }
  }

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

      <Form method="get" className="flex flex-wrap items-end gap-3 border border-border p-4">
        <div>
          <Label htmlFor="catalog-status">Status</Label>
          <select
            id="catalog-status"
            name="status"
            defaultValue={status}
            className="mt-1 flex h-10 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Ativos</option>
            <option value="archived">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="catalog-search">Buscar</Label>
          <Input id="catalog-search" name="q" defaultValue={search} placeholder="Nome do produto" />
        </div>
        <Button type="submit" className="w-fit">
          Filtrar
        </Button>
      </Form>

      <Form method="post" className="grid gap-3 border border-border p-4">
        <input type="hidden" name="intent" value="create" />
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
        {items.map((item) => {
          const itemEligibility = eligibilityById.get(item.id);
          const isArchived = item.archivedAt != null;
          return (
            <li key={item.id} className="px-4 py-3">
              <div className="flex gap-3">
                {item.Image ? (
                  <img
                    src={item.Image.thumbnail ?? item.Image.location}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border text-center text-xs text-muted-foreground">
                    Sem imagem
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <Link
                        to={`/admin/catalog/${item.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {item.name}
                      </Link>
                      {isArchived ? (
                        <span className="ml-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Arquivado
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.defaultUnitPriceCents != null
                        ? formatBRL(item.defaultUnitPriceCents)
                        : "sem preço"}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item._count.options} opções · {item._count.variants} combinações
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/catalog/${item.id}`}>Editar</Link>
                    </Button>
                    {isArchived ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="restore" />
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="expectedUpdatedAt"
                          value={item.updatedAt}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Restaurar
                        </Button>
                      </fetcher.Form>
                    ) : (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="archive" />
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="expectedUpdatedAt"
                          value={item.updatedAt}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Arquivar
                        </Button>
                      </fetcher.Form>
                    )}
                    {itemEligibility?.eligible ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="expectedUpdatedAt"
                          value={item.updatedAt}
                        />
                        <Button type="submit" variant="destructive" size="sm">
                          Excluir
                        </Button>
                      </fetcher.Form>
                    ) : itemEligibility ? (
                      <p className="text-xs text-muted-foreground">
                        Não pode excluir: {itemEligibility.quotationLines} orçamentos
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`catalog-img-${item.id}`}>Imagem</Label>
                    <FileButton
                      id={`catalog-img-${item.id}`}
                      className="mt-1"
                      disabled={uploadingId === item.id || fetcher.state !== "idle"}
                      busy={uploadingId === item.id}
                      onFile={(file) =>
                        void handleImageUpload(item.id, String(item.updatedAt), file)
                      }
                    />
                    {uploadErrors[item.id] ? (
                      <p className="mt-1 text-sm text-destructive">{uploadErrors[item.id]}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground">
            Nenhum produto encontrado.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
