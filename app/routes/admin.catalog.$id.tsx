import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import {
  archiveCatalogFamily,
  getCatalogFamilyDetail,
  restoreCatalogFamily,
  updateCatalogFamilyAggregate,
} from "~/models/catalog.server";
import {
  catalogMutationErrorResponse,
  parseCatalogAggregateJson,
  toCatalogFamilyInput,
  toStringArray,
} from "~/utils/catalog-admin";
import { resolveCatalogSelection, type CatalogFamilyInput } from "~/utils/catalog-resolver";
import { formatBRL, parseBRLToCents } from "~/utils/quotation";
import { requireAdmin } from "~/utils/require-admin.server";

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  buildNoIndexMeta(data ? `${data.item.name} | Catálogo | ${SITE_NAME}` : `Catálogo | ${SITE_NAME}`);

type EditorOption = {
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

type EditorVariant = {
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

type EditorState = {
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

function detailToEditorState(item: NonNullable<Awaited<ReturnType<typeof getCatalogFamilyDetail>>>) {
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
      descriptionLinesOverride: variant.descriptionLinesOverride
        ? toStringArray(variant.descriptionLinesOverride)
        : null,
      unitPriceCents: variant.unitPriceCents,
      imageId: variant.imageId,
    })),
  };
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
      intent === "archive"
        ? await archiveCatalogFamily(id, expectedUpdatedAt)
        : await restoreCatalogFamily(id, expectedUpdatedAt);
    if (!result.ok) return catalogMutationErrorResponse(result);
    return json({ ok: true });
  }

  const aggregateRaw = String(form.get("aggregate") || "");
  const parsed = parseCatalogAggregateJson(aggregateRaw);
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

export default function AdminCatalogEditor() {
  const { item, editorState } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [state, setState] = useState<EditorState>(editorState);
  const [previewValueIds, setPreviewValueIds] = useState<number[]>([]);
  const [confirmDestructive, setConfirmDestructive] = useState(false);

  const aggregateJson = useMemo(() => JSON.stringify(state), [state]);

  const preview = useMemo(() => {
    if (!previewValueIds.length) return null;
    const family: CatalogFamilyInput = {
      id: item.id,
      slug: state.family.slug,
      name: state.family.name,
      nameTemplate: state.family.nameTemplate,
      descriptionLines: state.family.descriptionLines,
      defaultUnitPriceCents: state.family.defaultUnitPriceCents,
      imageId: state.family.imageId,
      options: state.options.map((option, optionIndex) => ({
        id: option.id ?? -(optionIndex + 1),
        name: option.name,
        slug: option.slug,
        placement: option.placement,
        sortOrder: option.sortOrder,
        values: option.values.map((value, valueIndex) => ({
          id: value.id ?? -(valueIndex + 1),
          label: value.label,
          slug: value.slug,
          titleFragment: value.titleFragment,
          descriptionLines: value.descriptionLines,
          sortOrder: value.sortOrder,
        })),
      })),
      variants: state.variants.map((variant, variantIndex) => ({
        id: variant.id ?? -(variantIndex + 1),
        key: variant.valueClientKeys
          .map((clientKey) => {
            const value = state.options
              .flatMap((option) => option.values)
              .find((entry) => entry.clientKey === clientKey);
            return value?.id ?? 0;
          })
          .sort((a, b) => a - b)
          .join("|"),
        active: variant.active,
        valueIds: variant.valueClientKeys
          .map((clientKey) => {
            const value = state.options
              .flatMap((option) => option.values)
              .find((entry) => entry.clientKey === clientKey);
            return value?.id ?? 0;
          })
          .filter((id) => id > 0),
        nameOverride: variant.nameOverride,
        descriptionLinesOverride: variant.descriptionLinesOverride,
        unitPriceCents: variant.unitPriceCents,
        imageId: variant.imageId,
      })),
    };
    return resolveCatalogSelection(family, previewValueIds);
  }, [item.id, previewValueIds, state]);

  const removedValueLabels = useMemo(() => {
    const originalValueIds = new Set(
      editorState.options.flatMap((option) => option.values.filter((value) => value.id).map((value) => value.id!)),
    );
    const submittedValueIds = new Set(
      state.options.flatMap((option) => option.values.filter((value) => value.id).map((value) => value.id!)),
    );
    const removedIds = [...originalValueIds].filter((valueId) => !submittedValueIds.has(valueId));
    const retainedVariantIds = new Set(state.variants.filter((variant) => variant.id).map((variant) => variant.id!));
    const affected = editorState.variants
      .filter((variant) => variant.id && retainedVariantIds.has(variant.id))
      .filter((variant) =>
        variant.valueClientKeys.some((clientKey) => {
          const value = editorState.options.flatMap((option) => option.values).find((entry) => entry.clientKey === clientKey);
          return value?.id && removedIds.includes(value.id);
        }),
      );
    return affected.map((variant) => variant.clientKey);
  }, [editorState, state]);

  function updateFamily(patch: Partial<typeof state.family>) {
    setState((current) => ({ ...current, family: { ...current.family, ...patch } }));
  }

  function updateOption(optionIndex: number, patch: Partial<EditorOption>) {
    setState((current) => ({
      ...current,
      options: current.options.map((option, index) => (index === optionIndex ? { ...option, ...patch } : option)),
    }));
  }

  function updateValue(optionIndex: number, valueIndex: number, patch: Partial<EditorOption["values"][number]>) {
    setState((current) => ({
      ...current,
      options: current.options.map((option, index) =>
        index !== optionIndex
          ? option
          : {
              ...option,
              values: option.values.map((value, vIndex) => (vIndex === valueIndex ? { ...value, ...patch } : value)),
            },
      ),
    }));
  }

  function removeVariant(clientKey: string) {
    setState((current) => ({
      ...current,
      variants: current.variants.filter((variant) => variant.clientKey !== clientKey),
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-grow flex-col gap-8 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/admin" className="underline-offset-2 hover:underline">
            Admin
          </Link>{" "}
          /{" "}
          <Link to="/admin/catalog" className="underline-offset-2 hover:underline">
            Catálogo
          </Link>{" "}
          / {item.name}
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">{item.name}</h1>
      </div>

      {actionData && "error" in actionData ? (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionData.error}
          {"fields" in actionData && actionData.fields
            ? ` ${Object.values(actionData.fields).join(" ")}`
            : null}
        </p>
      ) : null}

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Produto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="family-name">Nome</Label>
            <Input
              id="family-name"
              value={state.family.name}
              onChange={(event) => updateFamily({ name: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="family-slug">Slug</Label>
            <Input
              id="family-slug"
              value={state.family.slug}
              onChange={(event) => updateFamily({ slug: event.target.value })}
            />
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
        <div>
          <Label htmlFor="family-price">Preço padrão</Label>
          <Input
            id="family-price"
            value={
              state.family.defaultUnitPriceCents != null
                ? formatBRL(state.family.defaultUnitPriceCents).replace("R$", "").trim()
                : ""
            }
            onChange={(event) =>
              updateFamily({ defaultUnitPriceCents: parseBRLToCents(event.target.value) })
            }
            placeholder="0,00"
          />
        </div>
      </section>

      <section className="grid gap-4 border border-border p-4">
        <h2 className="text-lg font-semibold">Opções e valores</h2>
        {state.options.map((option, optionIndex) => (
          <div key={option.clientKey} className="grid gap-3 rounded border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`option-name-${option.clientKey}`}>Opção</Label>
                <Input
                  id={`option-name-${option.clientKey}`}
                  value={option.name}
                  onChange={(event) => updateOption(optionIndex, { name: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`option-slug-${option.clientKey}`}>Slug</Label>
                <Input
                  id={`option-slug-${option.clientKey}`}
                  value={option.slug}
                  onChange={(event) => updateOption(optionIndex, { slug: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`option-placement-${option.clientKey}`}>Posição</Label>
                <select
                  id={`option-placement-${option.clientKey}`}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={option.placement}
                  onChange={(event) =>
                    updateOption(optionIndex, {
                      placement: event.target.value === "DESCRIPTION" ? "DESCRIPTION" : "TITLE",
                    })
                  }
                >
                  <option value="TITLE">Título</option>
                  <option value="DESCRIPTION">Descrição</option>
                </select>
              </div>
            </div>
            <ul className="grid gap-2">
              {option.values.map((value, valueIndex) => (
                <li key={value.clientKey} className="grid gap-2 rounded border border-dashed border-border p-2">
                  <div className="grid gap--2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`value-label-${value.clientKey}`}>Valor</Label>
                      <Input
                        id={`value-label-${value.clientKey}`}
                        value={value.label}
                        onChange={(event) => updateValue(optionIndex, valueIndex, { label: event.target.value })}
                      />
                    </div>
                    {option.placement === "TITLE" ? (
                      <div>
                        <Label htmlFor={`value-fragment-${value.clientKey}`}>Fragmento do título</Label>
                        <Input
                          id={`value-fragment-${value.clientKey}`}
                          value={value.titleFragment ?? ""}
                          onChange={(event) =>
                            updateValue(optionIndex, valueIndex, {
                              titleFragment: event.target.value || null,
                            })
                          }
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
                            updateValue(optionIndex, valueIndex, {
                              descriptionLines: event.target.value
                                .split(/\n/)
                                .map((line) => line.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Combinações</h2>
        {state.variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem combinações explícitas.</p>
        ) : (
          <ul className="grid gap-2">
            {state.variants.map((variant) => (
              <li key={variant.clientKey} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2 text-sm">
                <span>{variant.valueClientKeys.join(" · ")}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => removeVariant(variant.clientKey)}>
                  Remover combinação
                </Button>
              </li>
            ))}
          </ul>
        )}
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
          <div className="grid gap-2 text-sm text-muted-foreground">
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
                Família canônica da execução{" "}
                <Link className="underline" to={`/admin/catalog/normalization/${canonicalMap.runId}`}>
                  #{canonicalMap.runId}
                </Link>
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 border border-border p-4">
        <h2 className="text-lg font-semibold">Pré-visualização</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {state.options.map((option) => (
            <div key={`preview-${option.clientKey}`}>
              <Label htmlFor={`preview-${option.clientKey}`}>{option.name}</Label>
              <select
                id={`preview-${option.clientKey}`}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={previewValueIds.find((valueId) =>
                  option.values.some((value) => value.id === valueId),
                ) ?? ""}
                onChange={(event) => {
                  const nextId = Number(event.target.value);
                  setPreviewValueIds((current) => {
                    const withoutOption = current.filter(
                      (valueId) => !option.values.some((value) => value.id === valueId),
                    );
                    return Number.isFinite(nextId) ? [...withoutOption, nextId] : withoutOption;
                  });
                }}
              >
                <option value="">Selecione</option>
                {option.values
                  .filter((value) => value.id)
                  .map((value) => (
                    <option key={value.clientKey} value={value.id}>
                      {value.label}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>
        {preview ? (
          preview.ok ? (
            <div className="rounded border border-border p-3 text-sm">
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
            <p className="text-sm text-destructive">{previewErrorMessage(preview.error)}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Escolha valores para pré-visualizar o orçamento.</p>
        )}
      </section>

      {removedValueLabels.length > 0 ? (
        <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Alterações destrutivas pendentes</p>
          <p className="mt-1">
            Valores removidos ainda são usados por combinações mantidas ({removedValueLabels.join(", ")}). Remova as
            combinações ou confirme antes de salvar.
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmDestructive}
              onChange={(event) => setConfirmDestructive(event.target.checked)}
            />
            Confirmo que entendo o impacto destas remoções.
          </label>
        </section>
      ) : null}

      <Form method="post" className="flex flex-wrap gap-2">
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="aggregate" value={aggregateJson} />
        <Button type="submit" disabled={removedValueLabels.length > 0 && !confirmDestructive}>
          Salvar alterações
        </Button>
        {item.archivedAt ? (
          <Button formMethod="post" name="intent" value="restore" variant="outline" type="submit">
            <input type="hidden" name="expectedUpdatedAt" value={state.expectedUpdatedAt} />
            Restaurar
          </Button>
        ) : (
          <Button formMethod="post" name="intent" value="archive" variant="outline" type="submit">
            <input type="hidden" name="expectedUpdatedAt" value={state.expectedUpdatedAt} />
            Arquivar
          </Button>
        )}
      </Form>
    </main>
  );
}
