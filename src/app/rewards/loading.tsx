export default function RewardsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100 animate-pulse">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="h-9 w-48 bg-slate-800 rounded-xl" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="h-8 w-24 bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Rewards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 bg-slate-800 rounded" />
            <div className="h-4 w-full bg-slate-800/60 rounded" />
            <div className="h-4 w-3/4 bg-slate-800/60 rounded" />
            <div className="h-9 w-full bg-slate-800 rounded-xl mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
