import { useId, useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type FileButtonProps = {
  id?: string;
  accept?: string;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  busyLabel?: string;
  className?: string;
  onFile: (file: File) => void;
};

export function FileButton({
  id,
  accept = "image/*",
  disabled,
  busy,
  label = "Escolher imagem",
  busyLabel = "Enviando…",
  className,
  onFile,
}: FileButtonProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus />
        {busy ? busyLabel : label}
      </Button>
    </div>
  );
}
