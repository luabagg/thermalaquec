import { Link } from "@remix-run/react";
import styles from "~/styles/global.module.css";
import logo from 'public/images/wide_logo_dark_transparent.svg';


const navigationMap = [
  { name: "Home", href: "/" },
  { name: "Nosso trabalho", href: "/services" },
  { name: "Sobre nós", href: "/about" },
  { name: "Contato", href: "/contact" },
]

const socialMap = [
  { icon: "fab fa-instagram", href: "https://www.instagram.com/thermalaquec" },
  { icon: "fas fa-envelope-square", href: "mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento" },
  { icon: "fab fa-facebook-square", href: "https://www.instagram.com/thermalaquec" },
]

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Navigation>
        <img src={logo} alt="logo" className={styles.logo}/>
      </Navigation>

      <Navigation>
        {
          ...navigationMap.map((args) => {
            return <NavItem href={args.href}>
              {args.name}
            </NavItem>
          })
        }
      </Navigation>

      <Navigation>
        {
          ...socialMap.map((args) => {
            return <NavItem href={args.href}>
              <i className={args.icon}></i>
            </NavItem>
          })
        }
      </Navigation>
    </nav>
  );
}

const Navigation = function ({ children }: { children: React.ReactNode }) {
  return (
    <ul className={styles.navigation}>
      {children}
    </ul>
  )
}

const NavItem = function ({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <li className={styles.navitem} >
      <Link to={href}>{children}</Link>
    </li>
  );
}