import { Link, useLocation } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import React, { useEffect, useState } from 'react';

const navigationMap = [
  { name: "Home", href: "/" },
  { name: "Produtos", href: "/products" },
  { name: "Nosso trabalho", href: "/services" },
  { name: "Sobre nós", href: "/about" },
  { name: "Contato", href: "/contact" },
]

const socialMap = [
  { icon: "fab fa-instagram", href: "https://www.instagram.com/thermalaquec" },
  { icon: "fas fa-envelope-square", href: "mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  { icon: "fab fa-facebook-square", href: "https://www.instagram.com/thermalaquec" },
]

const viewportMobile = 768;

export default function Navbar() {
  const isHomepage = useHomepage();
  const display = isHomepage ? "fixed" : "sticky";
  const opaque = "bg-ebony shadow-sm shadow-gray-dark-500";
  const applyOpaque = useOpaque() || !isHomepage ? opaque : "";

  return (
    <header id="navigation" aria-label="Global Navigation" className={`
      top-0 z-50 h-16 w-full
      transition-colors ease-out duration-500
      ${display}
      ${applyOpaque}
    `}>

      <div className="flex justify-center h-full">
        <Link to="#" id="logo" className="cursor-default">
          <img src={logo} alt="logo" className="w-40 min-w-40" />
        </Link>

        <NavSection>
          {
            navigationMap.map((args) => {
              return <NavItem key={args.name} href={args.href}>
                {args.name}
              </NavItem>
            })
          }
        </NavSection>

        <NavSection>
          {
            socialMap.map((args) => {
              return <NavItem key={args.icon} href={args.href}>
                <i className={`${args.icon} text-xl`}></i>
              </NavItem>
            })
          }
        </NavSection>
      </div>
    </header>
  );
}

const NavSection = function ({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex mx-14 items-center space-x-8">
      {children}
    </nav>
  );
}

const NavItem = function ({ children, href }: { children: React.ReactNode, href: string }) {
  const active = "text-yellow border-b-2 border-white";
  const applyActive = useActive(href) ? active : "";

  return (
    <Link to={href} className={`
      flex h-full p-1 items-center
      uppercase tracking-widest
      text-xs leading-3
      font-sansbold font-extrabold
      hover:text-yellow
      transition-colors ease-out duration-250
      ${applyActive}
    `}>
      {children}
    </Link>
  );
}

function useHomepage(): boolean {
  const location = useLocation();

  return location["pathname"] == "/";
}

function useOpaque(): boolean {
  const [offset, setOffset] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(window.outerWidth);

    const onScroll = () => setOffset(window.scrollY);
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return offset > 30 || width < viewportMobile
}

function useActive(href: string): boolean {
  const location = useLocation();

  return location['pathname'] == href;
}
