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
  color = "bg-cyan-500",
  height = "h-2",
  label,
  showPercent,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full progress-bar-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
