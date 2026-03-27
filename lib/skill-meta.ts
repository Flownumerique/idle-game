import type { SkillId } from "@/types/game";

export interface SkillMeta {
  name: string;
  icon: string;
  /** Tailwind background-color class for progress bars */
  bar: string;
  /** RGBA border color with opacity for panel borders */
  borderColor: string;
}

export const SKILL_META: Record<SkillId, SkillMeta> = {
  // Profession skills
  woodcutting: { name: "Bûcheronnage", icon: "🪓", bar: "bg-green-700",   borderColor: "rgba(21,128,61,0.4)"   },
  mining:      { name: "Minage",       icon: "⛏️", bar: "bg-stone-500",   borderColor: "rgba(120,113,108,0.4)" },
  fishing:     { name: "Pêche",        icon: "🎣", bar: "bg-blue-400",    borderColor: "rgba(96,165,250,0.4)"  },
  planting:    { name: "Plantation",   icon: "🌱", bar: "bg-lime-500",    borderColor: "rgba(132,204,22,0.4)"  },
  farming:     { name: "Agriculture",  icon: "🌾", bar: "bg-yellow-600",  borderColor: "rgba(202,138,4,0.4)"   },
  smithing:    { name: "Forge",        icon: "🔨", bar: "bg-orange-600",  borderColor: "rgba(234,88,12,0.4)"   },
  cooking:     { name: "Cuisine",      icon: "🍳", bar: "bg-rose-500",    borderColor: "rgba(244,63,94,0.4)"   },
  alchemy:     { name: "Alchimie",     icon: "⚗️", bar: "bg-violet-500",  borderColor: "rgba(139,92,246,0.4)"  },
  // Combat skills
  attack:       { name: "Attaque",      icon: "⚔️", bar: "bg-amber-500",  borderColor: "rgba(245,158,11,0.4)"  },
  strength:     { name: "Force",        icon: "💪", bar: "bg-orange-500", borderColor: "rgba(249,115,22,0.4)"  },
  ranged:       { name: "Distance",     icon: "🏹", bar: "bg-green-500",  borderColor: "rgba(34,197,94,0.4)"   },
  magic:        { name: "Magie",        icon: "✨", bar: "bg-purple-500", borderColor: "rgba(168,85,247,0.4)"  },
  defense:      { name: "Défense",      icon: "🛡️", bar: "bg-blue-500",   borderColor: "rgba(59,130,246,0.4)"  },
  dodge:        { name: "Esquive",      icon: "💨", bar: "bg-cyan-500",   borderColor: "rgba(6,182,212,0.4)"   },
  constitution: { name: "Constitution", icon: "❤️", bar: "bg-red-500",    borderColor: "rgba(239,68,68,0.4)"   },
  prayer:       { name: "Prière",       icon: "🙏", bar: "bg-yellow-400", borderColor: "rgba(250,204,21,0.4)"  },
};
