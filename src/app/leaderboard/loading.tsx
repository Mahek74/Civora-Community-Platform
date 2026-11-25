export default function LeaderboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100 animate-pulse">
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <div className="h-9 w-64 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-lg mx-auto" />
      </div>

      {/* Card */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 h-28" />
        {/* Table rows */}
        <div className="divide-y divide-slate-800/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5">
              <div className="h-7 w-7 bg-slate-800 rounded-full" />
              <div className="h-10 w-10 bg-slate-800 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-3 w-16 bg-slate-800/60 rounded" />
              </div>
              <div className="h-6 w-14 bg-slate-800 rounded-full" />
              <div className="h-6 w-14 bg-slate-800 rounded-full" />
              <div className="h-6 w-14 bg-slate-800 rounded-full" />
              <div className="h-6 w-16 bg-slate-800 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
