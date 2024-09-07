import * as React from 'react';
import heroBg from "/images/hero-background.png";
import { Link } from '@remix-run/react';
import { Box, Container, MobileStepper, Typography } from '@mui/material';
import { Button } from '@mui/base';
import { Underline } from './Underline';
import { KeyboardArrowDown, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';

const steps: Array<{ title: React.ReactNode, text: string }> = [
  {
    title: <React.Fragment>
      Conheça a <Underline>Thermal</Underline>. 🔥 Aquecimento de qualidade para seu lar.
    </React.Fragment>,
    text: "Oferecemos as melhores soluções de aquecimento no mercado, atuando a mais de 5 anos em todo Rio Grande do Sul. Não espere mais para desfrutar do conforto que merece - entre em contato conosco hoje mesmo."
  },
  {
    title: <React.Fragment>
      Somos uma empresa dedicada em oferecer as melhores soluções de aquecimento disponíveis no mercado.
    </React.Fragment>,
    text: "Para nós, o cliente é prioridade. Conheça nossos projetos e solicite um orçamento personalizado abaixo."
  },
  {
    title: <React.Fragment>
      Veja mais sobre nossos <Link to="/services" title="services" ><Underline>serviços</Underline></Link > ou solicite um < Link to="/contact" title="contact us" > <Underline>orçamento</Underline></Link >.
    </React.Fragment >,
    text: "Explore as soluções de aquecimento que temos disponíveis para você. Estaremos prontos para ajudá-lo a encontrar a melhor solução para suas necessidades."
  }
]
const maxSteps = steps.length;

export default function Hero() {
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps)
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => {
      if (prevActiveStep == 0) {
        return maxSteps - 1;
      }
      return (prevActiveStep - 1) % maxSteps;
    });
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero">
      <div className="
        w-full h-auto py-40
        bg-cover bg-center
      "
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <Container maxWidth="md" className='text-center lg:text-left'>
          <HeroSection {...steps[activeStep]} />
          <MobileStepper
            variant="dots"
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            sx={{ maxWidth: 200, backgroundColor: 'transparent' }}
            className='mt-20 animate-fadeInUp'
            nextButton={
              <Button onClick={handleNext}>
                <KeyboardArrowRight className='text-gray-500' />

              </Button>
            }
            backButton={
              <Button onClick={handleBack}>
                <KeyboardArrowLeft className='text-gray-500' />
              </Button>
            }
          />
        </Container>
      </div>

      <Box className="relative flex flex-col items-center">
        <Button href="/services" className="
          lg:ml-.25 -my-6
          w-48 py-4
          rounded-sm shadow-inset-clean
          uppercase tracking-widest
          text-center text-xs leading-3
          font-sansbold font-extrabold
          bg-red-dark hover:bg-yellow
          text-white hover:text-ebony
          transition-colors ease-out duration-500
        ">
          Saiba mais <KeyboardArrowDown />
        </Button>
      </Box>
    </section>
  );
}

const HeroSection = function ({ title, text }: { title: React.ReactNode, text: string }) {
  return (
    <Box className="
      w-full lg:w-[65%]
    ">
      <h1 className='
        font-sansbold font-bold
        text-3xl lg:text-5xl lg:leading-tight
        animate-fadeInDown
        partial-b-yellow
      '>
        {title}
      </h1>
      <Typography variant="body1" fontSize={20} className="
        text-gray-300 opacity-75
        animate-fadeInUp
      ">
        {text}
      </Typography>
    </Box>
  )
}