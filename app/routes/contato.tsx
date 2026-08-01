import type { MetaFunction } from "@remix-run/node";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "~/components/marketing/ContactForm";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { WhatsappIcon } from "~/components/marketing/WhatsappIcon";
import { CONTACT } from "~/lib/site";

export const meta: MetaFunction = () => [
  { title: "Contato | Thermal" },
  {
    name: "description",
    content: "Entre em contato com a Thermal. Estamos prontos para atender você.",
  },
];

export default function ContatoPage() {
  const mapsQuery = encodeURIComponent(
    `${CONTACT.addressLine}, ${CONTACT.cityLine}`,
  );

  return (
    <main className="flex-grow">
      <section className="relative flex w-full items-center justify-center bg-gray-800 py-24 text-white md:py-32">
        <img
          src="/energia-solar.webp"
          alt="Painéis solares"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-70" />
        <div className="relative z-10 container mx-auto px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Entre em Contato</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-200 md:text-xl">
              Estamos prontos para atender você. Fale conosco e descubra as melhores soluções para
              suas necessidades.
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      <section className="bg-secondary py-12 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 text-3xl font-bold">Nossos Canais de Atendimento</h2>
            <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105 hover:shadow-xl"
              >
                <MapPin className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-gray-800">Endereço</h3>
                <p className="text-muted-foreground">
                  {CONTACT.addressLine}, {CONTACT.cityLine}
                </p>
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex flex-col items-center rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105 hover:shadow-xl"
              >
                <Mail className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-gray-800">E-mail</h3>
                <p className="text-muted-foreground">{CONTACT.email}</p>
              </a>
              <a
                href={`tel:+${CONTACT.phoneE164}`}
                className="flex h-full flex-col items-center justify-center rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105 hover:shadow-xl"
              >
                <Phone className="mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-gray-800">Telefone</h3>
                <p className="text-muted-foreground">{CONTACT.phoneDisplay}</p>
              </a>
              <a
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105 hover:shadow-xl"
              >
                <WhatsappIcon size={48} className="mb-4 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-gray-800">WhatsApp</h3>
                <p className="text-muted-foreground">{CONTACT.phoneDisplay}</p>
              </a>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      <section className="bg-white py-12 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 text-3xl font-bold">Onde Estamos</h2>
            <div className="aspect-video w-full overflow-hidden rounded-lg shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3474.0000000000005!2d-51.3456789!3d-29.2222222!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x951e31b2b2b2b2b2%3A0x951e31b2b2b2b2b2!2sRua%20Paulo%20Tartarotti%2C%201012%20-%20Bela%20Vista%2C%20Farroupilha%20-%20RS%2C%2095173-148!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização da Thermal"
              />
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      <section className="bg-secondary py-12 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 text-center md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 text-3xl font-bold">Envie-nos uma Mensagem</h2>
            <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-lg">
              <ContactForm />
            </div>
          </FadeInOnScroll>
        </div>
      </section>
    </main>
  );
}
