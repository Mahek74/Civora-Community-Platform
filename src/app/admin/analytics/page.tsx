'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, TrendingUp, MapPin, Clock, Users, Leaf, Loader, PieChart, Activity } from 'lucide-react'
import { getAnalyticsData } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

const CATEGORY_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-amber-500']

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role !== 'admin') {
      toast.error('Access denied: Admin privileges required.')
      router.push('/')
      return
    }

    const load = async () => {
      const result = await getAnalyticsData()
      setData(result)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  )

  // Fallback if DB empty
  const total = data?.total ?? 0
  const resolved = data?.resolved ?? 0
  const pending = data?.pending ?? 0
  const inProgress = data?.inProgress ?? 0
  const activeUsers = data?.activeUsers ?? 0
  const wardData = data?.wardData ?? []
  const categoryData = data?.categoryData ?? []
  const trendData = data?.trendData ?? []
  const maxBar = Math.max(...trendData.map((d: any) => d.complaints), 1)

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-3 rounded-2xl shadow-lg"><Activity className="h-7 w-7 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Civic Analytics Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Live city-wide complaint intelligence from database</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Complaints', value: total, delta: `${pending} pending`, icon: BarChart3, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
          { label: 'Resolved', value: resolved, delta: `${resolutionRate}% resolution rate`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'In Progress', value: inProgress, delta: 'Being worked on', icon: Clock, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
          { label: 'Active Citizens', value: activeUsers, delta: 'Registered users', icon: Users, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color} border rounded-2xl p-5 shadow-sm`}>
            <kpi.icon className="h-6 w-6 mb-2" />
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{kpi.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-slate-500 mt-1">{kpi.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Weekly Trend Chart — Real data */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />Weekly Complaint Trend
          </h2>
          {trendData.length > 0 ? (
            <>
              <div className="flex items-end justify-between gap-2 h-40 px-2 mb-3">
                {trendData.map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-700" style={{ height: `${(d.complaints / maxBar) * 120}px`, minHeight: 4 }} />
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-700" style={{ height: `${(d.resolved / maxBar) * 80}px`, minHeight: 2, opacity: 0.6 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-2">
                {trendData.map((d: any, i: number) => <span key={i} className="text-xs text-slate-500 flex-1 text-center">{d.day}</span>)}
              </div>
              <div className="flex gap-4 mt-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><div className="h-2.5 w-2.5 bg-blue-500 rounded-sm" />Reported</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><div className="h-2.5 w-2.5 bg-emerald-500 rounded-sm opacity-60" />Resolved</span>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No report data yet</div>
          )}
        </div>

        {/* Category Breakdown — Real data */}
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-400" />Waste Categories
          </h2>
          {categoryData.length > 0 ? (
            <div className="space-y-3">
              {categoryData.map((cat: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.count} <span className="text-xs text-slate-500">({cat.pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-2.5 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} transition-all duration-700`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No category data yet</div>
          )}
        </div>
      </div>

      {/* Ward Comparison Table — Real data */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md mb-8">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-400" />Ward-wise Comparison
        </h2>
        {wardData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 pr-4">Ward</th>
                  <th className="text-right py-3 px-4">Total</th>
                  <th className="text-right py-3 px-4">Resolved</th>
                  <th className="text-left py-3 pl-4">Progress</th>
                </tr>
              </thead>
              <tbody>
                {wardData.map((w: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">{w.ward}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{w.complaints}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{w.resolved}</td>
                    <td className="py-3 pl-4 w-32">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${w.complaints > 0 ? Math.round((w.resolved / w.complaints) * 100) : 0}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{w.complaints > 0 ? Math.round((w.resolved / w.complaints) * 100) : 0}% resolved</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">No ward data yet — reports with ward info will appear here.</p>
        )}
      </div>

      {/* Environmental Impact */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Leaf className="h-5 w-5 text-emerald-500" />Community Environmental Impact</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'CO₂ Reduced', value: `${(resolved * 5).toFixed(0)} kg`, icon: '♻️' },
            { label: 'Waste Reported', value: `${total} Issues`, icon: '🗑️' },
            { label: 'Cases Resolved', value: resolved, icon: '✅' },
            { label: 'Citizens Active', value: activeUsers, icon: '🏆' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/50 rounded-xl p-4 text-center border border-emerald-500/15">
              <span className="text-2xl block mb-1">{s.icon}</span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
