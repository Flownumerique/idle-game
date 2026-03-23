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
        void: "var(--void)",
        abyss: "var(--abyss)",
        surface: {
          DEFAULT: "var(--surface)",
          card: "var(--surface-card)",
          elevated: "var(--surface-elevated)",
          hover: "var(--surface-hover)",
        },
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          accent: "var(--border-accent)",
          gold: "var(--border-gold)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light: "var(--gold-light)",
          bright: "var(--gold-bright)",
          muted: "var(--gold-muted)",
        },
        damage: "var(--color-damage)",
        heal: "var(--color-heal)",
        crit: "var(--color-crit)",
        xp: "var(--color-xp)",
        magic: "var(--color-magic)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        rarity: {
          common: "var(--rarity-common)",
          uncommon: "var(--rarity-uncommon)",
          rare: "var(--rarity-rare)",
          epic: "var(--rarity-epic)",
          legendary: "var(--rarity-legendary)",
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
