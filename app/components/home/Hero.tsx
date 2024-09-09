import * as React from 'react';
import heroBg from "/images/hero-background.png";
import { Link } from '@remix-run/react';
import { Box, Container, Typography } from '@mui/material';
import { Underline } from './Underline';
import { KeyboardArrowDown } from '@mui/icons-material';
import { MobileStepper } from './MobileStepper';
import LargeButton from '../utils/LargeButton';

const steps: Array<{ title: React.ReactNode, text: string }> = [
  {
    title: <>Conheça a <Underline>Thermal</Underline>. 🔥 Aquecimento de qualidade para seu lar.</>,
    text: "Oferecemos as melhores soluções de aquecimento no mercado, atuando a mais de 5 anos em todo Rio Grande do Sul. Não espere mais para desfrutar do conforto que merece - entre em contato conosco hoje mesmo."
  },
  {
    title: <>Somos uma empresa dedicada em oferecer as melhores soluções de aquecimento disponíveis no mercado.</>,
    text: "Para nós, o cliente é prioridade. Conheça nossos projetos e solicite um orçamento personalizado."
  },
  {
    title: <>Veja mais sobre nossos <Link to="/services" title="services" ><Underline>serviços</Underline></Link > ou solicite um < Link to="/contact" title="contact us" > <Underline>orçamento</Underline></Link >.</>,
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

  // Hero swipping effect, for mobile users.
  const [dragging, setDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [currentX, setCurrentX] = React.useState(0);

  const [width, setWidth] = React.useState(0);
  const moveLeft = startX < (width * 0.3)
  const moveRight = startX > (width * 0.7)

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragging) setCurrentX(e.touches[0].clientX);
    setDragging(true);
  };

  // Verifies states to move section according to user drag.
  const handleTouchEnd = () => {
    if (!dragging) {
      return
    }
    setDragging(false);
    if (moveRight && (currentX == 0 || (startX - currentX > (width * 0.2)))) {
      handleNext();
    }
    if (moveLeft && (currentX == 0 || (currentX - startX > (width * 0.2)))) {
      handleBack();
    }
    setCurrentX(0);
  };

  React.useEffect(() => {
    setWidth(window.outerWidth)
    const interval = setInterval(() => {
      handleNext();
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero">
      <Box className="
        w-full h-auto py-40
        bg-cover bg-center
      "
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <Container
          maxWidth="md"
          className='text-center lg:text-left'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <HeroSection key={activeStep} {...steps[activeStep]} />
          <MobileStepper
            steps={maxSteps}
            activeStep={activeStep}
            onStepClick={(step: number) => setActiveStep(step)}
            className='
              flex mt-20
              justify-center lg:justify-start
            '/>
        </Container>
      </Box>

      <Box className="
        relative flex flex-col
        lg:ml-.25 -mt-6
        items-center
      ">
        <LargeButton href="/services">
          Saiba mais <KeyboardArrowDown />
        </LargeButton>
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
