import type { Config } from "tailwindcss";

import { heroui } from "@heroui/react";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Raleway", "sans-serif"],
        sansbold: ["Raleway-heavy", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
      colors: {
        white: "#FFFFFF",
        ebony: "#0B0C10",
        "gray-dark": {
          500: "#1F2225",
          900: "#0F1215",
        },
        "slate-dark": {
          300: "#1C212A",
          500: "#12151B",
        },
        yellow: "#FFD700",
        "red-dark": "#8B0000",
        "blue-light": "#ADD8E6",
        "green-light": "#90EE90",
      },
      borderWidth: {
        "1": "1px",
      },
      boxShadow: {
        "inset-clean": "inset 0 1px 0 rgba(255,255,255,0.2)",
        "xs-clean": "0 1px 0 rgba(255,255,255,0.2)",
      },
      keyframes: {
        fadeInUp: {
          from: {
            transform: "translate3d(0,20px,0)",
            opacity: "0",
          },
          to: {
            transform: "translate3d(0,0,0)",
          },
        },
        fadeInDown: {
          from: {
            transform: "translate3d(0,-20px,0)",
            opacity: "0",
          },
          to: {
            transform: "translate3d(0,0,0)",
          },
        },
        fadeIn: {
          from: {
            opacity: "0",
          },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-in",
        fadeInUp: "fadeInUp 500ms ease-in",
        fadeInDown: "fadeInDown 500ms ease-in",
      },
    },
  },
  plugins: [
    heroui({
      prefix: "heroui", // prefix for themes variables
      addCommonColors: false, // override common colors (e.g. "blue", "green", "pink").
      defaultTheme: "dark", // default theme from the themes object
      defaultExtendTheme: "dark", // default theme to extend on custom themes
      layout: {}, // common layout tokens (applied to all themes)
      themes: {
        light: {
          layout: {}, // light theme layout tokens
          colors: {}, // light theme colors
        },
        dark: {
          layout: {}, // dark theme layout tokens
          colors: {}, // dark theme colors
        },
        // ... custom themes
      },
    }),
  ],
} satisfies Config;
