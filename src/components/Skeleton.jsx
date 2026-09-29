export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ThumbnailSkeleton() {
  return (
    <div className="shrink-0 w-10 h-10 rounded border border-[#303236] mt-0.5 overflow-hidden" aria-hidden="true">
      <div className="skeleton w-full h-full" />
    </div>
  );
}

export function PreviewSkeleton({ label }) {
  return (
    <div className="space-y-2">
      {label && <div className="skeleton h-3 w-16 rounded" />}
      <div
        className="rounded border border-[#303236] overflow-hidden aspect-square"
        aria-label="Loading preview…"
        aria-busy="true"
      >
        <div className="skeleton w-full h-full rounded-none" />
      </div>
    </div>
  );
}

export function TextSkeleton({ className = 'h-3 w-24' }) {
  return <div className={`skeleton rounded ${className}`} aria-hidden="true" />;
}
