'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, MapPin, Phone, Zap, Droplets, Construction, Flame, Loader, Shield, Navigation, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, createEmergencyReport, getEmergencyReportsByUser } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

type SOSCategory = {
  id: string
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  description: string
  severity: string
}

const sosCategories: SOSCategory[] = [
  {
    id: 'manhole',
    label: 'Open Manhole',
    icon: Construction,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-400 dark:border-orange-700',
    description: 'Uncovered or damaged manhole on road',
    severity: 'critical',
  },
  {
    id: 'electric',
    label: 'Fallen Electric Wire',
    icon: Zap,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-400 dark:border-red-700',
    description: 'Exposed or fallen electric wire',
    severity: 'critical',
  },
  {
    id: 'water',
    label: 'Water Pipeline Burst',
    icon: Droplets,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-400 dark:border-blue-700',
    description: 'Leaking or burst water pipeline',
    severity: 'high',
  },
  {
    id: 'fire',
    label: 'Waste Fire / Hazard',
    icon: Flame,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-400 dark:border-red-700',
    description: 'Garbage fire or fire hazard spotted',
    severity: 'critical',
  },
]

const EMERGENCY_CONTACTS = [
  { name: 'National Emergency', number: '112', icon: '🚨' },
  { name: 'Police', number: '100', icon: '👮' },
  { name: 'Fire Brigade', number: '101', icon: '🚒' },
  { name: 'Ambulance', number: '108', icon: '🚑' },
  { name: 'Nagar Nigam', number: '1533', icon: '🏛️' },
]

const STATUS_STEPS = ['reported', 'high_priority', 'assigned', 'in_progress', 'resolved']
const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  high_priority: 'High Priority',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export default function EmergencyReportingPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState<string | undefined>()
  const [longitude, setLongitude] = useState<string | undefined>()
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedReport, setSubmittedReport] = useState<any>(null)
  const [myReports, setMyReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report')

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem('userEmail')
      if (email) {
        const u = await getUserByEmail(email)
        if (u) setUser(u)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (user && activeTab === 'history') fetchMyReports()
  }, [user, activeTab])

  const fetchMyReports = async () => {
    if (!user) return
    setLoadingReports(true)
    try {
      const reports = await getEmergencyReportsByUser(user.id)
      setMyReports(reports)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoadingReports(false)
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(5)
        const lng = pos.coords.longitude.toFixed(5)
        setLatitude(lat)
        setLongitude(lng)
        setLocation(`Lat: ${lat}, Lng: ${lng} (GPS Detected)`)
        setGettingLocation(false)
        toast.success('📍 Location captured!')
      },
      () => {
        setGettingLocation(false)
        toast.error('GPS unavailable. Please enter location manually.')
      }
    )
  }

  const handleSubmit = async () => {
    if (!selectedCategory) { toast.error('Please select a hazard type.'); return }
    if (!location.trim()) { toast.error('Please capture or enter your location.'); return }
    if (!user) { toast.error('Please log in to submit a report.'); return }

    setIsSubmitting(true)
    try {
      const category = sosCategories.find(c => c.id === selectedCategory)!
      const report = await createEmergencyReport({
        userId: user.id,
        hazardType: selectedCategory,
        severity: category.severity,
        location: location.trim(),
        latitude,
        longitude,
        description: description.trim() || undefined,
      })

      if (report) {
        setSubmittedReport(report)
        setSubmitted(true)
        toast.success('🚨 Emergency report submitted successfully!')
      } else {
        toast.error('Failed to submit report. Please try again.')
      }
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitted(false)
    setSubmittedReport(null)
    setSelectedCategory(null)
    setLocation('')
    setLatitude(undefined)
    setLongitude(undefined)
    setDescription('')
  }

  const statusIndex = (status: string) => STATUS_STEPS.indexOf(status)

  const statusColor = (status: string) => {
    if (status === 'resolved') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (status === 'in_progress') return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    if (status === 'assigned') return 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    if (status === 'high_priority') return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-red-500 to-orange-600 p-3 rounded-2xl shadow-lg shadow-red-500/20">
            <AlertTriangle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Emergency Civic Reporting</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Report high-risk civic hazards for municipal priority dispatch</p>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <Shield className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300 leading-relaxed">
            <strong className="text-red-200">Public Safety Notice:</strong> This is a civic reporting tool for municipal road/hazard complaints and does not replace official emergency response services. If you or someone else is in immediate physical danger, call National Emergency Response at <strong>112</strong> immediately.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-8 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'report' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          🚨 Report Hazard
        </button>
        <button
          onClick={() => { setActiveTab('history'); fetchMyReports() }}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
          📋 My Reports
        </button>
      </div>

      {activeTab === 'report' ? (
        !submitted ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Hazard Type */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> Select Hazard Type
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {sosCategories.map(cat => {
                    const Icon = cat.icon
                    const selected = selectedCategory === cat.id
                    return (
                      <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${selected ? `${cat.bgColor} ${cat.borderColor} shadow-lg scale-[1.02]` : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                        <Icon className={`h-6 w-6 mb-2 ${selected ? cat.color : 'text-slate-500 dark:text-slate-400'}`} />
                        <p className={`text-sm font-bold ${selected ? cat.color : 'text-slate-700 dark:text-slate-300'}`}>{cat.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{cat.description}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${cat.severity === 'critical' ? 'text-red-500 bg-red-100 dark:bg-red-950/30' : 'text-orange-500 bg-orange-100 dark:bg-orange-950/30'}`}>
                          {cat.severity.toUpperCase()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* GPS Location */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" /> Your Location
                </h2>
                <Button onClick={getLocation} disabled={gettingLocation} variant="outline"
                  className="border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 mb-3">
                  {gettingLocation ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                  Auto-Detect GPS
                </Button>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Or type your location manually..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Describe the Hazard</h2>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Briefly describe what you see and how urgent it is..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 h-24 resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedCategory || !location.trim() || !user}
                className="w-full py-7 text-xl font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl shadow-2xl shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting
                  ? <><Loader className="animate-spin mr-3 h-5 w-5" /> Submitting...</>
                  : '🚨 Submit Emergency Report'
                }
              </Button>
              {!user && (
                <p className="text-center text-sm text-slate-500">Please <strong>log in</strong> to submit a report.</p>
              )}
            </div>

            {/* Right panel: emergency contacts */}
            <div>
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-red-200 dark:border-red-900/30 sticky top-24">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-500" /> Emergency Numbers
                </h2>
                <div className="space-y-2 mb-6">
                  {EMERGENCY_CONTACTS.map((c, i) => (
                    <a key={i} href={`tel:${c.number}`}
                      className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-400/50 transition-colors group">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.icon} {c.name}</span>
                      <span className="text-base font-black text-red-500 group-hover:text-red-400">{c.number}</span>
                    </a>
                  ))}
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ For life-threatening emergencies, always call <strong>112</strong> first before submitting a report.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── SUCCESS STATE (real DB) ── */
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Report Submitted</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Your emergency report has been saved to the database. Admin will review and prioritize it.
              </p>

              {/* Report summary */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-left space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Report ID</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">#{submittedReport?.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Hazard</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{submittedReport?.hazardType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Severity</span>
                  <span className={`font-bold capitalize ${submittedReport?.severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`}>
                    {submittedReport?.severity}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-red-500 capitalize">Reported</span>
                </div>
              </div>

              {/* Status pipeline */}
              <div className="flex items-center justify-between mb-6 px-2">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div className={`flex flex-col items-center ${i === 0 ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-red-500 border-red-500 text-white' : 'border-slate-400 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 text-center leading-tight max-w-[40px]">
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-slate-400 mx-0.5 mb-3" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={resetForm} variant="outline" className="flex-1 border-slate-300 dark:border-slate-700">
                  Report Another
                </Button>
                <Button onClick={() => { setActiveTab('history'); fetchMyReports() }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                  View My Reports
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ── HISTORY TAB ── */
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Emergency Reports</h2>
            <Button size="sm" onClick={fetchMyReports} variant="outline" className="border-slate-700 text-slate-400 text-xs">
              Refresh
            </Button>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="animate-spin h-8 w-8 text-red-500" />
            </div>
          ) : myReports.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No emergency reports submitted yet.</p>
            </div>
          ) : (
            myReports.map(report => {
              const cat = sosCategories.find(c => c.id === report.hazardType)
              const Icon = cat?.icon ?? AlertTriangle
              const step = statusIndex(report.status)
              return (
                <div key={report.id} className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl">
                        <Icon className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 capitalize">{cat?.label ?? report.hazardType}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {report.location}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(report.status)}`}>
                      {STATUS_LABELS[report.status] ?? report.status}
                    </span>
                  </div>

                  {/* Status pipeline */}
                  <div className="flex items-center gap-1 mb-3">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                    {STATUS_STEPS.map(s => (
                      <span key={s} className={statusIndex(report.status) >= statusIndex(s) ? 'text-red-400 font-bold' : ''}>{STATUS_LABELS[s]}</span>
                    ))}
                  </div>

                  {report.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">{report.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(report.reportedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {report.resolvedAt && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Resolved {new Date(report.resolvedAt).toLocaleDateString('en-IN')}</span>}
                    {report.assignedTo && <span className="text-purple-400">👷 {report.assignedTo}</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
