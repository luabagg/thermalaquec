import type { MetaFunction } from "@remix-run/node";

import { ContactForm } from "~/components/marketing/ContactForm";
import { FadeInOnScroll } from "~/components/marketing/FadeInOnScroll";
import { PageHero } from "~/components/marketing/PageHero";
import { WhatsappIcon } from "~/components/marketing/WhatsappIcon";
import { buildSeoMeta } from "~/lib/seo";
import { CONTACT, SITE_NAME } from "~/lib/site";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

export const meta: MetaFunction = () =>
  buildSeoMeta({
    title: `Contato | ${SITE_NAME}`,
    description: "Fale com a Thermal Aquecimento em Farroupilha/RS para solicitar orçamento, suporte ou atendimento técnico.",
    path: "/contato",
  });

export default function ContatoPage() {
  const mapsQuery = encodeURIComponent(`${CONTACT.addressLine}, ${CONTACT.cityLine}`);

  const channels: Array<{
    href: string;
    external?: boolean;
    label: string;
    value: string;
    mono?: boolean;
    icon?: typeof MapPin;
  }> = [
    {
      href: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
      external: true,
      icon: MapPin,
      label: "Endereço",
      value: `${CONTACT.addressLine}, ${CONTACT.cityLine}`,
    },
    {
      href: `mailto:${CONTACT.email}`,
      icon: Mail,
      label: "E-mail",
      value: CONTACT.email,
    },
    {
      href: `tel:+${CONTACT.phoneE164}`,
      icon: Phone,
      label: "Telefone",
      value: CONTACT.phoneDisplay,
      mono: true,
    },
    {
      href: CONTACT.whatsappUrl,
      external: true,
      label: "WhatsApp",
      value: CONTACT.phoneDisplay,
      mono: true,
    },
  ];

  return (
    <main className="flex-grow">
      <PageHero title="Contato" description="Orçamento, dúvidas técnicas ou visita. Escolha o canal e fale com a gente." />

      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <FadeInOnScroll>
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Fale conosco</h2>
                <p className="mt-3 max-w-[40ch] leading-relaxed text-muted-foreground">
                  Atendimento direto da equipe Thermal em Farroupilha/RS.
                </p>

                <ul className="mt-10 divide-y divide-border border-y border-border">
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <li key={channel.label}>
                        <a
                          href={channel.href}
                          target={channel.external ? "_blank" : undefined}
                          rel={channel.external ? "noopener noreferrer" : undefined}
                          className="group flex items-start gap-4 py-5 transition-colors hover:bg-secondary/60"
                        >
                          <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                            {Icon ? <Icon className="h-5 w-5" /> : <WhatsappIcon size={20} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-muted-foreground">{channel.label}</span>
                            <span
                              className={`mt-1 block text-base font-medium text-ink transition-colors group-hover:text-primary ${
                                channel.mono ? "font-mono" : ""
                              }`}
                            >
                              {channel.value}
                            </span>
                          </span>
                          <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-zinc-300 transition-colors group-hover:text-primary" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Envie uma mensagem</h2>
                <p className="mb-8 mt-3 max-w-[45ch] leading-relaxed text-muted-foreground">
                  Conte o tipo de imóvel e o que precisa. Retornamos com a orientação inicial.
                </p>
                <div className="rounded-lg border border-border bg-card p-6 md:p-8">
                  <ContactForm />
                </div>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      <section className="bg-secondary py-16 md:py-24">
        <div className="container mx-auto max-w-screen-xl px-4 md:px-6">
          <FadeInOnScroll>
            <h2 className="mb-8 font-display text-3xl font-bold tracking-tight">Onde estamos</h2>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
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
    </main>
  );
}
