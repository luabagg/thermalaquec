export type SaveCompletion = {
  ok: boolean;
  revision: number;
  redirectTo?: string;
  error?: string;
};

export type RevisionState = {
  draftRevision: number;
  nextRequestRevision: number;
  pending: { requestRevision: number; draftRevision: number } | null;
  handledRequestRevision: number;
  dirty: boolean;
};

export type CompletionEffect =
  | { type: "ignored" }
  | { type: "dirty-preserved" }
  | { type: "error"; message: string }
  | { type: "saved" }
  | { type: "navigate"; to: string };

export function initialRevisionState(): RevisionState {
  return {
    draftRevision: 0,
    nextRequestRevision: 0,
    pending: null,
    handledRequestRevision: 0,
    dirty: false,
  };
}

export function markRevisionEdited(state: RevisionState): RevisionState {
  return { ...state, draftRevision: state.draftRevision + 1, dirty: true };
}

export function beginRevisionSave(state: RevisionState): { state: RevisionState; requestRevision: number } {
  const requestRevision = state.nextRequestRevision + 1;
  return {
    requestRevision,
    state: {
      ...state,
      nextRequestRevision: requestRevision,
      pending: { requestRevision, draftRevision: state.draftRevision },
    },
  };
}

export function completeRevisionSave(
  state: RevisionState,
  completion: SaveCompletion,
): { state: RevisionState; effect: CompletionEffect } {
  const pending = state.pending;
  if (
    !pending ||
    completion.revision !== pending.requestRevision ||
    state.handledRequestRevision === completion.revision
  ) {
    return { state, effect: { type: "ignored" } };
  }

  const completedState = {
    ...state,
    pending: null,
    handledRequestRevision: completion.revision,
  };
  if (state.draftRevision !== pending.draftRevision) {
    return { state: completedState, effect: { type: "dirty-preserved" } };
  }
  if (!completion.ok) {
    return {
      state: completedState,
      effect: { type: "error", message: completion.error ?? "Falha ao salvar" },
    };
  }

  const savedState = { ...completedState, dirty: false };
  return completion.redirectTo
    ? { state: savedState, effect: { type: "navigate", to: completion.redirectTo } }
    : { state: savedState, effect: { type: "saved" } };
}
