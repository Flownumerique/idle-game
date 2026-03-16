import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Idle Realms dark fantasy palette
        surface: {
          DEFAULT: "#1a1a2e",
          card: "#16213e",
          hover: "#0f3460",
        },
        gold: {
          DEFAULT: "#f0c040",
          light: "#ffd700",
          dark: "#b8960c",
        },
        rarity: {
          common: "#9ca3af",
          uncommon: "#4ade80",
          rare: "#60a5fa",
          epic: "#c084fc",
          legendary: "#fbbf24",
        },
        xp: "#22d3ee",
      },
    },
  },
  plugins: [],
};

export default config;
