import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        background: {
          DEFAULT: "#f2f6fc",
          200: "#e7eef8",
        },
        primary: {
          DEFAULT: "#1d3f72",
          foreground: "#eef4ff",
        },
      },
    },
    dark: {
      colors: {
        background: {
          DEFAULT: "#070f1f",
          200: "#0d1830",
        },
        foreground: "#d8e6ff",
        default: {
          DEFAULT: "#1a2f53",
          foreground: "#e6efff",
        },
        primary: {
          DEFAULT: "#335d9b",
          foreground: "#f2f6ff",
        },
      },
    },
  },
});
