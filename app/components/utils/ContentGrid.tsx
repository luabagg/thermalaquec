import * as React from 'react';
import styled from '@emotion/styled';
import { Box, Grid2, Paper, Typography } from '@mui/material';
import tailwindConfig from 'tailwind.config';
import resolveConfig from 'tailwindcss/resolveConfig';

type ContentGridProps = {
  items: Array<{ title: string, text: string }>,
  maxCols?: number,
};

const cfg = resolveConfig(tailwindConfig);

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: cfg.theme.colors['slate-dark-500'],
  textAlign: 'left',
}));

export const ContentGrid: React.FC<ContentGridProps> = ({ items, maxCols = 3 }) => {
  return (
    <Box className="p-2 sm:p-6">
      <Grid2
        container
        className="w-full"
        spacing={{ xs: 4, sm: 6 }}
      >
        {items.map((item: { title: string, text: string }, idx: number) => (
          <Grid2 key={idx} size={{ xs: 12, sm: (12 / maxCols) }}>
            <Item sx={{ p: { xs: 4, sm: 6 } }} elevation={1} square={false}>
              <Typography variant='h2' className='pb-4'>{item.title}.</Typography>
              <Typography variant='body2'>{item.text}</Typography>
            </Item>
          </Grid2>
        ))}
      </Grid2>
    </Box>
  )
}