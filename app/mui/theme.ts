import { createTheme } from '@mui/material/styles';
import { colors } from '@mui/material';

// Create a theme instance.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#810000',
      contrastText: "#FCFCFC",
    },
    secondary: {
      main: '#FFD600',
      contrastText: "#080402",
    },
    error: {
      main: colors.red[900],
    },
    warning: {
      main: colors.orange[500],
    }
  },
  typography: {
    fontFamily: [
      '"Merriweather"',
      'serif',
      '"Raleway"',
      'sans-serif',
    ].join(','),
  },
  spacing: 4,
  transitions: {
    easing: {
      // This is the most common easing curve.
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Objects enter the screen at full velocity from off-screen and
      // slowly decelerate to a resting point.
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      // Objects leave the screen at full velocity. They do not decelerate when off-screen.
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      // The sharp curve is used by objects that may return to the screen at any time.
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
});

export default theme;