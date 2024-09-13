import { createTheme, colors } from '@mui/material';
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from 'tailwind.config.js'

const cfg = resolveConfig(tailwindConfig)

// Create a theme instance applying the palette from tailwind.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: cfg.theme.colors['red-dark'],
      contrastText: cfg.theme.colors.white,
    },
    secondary: {
      main: cfg.theme.colors.yellow,
      contrastText: cfg.theme.colors.ebony,
    },
    error: {
      main: colors.red[900],
    },
    warning: {
      main: colors.orange[900],
    }
  },
  typography: {
    fontSize: 16,
    fontFamily: [
      ...cfg.theme.fontFamily.sans,
      ...cfg.theme.fontFamily.serif,
    ].join(','),
  },
  spacing: 4,
});

theme.typography.h1 = {
  fontFamily: 'sans-serif',
  fontSize: 16,
  fontWeight: 700,
  '@media (min-width:768px)': {
    fontSize: 18,
  },
};

theme.typography.h2 = {
  ...theme.typography.h1,
  ...{
    color: cfg.theme.colors.yellow,
    lineHeight: '1',
  },
};

theme.typography.subtitle1 = {
  fontFamily: 'serif',
  fontSize: 18,
  '@media (min-width:768px)': {
    fontSize: 20,
  },
  lineHeight: '1.5'
};

theme.typography.body1 = {
  fontFamily: 'serif',
  fontSize: 18,
  '@media (min-width:768px)': {
    fontSize: 20,
  },
  color: cfg.theme.colors['gray']['300'],
  lineHeight: '1.5'
};

theme.typography.body2 = {
  fontFamily: 'serif',
  fontSize: 16,
  '@media (min-width:768px)': {
    fontSize: 20,
  },
  color: cfg.theme.colors['gray']['400'],
  lineHeight: '1.3'
};

theme.typography.caption = {
  fontFamily: 'sans-serif',
  fontSize: 16,
  lineHeight: '1'
};

export default theme;