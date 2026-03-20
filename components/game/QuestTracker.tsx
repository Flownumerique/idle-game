"use client";

import { useGameStore } from "@/stores/game-store";

export default function QuestTracker() {
  const quests = useGameStore((s) => s.quests);

  const activeQuests = Object.values(quests)
    .filter((q) => q.status === "active")
    .map((q) => {
      let totalCurrent = 0;
      let totalRequired = 0;
      let mostAdvancedObjective = q.objectives[0];
      let maxProgress = 0;
      for (const obj of q.objectives) {
        totalCurrent += obj.current;
        totalRequired += obj.required;
        const progress = obj.current / obj.required;
        if (progress >= maxProgress) { maxProgress = progress; mostAdvancedObjective = obj; }
      }
      return {
        ...q,
        completionPercentage: totalRequired > 0 ? totalCurrent / totalRequired : 0,
        mostAdvancedObjective,
      };
    })
    .sort((a, b) => b.completionPercentage - a.completionPercentage)
    .slice(0, 3);

  return (
    <aside
      className="hidden lg:flex w-52 flex-shrink-0 flex-col overflow-hidden"
      style={{
        background: "var(--void)",
        borderRight: "2px solid var(--border-default)",
      }}
    >
      <div className="px-3 pt-3 pb-2.5" style={{ borderBottom: "2px solid var(--border-default)" }}>
        <div className="section-title">Quêtes</div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {activeQuests.length === 0 ? (
          <p className="font-cinzel mt-2 px-1" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>
            AUCUNE QUÊTE ACTIVE
          </p>
        ) : (
          activeQuests.map((quest) => {
            const isMQ = quest.questId.startsWith("mq");
            const isSQ = quest.questId.startsWith("sq");
            const questLabel = isMQ ? "PRINCIPALE" : isSQ ? "MÉTIER" : "JOURNALIÈRE";
            const questColor = isMQ
              ? "var(--gold-light)"
              : isSQ
              ? "var(--color-xp)"
              : "var(--color-heal)";
            const questIcon = isMQ ? "★" : isSQ ? "◆" : "▸";

            const obj = quest.mostAdvancedObjective;
            const pct = obj ? Math.min(100, (obj.current / obj.required) * 100) : 0;

            return (
              <div key={quest.questId} className="game-card !p-2.5 cursor-pointer">
                {/* Quest type badge */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span style={{ color: questColor, fontSize: "0.5rem" }}>{questIcon}</span>
                  <span className="font-cinzel" style={{ fontSize: "0.45rem", color: questColor }}>
                    {questLabel}
                  </span>
                </div>

                {obj && (
                  <>
                    <p
                      className="font-crimson leading-snug mb-2 truncate"
                      style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
                      title={obj.target}
                    >
                      {obj.type === "kill"   ? `Tuer ${obj.target}`
                       : obj.type === "gather" ? `Collecter ${obj.target}`
                       : obj.type === "craft"  ? `Fabriquer ${obj.target}`
                       : obj.type === "sell"   ? `Vendre au marché`
                       : obj.target}
                    </p>

                    <div className="flex justify-between items-center mb-1">
                      <span className="font-cinzel" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>
                        PROG.
                      </span>
                      <span className="font-cinzel" style={{ fontSize: "0.5rem", color: questColor }}>
                        {obj.current}/{obj.required}
                      </span>
                    </div>
                    <div
                      className="w-full h-2"
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <div
                        className="h-full progress-bar-fill"
                        style={{ width: `${pct}%`, background: questColor }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
