import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import type { CatalogFamilyInput } from "~/utils/catalog-resolver";

import { useEffect, useMemo, useRef, useState } from "react";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { archiveCatalogFamily, getCatalogFamilyDetail, restoreCatalogFamily, updateCatalogFamilyAggregate } from "~/models/catalog.server";
import { catalogMutationErrorResponse, parseCatalogAggregateJson, toStringArray } from "~/utils/catalog-admin";
import { catalogVariantKey, resolveCatalogSelection } from "~/utils/catalog-resolver";
import { formatBRL, parseBRLToCents } from "~/utils/quotation";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(data ? `${data.item.name} | Catálogo | ${SITE_NAME}` : `Catálogo | ${SITE_NAME}`);

export type EditorOption = {
  id?: number;
  clientKey: string;
  name: string;
  slug: string;
  placement: "TITLE" | "DESCRIPTION";
  sortOrder: number;
  values: Array<{
    id?: number;
    clientKey: string;
    label: string;
    slug: string;
    titleFragment: string | null;
    descriptionLines: string[];
    sortOrder: number;
  }>;
};

export type EditorVariant = {
  id?: number;
  clientKey: string;
  valueClientKeys: string[];
  sku: string | null;
  active: boolean;
  nameOverride: string | null;
  descriptionLinesOverride: string[] | null;
  unitPriceCents: number | null;
  imageId: number | null;
};

export type EditorState = {
  id: number;
  expectedUpdatedAt: string;
  family: {
    slug: string;
    name: string;
    nameTemplate: string | null;
    descriptionLines: string[];
    defaultUnitPriceCents: number | null;
    imageId: number | null;
  };
  options: EditorOption[];
  variants: EditorVariant[];
};

export type PendingRemoval = {
  kind: "option" | "value";
  optionClientKey: string;
  valueClientKey?: string;
  label: string;
  affectedVariantClientKeys: string[];
};

export function detailToEditorState(item: NonNullable<Awaited<ReturnType<typeof getCatalogFamilyDetail>>>): EditorState {
  return {
    id: item.id,
    expectedUpdatedAt: item.updatedAt.toISOString(),
    family: {
      slug: item.slug,
      name: item.name,
      nameTemplate: item.nameTemplate,
      descriptionLines: toStringArray(item.descriptionLines),
      defaultUnitPriceCents: item.defaultUnitPriceCents,
      imageId: item.imageId,
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
      descriptionLinesOverride: variant.descriptionLinesOverride ? toStringArray(variant.descriptionLinesOverride) : null,
      unitPriceCents: variant.unitPriceCents,
      imageId: variant.imageId,
    })),
  };
}

function syntheticNumericId(clientKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < clientKey.length; index += 1) {
    hash ^= clientKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return -(Math.abs(hash) + 1);
}

function syntheticIds(prefix: string, clientKeys: string[]) {
  const result = new Map<string, number>();
  const used = new Set<number>();
  for (const clientKey of [...new Set(clientKeys)].sort()) {
    let id = syntheticNumericId(`${prefix}:${clientKey}`);
    while (used.has(id)) id -= 1;
    used.add(id);
    result.set(clientKey, id);
  }
  return result;
}

/** Builds an in-memory resolver model. Synthetic IDs exist only here and are never submitted. */
export function buildPreviewModel(state: EditorState): {
  family: CatalogFamilyInput;
  valueIdByClientKey: Map<string, number>;
} {
  const optionSyntheticIds = syntheticIds(
    "option",
    state.options.filter((option) => option.id === undefined).map((option) => option.clientKey)
  );
  const unsavedValues = state.options.flatMap((option) => option.values).filter((value) => value.id === undefined);
  const valueSyntheticIds = syntheticIds(
    "value",
    unsavedValues.map((value) => value.clientKey)
  );
  const variantSyntheticIds = syntheticIds(
    "variant",
    state.variants.filter((variant) => variant.id === undefined).map((variant) => variant.clientKey)
  );
  const valueIdByClientKey = new Map<string, number>();
  for (const option of state.options) {
    for (const value of option.values) {
      valueIdByClientKey.set(value.clientKey, value.id ?? valueSyntheticIds.get(value.clientKey)!);
    }
  }

  return {
    valueIdByClientKey,
    family: {
      id: state.id,
      slug: state.family.slug,
      name: state.family.name,
      nameTemplate: state.family.nameTemplate,
      descriptionLines: state.family.descriptionLines,
      defaultUnitPriceCents: state.family.defaultUnitPriceCents,
      imageId: state.family.imageId,
      options: state.options.map((option) => ({
        id: option.id ?? optionSyntheticIds.get(option.clientKey)!,
        name: option.name,
        slug: option.slug,
        placement: option.placement,
        sortOrder: option.sortOrder,
        values: option.values.map((value) => ({
          id: valueIdByClientKey.get(value.clientKey)!,
          label: value.label,
          slug: value.slug,
          titleFragment: value.titleFragment,
          descriptionLines: value.descriptionLines,
          sortOrder: value.sortOrder,
        })),
      })),
      variants: state.variants.map((variant) => {
        const valueIds = variant.valueClientKeys
          .map((clientKey) => valueIdByClientKey.get(clientKey))
          .filter((valueId): valueId is number => valueId !== undefined);
        return {
          id: variant.id ?? variantSyntheticIds.get(variant.clientKey)!,
          key: catalogVariantKey(valueIds),
          active: variant.active,
          valueIds,
          nameOverride: variant.nameOverride,
          descriptionLinesOverride: variant.descriptionLinesOverride,
          unitPriceCents: variant.unitPriceCents,
          imageId: variant.imageId,
        };
      }),
    },
  };
}

export function appendEditorOption(state: EditorState, clientKey: string): EditorState {
  return {
    ...state,
    options: [
      ...state.options,
      {
        id: undefined,
        clientKey,
        name: "",
        slug: "",
        placement: "TITLE",
        sortOrder: state.options.length,
        values: [],
      },
    ],
  };
}

export function appendEditorValue(state: EditorState, optionClientKey: string, clientKey: string): EditorState {
  return {
    ...state,
    options: state.options.map((option) =>
      option.clientKey !== optionClientKey
        ? option
        : {
            ...option,
            values: [
              ...option.values,
              {
                id: undefined,
                clientKey,
                label: "",
                slug: "",
                titleFragment: null,
                descriptionLines: [],
                sortOrder: option.values.length,
              },
            ],
          }
    ),
  };
}

export function appendEditorVariant(state: EditorState, clientKey: string): EditorState {
  return {
    ...state,
    variants: [
      ...state.variants,
      {
        id: undefined,
        clientKey,
        valueClientKeys: [],
        sku: null,
        active: true,
        nameOverride: null,
        descriptionLinesOverride: null,
        unitPriceCents: null,
        imageId: null,
      },
    ],
  };
}

export function applyEditorRemoval(state: EditorState, removal: PendingRemoval): EditorState {
  const affected = new Set(removal.affectedVariantClientKeys);
  return {
    ...state,
    options: state.options
      .filter((option) => removal.kind !== "option" || option.clientKey !== removal.optionClientKey)
      .map((option) =>
        option.clientKey !== removal.optionClientKey || removal.kind !== "value"
          ? option
          : {
              ...option,
              values: option.values.filter((value) => value.clientKey !== removal.valueClientKey),
            }
      ),
    variants: state.variants.filter((variant) => !affected.has(variant.clientKey)),
  };
}

export function DestructiveRemovalConfirmation({
  removal,
  confirmed,
  onConfirmedChange,
  onConfirm,
  onCancel,
}: {
  removal: PendingRemoval;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" aria-labelledby="destructive-title">
      <p id="destructive-title" className="font-medium">
        Confirmar remoção de “{removal.label}”
      </p>
      <p className="mt-1">
        Esta remoção também excluirá {removal.affectedVariantClientKeys.length}{" "}
        {removal.affectedVariantClientKeys.length === 1 ? "combinação" : "combinações"}. IDs existentes só serão removidos após salvar.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input id="confirm-destructive" type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
        <Label htmlFor="confirm-destructive">Entendo e quero remover o item e as combinações afetadas.</Label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="destructive" size="sm" disabled={!confirmed} onClick={onConfirm}>
          Confirmar remoção
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response("Not Found", { status: 404 });
  const item = await getCatalogFamilyDetail(id);
  if (!item) throw new Response("Not Found", { status: 404 });
  return json({ item, editorState: detailToEditorState(item) });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await requireAdmin(request);
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "Produto não encontrado" }, { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "save");

  if (intent === "archive" || intent === "restore") {
    const expectedUpdatedAt = String(form.get("expectedUpdatedAt") || "");
    if (!expectedUpdatedAt) return json({ error: "Dados inválidos" }, { status: 400 });
    const result =
      intent === "archive" ? await archiveCatalogFamily(id, expectedUpdatedAt) : await restoreCatalogFamily(id, expectedUpdatedAt);
    if (!result.ok) return catalogMutationErrorResponse(result);
    return json({ ok: true });
  }

  if (intent !== "save") return json({ error: "Ação inválida" }, { status: 400 });
  const parsed = parseCatalogAggregateJson(String(form.get("aggregate") || ""));
  if ("error" in parsed) return json({ error: parsed.error }, { status: 400 });
  if (parsed.id !== id) return json({ error: "Dados inválidos" }, { status: 400 });

  const result = await updateCatalogFamilyAggregate(parsed);
  if (!result.ok) return catalogMutationErrorResponse(result);
  return json({ ok: true });
};

function previewErrorMessage(error: string) {
  switch (error) {
    case "missing_option":
      return "Selecione um valor para cada opção.";
    case "duplicate_option":
      return "Cada opção só pode ter um valor selecionado.";
    case "unknown_value":
      return "Valor desconhecido na pré-visualização.";
    case "unknown_combination":
      return "Combinação não permitida.";
    case "invalid_template":
      return "Modelo de nome inválido.";
    default:
      return "Não foi possível pré-visualizar esta seleção.";
  }
}

function nullableNumber(raw: string) {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export default function AdminCatalogEditor() {
  const { item, editorState } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [state, setState] = useState<EditorState>(editorState);
  const [previewValueClientKeys, setPreviewValueClientKeys] = useState<string[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(item.Image?.thumbnail ?? item.Image?.location ?? null);
  const nextClientKey = useRef(1);

  useEffect(() => {
    setState(editorState);
    setPreviewValueClientKeys([]);
    setPendingRemoval(null);
    setConfirmDestructive(false);
    setImagePreview(item.Image?.thumbnail ?? item.Image?.location ?? null);
  }, [editorState, item.Image]);

  const aggregateJson = useMemo(() => JSON.stringify(state), [state]);
  const preview = useMemo(() => {
    if (!previewValueClientKeys.length) return null;
    const model = buildPreviewModel(state);
    const valueIds = previewValueClientKeys
      .map((clientKey) => model.valueIdByClientKey.get(clientKey))
      .filter((valueId): valueId is number => valueId !== undefined);
    return resolveCatalogSelection(model.family, valueIds);
  }, [previewValueClientKeys, state]);

  function makeClientKey(prefix: string) {
    const key = `${prefix}-new-${nextClientKey.current}`;
    nextClientKey.current += 1;
    return key;
  }

  function updateFamily(patch: Partial<EditorState["family"]>) {
    setState((current) => ({ ...current, family: { ...current.family, ...patch } }));
  }

  function updateOption(optionClientKey: string, patch: Partial<EditorOption>) {
    setState((current) => ({
      ...current,
      options: current.options.map((option) => (option.clientKey === optionClientKey ? { ...option, ...patch } : option)),
    }));
  }

  function updateValue(optionClientKey: string, valueClientKey: string, patch: Partial<EditorOption["values"][number]>) {
    setState((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.clientKey !== optionClientKey
          ? option
          : {
              ...option,
              values: option.values.map((value) => (value.clientKey === valueClientKey ? { ...value, ...patch } : value)),
            }
      ),
    }));
  }

  function updateVariant(variantClientKey: string, patch: Partial<EditorVariant>) {
    setState((current) => ({
      ...current,
      variants: current.variants.map((variant) => (variant.clientKey === variantClientKey ? { ...variant, ...patch } : variant)),
    }));
  }

  function addOption() {
    setState((current) => appendEditorOption(current, makeClientKey("option")));
  }

  function addValue(optionClientKey: string) {
    setState((current) => appendEditorValue(current, optionClientKey, makeClientKey("value")));
  }

  function removeWithConsequences(removal: PendingRemoval) {
    setState((current) => applyEditorRemoval(current, removal));
    setPreviewValueClientKeys((current) =>
      current.filter((clientKey) =>
        state.options
          .filter(
            (option) =>
              option.clientKey === removal.optionClientKey &&
              (removal.kind === "option" || option.values.some((value) => value.clientKey === removal.valueClientKey))
          )
          .flatMap((option) => option.values)
          .every((value) => value.clientKey !== clientKey)
      )
    );
    setPendingRemoval(null);
    setConfirmDestructive(false);
  }

  function requestOptionRemoval(option: EditorOption) {
    const valueKeys = new Set(option.values.map((value) => value.clientKey));
    const removal: PendingRemoval = {
      kind: "option",
      optionClientKey: option.clientKey,
      label: option.name || "Opção sem nome",
      affectedVariantClientKeys: state.variants
        .filter((variant) => variant.valueClientKeys.some((key) => valueKeys.has(key)))
        .map((variant) => variant.clientKey),
    };
    if (removal.affectedVariantClientKeys.length === 0) removeWithConsequences(removal);
    else setPendingRemoval(removal);
  }

  function requestValueRemoval(option: EditorOption, value: EditorOption["values"][number]) {
    const removal: PendingRemoval = {
      kind: "value",
      optionClientKey: option.clientKey,
      valueClientKey: value.clientKey,
      label: value.label || "Valor sem nome",
      affectedVariantClientKeys: state.variants
        .filter((variant) => variant.valueClientKeys.includes(value.clientKey))
        .map((variant) => variant.clientKey),
    };
    if (removal.affectedVariantClientKeys.length === 0) removeWithConsequences(removal);
    else setPendingRemoval(removal);
  }

  function addVariant() {
    setState((current) => appendEditorVariant(current, makeClientKey("variant")));
  }

  async function handleImageUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "catalog");
      const response = await fetch("/admin/uploads", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        id?: number;
        location?: string;
        thumbnail?: string | null;
        error?: string;
      };
      if (!response.ok || data.id == null) {
        setUploadError(data.error ?? "Falha no envio da imagem.");
        return;
      }
      updateFamily({ imageId: data.id });
      setImagePreview(data.thumbnail ?? data.location ?? null);
    } catch {
      setUploadError("Falha no envio da imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-grow flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>
          {" / "}
          <Link to="/admin/catalog" className="underline-offset-2 hover:underline">
            Catálogo
          </Link>
          {" / "}
          {item.name}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">{item.name}</h1>
      </div>

      {actionData && "error" in actionData ? (
        <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          <p>{actionData.error}</p>
          {"fields" in actionData && actionData.fields ? (
            <ul className="mt-1 list-disc pl-5">
              {Object.entries(actionData.fields).map(([field, message]) => (
                <li key={field}>{String(message)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {actionData && "ok" in actionData && actionData.ok ? (
        <p className="rounded border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">Alterações salvas.</p>
      ) : null}

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Produto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="family-name">Nome</Label>
            <Input id="family-name" value={state.family.name} onChange={(event) => updateFamily({ name: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="family-slug">Slug</Label>
            <Input id="family-slug" value={state.family.slug} onChange={(event) => updateFamily({ slug: event.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="family-template">Modelo do nome</Label>
          <Input
            id="family-template"
            value={state.family.nameTemplate ?? ""}
            onChange={(event) => updateFamily({ nameTemplate: event.target.value || null })}
            placeholder="{name} {capacidade}"
          />
        </div>
        <div>
          <Label htmlFor="family-description">Descrição base</Label>
          <textarea
            id="family-description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={state.family.descriptionLines.join("\n")}
            onChange={(event) =>
              updateFamily({
                descriptionLines: event.target.value
                  .split(/\n/)
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="family-price">Preço padrão</Label>
            <Input
              id="family-price"
              value={
                state.family.defaultUnitPriceCents != null ? formatBRL(state.family.defaultUnitPriceCents).replace("R$", "").trim() : ""
              }
              onChange={(event) => updateFamily({ defaultUnitPriceCents: parseBRLToCents(event.target.value) })}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label htmlFor="catalog-base-image">Imagem base</Label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={`Imagem de ${state.family.name}`}
                  className="h-20 w-20 rounded border border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-border text-center text-xs text-muted-foreground">
                  Sem imagem
                </div>
              )}
              <div className="grid gap-2">
                <FileButton id="catalog-base-image" disabled={uploading} busy={uploading} onFile={(file) => void handleImageUpload(file)} />
                {state.family.imageId != null ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateFamily({ imageId: null });
                      setImagePreview(null);
                    }}
                  >
                    Remover imagem
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              O envio prepara a imagem; clique em Salvar alterações para associá-la ao produto.
            </p>
            {uploadError ? (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Opções e valores</h2>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            Adicionar opção
          </Button>
        </div>
        {state.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eixos de opção. Adicione um para configurar valores.</p>
        ) : null}
        {state.options.map((option) => (
          <div key={option.clientKey} className="grid gap-3 rounded border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Eixo de opção</p>
              <Button type="button" variant="outline" size="sm" onClick={() => requestOptionRemoval(option)}>
                Remover opção
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor={`option-name-${option.clientKey}`}>Opção</Label>
                <Input
                  id={`option-name-${option.clientKey}`}
                  value={option.name}
                  onChange={(event) => updateOption(option.clientKey, { name: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`option-slug-${option.clientKey}`}>Slug</Label>
                <Input
                  id={`option-slug-${option.clientKey}`}
                  value={option.slug}
                  onChange={(event) => updateOption(option.clientKey, { slug: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`option-placement-${option.clientKey}`}>Posição</Label>
                <select
                  id={`option-placement-${option.clientKey}`}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={option.placement}
                  onChange={(event) =>
                    updateOption(option.clientKey, { placement: event.target.value === "DESCRIPTION" ? "DESCRIPTION" : "TITLE" })
                  }
                >
                  <option value="TITLE">Título</option>
                  <option value="DESCRIPTION">Descrição</option>
                </select>
              </div>
              <div>
                <Label htmlFor={`option-order-${option.clientKey}`}>Ordem</Label>
                <Input
                  id={`option-order-${option.clientKey}`}
                  type="number"
                  value={option.sortOrder}
                  onChange={(event) => updateOption(option.clientKey, { sortOrder: nullableNumber(event.target.value) ?? 0 })}
                />
              </div>
            </div>
            <ul className="grid gap-2">
              {option.values.map((value) => (
                <li key={value.clientKey} className="grid gap-2 rounded border border-dashed border-border p-2">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => requestValueRemoval(option, value)}>
                      Remover valor
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label htmlFor={`value-label-${value.clientKey}`}>Valor</Label>
                      <Input
                        id={`value-label-${value.clientKey}`}
                        value={value.label}
                        onChange={(event) => updateValue(option.clientKey, value.clientKey, { label: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`value-slug-${value.clientKey}`}>Slug</Label>
                      <Input
                        id={`value-slug-${value.clientKey}`}
                        value={value.slug}
                        onChange={(event) => updateValue(option.clientKey, value.clientKey, { slug: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`value-order-${value.clientKey}`}>Ordem</Label>
                      <Input
                        id={`value-order-${value.clientKey}`}
                        type="number"
                        value={value.sortOrder}
                        onChange={(event) =>
                          updateValue(option.clientKey, value.clientKey, { sortOrder: nullableNumber(event.target.value) ?? 0 })
                        }
                      />
                    </div>
                  </div>
                  {option.placement === "TITLE" ? (
                    <div>
                      <Label htmlFor={`value-fragment-${value.clientKey}`}>Fragmento do título</Label>
                      <Input
                        id={`value-fragment-${value.clientKey}`}
                        value={value.titleFragment ?? ""}
                        onChange={(event) => updateValue(option.clientKey, value.clientKey, { titleFragment: event.target.value || null })}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor={`value-description-${value.clientKey}`}>Bullets da descrição</Label>
                      <textarea
                        id={`value-description-${value.clientKey}`}
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={value.descriptionLines.join("\n")}
                        onChange={(event) =>
                          updateValue(option.clientKey, value.clientKey, {
                            descriptionLines: event.target.value
                              .split(/\n/)
                              .map((line) => line.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => addValue(option.clientKey)}>
              Adicionar valor
            </Button>
          </div>
        ))}
      </section>

      {pendingRemoval ? (
        <DestructiveRemovalConfirmation
          removal={pendingRemoval}
          confirmed={confirmDestructive}
          onConfirmedChange={setConfirmDestructive}
          onConfirm={() => removeWithConsequences(pendingRemoval)}
          onCancel={() => {
            setPendingRemoval(null);
            setConfirmDestructive(false);
          }}
        />
      ) : null}

      <section className="grid gap-3 border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Combinações</h2>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            Adicionar combinação
          </Button>
        </div>
        {state.variants.length === 0 ? <p className="text-sm text-muted-foreground">Sem combinações explícitas.</p> : null}
        <ul className="grid gap-3">
          {state.variants.map((variant, variantIndex) => (
            <li key={variant.clientKey} className="grid gap-3 rounded border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Combinação {variantIndex + 1}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      variants: current.variants.filter((entry) => entry.clientKey !== variant.clientKey),
                    }))
                  }
                >
                  Remover combinação
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {state.options.map((option) => (
                  <div key={`${variant.clientKey}-${option.clientKey}`}>
                    <Label htmlFor={`variant-${variant.clientKey}-${option.clientKey}`}>{option.name || "Opção"}</Label>
                    <select
                      id={`variant-${variant.clientKey}-${option.clientKey}`}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={variant.valueClientKeys.find((key) => option.values.some((value) => value.clientKey === key)) ?? ""}
                      onChange={(event) => {
                        const optionKeys = new Set(option.values.map((value) => value.clientKey));
                        const retained = variant.valueClientKeys.filter((key) => !optionKeys.has(key));
                        updateVariant(variant.clientKey, {
                          valueClientKeys: event.target.value ? [...retained, event.target.value] : retained,
                        });
                      }}
                    >
                      <option value="">Selecione</option>
                      {option.values.map((value) => (
                        <option key={value.clientKey} value={value.clientKey}>
                          {value.label || "Valor sem nome"}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label htmlFor={`variant-sku-${variant.clientKey}`}>SKU</Label>
                  <Input
                    id={`variant-sku-${variant.clientKey}`}
                    value={variant.sku ?? ""}
                    onChange={(event) => updateVariant(variant.clientKey, { sku: event.target.value || null })}
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-price-${variant.clientKey}`}>Preço específico</Label>
                  <Input
                    id={`variant-price-${variant.clientKey}`}
                    value={variant.unitPriceCents != null ? formatBRL(variant.unitPriceCents).replace("R$", "").trim() : ""}
                    onChange={(event) => updateVariant(variant.clientKey, { unitPriceCents: parseBRLToCents(event.target.value) })}
                    placeholder="Usar preço padrão"
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-image-${variant.clientKey}`}>ID da imagem</Label>
                  <Input
                    id={`variant-image-${variant.clientKey}`}
                    type="number"
                    value={variant.imageId ?? ""}
                    onChange={(event) => updateVariant(variant.clientKey, { imageId: nullableNumber(event.target.value) })}
                    placeholder="Usar imagem base"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`variant-name-${variant.clientKey}`}>Nome específico</Label>
                <Input
                  id={`variant-name-${variant.clientKey}`}
                  value={variant.nameOverride ?? ""}
                  onChange={(event) => updateVariant(variant.clientKey, { nameOverride: event.target.value || null })}
                  placeholder="Usar nome composto"
                />
              </div>
              <div>
                <Label htmlFor={`variant-description-${variant.clientKey}`}>Descrição específica</Label>
                <textarea
                  id={`variant-description-${variant.clientKey}`}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(variant.descriptionLinesOverride ?? []).join("\n")}
                  onChange={(event) =>
                    updateVariant(variant.clientKey, {
                      descriptionLinesOverride: event.target.value.trim()
                        ? event.target.value
                            .split(/\n/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                        : null,
                    })
                  }
                  placeholder="Usar descrição composta"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`variant-active-${variant.clientKey}`}
                  type="checkbox"
                  checked={variant.active}
                  onChange={(event) => updateVariant(variant.clientKey, { active: event.target.checked })}
                />
                <Label htmlFor={`variant-active-${variant.clientKey}`}>Combinação ativa</Label>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">A chave da combinação é calculada no servidor a partir dos valores selecionados.</p>
      </section>

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Aliases e proveniência</h2>
        {item.aliases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem aliases registrados.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {item.aliases.map((alias) => (
              <li key={alias.id} className="rounded border border-border px-3 py-2">
                {alias.originalName} ({alias.sourceSlug})
              </li>
            ))}
          </ul>
        )}
        {item.sourceMaps.length > 0 || item.canonicalMaps.length > 0 ? (
          <div className="grid gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              Este produto participa de uma normalização. Alterações posteriores podem tornar a reversão insegura; consulte a execução antes
              de editar.
            </p>
            {item.sourceMaps.map((sourceMap) => (
              <p key={`source-${sourceMap.id}`}>
                Origem da normalização:{" "}
                <Link className="underline" to={`/admin/catalog/normalization/${sourceMap.runId}`}>
                  execução #{sourceMap.runId}
                </Link>
              </p>
            ))}
            {item.canonicalMaps.map((canonicalMap) => (
              <p key={`canonical-${canonicalMap.id}`}>
                Família canônica da{" "}
                <Link className="underline" to={`/admin/catalog/normalization/${canonicalMap.runId}`}>
                  execução #{canonicalMap.runId}
                </Link>
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Pré-visualização ao vivo</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {state.options.map((option) => (
            <div key={`preview-${option.clientKey}`}>
              <Label htmlFor={`preview-${option.clientKey}`}>{option.name || "Opção"}</Label>
              <select
                id={`preview-${option.clientKey}`}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={previewValueClientKeys.find((key) => option.values.some((value) => value.clientKey === key)) ?? ""}
                onChange={(event) => {
                  const optionKeys = new Set(option.values.map((value) => value.clientKey));
                  setPreviewValueClientKeys((current) => {
                    const retained = current.filter((key) => !optionKeys.has(key));
                    return event.target.value ? [...retained, event.target.value] : retained;
                  });
                }}
              >
                <option value="">Selecione</option>
                {option.values.map((value) => (
                  <option key={value.clientKey} value={value.clientKey}>
                    {value.label || "Valor sem nome"}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {preview ? (
          preview.ok ? (
            <div className="rounded border border-border p-3 text-sm" aria-live="polite">
              <p className="font-medium">{preview.value.name}</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {preview.value.descriptionLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">
                {preview.value.unitPriceCents != null ? formatBRL(preview.value.unitPriceCents) : "sem preço"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive" aria-live="polite">
              {previewErrorMessage(preview.error)}
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Escolha valores, inclusive os ainda não salvos, para pré-visualizar o orçamento.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Form method="post">
          <input type="hidden" name="intent" value="save" />
          <input type="hidden" name="aggregate" value={aggregateJson} />
          <Button type="submit" disabled={pendingRemoval != null}>
            Salvar alterações
          </Button>
        </Form>
        <Form method="post">
          <input type="hidden" name="expectedUpdatedAt" value={state.expectedUpdatedAt} />
          <Button name="intent" value={item.archivedAt ? "restore" : "archive"} variant="outline" type="submit">
            {item.archivedAt ? "Restaurar" : "Arquivar"}
          </Button>
        </Form>
      </div>
    </main>
  );
}
