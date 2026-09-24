import { useRef, useState, type ChangeEvent, type ComponentProps } from "react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useIsomorphicLayoutEffect } from "~/lib/use-isomorphic-layout-effect";

import { caretAfterTaxIdChars, compactTaxId, formatTaxId, taxIdLabel } from "./tax-id";

type TaxIdInputProps = Omit<ComponentProps<"input">, "onChange" | "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  optional?: boolean;
};

/** A CPF/CNPJ input that punctuates as the user types and keeps the caret in place. Its label follows the kind typed. */
export function TaxIdInput({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  optional = true,
  className,
  ...props
}: TaxIdInputProps) {
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(() => formatTaxId(defaultValue));
  const shown = formatTaxId(isControlled ? value : inner);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const node = inputRef.current;
    const caret = caretRef.current;
    if (!node || caret == null) return;
    node.setSelectionRange(caret, caret);
    caretRef.current = null;
  }, [shown]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const node = event.target;
    const caret = node.selectionStart ?? node.value.length;
    const charsBefore = compactTaxId(node.value.slice(0, caret)).length;
    const next = formatTaxId(node.value);
    caretRef.current = caretAfterTaxIdChars(next, charsBefore);
    if (!isControlled) setInner(next);
    onValueChange?.(next);
  }

  const label = taxIdLabel(shown);
  const inputId = id ?? name ?? "tax-id";

  return (
    <div className={className}>
      <Label htmlFor={inputId}>
        {label}
        {optional ? " (opcional)" : ""}
      </Label>
      <Input
        {...props}
        ref={inputRef}
        id={inputId}
        name={name}
        value={shown}
        onChange={handleChange}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="CPF ou CNPJ"
      />
    </div>
  );
}
