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
        '.25': '25%',
        '.50': '50%',
        '.75': '75%',
      },
      boxShadow: {
        'inset-clean': 'inset 0 1px 0 rgba(255,255,255,0.2)',
        'xs-clean': '0 1px 0 rgba(255,255,255,0.2)',
      },
      keyframes: {
        fadeInUp: {
          from: {
            transform: "translate3d(0,20px,0)",
            opacity: "0"
          },
          to: {
            transform: "translate3d(0,0,0)",
          }
        },
        fadeInDown: {
          from: {
            transform: "translate3d(0,-20px,0)",
            opacity: "0"
          },
          to: {
            transform: "translate3d(0,0,0)",
          }
        }
      },
      animation: {
        'fadeInUp': 'fadeInUp 500ms ease-in',
        'fadeInDown': 'fadeInDown 500ms ease-in',
      }
    },
  },
  plugins: [],
} satisfies Config
