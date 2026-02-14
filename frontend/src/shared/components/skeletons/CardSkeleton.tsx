export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-white/10"></div>
        <div className="h-4 w-20 bg-white/10 rounded"></div>
      </div>
      <div className="h-8 w-32 bg-white/10 rounded mb-2"></div>
      <div className="h-2 w-full bg-white/5 rounded-full mt-2"></div>
    </div>
  );
}