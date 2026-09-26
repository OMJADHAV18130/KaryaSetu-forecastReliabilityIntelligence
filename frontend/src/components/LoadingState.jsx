export function LoadingState({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-8 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-navy-800 rounded-lg flex items-center justify-center border border-border">
      <div className="text-center space-y-3">
        <div className="skeleton h-4 w-32 mx-auto" />
        <div className="skeleton h-3 w-48 mx-auto" />
        <div className="text-slate-500 text-sm">Loading map data…</div>
      </div>
    </div>
  );
}
