import { Link } from "@remix-run/react";
import { MenuButtonProps } from '@headlessui/react'

export default function Menu() {
  return (
    <header className="sticky top-0 bg-indigo-500 text-indigo-50">
      <div>
        <div>
          <Link to="#">Thermal Aquecimento</Link>
        </div>

        <nav className="list-none flex justify-center gap-4">
          <ul>
            <li className="p-2"><Link to="/">Home</Link></li>
            <li className="p-2"><Link to="/services">Nosso trabalho</Link></li>
            <li className="p-2"><Link to="/about">Sobre nós</Link></li>
            <li className="p-2"><Link to="/contact">Contato</Link></li>
          </ul>
        </nav>

        {/* <ul>
          <li className="p-2"><Link to="https://www.instagram.com/thermalaquec"><i className="fab fa-instagram"></i></Link></li>
          <li className="p-2"><Link to="mailto:comercial@thermalaquecimento.com.br?subject=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento"><i className="fas fa-envelope-square"></i></Link></li>
          <li className="p-2"><Link to="https://www.facebook.com/thermalaquec"><i className="fab fa-facebook-square"></i></Link></li>
        </ul> */}
      </div>
    </header>
  );
}