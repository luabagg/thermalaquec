import * as React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { MobileStepper } from './MobileStepper';

export function Swiper({ steps }: { steps: Array<{ title: React.ReactNode, text: string }> }) {
  const maxSteps = steps.length;
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = React.useCallback(() => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps)
  }, [setActiveStep, maxSteps]);

  const handleBack = () => {
    setActiveStep((prevActiveStep) => {
      if (prevActiveStep == 0) {
        return maxSteps - 1;
      }
      return (prevActiveStep - 1) % maxSteps;
    });
  };

  // Swiping effect for mobile users.
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
  }, [handleNext]);

  return (
    <Container
      maxWidth="md"
      className='text-center lg:text-left'
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <SwiperSection key={activeStep} {...steps[activeStep]} />
      <MobileStepper
        steps={maxSteps}
        activeStep={activeStep}
        onStepClick={(step: number) => setActiveStep(step)}
        className='
          flex justify-center
          mt-20 lg:justify-start
      '/>
    </Container>
  );
}

const SwiperSection = function ({ title, text }: { title: React.ReactNode, text: string }) {
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
      <Typography variant="subtitle1" className="
        text-gray-300 opacity-90
        animate-fadeInUp
      ">
        {text}
      </Typography>
    </Box>
  )
}
