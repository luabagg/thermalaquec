import React, { useState } from 'react';
import { Box, Container, Typography } from "@mui/material"

export const Section = function ({ children }: { children: React.ReactNode}) {
  return (
    <Box className="
            w-full min-h-[75vh]
            py-20
            bg-gray-dark-900
        ">
      <Container maxWidth="md" className="section-container">
        {children}
      </Container>
    </Box>
  )
}

export const SectionTitle: React.FC<{ title: string }> = function ({ title }) {
  const [borderStyle, setBorderStyle] = useState('partial-b-opacity');

  return (
    <Box className="w-full"
      onMouseEnter={() => setBorderStyle('partial-b-yellow')}
      onMouseLeave={() => setBorderStyle('partial-b-opacity')}
    >
      <Box className='flex w-auto p-2 lg:p-6'>
        <Typography variant='h1' className={`
          uppercase tracking-tight
          ${borderStyle}
        `}>
          {title} <span className='text-yellow'>.</span>
        </Typography>
      </Box>
    </Box >
  )
}
