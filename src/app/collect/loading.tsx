export default function CollectLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto text-slate-100 animate-pulse">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="h-9 w-52 bg-slate-800 rounded-xl" />
        <div className="h-4 w-72 bg-slate-800/60 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-800 rounded-xl" />
        ))}
      </div>

      {/* Waste cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-56 bg-slate-800/60 rounded" />
            </div>
            <div className="h-9 w-28 bg-slate-800 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
