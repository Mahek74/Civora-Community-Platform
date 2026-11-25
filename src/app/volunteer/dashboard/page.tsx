'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, Camera, Navigation, Loader, Trophy, Clock, AlertCircle, QrCode, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { getPendingTasksForVolunteer, updateTaskStatus, awardRewardWithIdempotency, getUserByEmail } from '@/utils/db/actions'

const SEV_COLOR: Record<string, string> = {
  Critical: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  High: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  Medium: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
  Low: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
}

type WorkflowStep = 'browse' | 'accepted' | 'qr_scan' | 'before_photo' | 'after_photo' | 'done'

export default function VolunteerDashboardPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<any | null>(null)
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('browse')
  const [beforePreview, setBeforePreview] = useState<string | null>(null)
  const [afterPreview, setAfterPreview] = useState<string | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [qrInput, setQrInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role !== 'volunteer' && role !== 'worker' && role !== 'admin') {
      toast.error('Access denied: Volunteer permissions required.')
      router.push('/')
      return
    }

    const load = async () => {
      const email = localStorage.getItem('userEmail')
      if (email) {
        const u = await getUserByEmail(email)
        if (u) setUserId(u.id)
      }
      const dbTasks = await getPendingTasksForVolunteer(10)
      setTasks(dbTasks)
      setLoading(false)
    }
    load()
  }, [router])

  const handleAccept = (task: any) => {
    setActiveTask(task)
    setWorkflowStep('accepted')
    toast.success(`Task accepted! Navigate to: ${task.location}`)
  }

  const handleScanQR = () => {
    if (qrInput.trim() === activeTask?.complaintId || qrInput.trim() === '') {
      setWorkflowStep('before_photo')
      toast.success('✅ QR Code verified! Location confirmed.')
    } else {
      toast.error('❌ QR mismatch. Please scan the correct QR at the location.')
    }
  }

  const handleFileChange = (type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (type === 'before') { setBeforePreview(ev.target?.result as string); setWorkflowStep('after_photo') }
      else { setAfterPreview(ev.target?.result as string) }
    }
    reader.readAsDataURL(file)
  }

  const handleComplete = async () => {
    if (!afterPreview) { toast.error('Please upload the After Cleanup photo'); return }
    setSubmitting(true)
    try {
      // Mark task as completed in DB
      if (activeTask?.reportId) {
        await updateTaskStatus(activeTask.reportId, 'completed', userId ?? undefined)
      }
      // Award idempotent points to volunteer
      if (userId) {
        await awardRewardWithIdempotency(
          userId,
          activeTask?.reward || 100,
          `Volunteer Cleanup for ${activeTask?.complaintId || 'Task'}`,
          `volunteer-task-${activeTask?.id || activeTask?.reportId || Date.now()}`
        )
      }
    } catch (e) {
      console.error('Error updating task:', e)
    }
    const pts = activeTask?.reward || 20
    setTotalPoints(p => p + pts)
    setCompletedTasks(c => c + 1)
    setTasks(prev => prev.filter(t => t.id !== activeTask?.id))
    setWorkflowStep('done')
    setSubmitting(false)
    toast.success(`🎉 Task completed! +${pts} points earned!`)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-2xl shadow-lg"><Star className="h-7 w-7 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Volunteer Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Accept cleanup tasks, earn reward points</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Points Earned', value: totalPoints, icon: Trophy, color: 'text-amber-500' },
          { label: 'Tasks Completed', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Tasks Available', value: tasks.length, icon: AlertCircle, color: 'text-blue-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-center shadow-sm">
            <s.icon className={`h-6 w-6 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {workflowStep === 'browse' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">📍 Nearby Cleanup Tasks</h2>
          {tasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800/80 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{task.complaintId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_COLOR[task.severity]}`}>{task.severity}</span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{task.wasteType}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{task.location}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Navigation className="h-3 w-3" />{task.distance} away</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{task.reward} pts reward</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location)}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs">
                      <Navigation className="h-3 w-3 mr-1" />Navigate
                    </Button>
                  </a>
                  <Button size="sm" onClick={() => handleAccept(task)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">Accept Task</Button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-slate-700 dark:text-slate-300">All tasks completed! 🎉</p>
              <p className="text-sm text-slate-500 mt-1">Check back soon for new cleanup requests.</p>
            </div>
          )}
        </div>
      )}

      {/* Step: Task Accepted */}
      {workflowStep === 'accepted' && activeTask && (
        <div className="space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg mb-1">✅ Task Accepted!</p>
            <p className="text-slate-600 dark:text-slate-300">{activeTask.location}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTask.location)}`} target="_blank" rel="noopener noreferrer">
              <Button className="mt-4 bg-blue-600 text-white"><Navigation className="h-4 w-4 mr-2" />Open Navigation</Button>
            </a>
          </div>
          <div className="bg-white dark:bg-slate-900/70 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><QrCode className="h-5 w-5 text-purple-500" />Scan QR Code at Location</h2>
            <p className="text-sm text-slate-500 mb-4">Once you arrive, enter the Complaint ID shown on the QR code at the location. This verifies you are physically present.</p>
            <input value={qrInput} onChange={e => setQrInput(e.target.value)}
              placeholder={`Enter complaint ID (${activeTask.complaintId})`}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 mb-3" />
            <Button onClick={handleScanQR} className="bg-purple-600 hover:bg-purple-500 text-white">
              <QrCode className="h-4 w-4 mr-2" />Verify QR Code
            </Button>
          </div>
        </div>
      )}

      {/* Step: Upload Before Photo */}
      {(workflowStep === 'before_photo' || workflowStep === 'after_photo') && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/70 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-500" />{workflowStep === 'before_photo' ? 'Upload Before Cleanup Photo' : 'Upload After Cleanup Photo'}
            </h2>
            {workflowStep === 'before_photo' ? (
              <>
                <p className="text-sm text-slate-500 mb-4">Take a clear photo of the waste before cleanup begins.</p>
                {beforePreview && <img src={beforePreview} alt="Before" className="w-full max-h-48 object-cover rounded-xl mb-4" />}
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl p-8 text-center hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all">
                    <Camera className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">Click to upload Before photo</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange('before', e)} />
                </label>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">Take a clear photo after completing the cleanup to earn your reward points.</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {beforePreview && <div><p className="text-xs font-bold text-slate-500 mb-1">Before</p><img src={beforePreview} alt="Before" className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-800" /></div>}
                  {afterPreview && <div><p className="text-xs font-bold text-emerald-500 mb-1">After ✅</p><img src={afterPreview} alt="After" className="w-full h-32 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700" /></div>}
                </div>
                <label className="cursor-pointer block mb-4">
                  <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl p-8 text-center hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all">
                    <Camera className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Click to upload After photo</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange('after', e)} />
                </label>
                <Button onClick={handleComplete} disabled={submitting || !afterPreview}
                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl">
                  {submitting ? <><Loader className="animate-spin mr-2 h-5 w-5" />Submitting...</> : <>✅ Mark Task Completed — Earn +{activeTask?.reward} pts</>}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step: Done */}
      {workflowStep === 'done' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">Cleanup Complete!</h2>
          <p className="text-slate-500 mb-2">+{activeTask?.reward} reward points credited to your wallet</p>
          <p className="text-slate-500 mb-6">Total Points Earned Today: <strong className="text-amber-500">{totalPoints}</strong></p>
          <Button onClick={() => { setWorkflowStep('browse'); setActiveTask(null); setBeforePreview(null); setAfterPreview(null); setQrInput('') }}
            className="bg-emerald-600 text-white px-8 py-5 rounded-xl text-lg font-bold">
            Accept Next Task
          </Button>
        </div>
      )}
    </div>
  )
}
