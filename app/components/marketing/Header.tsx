import { useState } from "react";
import { Link, NavLink } from "@remix-run/react";
import { Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

const navItems = [
  { href: "/sobre", label: "A Empresa" },
  { href: "/produtos", label: "Produtos" },
  { href: "/calculadora-solar", label: "Calculadora" },
  { href: "/panorama-energetico", label: "Panorama" },
  { href: "/contato", label: "Contato" },
];

export const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-soft text-white">
      <div className="container mx-auto flex h-[72px] max-w-screen-xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img
            src="/logo.webp"
            alt="Thermal Aquecimento"
            className="h-10 w-auto md:h-11"
          />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `text-sm transition-colors duration-200 ${
                  isActive
                    ? "font-semibold text-white underline decoration-heat underline-offset-8"
                    : "font-medium text-zinc-300 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile — CSS only, no JS breakpoint (avoids missing hamburger on first paint) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-l border-white/10 bg-ink-soft text-white"
          >
            <nav className="mt-8 grid gap-6">
              <Link to="/" className="mb-2" onClick={() => setOpen(false)}>
                <img
                  src="/logo.webp"
                  alt="Thermal Aquecimento"
                  className="h-10 w-auto"
                />
              </Link>
              <div className="flex flex-col gap-5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `text-lg transition-colors duration-200 ${
                        isActive
                          ? "font-semibold text-white underline decoration-heat underline-offset-8"
                          : "font-medium text-zinc-300 hover:text-white"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
