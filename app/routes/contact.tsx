import { Box, Typography } from "@mui/material";
import type { MetaFunction } from "@remix-run/react";
import { Section, SectionTitle } from "~/components/utils/Section";

export const meta: MetaFunction = ({ matches }) => {
  const parentMeta = matches.flatMap(
    (match) => match.meta ?? []
  );
  return [...parentMeta, { title: "Entre em Contato - Thermal Aquecimento" }];
};

export default function ContactPage() {
  return (
    <Section>
      <SectionTitle title="Fale conosco" />

      <Box className='pl-4 sm:pl-20'>
        <Typography variant={"body1"} fontFamily={"serif"}>
          Ligue para nós agora mesmo - estamos prontos para encontrar a solução ideal para o aquecimento de sua casa ou piscina.
        </Typography>
        <Typography variant={"h2"} className="text-yellow">contato:</Typography>
        <p>
          <i className="fas fa-envelope"></i> comercial@thermalaquecimento.com.br
          <br />
          <i className="fas fa-phone"></i> (54) 99653-8879
        </p>
      </Box>
    </Section>
  );
}