import { Link, useLocation } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import React, { useEffect, useState } from 'react';
import { Box, IconButton, Toolbar } from "@mui/material";
import { Menu, Instagram, Email, Facebook, } from "@mui/icons-material";
import NavLink from "./NavLink";

const navigationMap = [
  { name: "Home", href: "/" },
  { name: "Produtos", href: "/products" },
  { name: "Nosso trabalho", href: "/services" },
  { name: "Sobre nós", href: "/about" },
  { name: "Contato", href: "/contact" },
]

const socialMap = [
  { icon: Instagram, href: "https://www.instagram.com/thermalaquec" },
  { icon: Email, href: "mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  { icon: Facebook, href: "https://www.facebook.com/thermalaquec" },
]

const viewportMobile = 768;

export default function Navbar() {
  const isHomepage = useHomepage();
  const display = isHomepage ? "fixed" : "sticky";
  const applyOpaque = (useOpaque() || !isHomepage) ? "bg-ebony shadow-sm shadow-gray-dark-500" : "";

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
          <img src={logo} alt="logo" className="w-40 min-w-32" />
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
              return <NavItem key={args.href} href={args.href}>
                {<args.icon />}
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

const NavSection = function ({ children }: { children: React.ReactNode }) {
  return (
    <nav className="
      flex items-center
      mx-4 lg:mx-14
      lg:space-x-2
    ">
      {children}
    </nav>
  );
}

const NavItem = function ({ children, href }: { children: React.ReactNode, href: string }) {
  const active = useActive(href);
  const applyActive = active ? "border-b-2 border-white" : "";

  return (
    <Box className={`
      p-2 lg:p-4 h-16
      ${applyActive}
    `}>
      <NavLink href={href} active={active} >
        {children}
      </NavLink>
    </Box>
  );
}

const MobileMenu = function ({ children }: { children: React.ReactNode }) {
  return (
    <nav className="
      fixed z-50 left-0 top-16
      w-full h-auto p-6
      rounded-b-md
      bg-slate-dark-300
      shadow-sm shadow-gray-dark-500
    ">
      {children}
    </nav>
  );
}

const MobileMenuItem = function ({ children, href }: { children: React.ReactNode, href: string }) {
  return (
    <Box className="
      p-4 h-16
      border-b-1 border-dashed border-slate-dark-500
    ">
      <NavLink href={href} active={useActive(href)} >
        {children}
      </NavLink>
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
