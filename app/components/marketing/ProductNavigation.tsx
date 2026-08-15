import { List } from "lucide-react";
import { type MouseEvent, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { productsData } from "~/data/products";

export const ProductNavigation = () => {
  const [open, setOpen] = useState(false);
  const pendingProduct = useRef<string | null>(null);

  const scrollToProduct = (slug: string) => {
    const hash = `#${slug}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }

    document
      .getElementById(slug)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMobileProductSelect = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    event.preventDefault();
    pendingProduct.current = slug;
    setOpen(false);
  };

  const handleDesktopProductSelect = (
    event: MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    event.preventDefault();
    scrollToProduct(slug);
  };

  const handleCloseAutoFocus = (event: Event) => {
    const slug = pendingProduct.current;
    if (!slug) return;

    event.preventDefault();
    pendingProduct.current = null;
    requestAnimationFrame(() => scrollToProduct(slug));
  };

  return (
    <>
      <div className="mb-6 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              Todos os produtos
              <List className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[82%] max-w-xs overflow-y-auto"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <SheetHeader>
              <SheetTitle className="font-display text-xl tracking-tight">
                Produtos e serviços
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Produtos" className="mt-6 border-t border-border">
              {productsData.map((product, index) => (
                <a
                  key={product.slug}
                  href={`#${product.slug}`}
                  onClick={(event) =>
                    handleMobileProductSelect(event, product.slug)
                  }
                  className="group flex items-start gap-3 border-b border-border py-3.5 text-left text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium leading-snug">{product.name}</span>
                </a>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden pt-12 lg:block">
        <div className="sticky top-28">
          <p className="mb-4 font-display text-lg font-semibold tracking-tight text-ink">
            Produtos e serviços
          </p>
          <nav aria-label="Produtos" className="border-l border-border">
            {productsData.map((product, index) => (
              <a
                key={product.slug}
                href={`#${product.slug}`}
                onClick={(event) =>
                  handleDesktopProductSelect(event, product.slug)
                }
                className="group flex gap-2.5 border-l-2 border-transparent py-2 pl-3 text-[13px] text-muted-foreground transition-colors hover:border-heat hover:text-ink focus-visible:border-heat focus-visible:text-ink focus-visible:outline-none"
              >
                <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-medium leading-snug">{product.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};
