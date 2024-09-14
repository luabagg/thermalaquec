import { Email, WhatsApp } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { Section, SectionContent, SectionTitle } from "~/components/utils/Section";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Entre em Contato - Thermal Aquecimento" }];
};

const contactOpts = [
  { icon: Email, text: "comercial@thermalaquecimento.com.br" },
  { icon: WhatsApp, text: "(54) 99653-8879" },
]

export default function ContactPage() {
  return (
    <Section>
      <SectionTitle title="Fale conosco" />
      <SectionContent description={
        "Ligue para nós agora mesmo - estamos prontos para encontrar a solução ideal para o aquecimento de sua casa ou piscina."
      }>
        <Typography variant={"h2"} className="py-8">contato:</Typography>
        {contactOpts.map((opt, i) => (
          <Box key={i} className="flex sm:p-2 mb-2">
            <opt.icon
              className="mr-1 sm:mr-4"
              sx={{ fontSize: { xs: "18px", sm: "22px" } }}
            />
            <Typography variant="body2">{opt.text}</Typography>
          </Box>
        ))}
      </SectionContent>
    </Section>
  );
}