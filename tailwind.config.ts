const colors = require('tailwindcss/colors')

import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'transparent': 'transparent',
        'current': 'currentColor',
        'black': colors.black,
        'white': colors.white,
        'gray': colors.gray,
        'emerald': colors.emerald,
        'indigo': colors.indigo,
        'yellow': colors.yellow,
        'red-dark': '#810000'
      },
      fontFamily: {
        sans: ['Graphik', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
