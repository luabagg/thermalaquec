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
      main: colors.orange[500],
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
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
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
  fontFamily: 'sans-serif',
  fontSize: 16,
  fontWeight: 700,
  '@media (min-width:768px)': {
    fontSize: 18,
  },
  lineHeight: '1'
};

theme.typography.subtitle1 = {
  fontFamily: 'serif',
  fontSize: 16,
  '@media (min-width:768px)': {
    fontSize: 18,
  },
  lineHeight: '1.5',
};

theme.typography.caption = {
  fontFamily: 'serif',
  fontSize: 16,
  '@media (min-width:768px)': {
    fontSize: 20,
  },
  lineHeight: '1.5'
};

theme.typography.body1 = {
  fontFamily: 'serif',
  lineHeight: '1.5'
};

export default theme;