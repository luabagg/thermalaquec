import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@remix-run/react";
import { WhatsappIcon } from "./WhatsappIcon";
import { CONTACT, SOCIAL } from "~/lib/site";

export const Footer = () => {
  const mapsQuery = encodeURIComponent(
    `${CONTACT.addressLine}, ${CONTACT.cityLine}`,
  );

  return (
    <footer className="bg-[#1f1f1f] text-white">
      <div className="container mx-auto grid max-w-screen-xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src="/logo-thermal-novo.webp" alt="Thermal Logo" className="h-16 w-auto" />
            </Link>
            <img
              src="/certificacao-absolar.webp"
              alt="Certificação Absolar"
              className="h-16 w-auto"
              loading="lazy"
            />
          </div>
          <div className="mt-2 flex gap-4">
            <a
              href={SOCIAL.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-gray-400 hover:text-white"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-400 hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-gray-400 hover:text-white"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href={CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="text-gray-400 hover:text-white"
            >
              <WhatsappIcon className="h-6 w-6" />
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-white">Páginas Importantes</h3>
          <Link to="/" className="text-sm text-gray-400 hover:underline">
            Home
          </Link>
          <Link to="/sobre" className="text-sm text-gray-400 hover:underline">
            Empresa
          </Link>
          <Link to="/produtos" className="text-sm text-gray-400 hover:underline">
            Produtos
          </Link>
          <Link to="/contato" className="text-sm text-gray-400 hover:underline">
            Contato
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-white">Técnico Responsável</h3>
          <p className="text-sm text-gray-400">Carlos Gustavo Brochetto</p>
          <p className="text-sm text-gray-400">CRT/RS 77602935004</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-white">Contato</h3>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>
              {CONTACT.addressLine}, {CONTACT.cityLine}
            </span>
          </a>
          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4" />
            <span>{CONTACT.email}</span>
          </a>
          <a
            href={`tel:+${CONTACT.phoneE164}`}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <Phone className="h-4 w-4" />
            <span>{CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>
      <div className="bg-[#1f1f1f]">
        <div className="container mx-auto flex max-w-screen-xl flex-col items-center justify-between px-4 py-4 text-center text-xs text-white md:flex-row md:px-6">
          <span>© {new Date().getFullYear()} Thermal. Todos os direitos reservados.</span>
          <a
            href="https://4zion.com.br?utm_source=thermal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            <span>Feito com ❤️ por 4ZION Agência Criativa</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
