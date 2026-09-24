import { Link, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";

import { ClientFormFields } from "~/components/admin/ClientFormFields";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import type { action as clientAction } from "~/routes/admin.clients_.$id";
import { formatCityState, formatClientAddress, formatPhone, formatTaxId, type ClientInput } from "~/utils/client";

import { QUOTATION_FIELD } from "../quotation-form";

type Props = {
  clients: (ClientInput & { id: number })[];
  clientId: number;
  onClientChange(clientId: number): void;
};

/** Picks the quotation's client, and edits that client's record in a dialog without leaving the editor. */
export function QuotationClientField({ clients, clientId, onClientChange }: Props) {
  const client = clients.find((candidate) => candidate.id === clientId);
  const [editing, setEditing] = useState(false);
  const fetcher = useFetcher<typeof clientAction>();
  const saved = fetcher.state === "idle" && fetcher.data !== undefined && "saved" in fetcher.data;

  useEffect(() => {
    if (saved) setEditing(false);
  }, [saved]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="clientId">Cliente</Label>
      <select
        id="clientId"
        name={QUOTATION_FIELD.clientId}
        value={clientId}
        onChange={(event) => onClientChange(Number(event.target.value))}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {clients.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} · {formatCityState(option)}
          </option>
        ))}
      </select>
      {client ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
          <div className="min-w-0 text-muted-foreground">
            <p>{formatClientAddress(client)}</p>
            <p>{[client.document ? formatTaxId(client.document) : null, client.phone ? formatPhone(client.phone) : null, client.email].filter(Boolean).join(" · ")}</p>
          </div>
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar cliente</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">As alterações valem para todos os orçamentos deste cliente.</p>
              <fetcher.Form method="post" action={`/admin/clients/${client.id}`} className="grid gap-4" key={client.id}>
                <ClientFormFields
                  idPrefix="editor-client"
                  defaultValues={client}
                  fieldErrors={fetcher.data && "fieldErrors" in fetcher.data ? fetcher.data.fieldErrors : undefined}
                />
                <div className="flex gap-2">
                  <Button type="submit" name="intent" value="update" disabled={fetcher.state !== "idle"}>
                    {fetcher.state !== "idle" ? "Salvando…" : "Salvar cliente"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </fetcher.Form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Cliente novo?{" "}
        <Link to="/admin/clients" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Cadastre em Clientes
        </Link>{" "}
        e recarregue esta página.
      </p>
    </div>
  );
}
