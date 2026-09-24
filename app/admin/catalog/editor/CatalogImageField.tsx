import { Button } from "~/components/ui/button";
import { FileButton } from "~/components/ui/file-button";
import { cn } from "~/lib/utils";

type CatalogImageFieldProps = {
  inputId: string;
  previewUrl: string | null;
  /** Shown only when the field holds an image of its own. */
  clearLabel: string | null;
  uploading: boolean;
  previewClassName: string;
  onFile(file: File): void;
  onClear(): void;
};

/** The image of a product or a variant: a preview, a file button and a button that clears the image. */
export function CatalogImageField({ inputId, previewUrl, clearLabel, uploading, previewClassName, onFile, onClear }: CatalogImageFieldProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {previewUrl ? <img src={previewUrl} alt="" className={cn("rounded border border-border object-cover", previewClassName)} /> : null}
      <FileButton id={inputId} disabled={uploading} busy={uploading} onFile={onFile} />
      {clearLabel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}
