import { expect, test } from "vitest";

import {
  beginRevisionSave,
  completeRevisionSave,
  initialRevisionState,
  markRevisionEdited,
} from "./quotation-revision";

test("a stale save completion preserves a newer edit's dirty state", () => {
  let state = markRevisionEdited(initialRevisionState());
  const begun = beginRevisionSave(state);
  state = markRevisionEdited(begun.state);

  const completed = completeRevisionSave(state, { ok: true, revision: begun.requestRevision });

  expect(completed.effect).toEqual({ type: "dirty-preserved" });
  expect(completed.state.dirty).toBe(true);
  expect(completed.state.draftRevision).toBe(2);
});

test("a matching revision clears dirty state", () => {
  const begun = beginRevisionSave(markRevisionEdited(initialRevisionState()));
  const completed = completeRevisionSave(begun.state, { ok: true, revision: begun.requestRevision });

  expect(completed.effect).toEqual({ type: "saved" });
  expect(completed.state.dirty).toBe(false);
});

test("save-and-print emits one navigation effect for one completion", () => {
  const begun = beginRevisionSave(markRevisionEdited(initialRevisionState()));
  const response = {
    ok: true,
    revision: begun.requestRevision,
    redirectTo: "/admin/quotations/42/print?autoprint=1",
  };
  const first = completeRevisionSave(begun.state, response);
  const duplicate = completeRevisionSave(first.state, response);

  expect(first.effect).toEqual({ type: "navigate", to: response.redirectTo });
  expect(duplicate.effect).toEqual({ type: "ignored" });
});
