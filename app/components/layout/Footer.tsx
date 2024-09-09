import { Link } from "@remix-run/react";
import logo from "/images/wide-logo-dark-transparent.svg";
import { Email, Facebook, Instagram, Twitter, WhatsApp } from "@mui/icons-material";
import { Box, Container, ListItem, Stack, Typography } from "@mui/material";

const socialMap = [
  { icon: Twitter, href: "https://twitter.com/thermalaquec" },
  { icon: Instagram, href: "https://www.instagram.com/thermalaquec" },
  { icon: Email, href: "mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  { icon: Facebook, href: "https://www.facebook.com/thermalaquec" },
  { icon: WhatsApp, href: "https://wa.me/5554999161816/?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
]

export default function Footer() {
  return (
    <footer>
      <Container maxWidth="sm" className="
        flex flex-col
        py-12 items-center
        text-center
      ">
        <Box className="
        pb-12 sm:w-.75
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
          <Typography variant="body1" fontSize={18} className="opacity-80" >
            Aqueça seu ambiente e desfrute do conforto que merece.
          </Typography>
        </Container>

        <Box className="
          flex flex-col
          sm:flex-row sm:space-x-8
          opacity-40
        ">
          <Typography>&copy; Thermal Aquecimento LTDA.</Typography>
          <Typography>created by @luabagg</Typography>
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