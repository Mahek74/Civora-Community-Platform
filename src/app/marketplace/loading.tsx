export default function MarketplaceLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100 animate-pulse">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="h-9 w-44 bg-slate-800 rounded-xl" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-lg" />
      </div>

      {/* Search / filter row */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 flex-1 bg-slate-800 rounded-xl" />
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="h-44 w-full bg-slate-800" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-3 w-full bg-slate-800/60 rounded" />
              <div className="h-3 w-2/3 bg-slate-800/60 rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-16 bg-slate-800 rounded" />
                <div className="h-8 w-24 bg-emerald-900/40 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
