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
    fontFamily: [
      ...cfg.theme.fontFamily.sans,
      ...cfg.theme.fontFamily.serif,
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