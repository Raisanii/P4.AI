// P4.AI — ProgressBar: labeled completion/on-time rate bar (§7.9 ANALYTICS).
// ponytail: CSS bar via globals.css; upgrade to shadcn Progress when available.

type Props = {
  label: string;
  value: number; // 0–100
  caption?: string;
};

export default function ProgressBar({ label, value, caption }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-bar-row">
      <div className="progress-bar-head">
        <span className="progress-bar-label">{label}</span>
        <span className="progress-bar-value">{pct}%</span>
      </div>
      <div className="progress-bar-track" role="progressbar" aria-valuenow={pct} aria-label={label}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {caption && <p className="progress-bar-caption">{caption}</p>}
    </div>
  );
}
