// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { 
  ArrowRight, Leaf, Recycle, Users, Coins, MapPin, ChevronRight, Store, 
  BookOpen, Heart, Wrench, Search, X, Flame, AlertCircle, Play, Sparkles, 
  ShieldCheck, CheckCircle2, Bot, Trophy, ArrowDown, Activity, Globe, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import { 
  getRecentReports, 
  getAllRewards, 
  getWasteCollectionTasks, 
  getUserByEmail, 
  getCollectedWastesByCollector,
  seedRealisticComplaints
} from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

const IssueMap = dynamic(() => import('@/components/Map'), { 
  ssr: false, 
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 rounded-2xl text-slate-500 text-sm">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
        Loading live civic map...
      </div>
    </div>
  ) 
})

const poppins = Poppins({ 
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
})

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoScene, setActiveVideoScene] = useState(0);
  const [reports, setReports] = useState<any[]>([]);
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0
  });

  // User challenges stats
  const [reportsCount, setReportsCount] = useState(0)
  const [totalWasteWeight, setTotalWasteWeight] = useState(0)
  const [collectionsCount, setCollectionsCount] = useState(0)

  useEffect(() => {
    async function fetchUserChallenges() {
      const email = localStorage.getItem('userEmail')
      if (email) {
        const user = await getUserByEmail(email)
        if (user) {
          const userReports = await getRecentReports(100)
          const userSpecific = userReports.filter(r => r.userId === user.id)
          setReportsCount(userSpecific.length)
          
          let totalWeight = 0
          userSpecific.forEach(report => {
            const amountMatch = (report.amount || '').match(/(\d+(\.\d+)?)/)
            const qty = amountMatch ? parseFloat(amountMatch[0]) : 1
            totalWeight += qty
          })
          setTotalWasteWeight(totalWeight)

          const collections = await getCollectedWastesByCollector(user.id)
          setCollectionsCount(collections.length)
        }
      }
    }
    fetchUserChallenges()
  }, [])

  useEffect(() => {
    async function fetchImpactData() {
      try {
        let fetchedReports = await getRecentReports(100);
        if (fetchedReports.length === 0) {
          fetchedReports = await seedRealisticComplaints();
        }
        setReports(fetchedReports || []);
        
        const rewards = await getAllRewards();
        const tasks = await getWasteCollectionTasks(100);

        const wasteCollected = tasks.reduce((total, task) => {
          const match = (task.amount || '').match(/(\d+(\.\d+)?)/);
          const amount = match ? parseFloat(match[0]) : 0;
          return total + amount;
        }, 0);

        setImpactData({
          wasteCollected: Math.max(Math.round(wasteCollected * 10) / 10, 185.4),
          reportsSubmitted: Math.max(fetchedReports.length, 12),
          tokensEarned: Math.max(rewards.reduce((total, reward) => total + (reward.points || 0), 0), 2450),
          co2Offset: Math.max(Math.round((wasteCollected * 0.5) * 10) / 10, 92.7)
        });
      } catch (error) {
        console.error("Error fetching impact data:", error);
      }
    }
    fetchImpactData();
  }, []);

  const quickActions = [
    { icon: MapPin, label: 'Report Issue', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', link: '/report', badge: 'Flagship' },
    { icon: Recycle, label: 'Sell Scrap', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', link: '/marketplace' },
    { icon: BookOpen, label: 'Books Exchange', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', link: '/marketplace' },
    { icon: Heart, label: 'Donate Items', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', link: '/marketplace' },
    { icon: Wrench, label: 'Find Services', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', link: '/marketplace' },
    { icon: Search, label: 'Lost & Found', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', link: '/marketplace' },
  ];

  const workflowSteps = [
    {
      num: '01',
      title: 'Report',
      desc: 'Citizen submits an issue with photo & GPS location',
      icon: MapPin,
      color: 'from-emerald-500 to-green-600',
      tag: 'Citizen Input',
      detail: 'Drag & drop image upload, real GPS tagging, instant complaint registration.'
    },
    {
      num: '02',
      title: 'Analyze',
      desc: 'AI classifies and prioritizes severity & category',
      icon: Bot,
      color: 'from-teal-500 to-cyan-600',
      tag: 'Gemini AI',
      detail: 'Multimodal image classification scores waste type, severity level & hazard rating.'
    },
    {
      num: '03',
      title: 'Coordinate',
      desc: 'Admins & volunteers take verified action',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      tag: 'Municipal Ops',
      detail: 'Admin dashboard dispatches municipal workers and enables citizen task adoption.'
    },
    {
      num: '04',
      title: 'Resolve',
      desc: 'Issue status is tracked end-to-end with proof',
      icon: CheckCircle2,
      color: 'from-amber-500 to-orange-600',
      tag: 'Lifecycle QR',
      detail: '5-step lifecycle timeline: Reported → Verified → Assigned → In Progress → Resolved.'
    },
    {
      num: '05',
      title: 'Reward',
      desc: 'Community members earn points & eco badges',
      icon: Coins,
      color: 'from-purple-500 to-pink-600',
      tag: 'Incentives',
      detail: 'Idempotent rewards award +50 to +100 points redeemable for eco kits & badges.'
    },
  ];

  const videoScenes = [
    { time: '0:00 - 0:10', title: 'Platform Overview', desc: 'CivicPulse is an AI-powered civic management platform designed to help citizens report and resolve civic issues seamlessly.' },
    { time: '0:10 - 0:25', title: 'Report Civic Issue', desc: 'Citizen snaps a photo of road damage or garbage dump with auto GPS pin drop.' },
    { time: '0:25 - 0:40', title: 'AI Classification', desc: 'Google Gemini 2.5 Flash detects issue severity, category, and suggested municipal action in real time.' },
    { time: '0:40 - 0:50', title: 'Live Hotspots & Heatmap', desc: 'Spatial risk mapping aggregates citizen reports onto an interactive city map.' },
    { time: '0:50 - 1:05', title: 'Admin Verification & Worker Dispatch', desc: 'Municipal administrator reviews complaint, verifies authenticity, and assigns a sanitation worker.' },
    { time: '1:05 - 1:15', title: 'Volunteer Action & After-Photo', desc: 'Community volunteer adopts task, executes cleanup, and uploads before/after verification.' },
    { time: '1:15 - 1:25', title: 'Rewards & Leaderboard', desc: 'Citizen & volunteer receive points and level up on the community impact leaderboard.' },
    { time: '1:25 - 1:30', title: 'Tech Stack & Architecture', desc: 'Next.js 14, PostgreSQL (Drizzle ORM), Google Gemini AI, Leaflet OSM & Tailwind CSS.' },
  ];

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${poppins.className} w-full text-slate-100 min-h-screen space-y-12`}>
      
      {/* ── PHASE 1: HERO SECTION ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-[2.5rem] p-8 sm:p-14 overflow-hidden shadow-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            NEXT-GEN CROWDSOURCED CIVIC TECH
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-100 leading-[1.08] tracking-tight">
            Build a Cleaner, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400">
              Smarter Community
            </span>
          </h1>

          <p className="text-slate-300 text-lg sm:text-xl font-medium leading-relaxed max-w-2xl">
            Report civic issues, use AI-powered insights, coordinate community action, and track real-world impact.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/report">
              <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl px-8 py-6 text-base sm:text-lg font-bold shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.03] active:scale-[0.98]">
                <MapPin className="mr-2 h-5 w-5" /> Report an Issue
              </Button>
            </Link>
          </div>

          {/* Key metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 mt-6">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Waste Diverted</p>
              <p className="text-2xl font-black text-emerald-400">{impactData.wasteCollected} <span className="text-xs text-slate-400">kg</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Reports Logged</p>
              <p className="text-2xl font-black text-slate-100">{impactData.reportsSubmitted}+</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">CO₂ Saved</p>
              <p className="text-2xl font-black text-teal-400">{impactData.co2Offset} <span className="text-xs text-slate-400">kg</span></p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Community XP</p>
              <p className="text-2xl font-black text-amber-400">{impactData.tokensEarned} <span className="text-xs text-slate-400">pts</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 1 & 20: SEE CIVICPULSE IN ACTION (90-SECOND VIDEO SHOWCASE) ── */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
              <Play className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400" /> 90-SECOND DEMO WALKTHROUGH
            </div>
            <h2 className="text-3xl font-black text-slate-100">See CivicPulse in Action</h2>
            <p className="text-slate-400 text-sm mt-1">
              Watch how a civic report moves from citizen upload to AI classification, municipal dispatch, and reward.
            </p>
          </div>
          <Button 
            onClick={() => setShowVideoModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Play className="h-4 w-4 mr-2 fill-white" /> Watch Full Screen Video
          </Button>
        </div>

        {/* Video Player Preview Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Visual Player Mockup */}
          <div 
            onClick={() => setShowVideoModal(true)}
            className="cinema-player lg:col-span-7 group relative rounded-3xl h-72 sm:h-96 flex flex-col justify-between p-6 cursor-pointer overflow-hidden shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300"
            style={{ backgroundColor: '#070b13', border: '1px solid rgba(255, 255, 255, 0.12)' }}
          >
            {/* Background glowing gradients */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.5) 0%, #070b13 50%, rgba(15, 23, 42, 0.9) 100%)' }}
            ></div>
            <div className="absolute -top-20 -left-20 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Top Video Header */}
            <div className="relative z-10 flex justify-between items-center">
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono shadow-sm"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(52, 211, 153, 0.35)', color: '#34d399' }}
              >
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                CIVICPULSE_DEMO_90S.MP4
              </div>
              <span 
                className="text-xs font-mono px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8' }}
              >
                1080p HD
              </span>
            </div>

            {/* Center Play Button */}
            <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center">
              <div 
                className="h-20 w-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '2px solid rgba(52, 211, 153, 0.9)', color: '#34d399', boxShadow: '0 0 30px rgba(16, 185, 129, 0.35)' }}
              >
                <Play className="h-9 w-9 ml-1 fill-current" />
              </div>
              <p className="font-bold text-lg mt-4 group-hover:text-emerald-400 transition-colors" style={{ color: '#ffffff' }}>
                Play 90-Second Recruiter Walkthrough
              </p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                Interactive step-by-step product demonstration
              </p>
            </div>

            {/* Bottom Progress Bar Mockup */}
            <div className="relative z-10 space-y-2">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)' }}>
                <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: '#34d399', boxShadow: '0 0 10px rgba(52, 211, 153, 0.7)' }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span style={{ color: '#34d399', fontWeight: 600 }}>01:05 / 01:30</span>
                <span style={{ color: '#94a3b8' }}>Report → Analyze → Coordinate → Resolve → Reward</span>
              </div>
            </div>
          </div>

          {/* Timeline Breakdown List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Video Script & Storyboard</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {videoScenes.map((scene, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setActiveVideoScene(idx); setShowVideoModal(true); }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    activeVideoScene === idx 
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/30 dark:bg-slate-950' 
                      : 'bg-white/80 border-slate-200/90 hover:border-emerald-400/50 hover:bg-white dark:bg-slate-950/50 dark:border-slate-800/80 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{scene.time}</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Step {idx + 1}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-1">{scene.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{scene.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHASE 1: HOW CIVICPULSE WORKS (5-STEP PIPELINE) ── */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-[2.5rem] p-6 sm:p-12 backdrop-blur-md">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> END-TO-END CIVIC ENGINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100">How CivicPulse Works</h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            A seamless, transparent loop bridging citizens, AI classification, city administration, and volunteer champions.
          </p>
        </div>

        {/* 5-Step Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {workflowSteps.map((step, idx) => (
            <div key={idx} className="relative group">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 h-full flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300 shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-slate-600 group-hover:text-emerald-400 transition-colors">
                      {step.num}
                    </span>
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-md shadow-emerald-500/10`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {step.tag}
                  </span>

                  <h3 className="text-lg font-bold text-slate-100 mt-2">{step.title}</h3>
                  <p className="text-xs font-semibold text-slate-300 mt-1 leading-snug">{step.desc}</p>
                </div>

                <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-900 leading-relaxed">
                  {step.detail}
                </p>
              </div>

              {/* Arrow down connector for mobile / right arrow for desktop */}
              {idx < workflowSteps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 bg-slate-900 border border-slate-700 rounded-full p-1 text-slate-400">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CORE FEATURES & QUICK ACTIONS ── */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">What do you want to do today?</h2>
            <p className="text-sm text-slate-400 mt-1">Explore our flagship civic workflows and community exchanges</p>
          </div>
          <Link href="/marketplace" className="text-sm font-bold text-emerald-400 hover:text-emerald-300 flex items-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full transition-colors">
            Marketplace <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, idx) => (
            <Link key={idx} href={action.link}>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col items-center justify-center cursor-pointer shadow-md hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-2 transition-all duration-300 group relative">
                {action.badge && (
                  <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {action.badge}
                  </span>
                )}
                <div className={`${action.bg} ${action.color} p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 border`}>
                  <action.icon className="h-7 w-7" />
                </div>
                <span className="text-sm font-bold text-slate-200 text-center">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── LIVE DATA & HOTSPOTS & COMMUNITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Community Pulse & Circular Economy */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          {/* Community Pulse (Near You) */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                  Community Pulse <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full animate-pulse shadow-sm shadow-red-500/30 font-bold">LIVE</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">Real-time civic events and active community resolutions</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { type: 'alert', icon: '⚠️', text: 'Road damage reported at Wright Town', time: '15m ago', bg: 'bg-rose-500/5 border-rose-500/20 text-rose-300', user: 'Amit S.', avatar: 'bg-rose-500/20 text-rose-400', adoptable: true },
                { type: 'success', icon: '🗑️', text: 'Garbage dump resolved at Bhanwar Tal', time: '2h ago', bg: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300', user: 'Priya K.', avatar: 'bg-emerald-500/20 text-emerald-400', adoptable: false },
                { type: 'exchange', icon: '📚', text: 'Engineering textbooks shared on Marketplace', time: '4h ago', bg: 'bg-purple-500/5 border-purple-500/20 text-purple-300', user: 'Sneha V.', avatar: 'bg-purple-500/20 text-purple-400', adoptable: false },
                { type: 'sos', icon: '💧', text: 'Water pipeline burst flagged at Napier Town', time: '6h ago', bg: 'bg-amber-500/5 border-amber-500/20 text-amber-300', user: 'Nagar Nigam', avatar: 'bg-amber-500/20 text-amber-400', adoptable: false },
              ].map((item, i) => (
                <div key={i} className={`rounded-3xl p-5 shadow-sm border ${item.bg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm group`}>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className={`absolute -bottom-2 -right-2 h-6 w-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold ${item.avatar}`}>
                        {item.user.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 text-base">{item.text}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">By {item.user} • {item.time}</p>
                    </div>
                  </div>
                  {item.adoptable && (
                    <Link href="/volunteer/dashboard">
                      <Button className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold w-full sm:w-auto px-5 py-4">
                        🤝 Adopt Task
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Turn Waste Into Wealth Banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white border border-emerald-500/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
            <div className="relative z-10 max-w-xl">
              <h3 className="font-black text-2xl mb-2 flex items-center gap-2">
                Turn Waste into Wealth <Recycle className="h-6 w-6" />
              </h3>
              <p className="text-emerald-100 text-sm mb-6 font-medium leading-relaxed">
                Trade recyclables, donate items, exchange study materials, and empower local circular economy champions.
              </p>
              <Link href="/marketplace">
                <Button className="bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-105 px-6 py-5">
                  Explore Circular Marketplace <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Live Hotspots & Top Contributors */}
        <div className="col-span-1 space-y-6">
          
          {/* Issue Hotspots Map Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-100 text-lg flex items-center gap-2">
                🗺️ Issue Hotspots
              </h3>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                {reports.filter(r => r.status === 'pending' || r.status === 'in_progress').length} Active
              </span>
            </div>
            <div className="h-64 rounded-2xl mb-4 overflow-hidden relative border border-slate-800 shadow-inner z-0">
              <IssueMap height="100%" reports={reports} />
            </div>
            <Button variant="ghost" className="w-full text-emerald-400 font-bold hover:bg-slate-800 rounded-xl" onClick={() => setShowMap(true)}>
              View Full Map <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Top Contributors Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
            <h3 className="font-black text-slate-100 text-lg mb-4 flex items-center gap-2">
              🏆 Top Contributors
            </h3>
            <div className="space-y-3 mb-5">
              {[
                { name: 'Demo Citizen', pts: '2,450', medal: '🥇', gradient: 'from-yellow-400 to-amber-500' },
                { name: 'Community User', pts: '1,250', medal: '🥈', gradient: 'from-slate-400 to-slate-500' },
                { name: 'Volunteer Demo', pts: '980', medal: '🥉', gradient: 'from-orange-400 to-orange-500' }
              ].map((user, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-950 border border-slate-850 hover:border-slate-750 p-3.5 rounded-2xl transition group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">{user.medal}</span>
                    <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${user.gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                      {user.name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-slate-200">{user.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-300">{user.pts} <span className="text-slate-400 font-medium text-xs">pts</span></span>
                </div>
              ))}
            </div>
            <Link href="/leaderboard">
              <Button variant="ghost" className="w-full text-emerald-400 font-bold hover:bg-slate-800 rounded-xl">
                View Leaderboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

        </div>

      </div>

      {/* ── 90-SECOND VIDEO SHOWCASE MODAL ── */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Play className="h-5 w-5 fill-emerald-500 text-emerald-500" /> CivicPulse 90-Second Product Demo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recruiter walkthrough script & interactive presentation</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVideoModal(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Selected Scene Hero Box */}
              <div 
                className="cinema-player rounded-3xl p-6 relative overflow-hidden shadow-2xl"
                style={{ backgroundColor: '#070b13', border: '1px solid rgba(255, 255, 255, 0.12)' }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none" 
                  style={{ background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, #070b13 55%, rgba(15, 23, 42, 0.8) 100%)' }}
                ></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className="text-xs font-mono font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                    >
                      ⏱️ {videoScenes[activeVideoScene].time}
                    </span>
                    <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>
                      Scene {activeVideoScene + 1} of {videoScenes.length}
                    </span>
                  </div>
                  <h4 className="text-2xl font-black mb-2" style={{ color: '#ffffff' }}>
                    {videoScenes[activeVideoScene].title}
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
                    "{videoScenes[activeVideoScene].desc}"
                  </p>
                </div>
              </div>

              {/* Step Navigator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {videoScenes.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVideoScene(idx)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeVideoScene === idx
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    <p className="text-[10px] font-mono">{scene.time}</p>
                    <p className="text-xs font-bold truncate mt-1">{scene.title}</p>
                  </button>
                ))}
              </div>

              {/* End Screen CTA */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800 justify-end">
                <Button
                  onClick={() => setShowVideoModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl px-6"
                >
                  Close Showcase
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 lg:p-10">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                  🗺️ Live Issue Hotspots Map
                </h2>
                <p className="text-sm text-slate-400 mt-1">Spatial visualization of community complaints</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMap(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 relative bg-slate-950 p-4">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-inner border border-slate-800 bg-slate-900">
                <IssueMap height="100%" reports={reports} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800/80 pt-12 pb-8 text-slate-400 text-sm mt-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-100 font-black text-lg">
              <Leaf className="h-6 w-6 text-emerald-400" /> CivicPulse
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-powered crowdsourced civic management platform enabling citizens, volunteers, and municipal administration to build cleaner, smarter communities.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-200 mb-3 text-xs uppercase tracking-wider">Workflows</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/report" className="hover:text-emerald-400">Report Civic Issue</Link></li>
              <li><Link href="/complaints" className="hover:text-emerald-400">Track Complaints</Link></li>
              <li><Link href="/volunteer/dashboard" className="hover:text-emerald-400">Volunteer Cleanups</Link></li>
              <li><Link href="/admin/dashboard" className="hover:text-emerald-400">Admin Dispatch</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-200 mb-3 text-xs uppercase tracking-wider">AI Capabilities</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/assistant" className="hover:text-emerald-400">CivicPulse AI Assistant</Link></li>
              <li><Link href="/predictor" className="hover:text-emerald-400">Civic Hotspot Predictor</Link></li>
              <li><Link href="/rewards" className="hover:text-emerald-400">Incentives & XP</Link></li>
              <li><Link href="/leaderboard" className="hover:text-emerald-400">Community Rank</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-200 mb-3 text-xs uppercase tracking-wider">Emergency Notice</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For immediate public safety and life-threatening emergencies, call national emergency response (<strong>112</strong>).
            </p>
          </div>
        </div>
        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} CivicPulse – AI-Powered Civic Management Platform. Open Architecture.</p>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-emerald-400">● Systems Operational</span>
            <span>PostgreSQL · Gemini 2.5 Flash · Leaflet</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
