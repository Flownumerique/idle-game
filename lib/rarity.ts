/** Shared rarity constants used across UI components. */

export const RARITY_COLOR: Record<string, string> = {
  common:    "var(--rarity-common)",
  uncommon:  "var(--rarity-uncommon)",
  rare:      "var(--rarity-rare)",
  epic:      "var(--rarity-epic)",
  legendary: "var(--rarity-legendary)",
  boss:      "var(--rarity-legendary)",
};

export const RARITY_BORDER: Record<string, string> = {
  common:    "var(--border-default)",
  uncommon:  "rgba(114,184,96,0.35)",
  rare:      "rgba(96,168,212,0.35)",
  epic:      "rgba(152,112,200,0.35)",
  legendary: "rgba(240,200,80,0.45)",
  boss:      "rgba(240,200,80,0.45)",
};

export const RARITY_LABEL: Record<string, string> = {
  common:    "COMMUN",
  uncommon:  "PEU COMMUN",
  rare:      "RARE",
  epic:      "ÉPIQUE",
  legendary: "LÉGENDAIRE",
  boss:      "BOSS",
};

export const RARITY_ORDER = ["legendary", "boss", "epic", "rare", "uncommon", "common"];

/**
 * Returns the CSS color variable for an item rarity.
 * Used for text coloring on equipment/loot labels.
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common:    "var(--text-secondary)",
    uncommon:  "var(--color-xp)",
    rare:      "var(--color-magic)",
    epic:      "var(--color-crit)",
    legendary: "var(--gold-light)",
    boss:      "var(--gold-light)",
  };
  return colors[rarity] ?? "var(--text-primary)";
}
