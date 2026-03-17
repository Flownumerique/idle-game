"use client";

import { useGameStore } from "@/stores/game-store";

export default function QuestTracker() {
  const quests = useGameStore((s) => s.quests);

  // Filter for active quests
  const activeQuests = Object.values(quests)
    .filter((q) => q.status === "active")
    .map((q) => {
      // Calculate completion percentage based on objectives
      let totalCurrent = 0;
      let totalRequired = 0;
      let mostAdvancedObjective = q.objectives[0];
      let maxProgress = 0;

      for (const obj of q.objectives) {
        totalCurrent += obj.current;
        totalRequired += obj.required;
        const progress = obj.current / obj.required;
        if (progress >= maxProgress) {
          maxProgress = progress;
          mostAdvancedObjective = obj;
        }
      }

      const completionPercentage = totalRequired > 0 ? totalCurrent / totalRequired : 0;

      return {
        ...q,
        completionPercentage,
        mostAdvancedObjective,
      };
    })
    .sort((a, b) => b.completionPercentage - a.completionPercentage)
    .slice(0, 3); // Get top 3

  if (activeQuests.length === 0) {
    return (
      <div className="w-64 bg-[#0d1525] border-r border-[#0f3460] p-4 flex-shrink-0 flex flex-col hidden md:flex">
        <h3 className="font-bold text-slate-200 mb-4 pb-2 border-b border-slate-700/50">Quêtes Actives</h3>
        <p className="text-xs text-slate-500 italic">Aucune quête en cours.</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#0d1525] border-r border-[#0f3460] p-4 flex-shrink-0 flex flex-col hidden md:flex">
      <h3 className="font-bold text-slate-200 mb-4 pb-2 border-b border-slate-700/50">Quêtes Actives</h3>

      <div className="space-y-4">
        {activeQuests.map((quest) => {
          // A little generic mapping for objective target names
          // You could map questId to its actual name from quests.json if you wanted,
          // but here we just use the id for now or a generic label
          const questName = quest.questId.startsWith("mq") ? "Quête Principale"
            : quest.questId.startsWith("sq") ? "Quête de Métier"
            : "Quête Journalière";

          const obj = quest.mostAdvancedObjective;

          return (
            <div key={quest.questId} className="bg-[#16213e] p-3 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-colors cursor-pointer">
              <div className="text-sm font-semibold text-blue-300 mb-1">{questName}</div>

              {obj && (
                <>
                  <div className="text-xs text-slate-400 mb-2 truncate" title={obj.target}>
                    {obj.type === "kill" ? `Tuer ${obj.target}`
                      : obj.type === "gather" ? `Collecter ${obj.target}`
                      : obj.type === "craft" ? `Fabriquer ${obj.target}`
                      : obj.type === "sell" ? `Vendre au marché`
                      : `Objectif: ${obj.target}`}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (obj.current / obj.required) * 100))}%` }}
                      />
                    </div>
                    <span className="text-slate-400 font-mono w-10 text-right">
                      {obj.current}/{obj.required}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
