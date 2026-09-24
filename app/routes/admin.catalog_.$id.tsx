import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";

import {
  archiveCatalogProduct,
  deleteCatalogProduct,
  getCatalogProduct,
  listCatalogCategories,
  restoreCatalogProduct,
  updateCatalogProduct,
  type ProductChangeOutcome,
  type StoredProduct,
} from "~/admin/catalog/catalog.server";
import { CatalogImageField } from "~/admin/catalog/editor/CatalogImageField";
import { VariantDraftRow } from "~/admin/catalog/editor/VariantDraftRow";
import { blankVariantDraft, lowestPriceCents, storedVariantsToDrafts, type VariantDraft } from "~/admin/catalog/editor/variant-draft";
import { PRODUCT_FIELD, STALE_PRODUCT_MESSAGE, parseCatalogProductForm } from "~/admin/catalog/product-form";
import { imagePreviewUrl, uploadAdminImage, type UploadedImage } from "~/admin/images/upload-image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatBRL } from "~/lib/money";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { readStringList } from "~/lib/text-lines";
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

function changeFailed(outcome: Exclude<ProductChangeOutcome, { ok: true }>) {
  if (outcome.error === "stale") return data({ error: STALE_PRODUCT_MESSAGE }, { status: 409 });
  if (outcome.error === "not_found") return data({ error: "Produto não encontrado." }, { status: 404 });
  return data({ error: outcome.message ?? "Dados inválidos." }, { status: 400 });
}

const LIFECYCLE_CHANGES = { archive: archiveCatalogProduct, restore: restoreCatalogProduct, delete: deleteCatalogProduct };

type LifecycleIntent = keyof typeof LIFECYCLE_CHANGES;

function isLifecycleIntent(intent: string): intent is LifecycleIntent {
  return Object.hasOwn(LIFECYCLE_CHANGES, intent);
}

async function changeLifecycle(id: number, intent: LifecycleIntent, form: FormData) {
  const expectedUpdatedAt = new Date(String(form.get(PRODUCT_FIELD.expectedUpdatedAt) ?? ""));
  if (Number.isNaN(expectedUpdatedAt.valueOf())) return data({ error: STALE_PRODUCT_MESSAGE }, { status: 409 });
  const outcome = await LIFECYCLE_CHANGES[intent](id, expectedUpdatedAt);
  if (!outcome.ok) return changeFailed(outcome);
  return intent === "delete" ? redirect("/admin/catalog") : data({ saved: true as const });
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const id = productId(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");
  if (isLifecycleIntent(intent)) return changeLifecycle(id, intent, form);

  const parsed = parseCatalogProductForm(form);
  if (!parsed.ok) return data({ error: parsed.error }, { status: 400 });
  const outcome = await updateCatalogProduct(id, parsed.expectedUpdatedAt, parsed.content);
  if (!outcome.ok) return changeFailed(outcome);
  return data({ saved: true as const });
};

export default function CatalogProductPage() {
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
        <h1 className="mt-1 break-words font-display text-3xl font-bold">{product.name}</h1>
        {product.archivedAt ? <p className="mt-1 text-sm text-muted-foreground">Arquivado: não aparece no orçamento.</p> : null}
        <p className="mt-1 text-sm text-muted-foreground">{variantSummary(product)}</p>
      </div>
      {/* Remount on every save, so the drafts start from what was stored. */}
      <ProductEditor key={new Date(product.updatedAt).toISOString()} {...loaded} />
    </main>
  );
}

/** "2 de 3 variantes disponíveis · a partir de R$ 4.500,00" */
function variantSummary(product: StoredProduct) {
  const available = product.variants.filter((variant) => variant.active).length;
  const lowest = lowestPriceCents(product.variants);
  const from = lowest === null ? "" : ` · a partir de ${formatBRL(lowest)}`;
  return `${available} de ${product.variants.length} variantes disponíveis${from}`;
}

/** Uploads one catalog image at a time. */
function useCatalogImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File, apply: (image: UploadedImage) => void) {
    setUploadError(null);
    setUploading(true);
    const result = await uploadAdminImage(file, "catalog");
    setUploading(false);
    if (result.ok) apply(result.image);
    else setUploadError(result.error);
  }

  return { uploading, uploadError, upload };
}

const areaClass = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function ProductEditor({ product, categories }: ReturnType<typeof useLoaderData<typeof loader>>) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [variants, setVariants] = useState(() => storedVariantsToDrafts(product));
  const [productImage, setProductImage] = useState({ id: product.imageId, previewUrl: imagePreviewUrl(product.image) });
  const { uploading, uploadError, upload } = useCatalogImageUpload();
  const expectedUpdatedAt = new Date(product.updatedAt).toISOString();

  const patchVariant = (draftKey: string, patch: Partial<VariantDraft>) =>
    setVariants((current) => current.map((variant) => (variant.draftKey === draftKey ? { ...variant, ...patch } : variant)));
  const removeVariant = (draftKey: string) => setVariants((current) => current.filter((variant) => variant.draftKey !== draftKey));

  return (
    <>
      <Form method="post" className="grid grid-cols-1 gap-6">
        <input type="hidden" name={PRODUCT_FIELD.expectedUpdatedAt} value={expectedUpdatedAt} />
        <input type="hidden" name={PRODUCT_FIELD.variantCount} value={variants.length} />
        <input type="hidden" name={PRODUCT_FIELD.imageId} value={productImage.id ?? ""} />

        <section className="grid grid-cols-1 gap-3 border border-border p-4 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Produto</h2>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input id="product-name" name={PRODUCT_FIELD.name} defaultValue={product.name} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="product-brand">Marca (opcional)</Label>
            <Input id="product-brand" name={PRODUCT_FIELD.brand} defaultValue={product.brand ?? ""} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="product-category">Categoria</Label>
            <select
              id="product-category"
              name={PRODUCT_FIELD.categoryId}
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
            <textarea
              id="product-description"
              name={PRODUCT_FIELD.description}
              rows={3}
              defaultValue={readStringList(product.descriptionLines).join("\n")}
              className={areaClass}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="product-image">Imagem do produto</Label>
            <CatalogImageField
              inputId="product-image"
              previewUrl={productImage.previewUrl}
              clearLabel={productImage.id ? "Remover imagem" : null}
              uploading={uploading}
              previewClassName="h-16 w-16"
              onFile={(file) => void upload(file, (image) => setProductImage({ id: image.id, previewUrl: imagePreviewUrl(image) }))}
              onClear={() => setProductImage({ id: null, previewUrl: null })}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Variantes ({variants.length})</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setVariants((current) => [...current, blankVariantDraft(product.name)])}>
              + Variante
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Cada variante é um item do orçamento. O nome é o que sai impresso.</p>
          {variants.map((variant, index) => (
            <VariantDraftRow
              key={variant.draftKey}
              variant={variant}
              index={index}
              canRemove={variants.length > 1}
              uploading={uploading}
              onChange={(patch) => patchVariant(variant.draftKey, patch)}
              onRemove={() => removeVariant(variant.draftKey)}
              onUpload={(file) =>
                void upload(file, (image) => patchVariant(variant.draftKey, { imageId: image.id, previewUrl: imagePreviewUrl(image) }))
              }
            />
          ))}
        </section>

        <ProductSaveBar busy={busy} uploading={uploading} uploadError={uploadError} />
      </Form>

      <ProductLifecycleForm product={product} expectedUpdatedAt={expectedUpdatedAt} busy={busy} />
    </>
  );
}

type ProductSaveBarProps = { busy: boolean; uploading: boolean; uploadError: string | null };

function ProductSaveBar({ busy, uploading, uploadError }: ProductSaveBarProps) {
  const actionData = useActionData<typeof action>();
  const saveError = actionData && "error" in actionData ? actionData.error : null;
  const saved = actionData !== undefined && "saved" in actionData;
  return (
    <>
      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" name="intent" value="save" disabled={busy || uploading}>
          {busy ? "Salvando…" : "Salvar produto"}
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-muted-foreground">
            Produto salvo.
          </p>
        ) : null}
      </div>
    </>
  );
}

type ProductLifecycleFormProps = { product: StoredProduct; expectedUpdatedAt: string; busy: boolean };

/** Archive, restore and delete. They act on the stored product, not on the unsaved edits above. */
function ProductLifecycleForm({ product, expectedUpdatedAt, busy }: ProductLifecycleFormProps) {
  return (
    <Form
      method="post"
      className="flex flex-wrap items-center gap-2 border border-border p-4"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "delete" && !confirm(`Excluir ${product.name} e suas variantes?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name={PRODUCT_FIELD.expectedUpdatedAt} value={expectedUpdatedAt} />
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
  );
}
