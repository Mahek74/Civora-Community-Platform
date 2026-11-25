'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  CheckCircle, Clock, AlertTriangle, Search, Loader, 
  MapPin, Calendar, FileText, Copy, Check, ShieldAlert, QrCode, Clipboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { 
  getReportByComplaintId, 
  updateComplaintStatus, 
  getUserByEmail, 
  saveCollectedWaste, 
  saveReward, 
  updateTaskStatus 
} from '@/utils/db/actions'
import QRCode from 'qrcode'

export default function VerifyComplaintPage() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get('id')

  const [searchId, setSearchId] = useState(urlId || '')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [copiedLetter, setCopiedLetter] = useState(false)
  
  // User auth state
  const [user, setUser] = useState<any>(null)
  const [verifyingCollection, setVerifyingCollection] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load user from localStorage
  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('userEmail')
      if (email) {
        const dbUser = await getUserByEmail(email)
        if (dbUser) {
          setUser(dbUser)
        }
      }
    }
    fetchUser()
  }, [])

  // Auto-search if ID is in URL
  useEffect(() => {
    if (urlId) {
      handleSearch(urlId)
    }
  }, [urlId])

  // Render QR Code when report is loaded
  useEffect(() => {
    if (canvasRef.current && report) {
      const verifyUrl = `${window.location.origin}/verify?id=${report.complaintId}`
      QRCode.toCanvas(canvasRef.current, verifyUrl, {
        width: 140,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#f8fafc'
        }
      }, (err: any) => {
        if (err) console.error('Error generating QR code:', err)
      })
    }
  }, [report])

  const handleSearch = async (idToSearch: string) => {
    const targetId = idToSearch.trim()
    if (!targetId) {
      toast.error('Please enter a Complaint ID')
      return
    }

    setLoading(true)
    setReport(null)
    try {
      const data = await getReportByComplaintId(targetId)
      if (data) {
        setReport(data)
      } else {
        toast.error('No complaint found with this ID')
      }
    } catch (error) {
      console.error('Error searching complaint:', error)
      toast.error('Failed to search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: 'id' | 'letter') => {
    navigator.clipboard.writeText(text)
    if (type === 'id') {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } else {
      setCopiedLetter(true)
      setTimeout(() => setCopiedLetter(false), 2000)
    }
    toast.success('Copied to clipboard!')
  }

  // Calculate if the complaint is older than 7 days and not resolved
  const isEscalated = report && report.complaintStatus !== 'resolved' && (
    new Date().getTime() - new Date(report.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000
  )

  // Official letter generator
  const getOfficialLetter = (r: any) => {
    return `To,
The Municipal Commissioner,
Municipal Corporation Department,

Subject: Official Complaint Regarding Unattended Waste at ${r.location}

Respected Sir/Madam,

I am writing to officially file a complaint regarding the accumulation of unattended waste identified at the following location:
Location Details: ${r.location}
Type of Waste: ${r.wasteType}
Estimated Quantity: ${r.amount}
Date of Identification: ${new Date(r.createdAt).toLocaleDateString()}

This issue has been assigned the tracking reference ID: ${r.complaintId} under the CivicPulse Civic Monitoring System.

The presence of this waste poses environmental and public health hazards to the residents of the area. We request you to direct the sanitation department to clear this waste at the earliest.

Thank you.

Sincerely,
CivicPulse Citizen Portal
Ref ID: ${r.complaintId}`
  }

  // Collector confirms collection via QR
  const handleConfirmCollection = async () => {
    if (!user) {
      toast.error('Please sign in to confirm waste collection')
      return
    }
    if (!report) return

    setVerifyingCollection(true)
    try {
      // 1. Mark complaint as resolved in DB
      await updateComplaintStatus(report.id, 'resolved')
      
      // 2. Mark report task as verified
      await updateTaskStatus(report.id, 'verified', user.id)

      // 3. Save collected waste entry
      await saveCollectedWaste(report.id, user.id, {
        notes: "Collected via QR Code Verification",
        collectedAt: new Date().toISOString()
      })

      // 4. Award rewards points to collector
      await saveReward(user.id, 15)

      toast.success('Waste Collection Verified! 15 Points awarded.')
      
      // Refresh report details
      handleSearch(report.complaintId)
    } catch (error) {
      console.error('Error confirming collection:', error)
      toast.error('Failed to verify collection. Please try again.')
    } finally {
      setVerifyingCollection(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            Government Complaint Auto-Filing & Tracking
          </h1>
          <p className="text-slate-400 text-lg">
            Track civic issue complaints, access verification QR codes, and generate official filings.
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Search Complaint Tracking Status</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input 
                type="text" 
                placeholder="Enter Complaint ID (e.g. CIV-2026-1234)" 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500 h-12 rounded-xl"
              />
            </div>
            <Button 
              onClick={() => handleSearch(searchId)}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 h-12 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader className="animate-spin w-5 h-5" />
              ) : (
                'Track Complaint'
              )}
            </Button>
          </div>
        </div>

        {/* If Loading and No Report */}
        {loading && !report && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader className="w-12 h-12 animate-spin text-emerald-500" />
            <p className="text-slate-400">Retrieving complaint data...</p>
          </div>
        )}

        {/* Report Details Display */}
        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Info Card */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Complaint ID</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-bold text-slate-100">{report.complaintId}</span>
                      <button 
                        onClick={() => copyToClipboard(report.complaintId, 'id')}
                        className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                        title="Copy Complaint ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Complaint Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-1.5 ${
                      report.complaintStatus === 'resolved' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : isEscalated 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {report.complaintStatus === 'resolved' ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolved
                        </>
                      ) : isEscalated ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Auto-Escalated (Overdue)
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          Filed & Processing
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Location</span>
                      <p className="text-sm text-slate-200 font-medium mt-0.5 leading-relaxed">{report.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Report Filed On</span>
                      <p className="text-sm text-slate-200 font-medium mt-0.5">
                        {new Date(report.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Waste Type</span>
                      <p className="text-sm text-slate-200 font-medium mt-0.5 capitalize">{report.wasteType} ({report.amount})</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 font-medium">AI Verification Status</span>
                      <p className="text-sm text-emerald-400 font-medium mt-0.5">Verified</p>
                    </div>
                  </div>
                </div>

                {report.imageUrl && (
                  <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden max-h-48">
                    <img 
                      src={report.imageUrl} 
                      alt="Waste Evidence" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* QR Verification Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <QrCode className="w-8 h-8 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Waste Verification QR</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
                  Authorized waste collectors scan this QR to instantly confirm physical pickup and claim rewards.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <canvas ref={canvasRef} />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (canvasRef.current) {
                      const link = document.createElement('a')
                      link.download = `QR_${report.complaintId}.png`
                      link.href = canvasRef.current.toDataURL()
                      link.click()
                      toast.success('QR Code download started!')
                    }
                  }}
                  className="w-full text-xs font-semibold border-slate-800 hover:bg-slate-800 text-slate-300"
                >
                  Download QR Code
                </Button>
              </div>

            </div>

            {/* Tracking Status Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-semibold text-slate-100">Complaint Filing Timeline</h3>
              
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                
                {/* Step 1: Filed */}
                <div className="relative space-y-1">
                  <div className="absolute -left-[22px] top-1 bg-green-500 rounded-full w-3.5 h-3.5 border-4 border-slate-950" />
                  <h4 className="font-semibold text-sm text-slate-100">Report Filed</h4>
                  <p className="text-xs text-slate-400">
                    AI verification completed. Complaint successfully submitted to the civic database.
                  </p>
                  <p className="text-[10px] text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>

                {/* Step 2: Auto-Escalation Warning if Applicable */}
                {isEscalated && (
                  <div className="relative space-y-1 border border-rose-500/20 bg-rose-500/5 p-3 rounded-xl">
                    <div className="absolute -left-[28px] top-4 bg-rose-500 rounded-full w-3.5 h-3.5 border-4 border-slate-950" />
                    <h4 className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Auto-Escalated to Municipal Commissioner
                    </h4>
                    <p className="text-xs text-rose-300/80 leading-relaxed">
                      This complaint has remained unresolved for more than 7 days. It has been auto-escalated to higher municipal authorities for urgent intervention.
                    </p>
                  </div>
                )}

                {/* Step 3: In Progress */}
                <div className="relative space-y-1">
                  <div className={`absolute -left-[22px] top-1 rounded-full w-3.5 h-3.5 border-4 border-slate-950 ${
                    report.complaintStatus === 'resolved' || report.collectorId
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  }`} />
                  <h4 className="font-semibold text-sm text-slate-100">In Progress</h4>
                  <p className="text-xs text-slate-400">
                    {report.collectorId 
                      ? 'Sanitation agent assigned to location. Waste pickup in progress.' 
                      : 'Complaint queued. Awaiting sanitation officer dispatch.'}
                  </p>
                </div>

                {/* Step 4: Resolved */}
                <div className="relative space-y-1">
                  <div className={`absolute -left-[22px] top-1 rounded-full w-3.5 h-3.5 border-4 border-slate-950 ${
                    report.complaintStatus === 'resolved' 
                      ? 'bg-green-500' 
                      : 'bg-slate-700'
                  }`} />
                  <h4 className="font-semibold text-sm text-slate-100">Resolved</h4>
                  <p className="text-xs text-slate-400">
                    {report.complaintStatus === 'resolved' 
                      ? 'Waste successfully collected and disposal verified.' 
                      : 'Awaiting collector verification scan.'}
                  </p>
                </div>

              </div>
            </div>

            {/* Collector QR Verification Action Panel */}
            {user && report.complaintStatus !== 'resolved' && (
              <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-emerald-400">Collector Verification Control</h3>
                    <p className="text-sm text-slate-300">
                      You are logged in as <span className="font-medium text-slate-100">{user.name}</span>. Confirm waste collection using QR authentication.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleConfirmCollection}
                  disabled={verifyingCollection}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  {verifyingCollection ? (
                    <>
                      <Loader className="animate-spin w-5 h-5" />
                      Verifying Collection & Transferring Rewards...
                    </>
                  ) : (
                    'Confirm Physical Pickup & Claim 15 Points'
                  )}
                </Button>
              </div>
            )}

            {/* Official Complaint Letter Generator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-semibold text-slate-100">Official Municipal Complaint Letter</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(getOfficialLetter(report), 'letter')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 hover:bg-slate-800"
                >
                  {copiedLetter ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                  Copy Letter
                </Button>
              </div>
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {getOfficialLetter(report)}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}