import { useLocation } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Toolbar } from "@mui/material";
import { Menu } from "@mui/icons-material";
import { NavLink } from "./NavLink";
import { useHomepage } from "../utils/hooks/useHomepage";
import { useClickOutside } from "../utils/hooks/clickedOutside";
import type { NavigationMap, SocialMap } from "./types";
import { animateScroll } from 'react-scroll';

export function Navbar({ navigationMap, socialMap }: { navigationMap: NavigationMap, socialMap: SocialMap }) {
  const isHomepage = useHomepage();
  const display = isHomepage ? "fixed" : "sticky";

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const menuRef = useRef(null);
  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };
  useClickOutside(menuRef, () => setIsMenuVisible(false));

  // Apply opaque if it's scrolled, not homepage
  // or if the mobile menu is opened.
  const applyOpaque = (
    useOpaque() || !isHomepage || isMenuVisible
  ) ? "bg-ebony shadow-sm shadow-gray-dark-500" : "";

  return (
    <header id="navigation" aria-label="Global Navigation" className={`
      top-0 z-40 h-16 w-full
      transition-colors ease-out duration-500
      ${display}
      ${applyOpaque}
    `}>
      <Toolbar className="flex justify-center h-full">
        <img onClick={animateScroll.scrollToTop} src={logo} alt="logo" className="w-40 min-w-32" />

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
            socialMap.map((args, key) => {
              return <NavItem key={key} href={args.href}>
                {<args.icon fontSize="small" />}
              </NavItem>
            })
          }
        </NavSection>

        <Box aria-label="Open mobile menu" className="flex md:hidden">
          <IconButton
            size="medium"
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

      <Box id="mobile-menu" ref={menuRef} className={`
        ${isMenuVisible ? "block" : "hidden"}
        animate-fadeIn
      `}>
        <MobileMenu>
          {
            navigationMap.map((args) => {
              return <MobileMenuItem key={args.name} href={args.href} onClick={() => setIsMenuVisible(false)}>
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
      flex
      mx-4 lg:mx-12
      sm:space-x-2
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
      w-full h-auto p-4
      rounded-b-md
      bg-slate-dark-300
      shadow-sm shadow-gray-dark-500
    ">
      {children}
    </nav>
  );
}

const MobileMenuItem = function ({ children, href, onClick }: { children: React.ReactNode, href: string, onClick?: React.MouseEventHandler }) {
  return (
    <Box className="
      p-2 h-16
      border-b-1 border-dashed border-slate-dark-500
    "  onClick={onClick}>
      <NavLink href={href} active={useActive(href)} >
        {children}
      </NavLink>
    </Box>
  );
}

function useOpaque(): boolean {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(window.scrollY);

    const onScroll = () => setOffset(window.scrollY);
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return offset > 30
}

function useActive(href: string): boolean {
  const location = useLocation();

  return location['pathname'] == href;
}
