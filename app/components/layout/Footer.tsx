import { Link, useLocation } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import { Box, Container, ListItem, Stack, Typography } from "@mui/material";
import type { SocialMap } from "./types";
import { LargeButton } from "../utils/LargeButton";
import { KeyboardArrowUp } from "@mui/icons-material";
import { animateScroll } from 'react-scroll';
import React from "react";

export function Footer({ socialMap }: { socialMap: SocialMap }) {
  const [visibleButton, setVisibleButton] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setVisibleButton(
      document.documentElement.scrollHeight > 2000
    )
  }, [location]);

  return (
    <footer>
      <Box className={`
        flex flex-col
        lg:ml-[25%] -mt-6
        items-center
        ${visibleButton ? "relative" : "hidden"}
      `}>
        <LargeButton onclick={animateScroll.scrollToTop}>
          Voltar <KeyboardArrowUp />
        </LargeButton>
      </Box>
      <Container maxWidth="sm" className="
        flex flex-col
        py-12 items-center
        text-center
      ">
        <Box className="
        pb-12 sm:w-3/4
        border-b-2 border-b-slate-dark-300
      ">
          <Stack direction="row" spacing={0}>
            {
              socialMap.map((args, key) => {
                return <FooterLink key={key} href={args.href}>
                  {<args.icon style={{ fontSize: "34px" }} />}
                </FooterLink>
              })
            }
          </Stack>
        </Box>

        <Container className="
          flex flex-col
          my-20 items-center
        ">
          <img src={logo} alt="logo" className="w-80 min-w-40 opacity-40" />
          <Typography variant="caption" className="opacity-80" >
            Aqueça seu ambiente e desfrute do conforto que merece.
          </Typography>
        </Container>

        <Box className="
          flex flex-col
          md:flex-row
          opacity-40
        ">
          <Typography variant={"body1"} className="sm:pr-4">&copy; Thermal Aquecimento LTDA.</Typography>
          <Typography variant={"body1"}>created by @luabagg</Typography>
        </Box>
      </Container>
    </footer>
  );
}

const FooterLink = ({ children, href }: { children: React.ReactNode, href: string }) => {
  return (
    <ListItem className={`
        hover:text-yellow
        opacity-80 hover:opacity-100
        transition-all ease-out duration-250
      `}>

      <Link className='w-full' to={href} >
        {children}
      </Link>
    </ListItem>
  )
}