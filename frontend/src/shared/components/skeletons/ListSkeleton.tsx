export function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded"></div>
              <div className="h-3 w-24 bg-white/5 rounded"></div>
            </div>
          </div>
          <div className="h-4 w-20 bg-white/10 rounded"></div>
        </div>
      ))}
    </div>
  );
}