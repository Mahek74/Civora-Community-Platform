'use client'
import { useState } from 'react'
import {
  Bot, Loader, Copy, Mail, Twitter, FileText, ChevronRight, Zap, MapPin, Building2,
  CheckCircle2, Phone, ArrowLeft, Navigation, Recycle, BookOpen, Search, Star,
  AlertCircle, ClipboardList, Coins, Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { useUser } from '@/context/UserContext'
import { createReport, getUserBalance, getRewardTransactions } from '@/utils/db/actions'

type Intent = 'complaint' | 'locate_dustbin' | 'educational' | 'track_complaint' | 'reward_balance' | 'general'

type DustbinEntry = { name: string; type: string; location: string; distance: string; lat: number; lng: number }

type AssistantResponse = {
  intentType: Intent
  category: string
  severity: string
  authority: string
  authorityContact: string
  complaintLetter: string
  emailDraft: string
  tweetDraft: string
  suggestedActions: string[]
  estimatedResolutionTime: string
  relatedDepartments: string[]
  extractedLocation: string
  extractedWasteType: string
  extractedQuantity: string
  educationalAnswer: string
  dustbinsList: DustbinEntry[]
}

const SAMPLE_ISSUES = [
  "There is garbage near my house. What should I do?",
  "How do I earn points in CivicPulse?",
  "How do I track my complaint CIV-2026-1024?",
  "Where is the nearest waste recycling bin?",
  "How do I volunteer for community cleanup drives?",
  "How to report an urgent open manhole or wire hazard?",
]

const DUSTBIN_MOCK: DustbinEntry[] = [
  { name: "Nagar Nigam Smart Dry Bin", type: "Dry Waste (Blue)", location: "Near Civil Lines Main Crossing", distance: "180m", lat: 23.1686, lng: 79.9339 },
  { name: "Nagar Nigam Wet Compost Bin", type: "Wet Waste (Green)", location: "Wright Town Public Park Gate", distance: "340m", lat: 23.1645, lng: 79.9288 },
  { name: "Nagar Nigam E-Waste Hub", type: "E-Waste (Red)", location: "Zonal Office Z-3, Jabalpur", distance: "850m", lat: 23.1725, lng: 79.9412 },
  { name: "Community Recycling Point", type: "Mixed Recyclables", location: "Napier Town Chowk", distance: "1.2km", lat: 23.1610, lng: 79.9380 },
]

export default function AssistantPage() {
  const { user } = useUser()
  const [userInput, setUserInput] = useState('')
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [filing, setFiling] = useState(false)
  const [filedComplaintId, setFiledComplaintId] = useState<string | null>(null)
  const [rewardData, setRewardData] = useState<{ balance: number; transactions: any[] } | null>(null)

  const buildMockResponse = (input: string): AssistantResponse => {
    const low = input.toLowerCase()
    let intentType: Intent = 'complaint'
    let category = "Waste Management"
    let authority = "Municipal Corporation Grievance Cell"
    let educationalAnswer = ""

    if (low.includes('garbage near') || low.includes('what should i do') || low.includes('kachra') || low.includes('near my house')) {
      intentType = 'educational'; category = "Report Issue Guidance"
      educationalAnswer = `### 📢 How to Report Garbage Near You\n\nYou can report it directly through **CivicPulse Report Issue**:\n\n1. Go to **[Report Issue](/report)** from the sidebar.\n2. **Upload a photo** of the garbage dump.\n3. Verify the auto-detected **GPS location**.\n4. Click **"Analyze with AI"** — Gemini 2.5 Flash will classify the severity and suggested municipal action.\n5. Click **"Submit Report"** to generate your unique tracking ID (e.g. **CIV-1024**) and earn **+50 Points**.\n\nAdmins and volunteer cleanup teams in your ward will be notified immediately.`
    } else if (low.includes('earn points') || low.includes('points') || low.includes('reward') || low.includes('xp') || low.includes('kitne points')) {
      intentType = 'reward_balance'; category = "CivicPulse Rewards Engine"
      educationalAnswer = `### 🪙 How You Earn Points in CivicPulse\n\nCivicPulse rewards every verified community action:\n\n- 📢 **Report Verified Civic Issue**: **+50 Points**\n- ♻️ **Complete Waste Collection / Cleanup**: **+100 Points**\n- 🏅 **Complete Monthly Community Challenge**: **+150 Points**\n- 🤝 **Adopt & Complete Volunteer Task**: **+100 Points**\n\n*All points are logged with tamper-proof transaction receipts and can be redeemed for Eco Badges, Tree Plantation drives, and Eco Kits.*`
    } else if (low.includes('track') || low.includes('status') || low.includes('complaint') || low.includes('civ-')) {
      intentType = 'track_complaint'; category = "Complaint Lifecycle"
      educationalAnswer = `### 📋 Tracking Your Complaint Lifecycle\n\nYour complaint passes through 5 transparent stages:\n\n1. **✓ Reported** — Stored in PostgreSQL with unique ID and geo-coordinates.\n2. **✓ AI Classified** — Evaluated for severity and municipal department routing.\n3. **✓ Admin Verified** — Municipal supervisor verifies authenticity.\n4. **● In Progress** — Sanitation worker or volunteer assigned to the site.\n5. **○ Resolved** — Cleanup verified with after-photo proof.\n\nView all your active timelines in **[My Complaints](/complaints)**.`
    } else if (low.includes('volunteer') || low.includes('drive') || low.includes('adopt')) {
      intentType = 'educational'; category = "Volunteer Cleanups"
      educationalAnswer = `### 🤝 Community Volunteer Tasks\n\n1. Open **[Volunteer Dashboard](/volunteer/dashboard)**.\n2. Browse open tasks in your ward.\n3. Click **"Adopt Task"**.\n4. Perform cleanup and upload before/after photos.\n5. Earn **+100 XP** immediately on verified completion.`
    } else if (low.includes('dustbin') || low.includes('bin') || low.includes('nearest bin')) {
      intentType = 'locate_dustbin'; category = "Waste Facilities"
    } else if (low.includes('hazard') || low.includes('manhole') || low.includes('wire') || low.includes('emergency') || low.includes('sos')) {
      intentType = 'educational'; category = "Emergency Reporting"
      educationalAnswer = `### 🚨 Critical Hazard Protocol\n\nFor urgent public safety issues like **open manholes**, **fallen electric wires**, or **water pipeline bursts**, report via **[Emergency SOS](/sos)** for high-priority dispatch.\n\n*(Note: For immediate life-threatening situations, always dial **112**).*`
    } else {
      intentType = 'complaint'; category = "Civic Grievance"
    }

    return {
      intentType, category, severity: "High", authority,
      authorityContact: "1800-180-3012 (Grievance Cell)",
      complaintLetter: `To,\nThe Commissioner,\n${authority},\nLucknow, Uttar Pradesh.\n\nSubject: Urgent complaint regarding ${category.toLowerCase()} issues in our locality.\n\nRespected Sir/Madam,\n\nI am writing on behalf of the residents of our area to bring to your urgent attention the issue of: "${input}". This issue has been persisting for several days causing immense inconvenience, health hazards, and safety risks to all commuters and residents, especially children and the elderly.\n\nWe request you to kindly direct the concerned team to inspect the location and resolve the issue on priority.\n\nThanking you,\nConcerned Citizen`,
      emailDraft: `Subject: Urgent Attention Required — ${category} Grievance\n\nRespected Sir/Madam,\n\nI wish to report a critical issue regarding ${category.toLowerCase()} in our area: "${input}"\n\nThis is causing safety hazards and daily disturbance. Your immediate intervention is requested.\n\nBest Regards,\nConcerned Resident`,
      tweetDraft: `Urgent! @nagarnigamlko please resolve: "${input.slice(0, 80)}..." — Residents suffering daily! #CleanLucknow #CivicGrievance #SwachhBharat`,
      suggestedActions: [
        "Log this on the official Swachhata mobile app",
        "Submit a signed letter from 5-10 residents to the Ward Corporator",
        "Follow up on Twitter tagging the Municipal Commissioner",
        "Organize a community drive to document the issue with photos"
      ],
      estimatedResolutionTime: "3-5 working days",
      relatedDepartments: ["Public Grievance Cell", "Maintenance Division", "Area Inspector Office"],
      extractedLocation: "Gomti Nagar, Ward 12",
      extractedWasteType: "General Organic Waste",
      extractedQuantity: "Estimated 15 kg",
      educationalAnswer,
      dustbinsList: DUSTBIN_MOCK,
    }
  }

  const handleAnalyze = async () => {
    if (!userInput.trim()) { toast.error('Please describe your issue'); return }
    setLoading(true); setFiledComplaintId(null)

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
      })
      const data = await res.json()

      let finalResponse: AssistantResponse
      if (data.fallback || !data.intentType) {
        finalResponse = buildMockResponse(userInput)
      } else {
        finalResponse = data as AssistantResponse
      }

      if (finalResponse.intentType === 'reward_balance' && user) {
        const [bal, txns] = await Promise.all([getUserBalance(user.id), getRewardTransactions(user.id)])
        setRewardData({ balance: bal, transactions: txns })
      }
      setResponse(finalResponse); setStep('result')
      toast.success('AI has generated your response!')
    } catch (err) {
      const mock = buildMockResponse(userInput)
      setResponse(mock); setStep('result')
      toast.success('AI response ready (Fallback Mode)')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFile = async () => {
    if (!user) { toast.error('Please log in to file a complaint'); return }
    if (!response) return
    setFiling(true)
    try {
      const report = await createReport(
        user.id,
        response.extractedLocation || 'Detected via AI Assistant',
        response.extractedWasteType || 'General Waste',
        response.extractedQuantity || 'Estimated 5 kg',
        undefined, undefined
      ) as any
      if (report) {
        setFiledComplaintId(report.complaintId)
        toast.success(`✅ Complaint filed! ID: ${report.complaintId}`)
      } else {
        toast.error('Failed to auto-file complaint.')
      }
    } catch { toast.error('Error filing complaint.') } finally { setFiling(false) }
  }

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied!`) }
  const severityColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'critical': return 'bg-red-500/15 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
      default: return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    }
  }
  const binColor = (type: string) => {
    if (type.includes('Dry') || type.includes('Blue')) return 'bg-blue-500/10 border-blue-500/30 text-blue-300'
    if (type.includes('Wet') || type.includes('Green')) return 'bg-green-500/10 border-green-500/30 text-green-300'
    if (type.includes('E-Waste') || type.includes('Red')) return 'bg-red-500/10 border-red-500/30 text-red-300'
    return 'bg-amber-500/10 border-amber-500/30 text-amber-300'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Civic Assistant</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Your intelligent civic companion — report, track, learn, locate</p>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-2xl text-base">
          Describe any issue in <strong className="text-slate-700 dark:text-slate-200">Hindi or English</strong>. Ask for dustbins, recycling tips, complaint status, or reward balance.
        </p>
        {/* Intent chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { icon: AlertCircle, label: "File Complaint", color: "text-red-400 bg-red-500/10 border-red-500/20" },
            { icon: MapPin, label: "Find Dustbin", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { icon: Recycle, label: "Recycle Guide", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { icon: ClipboardList, label: "Track Complaint", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { icon: Coins, label: "Reward Balance", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          ].map((chip, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${chip.color}`}>
              <chip.icon className="h-3 w-3" />{chip.label}
            </span>
          ))}
        </div>
      </div>

      {step === 'input' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-500" /> What's your issue or question?
            </h2>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="e.g., Mere area me kachra 10 din se pada hai... Ya dustbin kaha hai? Ya plastic recycle kaise kare?"
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none h-36 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            />
            <Button
              onClick={handleAnalyze}
              disabled={loading || !userInput.trim()}
              className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-6 rounded-xl text-lg font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
            >
              {loading ? <><Loader className="animate-spin mr-3 h-5 w-5" />AI is thinking...</> : <><Bot className="mr-3 h-5 w-5" />Get AI Response</>}
            </Button>
          </div>

          {/* Sample prompts */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Try these examples</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_ISSUES.map((issue, i) => (
                <button key={i} onClick={() => setUserInput(issue)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-start gap-2 group">
                  <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                  {issue}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'result' && response && (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => { setStep('input'); setResponse(null); setFiledComplaintId(null) }}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            <ArrowLeft className="h-4 w-4 mr-2" /> Ask Another Question
          </Button>

          {/* ── INTENT: COMPLAINT ─────────────────────────── */}
          {response.intentType === 'complaint' && (
            <>
              {/* Summary card */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <div className="flex flex-wrap gap-3 items-center mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${severityColor(response.severity)}`}>{response.severity} Severity</span>
                  <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">{response.category}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-800/50">
                  <p className="text-xs text-slate-500 font-medium mb-1">Your Issue:</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">"{userInput}"</p>
                </div>
                {/* Extracted data */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "📍 Location", value: response.extractedLocation || "Not specified" },
                    { label: "🗑️ Waste Type", value: response.extractedWasteType || "General Waste" },
                    { label: "⚖️ Quantity", value: response.extractedQuantity || "Estimated 5 kg" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/50">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Estimated Resolution: <strong className="text-slate-800 dark:text-slate-200">{response.estimatedResolutionTime}</strong>
                </div>
              </div>

              {/* Auto-file complaint action */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/25 backdrop-blur-md">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-400" /> Auto-File Official Complaint
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click below to instantly register this complaint in the system. You'll get a Complaint ID and earn reward points.</p>
                {filedComplaintId ? (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-600 dark:text-emerald-300">Complaint Filed Successfully!</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Complaint ID: <strong>{filedComplaintId}</strong> — Track it in the Complaints section.</p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleAutoFile} disabled={filing || !user}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 py-5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]">
                    {filing ? <><Loader className="animate-spin mr-2 h-4 w-4" />Filing...</> : <>🚨 Auto-File Complaint in System</>}
                  </Button>
                )}
                {!user && <p className="text-xs text-amber-500 mt-2">⚠️ Please log in to file a complaint in the database.</p>}
              </div>

              {/* Authority */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-400" /> Responsible Authority
                </h2>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">{response.authority}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {response.authorityContact}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {response.relatedDepartments.map((d, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-50 dark:bg-slate-950/80 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">{d}</span>
                  ))}
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" /> Suggested Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {response.suggestedActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/50">
                      <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg p-1.5 text-xs font-bold shrink-0 border border-emerald-500/20">{i + 1}</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complaint Letter */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" /> Formal Complaint Letter</h2>
                  <Button variant="ghost" size="sm" onClick={() => copy(response.complaintLetter, 'Complaint letter')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><Copy className="h-4 w-4 mr-1" />Copy</Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-5 font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800/50">{response.complaintLetter}</div>
              </div>

              {/* Email Draft */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Mail className="h-5 w-5 text-red-400" /> Email Draft</h2>
                  <Button variant="ghost" size="sm" onClick={() => copy(response.emailDraft, 'Email draft')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><Copy className="h-4 w-4 mr-1" />Copy</Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800/50">{response.emailDraft}</div>
              </div>

              {/* Tweet */}
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Twitter className="h-5 w-5 text-blue-400" /> Tweet Draft</h2>
                  <Button variant="ghost" size="sm" onClick={() => copy(response.tweetDraft, 'Tweet')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><Copy className="h-4 w-4 mr-1" />Copy</Button>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-5 text-sm text-slate-800 dark:text-slate-200 border border-blue-500/20">
                  <p>{response.tweetDraft}</p>
                  <p className="text-xs text-slate-500 mt-2">{response.tweetDraft.length}/280 characters</p>
                </div>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(response.tweetDraft)}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                  <Button className="bg-blue-500 hover:bg-blue-400 text-white rounded-xl"><Twitter className="h-4 w-4 mr-2" />Post on X</Button>
                </a>
              </div>
            </>
          )}

          {/* ── INTENT: LOCATE DUSTBIN ───────────────────── */}
          {response.intentType === 'locate_dustbin' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-emerald-500" /> Nearest Dustbins & Waste Points
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Based on your area — click "Navigate" to open in Google Maps.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {response.dustbinsList.map((bin, i) => (
                    <div key={i} className={`rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-lg ${binColor(bin.type)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-base">{bin.name}</p>
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border mt-1" style={{ background: 'transparent' }}>{bin.type}</span>
                        </div>
                        <span className="text-sm font-bold bg-white/20 dark:bg-black/20 px-3 py-1 rounded-full">{bin.distance}</span>
                      </div>
                      <p className="text-xs opacity-80 mb-3 flex items-center gap-1"><MapPin className="h-3 w-3" />{bin.location}</p>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${bin.lat},${bin.lng}`} target="_blank" rel="noopener noreferrer">
                        <button className="w-full flex items-center justify-center gap-2 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 py-2 rounded-xl text-sm font-semibold transition-all">
                          <Navigation className="h-4 w-4" /> Navigate
                        </button>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INTENT: EDUCATIONAL ──────────────────────── */}
          {response.intentType === 'educational' && response.educationalAnswer && (
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-emerald-500/20">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-500" /> Recycling & Eco Guide
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-3">
                {response.educationalAnswer.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-2">{line.replace('## ', '')}</h3>
                  if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-slate-800 dark:text-slate-200 mt-3">{line.replace(/\*\*/g, '')}</p>
                  if (line.startsWith('- ♻') || line.startsWith('- 🌿') || line.startsWith('- 💡')) return <p key={i} className="pl-4 text-emerald-600 dark:text-emerald-300 text-sm">{line}</p>
                  if (line.startsWith('💡') || line.startsWith('🌿')) return <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-600 dark:text-emerald-300 mt-2">{line}</div>
                  if (line.trim()) return <p key={i} className="text-sm leading-relaxed">{line}</p>
                  return <div key={i} className="h-1" />
                })}
              </div>
            </div>
          )}

          {/* ── INTENT: TRACK COMPLAINT ──────────────────── */}
          {response.intentType === 'track_complaint' && (
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-purple-500" /> Complaint Tracker
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">Go to the <strong>Complaints</strong> section in the sidebar to see your full complaint history with real-time status updates.</p>
              <div className="space-y-3">
                {['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved'].map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${i < 2 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800 opacity-50'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{i + 1}</div>
                    <span className={`font-semibold text-sm ${i < 2 ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{s}</span>
                    {i < 2 && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INTENT: REWARD BALANCE ───────────────────── */}
          {response.intentType === 'reward_balance' && (
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800/80">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Coins className="h-6 w-6 text-amber-500" /> Your Reward Balance
              </h2>
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
                <p className="text-5xl font-black text-amber-500">{rewardData?.balance ?? 0}</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Total Points</p>
              </div>
              {rewardData?.transactions && rewardData.transactions.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">Recent Transactions</h3>
                  <div className="space-y-2">
                    {rewardData.transactions.slice(0, 5).map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{t.description}</span>
                        <span className={`font-bold text-sm ${t.type.startsWith('earned') ? 'text-emerald-500' : 'text-red-400'}`}>
                          {t.type.startsWith('earned') ? '+' : '-'}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
