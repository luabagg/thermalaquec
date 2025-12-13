import React from "react";
import { Link, useLocation } from "@remix-run/react";
import logo from "~/assets/wide-logo-dark-transparent.svg";
import { atom, useAtom } from "jotai";
import { IconType } from "react-icons/lib";
import { MdKeyboardArrowUp } from "react-icons/md";
import { animateScroll } from "react-scroll";
import { LargeButton } from "../ui/LargeButton";
import Typography from "../ui/Typography";

export type SocialMap = Array<{ icon: IconType; href: string }>;

const visibleButtonAtom = atom(false);

export default function Footer({ socialMap }: { socialMap: SocialMap }) {
  const [visibleButton, setVisibleButton] = useAtom(visibleButtonAtom);

  React.useEffect(() => {
    setVisibleButton(document.documentElement.scrollHeight > 2500);
  }, [setVisibleButton]);

  return (
    <footer>
      <div className={`-mt-6 flex flex-col items-center lg:ml-[25%] ${visibleButton ? "relative" : "hidden"} `}>
        <LargeButton onclick={animateScroll.scrollToTop}>
          Voltar <MdKeyboardArrowUp />
        </LargeButton>
      </div>
      <div className="flex w-full flex-col items-center py-12 text-center">
        <div className="border-b-2 border-b-slate-dark-300 pb-12 sm:w-3/4">
          <div className="flex w-full flex-row justify-center space-x-0">
            {socialMap.map((args, key) => {
              return (
                <FooterLink key={key} href={args.href}>
                  {<args.icon className="w-12 text-xl sm:text-2xl sm:w-14" />}
                </FooterLink>
              );
            })}
          </div>
        </div>

        <div className="my-12 sm:my-14 flex flex-col items-center">
          <img src={logo} alt="logo" className="w-80 min-w-40 opacity-60" />
          <Typography variant="subtitle1" className="opacity-80">
            Aqueça seu ambiente e desfrute do conforto que merece.
          </Typography>
        </div>

        <div className="flex flex-col opacity-60 md:flex-row">
          <Typography variant={"caption"} className="sm:pr-4">
            &copy; Thermal Aquecimento LTDA.
          </Typography>
          <Typography variant={"caption"}>created by @luabagg</Typography>
        </div>
      </div>
    </footer>
  );
}

const FooterLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return (
    <div className="opacity-80 transition-all duration-250 ease-out hover:text-yellow hover:opacity-100">
      <Link className="w-full" to={href} aria-label="Social link">
        {children}
      </Link>
    </div>
  );
};
