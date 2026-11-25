export default function ReportLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto text-slate-100 animate-pulse">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="h-9 w-52 bg-slate-800 rounded-xl" />
        <div className="h-4 w-80 bg-slate-800/60 rounded-lg" />
      </div>

      {/* Form card */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-5">
        {/* Map placeholder */}
        <div className="h-64 w-full bg-slate-800 rounded-2xl" />
        {/* Form fields */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-11 w-full bg-slate-800/70 rounded-xl" />
          </div>
        ))}
        {/* Submit */}
        <div className="h-12 w-full bg-emerald-900/40 rounded-xl mt-2" />
      </div>
    </div>
  )
}
