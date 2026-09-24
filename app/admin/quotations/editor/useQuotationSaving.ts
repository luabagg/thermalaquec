import { useFetcher, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  beginRevisionSave,
  completeRevisionSave,
  initialRevisionState,
  markRevisionEdited,
  type SaveResponse,
} from "./save-revisions";

export type SaveIntent = "save" | "save-print" | "autosave";

const AUTOSAVE_EVERY_MS = 2 * 60 * 1000;

type Options = {
  /** Autosave runs only while this is true and the draft has unsaved edits. */
  autosave: boolean;
  /** A save waits while an image upload runs, so the form it submits holds the uploaded image. */
  blocked: boolean;
};

/**
 * Submits the editor form and applies the answer. Call `markEdited` after each committed draft change:
 * the form is read from the DOM, so a save must never start between an edit and its render.
 */
export function useQuotationSaving(formRef: RefObject<HTMLFormElement>, { autosave, blocked }: Options) {
  const navigate = useNavigate();
  const fetcher = useFetcher<SaveResponse>();
  const fetcherRef = useRef(fetcher);
  const blockedRef = useRef(blocked);
  const revisionsRef = useRef(initialRevisionState());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  fetcherRef.current = fetcher;
  blockedRef.current = blocked;

  const markEdited = useCallback(() => {
    revisionsRef.current = markRevisionEdited(revisionsRef.current);
    setSaveError(null);
    setSavedHint(null);
  }, []);

  const save = useCallback(
    (intent: SaveIntent) => {
      const form = formRef.current;
      const saver = fetcherRef.current;
      if (!form || saver.state !== "idle" || blockedRef.current) return;
      const begun = beginRevisionSave(revisionsRef.current);
      revisionsRef.current = begun.state;
      const body = new FormData(form);
      body.set("intent", intent);
      body.set("revision", String(begun.requestRevision));
      saver.submit(body, { method: "post" });
      setSaveError(null);
    },
    [formRef],
  );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const completion = completeRevisionSave(revisionsRef.current, fetcher.data);
    revisionsRef.current = completion.state;
    const effect = completion.effect;
    if (effect.type === "error") setSaveError(effect.message);
    if (effect.type === "navigate") navigate(effect.to);
    if (effect.type === "saved") {
      setSavedHint(`Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
    }
  }, [navigate, fetcher.data, fetcher.state]);

  useEffect(() => {
    if (!autosave) return;
    const id = window.setInterval(() => {
      if (revisionsRef.current.dirty) save("autosave");
    }, AUTOSAVE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [autosave, save]);

  return { save, markEdited, saving: fetcher.state !== "idle", saveError, savedHint };
}
