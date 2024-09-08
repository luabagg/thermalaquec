import { Link, useLocation } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import React, { useEffect, useState } from 'react';
import { Box, IconButton, Toolbar } from "@mui/material";
import { Menu } from "@mui/icons-material";

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

  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  return (
    <header id="navigation" aria-label="Global Navigation" className={`
      top-0 z-40 h-16 w-full
      transition-colors ease-out duration-500
      ${display}
      ${applyOpaque}
    `}>
      <Toolbar className="flex justify-center h-full">
        <Link to="#" id="logo" className="cursor-default">
          <img src={logo} alt="logo" className="w-40 min-w-40" />
        </Link>

        <Box id="default-menu" className="hidden md:flex">
          <NavSection>
            {
              navigationMap.map((args) => {
                return <NavItem key={args.name} href={args.href}>
                  {args.name}
                </NavItem>
              })
            }
          </NavSection>
        </Box>

        <NavSection>
          {
            socialMap.map((args) => {
              return <NavItem key={args.icon} href={args.href}>
                <i className={`${args.icon} text-xl`}></i>
              </NavItem>
            })
          }
        </NavSection>

        <Box className="flex md:hidden">
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={toggleMenu}
            sx={{ mr: 2 }}
          >
            <Menu className=" active:text-yellow" />
          </IconButton>
        </Box>
      </Toolbar>

      <Box id="mobile-menu" className={`
        ${isMenuVisible ? "block" : "hidden"}
        animate-fadeIn
      `}>
        <MobileMenu>
          {
            navigationMap.map((args) => {
              return <MobileMenuItem key={args.name} href={args.href}>
                {args.name}
              </MobileMenuItem>
            })
          }
        </MobileMenu>
      </Box>
    </header>
  );
}

const MobileMenu = function ({ children }: { children: React.ReactNode }) {
  return (
    <Box className="
      fixed z-50 left-0 top-16
      w-full h-auto p-6
      rounded-b-md
      bg-slate-dark-300
      shadow-sm shadow-gray-dark-500
    ">
      {children}
    </Box>
  );
}

const MobileMenuItem = function ({ children, href }: { children: React.ReactNode, href: string }) {
  const active = "text-yellow";
  const applyActive = useActive(href) ? active : "";

  return (
    <Box className={`
      flex h-full p-4 items-center
      uppercase tracking-widest
      text-xs
      border-b-1 border-dashed border-slate-dark-500
      font-sansbold font-extrabold
      ${applyActive}
    `}>
      <Link to={href}>
        {children}
      </Link>
    </Box>
  );
}

const NavSection = function ({ children }: { children: React.ReactNode }) {
  return (
    <nav className="
      flex items-center
      mx-4 lg:mx-14
      space-x-4 lg:space-x-8
    ">
      {children}
    </nav>
  );
}

const NavItem = function ({ children, href }: { children: React.ReactNode, href: string }) {
  const active = "text-yellow border-b-2 border-white";
  const applyActive = useActive(href) ? active : "";

  return (
    <Box className={`
      flex h-full p-1 items-center
      uppercase tracking-widest
      text-xs leading-3
      font-sansbold font-extrabold
      hover:text-yellow
      transition-colors ease-out duration-250
      ${applyActive}
    `}>
      <Link to={href} >
        {children}
      </Link>
    </Box>
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

  return offset > 30 || width <= viewportMobile
}

function useActive(href: string): boolean {
  const location = useLocation();

  return location['pathname'] == href;
}
