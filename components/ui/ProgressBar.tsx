"use client";

interface ProgressBarProps {
  value: number; // 0.0–1.0
  color?: string;
  height?: string;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  color = "bg-green-500",
  height = "h-2",
  label,
  showPercent,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  // Round to nearest 2px step for a chunky pixel feel
  const pctDisplay = Math.floor(pct);

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div
          className="flex justify-between mb-1 font-crimson"
          style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}
        >
          {label && <span>{label}</span>}
          {showPercent && <span className="font-cinzel" style={{ fontSize: "0.55rem" }}>{pctDisplay}%</span>}
        </div>
      )}
      {/* Pixel track — uses border instead of rounded */}
      <div
        className={`w-full ${height}`}
        style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid var(--border-default)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7)",
        }}
      >
        <div
          className={`${height} ${color} progress-bar-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
