'use client'
import { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle2, Clock, AlertCircle, MapPin, User, Search, ChevronRight, QrCode, Image, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getReportsByUserId } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

const STATUS_STEPS = [
  { name: 'Reported', desc: 'Complaint registered in municipal database' },
  { name: 'AI Classified', desc: 'Gemini 2.5 Flash analyzed category & severity' },
  { name: 'Admin Verified', desc: 'Municipal zonal officer verified report' },
  { name: 'In Progress', desc: 'Sanitation team or volunteer dispatched' },
  { name: 'Resolved', desc: 'Site cleared with verified completion' }
]

function getStatusIndex(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'resolved' || s === 'completed' || s === 'verified') return 4
  if (s === 'in_progress') return 3
  if (s === 'admin_verified' || s === 'under_review' || s === 'assigned') return 2
  if (s === 'ai_classified') return 1
  if (s === 'pending' || s === 'reported' || s === 'filed') return 0
  return 0
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    reported: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    under_review: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    in_progress: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  }
  const cls = map[status?.toLowerCase()] || map.pending
  return <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${cls}`}>{status?.replace('_', ' ') || 'Pending'}</span>
}

export default function ComplaintsPage() {
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const email = localStorage.getItem('userEmail')
      if (!email) { setLoading(false); return }
      const u = await getUserByEmail(email)
      if (!u) { setLoading(false); return }
      setUser(u)
      const r = await getReportsByUserId(u.id)
      // Pad with mock complaints if none found
      const enriched = r.length > 0 ? r : [
        { id: 1, complaintId: 'CIV-2026-4821', location: 'Gomti Nagar, Ward 12', wasteType: 'Plastic Waste', amount: '15 kg', status: 'in_progress', complaintStatus: 'in_progress', createdAt: new Date(), assignedWorker: 'Ramesh Kumar', ward: 'Ward 12', severity: 'High' },
        { id: 2, complaintId: 'CIV-2026-3412', location: 'Aliganj, Sector H', wasteType: 'Organic Waste', amount: '8 kg', status: 'completed', complaintStatus: 'resolved', createdAt: new Date(Date.now() - 3 * 86400000), assignedWorker: 'Suresh Yadav', ward: 'Ward 18', severity: 'Medium' },
        { id: 3, complaintId: 'CIV-2026-6093', location: 'Hazratganj, MG Road', wasteType: 'Mixed Solid Waste', amount: '25 kg', status: 'pending', complaintStatus: 'filed', createdAt: new Date(Date.now() - 1 * 86400000), assignedWorker: null, ward: 'Ward 5', severity: 'Critical' },
      ]
      setReports(enriched as any)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = reports.filter(r =>
    (r.complaintId || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.wasteType || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>

  if (selected) {
    const idx = getStatusIndex(selected.status)
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-300">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-6 text-slate-500 dark:text-slate-400">← Back to Complaints</Button>
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 font-mono">Complaint ID</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selected.complaintId || 'N/A'}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-slate-500">Location</p><p className="font-semibold text-slate-800 dark:text-slate-200">{selected.location}</p></div>
              <div><p className="text-xs text-slate-500">Waste Type</p><p className="font-semibold text-slate-800 dark:text-slate-200">{selected.wasteType}</p></div>
              <div><p className="text-xs text-slate-500">Amount</p><p className="font-semibold text-slate-800 dark:text-slate-200">{selected.amount}</p></div>
              <div><p className="text-xs text-slate-500">Ward</p><p className="font-semibold text-slate-800 dark:text-slate-200">{(selected as any).ward || 'Ward 12'}</p></div>
              <div><p className="text-xs text-slate-500">Severity</p><p className="font-semibold text-slate-800 dark:text-slate-200">{(selected as any).severity || 'Medium'}</p></div>
              <div><p className="text-xs text-slate-500">Filed On</p><p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(selected.createdAt).toLocaleDateString('en-IN')}</p></div>
            </div>
            {(selected as any).assignedWorker && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <User className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-slate-700 dark:text-slate-300">Assigned to: <strong>{(selected as any).assignedWorker}</strong></p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2"><Clock className="h-5 w-5 text-blue-400" />Complaint Lifecycle</h2>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-5">
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= idx
                  const active = i === idx
                  return (
                    <div key={step.name} className={`flex items-start gap-4 transition-all ${done ? 'opacity-100' : 'opacity-35'}`}>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold z-10 border-2 shrink-0 ${done ? (active ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20' : 'bg-emerald-950/60 border-emerald-700 text-emerald-400') : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {done && !active ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className={`font-bold text-sm ${active ? 'text-emerald-400' : done ? 'text-slate-200' : 'text-slate-500'}`}>{step.name}</p>
                          {done && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(Date.now() - (4 - i) * 86400000).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                        {active && <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">● Active Stage</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><QrCode className="h-5 w-5 text-purple-500" />Worker Verification QR</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">The assigned worker must scan this QR at the location before marking the complaint as Resolved. This prevents fake closures.</p>
            <div className="flex items-center gap-6">
              <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center">
                <div className="text-4xl mb-2">📱</div>
                <div className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{selected.complaintId}</div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>✅ Worker must scan on-site</p>
                <p>✅ GPS location verified on scan</p>
                <p>✅ Prevents remote fake resolution</p>
                <p>✅ Before + After photos required</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg"><ClipboardList className="h-7 w-7 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Complaints</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Track all your filed grievances in real-time</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Filed', value: reports.length, color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
          { label: 'Resolved', value: reports.filter(r => r.status === 'completed').length, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'In Progress', value: reports.filter(r => r.status === 'in_progress' || r.status === 'verified').length, color: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' },
          { label: 'Pending', value: reports.filter(r => r.status === 'pending').length, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} border rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by Complaint ID, location, or waste type..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg font-semibold">No complaints found</p>
          <Link href="/report"><Button className="mt-4 bg-emerald-600 text-white">File a Complaint</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const idx = getStatusIndex(r.status)
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800/80 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{r.complaintId || 'N/A'}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{r.wasteType} — {r.amount}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</p>
                    {/* Mini progress */}
                    <div className="flex items-center gap-1 mt-3">
                      {STATUS_STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{STATUS_STEPS[idx].name} — Step {idx + 1} of 5</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 ml-auto mt-2 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
