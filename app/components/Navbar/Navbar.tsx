import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "@remix-run/react";
import logo from "~/assets/wide-logo-dark-transparent.svg";
import { useClickOutside } from "~/hooks/clickedOutside";
import { useIsHomepage } from "~/hooks/isHomepage";
import { atom, useAtom } from "jotai";
import { IconType } from "react-icons/lib";
import { MdMenu } from "react-icons/md";
import { animateScroll } from "react-scroll";
import { NavLink } from "./NavLink";

export type LinksMap = Array<{ name: string; href: string }>;
export type SocialMap = Array<{ icon: IconType; href: string }>;

type NavbarProps = { linksMap: LinksMap; socialMap: SocialMap };

const isMenuVisibleAtom = atom(false);

export default function Navbar({ linksMap, socialMap }: NavbarProps) {
  const isHomepage = useIsHomepage();
  const display = isHomepage ? "fixed" : "sticky";
  const [isMenuVisible, setIsMenuVisible] = useAtom(isMenuVisibleAtom);

  const menuRef = useRef<HTMLInputElement | null>(null);
  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };
  useClickOutside(menuRef, () => setIsMenuVisible(false));

  // Apply opaque if it's scrolled, not in homepage
  // or if the mobile menu is opened.
  const applyOpaque = useOpaque() || !isHomepage || isMenuVisible ? "bg-ebony shadow-sm shadow-gray-dark-500" : "";

  return (
    <header
      id="navigation"
      aria-label="Global Navigation"
      className={`top-0 z-40 h-16 w-full transition-colors duration-500 ease-out ${display} ${applyOpaque} `}
    >
      <div className="flex h-full items-center justify-center">
        <button className="mt-1 w-40 min-w-32 md:w-44" onClick={animateScroll.scrollToTop} aria-label="Scroll to top">
          <img src={logo} alt="logo" />
        </button>

        <div id="default-menu" className="hidden md:flex">
          <NavSection>
            {linksMap.map((args) => {
              return (
                <NavItem key={args.name} href={args.href}>
                  {args.name}
                </NavItem>
              );
            })}
          </NavSection>
        </div>

        <NavSection>
          {socialMap.map((args, key) => {
            return (
              <NavItem key={key} href={args.href}>
                {<args.icon className="text-medium md:text-xl" />}
              </NavItem>
            );
          })}
        </NavSection>

        <div aria-label="Open mobile menu" className="flex md:hidden">
          <button onClick={toggleMenu}>
            <MdMenu className="text-medium active:text-yellow sm:text-large" />
          </button>
        </div>
      </div>

      <div id="mobile-menu" ref={menuRef} className={` ${isMenuVisible ? "block" : "hidden"} animate-fadeIn`}>
        <MobileMenu>
          {linksMap.map((args) => {
            return (
              <MobileMenuItem key={args.name} href={args.href} onClick={() => setIsMenuVisible(false)}>
                {args.name}
              </MobileMenuItem>
            );
          })}
        </MobileMenu>
      </div>
    </header>
  );
}

const NavSection = function ({ children }: { children: React.ReactNode }) {
  return <nav className="mx-4 flex sm:space-x-2 lg:mx-12">{children}</nav>;
};

const NavItem = function ({ children, href }: { children: React.ReactNode; href: string }) {
  const active = useActive(href);
  const applyActive = active ? "border-b-2 border-white" : "";

  return (
    <div className={`h-16 p-2 lg:p-4 ${applyActive} `}>
      <NavLink href={href} active={active}>
        {children}
      </NavLink>
    </div>
  );
};

const MobileMenu = function ({ children }: { children: React.ReactNode }) {
  return (
    <nav className="left-0 top-16 z-50 h-auto w-full rounded-b-md bg-slate-dark-300 p-4 shadow-sm shadow-gray-dark-500">{children}</nav>
  );
};

const MobileMenuItem = function ({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href: string;
  onClick?: React.MouseEventHandler;
}) {
  return (
    <button className="h-16 w-full border-b-1 border-dashed border-slate-dark-500 p-2" onClick={onClick}>
      <NavLink href={href} active={useActive(href)}>
      {children}
      </NavLink>
    </button>
  );
};

function useOpaque(): boolean {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(window.scrollY);

    const onScroll = () => setOffset(window.scrollY);
    window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setOffset]);

  return offset > 30;
}

function useActive(href: string): boolean {
  const location = useLocation();

  return location["pathname"] == href;
}
