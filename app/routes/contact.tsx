import { MdEmail } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { Section, SectionContent, SectionTitle } from "~/components/ui/Section";
import Typography from "~/components/ui/Typography";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap((match) => match.meta ?? []);
  return [...parentMeta, { title: "Entre em Contato - Thermal Aquecimento" }];
};

const contactOpts = [
  { icon: MdEmail, text: "comercial@thermalaquecimento.com.br" },
  { icon: FaWhatsapp, text: "(54) 99653-8879" },
];

export default function ContactPage() {
  return (
    <Section>
      <SectionTitle title="Fale conosco" />
      <SectionContent
        description={"Ligue para nós agora mesmo - estamos prontos para encontrar a solução ideal para o aquecimento de sua casa ou piscina."}
      >
        <Typography variant="h2" className="py-8">
          contato:
        </Typography>
        {contactOpts.map((opt, i) => (
          <div key={i} className="flex items-center sm:p-2 mb-2">
            <opt.icon className="mr-1 sm:mr-4 text-lg sm:text-xl" />
            <Typography variant="body2">{opt.text}</Typography>
          </div>
        ))}
      </SectionContent>
    </Section>
  );
}
