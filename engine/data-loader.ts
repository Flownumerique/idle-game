import rawItems    from '../items.json'
import rawSkills   from '../skills.json'
import rawRecipes  from '../recipes.json'
import rawZones    from '../zones_monsters.json'
import rawQuests   from '../quests.json'

// Maps indexées pour lookups O(1)
const itemMap    = new Map<string, any>(rawItems.items.map(i => [i.id, i]))
const skillMap   = new Map<string, any>(rawSkills.skills.map(s => [s.id, s]))
const recipeMap  = new Map<string, any>(rawRecipes.recipes.map(r => [r.id, r]))
const monsterMap = new Map<string, any>(rawZones.monsters.map(m => [m.id, m]))
const zoneMap    = new Map<string, any>(rawZones.zones.map(z => [z.id, z]))
const questMap   = new Map<string, any>([
  ...rawQuests.mainQuests.map(q => [q.id, q] as const),
  ...Object.values(rawQuests.skillQuests).flat().map(q => [q.id, q] as const),
])

// Accesseurs avec erreur explicite
export const GameData = {
  item    : (id: string) => { const v = itemMap.get(id);    if (!v) throw new Error(`Unknown item: ${id}`);    return v },
  skill   : (id: string) => { const v = skillMap.get(id);   if (!v) throw new Error(`Unknown skill: ${id}`);   return v },
  recipe  : (id: string) => { const v = recipeMap.get(id);  if (!v) throw new Error(`Unknown recipe: ${id}`);  return v },
  monster : (id: string) => { const v = monsterMap.get(id); if (!v) throw new Error(`Unknown monster: ${id}`); return v },
  zone    : (id: string) => { const v = zoneMap.get(id);    if (!v) throw new Error(`Unknown zone: ${id}`);    return v },
  quest   : (id: string) => { const v = questMap.get(id);   if (!v) throw new Error(`Unknown quest: ${id}`);   return v },

  // Collections filtrées
  itemsOfCategory : (cat: string) => rawItems.items.filter(i => i.category === cat),
  recipesForSkill : (skillId: string) => rawRecipes.recipes.filter(r => r.skill === skillId),
  monstersInZone  : (zoneId: string) => rawZones.monsters.filter(m => m.zone === zoneId),
  actionsForSkill : (skillId: string) => GameData.skill(skillId).actions ?? [],
} as const

// Validation au démarrage
export function validateGameData(): void {
  const errors: string[] = []
  rawRecipes.recipes.forEach(r => {
    r.inputs?.forEach((i: any) => { if (!itemMap.has(i.itemId)) errors.push(`Recipe ${r.id}: unknown input ${i.itemId}`) })
    if (r.output && !itemMap.has((r.output as any).itemId)) errors.push(`Recipe ${r.id}: unknown output ${(r.output as any).itemId}`)
  })
  rawZones.monsters.forEach(m => {
    m.drops?.forEach((d: any) => { if (!itemMap.has(d.itemId)) errors.push(`Monster ${m.id}: unknown drop ${d.itemId}`) })
  })
  if (errors.length > 0) throw new Error(`Data validation failed:\n${errors.join('\n')}`)
}
