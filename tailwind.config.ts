import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Raleway', 'sans-serif'],
      sansbold: ['Raleway-heavy', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      colors: {
        'white': "#FCFCFC",
        'ebony': '#080402',
        'gray-dark-900': '#0F1215',
        'gray-dark-500': '#1F2225',
        'yellow': "#FFD600",
        'red-dark': '#810000'
      },
      spacing: {
        '4xl': '48rem',
        '8xl': '96rem',
        '9xl': '128rem',
        '.25': '25%',
        '.50': '50%',
        '.75': '75%',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
} satisfies Config
