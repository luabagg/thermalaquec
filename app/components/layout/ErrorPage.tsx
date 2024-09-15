import { Typography } from "@mui/material";
import { Section, SectionContent, SectionTitle } from "../utils/Section";
import errorImage from "/images/error-image.png";

export function ErrorPage(status: number) {
  let message = ""

  switch (status) {
    case 404:
      message = "A página que você está procurando não foi encontrada."
      break;
    default:
      message = "Não foi possível acessar a página."
      break;
  }

  return (
    <Section>
      <SectionTitle title="Erro ao navegar" />
      <SectionContent description={message}>
        <Typography variant={"h2"} className="py-8">:(</Typography>
        <img src={errorImage} alt="Erro" className="w-400" />
      </SectionContent>
    </Section>
  );
}