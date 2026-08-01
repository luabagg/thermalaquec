import { Link } from "@remix-run/react";
import { CONTACT, SITE_NAME, SOCIAL } from "~/lib/site";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { WhatsappIcon } from "./WhatsappIcon";

export const Footer = () => {
  const mapsQuery = encodeURIComponent(`${CONTACT.addressLine}, ${CONTACT.cityLine}`);

  return (
    <footer className="bg-ink text-white">
      <div className="container mx-auto grid max-w-screen-xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-3 md:gap-12 md:px-6">
        <div className="flex flex-col items-start gap-5">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src="/logo.webp" alt={SITE_NAME} className="h-14 w-auto" />
            </Link>
            <img src="/certificacao-absolar.webp" alt="Certificação Absolar" className="h-14 w-auto" loading="lazy" />
          </div>
          <div className="flex gap-3">
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
            >
              <Instagram className="h-5 w-5" strokeWidth={1.75} />
            </a>
            <a
              href={CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
            >
              <WhatsappIcon size={20} />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm font-semibold tracking-wide text-white">Navegação</h3>
          <Link to="/" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Home
          </Link>
          <Link to="/sobre" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Empresa
          </Link>
          <Link to="/produtos" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Produtos
          </Link>
          <Link to="/calculadora-solar" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Calculadora
          </Link>
          <Link to="/contato" className="text-sm text-zinc-400 transition-colors hover:text-white">
            Contato
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm font-semibold tracking-wide text-white">Contato</h3>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {CONTACT.addressLine}, {CONTACT.cityLine}
            </span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>{CONTACT.email}</span>
          </a>
          <a
            href={`tel:+${CONTACT.phoneE164}`}
            className="flex items-center gap-2 font-mono text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto max-w-screen-xl px-4 py-4 text-center text-xs text-zinc-500 md:px-6 md:text-left">
          © {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
