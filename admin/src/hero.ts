import { heroui } from "@heroui/react";

// This exports the HeroUI plugin configuration
export default heroui({
  themes: {
    light: {
      colors: {
        background: {
          DEFAULT: "#f8fafc", // Slate-50 for a subtle dashboard background
          50: "#fefefe",
          100: "#fefefe",
          200: "#fafafa",
          300: "#f5f5f5",
          400: "#e5e5e5",
          500: "#d4d4d4",
          600: "#a3a3a3",
          700: "#737373",
          800: "#525252",
          900: "#404040",
        },
        primary: {
          DEFAULT: "#006FEE",
          foreground: "#ffffff",
        },
        focus: "#006FEE",
      },
    },
    dark: {
      colors: {
        background: {
          DEFAULT: "#000000",
          50: "#111111",
        },
        primary: {
          DEFAULT: "#006FEE",
          foreground: "#ffffff",
        },
      },
    },
  },
});
