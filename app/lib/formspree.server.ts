export const FORM_KINDS = ["contact", "calculator"] as const;

export type FormKind = (typeof FORM_KINDS)[number];

const FORMSPREE_ENDPOINTS: Record<FormKind, string> = {
  contact: "https://formspree.io/f/xzdnladq",
  calculator: "https://formspree.io/f/xgogjlaw",
};

export function isFormKind(value: string): value is FormKind {
  return (FORM_KINDS as readonly string[]).includes(value);
}

export async function submitToFormspree(
  form: FormKind,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const response = await fetch(FORMSPREE_ENDPOINTS[form], {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return { ok: true, status: response.status };
  }

  let error = "Falha ao enviar o formulário.";
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) error = data.error;
  } catch {
    // ignore non-JSON error bodies
  }

  return { ok: false, status: response.status, error };
}
