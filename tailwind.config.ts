import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel:  ["var(--font-cinzel)",  "monospace"],
        crimson: ["var(--font-crimson)", "system-ui", "sans-serif"],
      },
      colors: {
        void:  "#17110a",
        abyss: "#1e1710",
        surface: {
          DEFAULT:  "#261d10",
          card:     "#2e2412",
          elevated: "#382d18",
          hover:    "#42341c",
        },
        gold: {
          DEFAULT: "#c8882a",
          light:   "#e0a83c",
          bright:  "#f0c850",
          muted:   "#8a5c1a",
        },
        rarity: {
          common:    "#9aaa9a",
          uncommon:  "#72b860",
          rare:      "#60a8d4",
          epic:      "#9870c8",
          legendary: "#f0c850",
        },
      },
      borderRadius: {
        DEFAULT: "0",
        none:    "0",
        sm:      "0",
        md:      "0",
        lg:      "0",
        xl:      "0",
        "2xl":   "0",
        full:    "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
