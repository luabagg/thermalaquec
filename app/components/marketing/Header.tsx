import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "~/hooks/use-mobile";
import { Link, NavLink } from "@remix-run/react";

const navItems = [
  { href: "/sobre", label: "A Empresa" },
  { href: "/produtos", label: "Produtos" },
  { href: "/calculadora-solar", label: "Calculadora Solar" },
  { href: "/panorama-energetico", label: "Panorama Energético" },
  { href: "/contato", label: "Contato" },
];

const NavLinks = ({ linkClassName }: { linkClassName?: string }) => (
  <>
    {navItems.map((item) => (
      <NavLink
        key={item.href}
        to={item.href}
        className={({ isActive }) =>
          `hover:underline underline-offset-4 ${linkClassName} ${
            isActive ? "font-bold text-white" : "font-medium"
          }`
        }
      >
        {item.label}
      </NavLink>
    ))}
  </>
);

export const Header = () => {
  const isMobile = useIsMobile();

  return (
    <header className="bg-[#1f1f1f] text-white sticky top-0 z-50">
      <div className="container mx-auto max-w-screen-xl flex items-center justify-between h-24 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-thermal-novo.webp" alt="Thermal Logo" className="h-12" />
        </Link>
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#1f1f1f] text-white border-l border-gray-700">
              <nav className="grid gap-6 text-lg font-medium mt-8">
                <Link to="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <img src="/logo-thermal-novo.webp" alt="Thermal Logo" className="h-10" />
                </Link>
                <div className="flex flex-col gap-4">
                  <NavLinks linkClassName="text-white text-lg" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="hidden md:flex gap-6">
            <NavLinks linkClassName="text-sm text-gray-300 hover:text-white" />
          </nav>
        )}
      </div>
    </header>
  );
};