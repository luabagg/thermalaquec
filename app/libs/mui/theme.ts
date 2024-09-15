import { createTheme, colors } from '@mui/material';
import config from '../tailwind/config';

// Create a theme instance applying the palette from tailwind.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: config.theme.colors['red-dark'],
      contrastText: config.theme.colors.white,
    },
    secondary: {
      main: config.theme.colors.yellow,
      contrastText: config.theme.colors.ebony,
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
      ...config.theme.fontFamily.sans,
      ...config.theme.fontFamily.serif,
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
    color: config.theme.colors.yellow,
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
  color: config.theme.colors['gray']['300'],
  lineHeight: '1.5'
};

theme.typography.body2 = {
  fontFamily: 'serif',
  fontSize: 16,
  '@media (min-width:768px)': {
    fontSize: 20,
  },
  color: config.theme.colors['gray']['400'],
  lineHeight: '1.3'
};

theme.typography.caption = {
  fontFamily: 'sans-serif',
  fontSize: 16,
  lineHeight: '1'
};

export default theme;