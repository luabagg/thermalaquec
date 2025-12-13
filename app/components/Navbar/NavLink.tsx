import * as React from "react";
import { Link } from "@remix-run/react";

export function NavLink({ children, href, active = false }: { children: React.ReactNode; href: string; active: boolean }) {
  return (
    <div
      className={`flex h-full items-center p-1 font-sansbold text-xs font-extrabold uppercase leading-3 tracking-widest transition-colors duration-250 ease-out hover:text-yellow ${active ? "text-yellow" : ""} `}
    >
      <Link className="w-full" to={href} aria-label="Navigation link">
        {children}
      </Link>
    </div>
  );
}
