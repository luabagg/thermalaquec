import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import tailwindConfig from 'tailwind.config';

// Create a theme instance.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#810000',
    },
    secondary: {
      main: '#FFD600',
    },
    error: {
      main: red[900],
    },
  },
});

export default theme;