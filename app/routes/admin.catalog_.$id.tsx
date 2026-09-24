import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  archiveCatalogProduct,
  deleteCatalogProduct,
  getCatalogProduct,
  listCatalogCategories,
  restoreCatalogProduct,
  updateCatalogProduct,
  type CatalogMutationResult,
  type CatalogProductDetail,
} from "~/models/catalog.server";
import { STALE_CATALOG_MESSAGE, formatAttributes, parseCatalogProductForm } from "~/utils/catalog-admin";
import { formatBRL } from "~/lib/money";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(`${data?.product.name ?? "Produto"} | Catálogo | ${SITE_NAME}`);

function productId(raw: string | undefined) {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new Response("Not found", { status: 404 });
  return id;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const [product, categories] = await Promise.all([getCatalogProduct(productId(params.id)), listCatalogCategories()]);
  if (!product) throw new Response("Not found", { status: 404 });
  return { product, categories };
};

function mutationError(result: Exclude<CatalogMutationResult, { ok: true }>) {
  if (result.error === "stale") return data({ error: STALE_CATALOG_MESSAGE }, { status: 409 });
  if (result.error === "not_found") return data({ error: "Produto não encontrado." }, { status: 404 });
  return data({ error: result.message ?? "Dados inválidos." }, { status: 400 });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const id = productId(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");
  const expectedUpdatedAt = new Date(String(form.get("expectedUpdatedAt") ?? ""));

  if (intent === "archive" || intent === "restore" || intent === "delete") {
    if (Number.isNaN(expectedUpdatedAt.valueOf())) return data({ error: STALE_CATALOG_MESSAGE }, { status: 409 });
    const lifecycle = { archive: archiveCatalogProduct, restore: restoreCatalogProduct, delete: deleteCatalogProduct }[intent];
    const result = await lifecycle(id, expectedUpdatedAt);
    if (!result.ok) return mutationError(result);
    return intent === "delete" ? redirect("/admin/catalog") : data({ saved: true as const });
  }

  const parsed = parseCatalogProductForm(form);
  if (!parsed.ok) return data({ error: parsed.error }, { status: 400 });
  const result = await updateCatalogProduct(id, parsed.expectedUpdatedAt, parsed.input);
  if (!result.ok) return mutationError(result);
  return data({ saved: true as const });
};

type VariantDraft = {
  clientKey: string;
  id: number | null;
  name: string;
  attributes: string;
  description: string;
  price: string;
  imageId: number | null;
  imageUrl: string | null;
  active: boolean;
  openOnMount: boolean;
};

function centsToInput(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function bullets(value: unknown) {
  return Array.isArray(value) ? value.map(String).join("\n") : "";
}

function toDrafts(product: CatalogProductDetail): VariantDraft[] {
  return product.variants.map((variant) => ({
    clientKey: String(variant.id),
    id: variant.id,
    name: variant.name,
    attributes: formatAttributes(variant.attributes),
    description: bullets(variant.descriptionLines),
    price: centsToInput(variant.priceCents),
    imageId: variant.imageId,
    imageUrl: variant.image?.thumbnail ?? variant.image?.location ?? null,
    active: variant.active,
    openOnMount: false,
  }));
}

async function uploadCatalogImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", "catalog");
  const res = await fetch("/admin/uploads", { method: "POST", body, credentials: "same-origin" });
  const payload = (await res.json()) as { id?: number; location?: string; thumbnail?: string; error?: string };
  if (!res.ok || payload.id == null) throw new Error(payload.error ?? "Falha no envio da imagem");
  return { id: payload.id, url: payload.thumbnail ?? payload.location ?? null };
}

const areaClass = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function ProductEditor({ product, categories }: ReturnType<typeof useLoaderData<typeof loader>>) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [variants, setVariants] = useState(() => toDrafts(product));
  const [productImage, setProductImage] = useState({ id: product.imageId, url: product.image?.thumbnail ?? product.image?.location ?? null });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const expectedUpdatedAt = new Date(product.updatedAt).toISOString();

  const patchVariant = (clientKey: string, patch: Partial<VariantDraft>) =>
    setVariants((current) => current.map((variant) => (variant.clientKey === clientKey ? { ...variant, ...patch } : variant)));

  async function upload(file: File, apply: (image: { id: number; url: string | null }) => void) {
    setUploadError(null);
    setUploading(true);
    try {
      apply(await uploadCatalogImage(file));
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        clientKey: `new-${Date.now()}`,
        id: null,
        name: product.name,
        attributes: "",
        description: "",
        price: "",
        imageId: null,
        imageUrl: null,
        active: true,
        openOnMount: true,
      },
    ]);
  }

  return (
    <>
      <Form method="post" className="grid gap-6">
        <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
        <input type="hidden" name="variantCount" value={variants.length} />
        <input type="hidden" name="imageId" value={productImage.id ?? ""} />

        <section className="grid gap-3 border border-border p-4 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Produto</h2>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input id="product-name" name="name" defaultValue={product.name} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="product-brand">Marca (opcional)</Label>
            <Input id="product-brand" name="brand" defaultValue={product.brand ?? ""} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="product-category">Categoria</Label>
            <select
              id="product-category"
              name="categoryId"
              defaultValue={product.categoryId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="product-description">Bullets de todas as variantes (um por linha)</Label>
            <textarea id="product-description" name="description" rows={3} defaultValue={bullets(product.descriptionLines)} className={areaClass} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            {productImage.url ? <img src={productImage.url} alt="" className="h-16 w-16 rounded border border-border object-cover" /> : null}
            <div className="grid gap-1">
              <Label htmlFor="product-image">Imagem do produto</Label>
              <FileButton
                id="product-image"
                disabled={uploading}
                busy={uploading}
                onFile={(file) => void upload(file, setProductImage)}
              />
            </div>
            {productImage.id ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setProductImage({ id: null, url: null })}>
                Remover imagem
              </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Variantes ({variants.length})</h2>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              + Variante
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada variante é um item do orçamento. O nome é o que sai impresso.
          </p>
          {variants.map((variant, index) => (
            <VariantRow
              key={variant.clientKey}
              variant={variant}
              index={index}
              canRemove={variants.length > 1}
              uploading={uploading}
              onChange={(patch) => patchVariant(variant.clientKey, patch)}
              onRemove={() => setVariants((current) => current.filter((row) => row.clientKey !== variant.clientKey))}
              onUpload={(file) => void upload(file, (image) => patchVariant(variant.clientKey, { imageId: image.id, imageUrl: image.url }))}
            />
          ))}
        </section>

        {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
        {actionData && "error" in actionData ? (
          <p role="alert" className="text-sm text-destructive">
            {actionData.error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" name="intent" value="save" disabled={busy || uploading}>
            {busy ? "Salvando…" : "Salvar produto"}
          </Button>
          {actionData && "saved" in actionData ? (
            <p role="status" className="text-sm text-muted-foreground">
              Produto salvo.
            </p>
          ) : null}
        </div>
      </Form>

      <Form
        method="post"
        className="flex flex-wrap items-center gap-2 border border-border p-4"
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.value === "delete" && !confirm(`Excluir ${product.name} e suas variantes?`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
        {product.archivedAt ? (
          <Button type="submit" name="intent" value="restore" variant="outline" disabled={busy}>
            Restaurar
          </Button>
        ) : (
          <Button type="submit" name="intent" value="archive" variant="outline" disabled={busy}>
            Arquivar
          </Button>
        )}
        <Button type="submit" name="intent" value="delete" variant="destructive" disabled={busy}>
          Excluir
        </Button>
        <p className="text-sm text-muted-foreground">
          Arquivar tira o produto do orçamento. Orçamentos já feitos guardam seus itens mesmo se o produto for excluído.
        </p>
      </Form>
    </>
  );
}

type VariantRowProps = {
  variant: VariantDraft;
  index: number;
  canRemove: boolean;
  uploading: boolean;
  onChange(patch: Partial<VariantDraft>): void;
  onRemove(): void;
  onUpload(file: File): void;
};

function VariantRow({ variant, index, canRemove, uploading, onChange, onRemove, onUpload }: VariantRowProps) {
  const [initiallyOpen] = useState(variant.openOnMount);
  const field = (name: string) => `variant.${index}.${name}`;
  const id = (name: string) => `variant-${variant.clientKey}-${name}`;

  return (
    <details open={initiallyOpen} onInvalidCapture={(event) => (event.currentTarget.open = true)} className="group border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{variant.name || "Sem nome"}</span>
        {!variant.active ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inativa</span> : null}
        {variant.price ? <span className="shrink-0 text-xs text-muted-foreground">R$ {variant.price}</span> : null}
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            aria-label="Remover variante"
            onClick={(event) => {
              event.preventDefault();
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </summary>
      <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
        <input type="hidden" name={field("id")} value={variant.id ?? ""} />
        <input type="hidden" name={field("imageId")} value={variant.imageId ?? ""} />
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor={id("name")}>Nome impresso</Label>
          <Input id={id("name")} name={field("name")} value={variant.name} onChange={(e) => onChange({ name: e.target.value })} required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={id("price")}>Preço (opcional)</Label>
          <Input
            id={id("price")}
            name={field("price")}
            value={variant.price}
            inputMode="decimal"
            placeholder="0,00"
            onChange={(e) => onChange({ price: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name={field("active")} checked={variant.active} onChange={(e) => onChange({ active: e.target.checked })} />
          Disponível no orçamento
        </label>
        <div className="grid gap-1">
          <Label htmlFor={id("attributes")}>Atributos (“Nome: valor” por linha)</Label>
          <textarea
            id={id("attributes")}
            name={field("attributes")}
            rows={3}
            value={variant.attributes}
            placeholder={"Capacidade: 400L\nMaterial: Inox 316"}
            onChange={(e) => onChange({ attributes: e.target.value })}
            className={areaClass}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={id("description")}>Bullets desta variante</Label>
          <textarea
            id={id("description")}
            name={field("description")}
            rows={3}
            value={variant.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={areaClass}
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          {variant.imageUrl ? <img src={variant.imageUrl} alt="" className="h-12 w-12 rounded border border-border object-cover" /> : null}
          <FileButton id={id("image")} disabled={uploading} busy={uploading} onFile={onUpload} />
          {variant.imageId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ imageId: null, imageUrl: null })}>
              Usar imagem do produto
            </Button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export default function AdminCatalogProduct() {
  const loaded = useLoaderData<typeof loader>();
  const { product } = loaded;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin/catalog" className="underline-offset-2 hover:underline">
            Catálogo
          </Link>{" "}
          / Editar
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">{product.name}</h1>
        {product.archivedAt ? <p className="mt-1 text-sm text-muted-foreground">Arquivado: não aparece no orçamento.</p> : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {product.variants.filter((variant) => variant.active).length} de {product.variants.length} variantes disponíveis
          {product.variants.some((variant) => variant.priceCents !== null)
            ? ` · a partir de ${formatBRL(Math.min(...product.variants.flatMap((variant) => (variant.priceCents === null ? [] : [variant.priceCents]))))}`
            : ""}
        </p>
      </div>
      {/* Remount on every save, so the drafts start from what was stored. */}
      <ProductEditor key={new Date(product.updatedAt).toISOString()} {...loaded} />
    </main>
  );
}
