'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle2, XCircle, User, MapPin, Clock, BarChart3, AlertTriangle, Search, ChevronDown, Loader, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRecentReports, updateComplaintStatus, updateTaskStatus, createNotification } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

const MOCK_REPORTS = [
  { id: 1, complaintId: 'CIV-2026-4821', location: 'Gomti Nagar, Sector 12', wasteType: 'Plastic Waste', amount: '15 kg', status: 'pending', userId: 1, ward: 'Ward 12', severity: 'High', createdAt: new Date() },
  { id: 2, complaintId: 'CIV-2026-3109', location: 'Aliganj, Sector H', wasteType: 'Organic Waste', amount: '8 kg', status: 'pending', userId: 2, ward: 'Ward 18', severity: 'Medium', createdAt: new Date(Date.now() - 86400000) },
  { id: 3, complaintId: 'CIV-2026-5502', location: 'Hazratganj, MG Road', wasteType: 'Mixed Solid Waste', amount: '25 kg', status: 'verified', userId: 1, ward: 'Ward 5', severity: 'Critical', createdAt: new Date(Date.now() - 2 * 86400000), assignedWorker: 'Ramesh Kumar' },
  { id: 4, complaintId: 'CIV-2026-6218', location: 'Indiranagar, Sector 23', wasteType: 'Construction Debris', amount: '40 kg', status: 'completed', userId: 3, ward: 'Ward 25', severity: 'Low', createdAt: new Date(Date.now() - 5 * 86400000), assignedWorker: 'Suresh Yadav' },
]

const WORKERS = ['Ramesh Kumar', 'Suresh Yadav', 'Anil Verma', 'Deepak Singh', 'Priya Kumari']

const SEV_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  High: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  Medium: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  Low: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [accessChecked, setAccessChecked] = useState(false)
  const [reports, setReports] = useState(MOCK_REPORTS as any[])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [assignMap, setAssignMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState<number | null>(null)

  const loadReports = async () => {
    try {
      const r = await getRecentReports(20)
      if (r.length > 0) setReports(r as any)
    } catch {}
  }

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role === 'admin') {
      setAccessChecked(true)
      loadReports()
    } else {
      toast.error('Access denied: Admin privileges required.')
      router.push('/')
    }
  }, [router])

  if (!accessChecked) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const handleVerify = async (report: any) => {
    setLoading(report.id)
    try {
      await updateComplaintStatus(report.id, 'verified')
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'verified', complaintStatus: 'verified' } : r))
      toast.success(`✅ Complaint ${report.complaintId} verified!`)
    } catch { toast.error('Failed to verify') } finally { setLoading(null) }
  }

  const handleAssign = async (report: any) => {
    const worker = assignMap[report.id]
    if (!worker) { toast.error('Please select a worker first'); return }
    setLoading(report.id)
    try {
      await updateTaskStatus(report.id, 'in_progress', undefined)
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'in_progress', assignedWorker: worker } : r))
      toast.success(`👷 ${worker} assigned to ${report.complaintId}!`)
    } catch { toast.error('Failed to assign') } finally { setLoading(null) }
  }

  const handleReject = async (report: any) => {
    setLoading(report.id)
    try {
      await updateComplaintStatus(report.id, 'rejected')
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'rejected' } : r))
      toast.success(`🗑️ Complaint ${report.complaintId} marked as duplicate/rejected.`)
    } catch { toast.error('Failed to reject') } finally { setLoading(null) }
  }

  const filtered = reports.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter
    const matchSearch = (r.complaintId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.location || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    inProgress: reports.filter(r => r.status === 'in_progress' || r.status === 'verified').length,
    resolved: reports.filter(r => r.status === 'completed').length,
    avgResponseDays: 2.4,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3 rounded-2xl shadow-lg"><Shield className="h-7 w-7 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Municipality Admin Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Verify complaints, assign workers, track ward analytics</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Complaints', value: stats.total, color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
          { label: 'Pending Review', value: stats.pending, color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
          { label: 'In Progress', value: stats.inProgress, color: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' },
          { label: 'Resolved', value: stats.resolved, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Avg Response (days)', value: stats.avgResponseDays, color: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} border rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID or location..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'verified', 'in_progress', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.complaintId || `#${r.id}`}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEV_COLORS[r.severity || 'Low'] || SEV_COLORS.Low}`}>{r.severity || 'Low'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : r.status === 'in_progress' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400' : r.status === 'verified' ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'}`}>{r.status?.replace('_', ' ')}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.wasteType} — {r.amount}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{r.location}</p>
                {r.assignedWorker && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1"><User className="h-3 w-3" />Assigned: {r.assignedWorker}</p>}
              </div>

              {/* Actions */}
              {r.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleVerify(r)} disabled={loading === r.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                    {loading === r.id ? <Loader className="animate-spin h-3 w-3" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Verify</>}
                  </Button>
                  <Button size="sm" onClick={() => handleReject(r)} disabled={loading === r.id}
                    variant="outline" className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs">
                    <XCircle className="h-3 w-3 mr-1" />Reject Duplicate
                  </Button>
                </div>
              )}

              {r.status === 'verified' && (
                <div className="flex gap-2 flex-wrap">
                  <select value={assignMap[r.id] || ''} onChange={e => setAssignMap(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select Worker</option>
                    {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <Button size="sm" onClick={() => handleAssign(r)} disabled={loading === r.id}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                    {loading === r.id ? <Loader className="animate-spin h-3 w-3" /> : <><User className="h-3 w-3 mr-1" />Assign</>}
                  </Button>
                </div>
              )}

              {r.status === 'completed' && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-bold">Resolved</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
