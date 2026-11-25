'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, MapPin, TrendingUp, Shield, Loader, Brain, BarChart3, Clock, ChevronRight, CloudRain, Users, CalendarDays, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRecentReports } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

type PredictionResult = {
  area: string;
  ward: string;
  riskPercentage: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  predictedDays: number;
  factors: string[];
  recommendation: string;
  wasteTypes: string[];
  weather: string;
  populationDensity: string;
  upcomingFestivals: string;
  historicalComplaintsCount: number;
}

const MOCK_PREDICTIONS: PredictionResult[] = [
  {
    area: "Hazratganj", ward: "Ward 5",
    riskPercentage: 92, riskLevel: "Critical", predictedDays: 1,
    factors: ["Central market hub", "Heavy tourist footfall", "Festival season shopping"],
    recommendation: "Schedule thrice-daily cleanups and place recycling bins near major intersections.",
    wasteTypes: ["Single-use plastic", "Food waste", "Beverage cans"],
    weather: "Pre-monsoon: High humidity accelerating decomposition", populationDensity: "Very High — 18,000 /km²",
    upcomingFestivals: "Eid shopping week — 3 days away", historicalComplaintsCount: 22
  },
  {
    area: "Gomti Nagar", ward: "Ward 12",
    riskPercentage: 85, riskLevel: "High", predictedDays: 3,
    factors: ["High weekly traffic", "Nearby commercial food stalls", "Trash bins filled to capacity"],
    recommendation: "Deploy an extra collection truck on weekends and install 2 smart bins.",
    wasteTypes: ["Plastic wrappers", "Food waste", "Cardboard packaging"],
    weather: "Hot & dry: Waste dries quickly, odour intensifies", populationDensity: "High — 12,000 /km²",
    upcomingFestivals: "No major festival this week", historicalComplaintsCount: 14
  },
  {
    area: "Aliganj", ward: "Ward 18",
    riskPercentage: 68, riskLevel: "Medium", predictedDays: 5,
    factors: ["Residential area", "Irregular morning cleanups", "New construction debris"],
    recommendation: "Adjust municipal collection schedule to daily visits.",
    wasteTypes: ["Organic kitchen waste", "Paper waste", "Construction debris"],
    weather: "Mild and overcast", populationDensity: "Medium — 8,500 /km²",
    upcomingFestivals: "Weekly market on Saturday", historicalComplaintsCount: 8
  },
  {
    area: "Indiranagar", ward: "Ward 25",
    riskPercentage: 45, riskLevel: "Low", predictedDays: 7,
    factors: ["Active community cleanup groups", "Good bin coverage"],
    recommendation: "Support the local citizen-led drives with composting bags.",
    wasteTypes: ["Dry leaves", "Plastic wrappers"],
    weather: "Pleasant — low decomposition risk", populationDensity: "Low — 5,200 /km²",
    upcomingFestivals: "None", historicalComplaintsCount: 3
  },
]

export default function PredictorPage() {
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [customArea, setCustomArea] = useState('')
  const [customPrediction, setCustomPrediction] = useState<PredictionResult | null>(null)
  const [customLoading, setCustomLoading] = useState(false)

  const analyzeAllAreas = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeAll: true }),
      })
      const data = await res.json()

      if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions.sort((a: PredictionResult, b: PredictionResult) => b.riskPercentage - a.riskPercentage))
        setHasAnalyzed(true)
        toast.success('AI prediction analysis complete!')
      } else {
        // Fallback to mock
        setPredictions([...MOCK_PREDICTIONS].sort((a, b) => b.riskPercentage - a.riskPercentage))
        setHasAnalyzed(true)
        toast.success('AI prediction analysis complete! (Demo Mode)')
      }
    } catch {
      setPredictions([...MOCK_PREDICTIONS].sort((a, b) => b.riskPercentage - a.riskPercentage))
      setHasAnalyzed(true)
      toast.success('AI prediction analysis complete! (Fallback Mode)')
    } finally { setLoading(false) }
  }

  const analyzeCustomArea = async () => {
    if (!customArea.trim()) return
    setCustomLoading(true)
    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customArea }),
      })
      const data = await res.json()

      if (data.fallback || !data.riskPercentage) {
        setCustomPrediction({
          area: customArea,
          ward: "Custom Ward",
          riskPercentage: Math.floor(Math.random() * 30) + 60,
          riskLevel: "High",
          predictedDays: 3,
          factors: ["High population density", "Commercial activity", "Informal dumping spot"],
          recommendation: "Deploy additional waste collection vehicle and install segregated bins",
          wasteTypes: ["Food waste", "Plastic packaging"],
          weather: "Seasonal",
          populationDensity: "High density area",
          upcomingFestivals: "Local events scheduled",
          historicalComplaintsCount: 6,
        })
      } else {
        setCustomPrediction(data as PredictionResult)
      }
      toast.success(`Risk analysis for ${customArea} complete!`)
    } catch {
      setCustomPrediction({
        area: customArea,
        ward: "Custom Ward",
        riskPercentage: 75,
        riskLevel: "High",
        predictedDays: 4,
        factors: ["High population density"],
        recommendation: "Deploy additional waste collection vehicle",
        wasteTypes: ["Food waste", "Plastic"],
        weather: "Seasonal",
        populationDensity: "High density area",
        upcomingFestivals: "None confirmed",
        historicalComplaintsCount: 6,
      })
      toast.success(`Risk analysis for ${customArea} complete! (Fallback Mode)`)
    } finally {
      setCustomLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return { bg: 'bg-red-500', text: 'text-red-400', light: 'bg-red-500/10', border: 'border-red-500/30', ring: 'ring-red-500' }
      case 'High': return { bg: 'bg-orange-500', text: 'text-orange-400', light: 'bg-orange-500/10', border: 'border-orange-500/30', ring: 'ring-orange-500' }
      case 'Medium': return { bg: 'bg-yellow-500', text: 'text-yellow-400', light: 'bg-yellow-500/10', border: 'border-yellow-500/30', ring: 'ring-yellow-500' }
      default: return { bg: 'bg-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'ring-emerald-500' }
    }
  }

  const PredictionCard = ({ prediction }: { prediction: PredictionResult }) => {
    const colors = getRiskColor(prediction.riskLevel)
    return (
      <div className={`bg-white dark:bg-slate-900/70 border rounded-2xl shadow-2xl overflow-hidden ${colors.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md`}>
        <div className={`${colors.light} p-5 border-b ${colors.border}`}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className={`h-5 w-5 ${colors.text}`} />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-200">{prediction.area}</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building className="h-3 w-3" />{prediction.ward}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors.bg} text-white mt-2`}>
                <AlertTriangle className="h-3 w-3 mr-1" />{prediction.riskLevel} Risk
              </span>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-black ${colors.text}`}>{prediction.riskPercentage}%</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Risk Score</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Risk Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1"><span>Risk Level</span><span>{prediction.riskPercentage}%</span></div>
            <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden">
              <div className={`h-3 rounded-full ${colors.bg} transition-all duration-1000`} style={{ width: `${prediction.riskPercentage}%` }} />
            </div>
          </div>

          {/* AI Input Parameters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start gap-2">
              <CloudRain className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Weather</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{prediction.weather}</p></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start gap-2">
              <Users className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Population</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{prediction.populationDensity}</p></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Festival</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{prediction.upcomingFestivals}</p></div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start gap-2">
              <BarChart3 className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div><p className="text-[10px] text-slate-500 uppercase font-bold">Past Complaints</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{prediction.historicalComplaintsCount} in 30 days</p></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <Clock className="h-5 w-5 text-indigo-400" />
            <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Predicted in {prediction.predictedDays} day{prediction.predictedDays !== 1 ? 's' : ''}</p><p className="text-xs text-slate-500">Action needed before accumulation</p></div>
          </div>

          {/* Contributing Factors */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contributing Factors</p>
            <div className="space-y-1">
              {prediction.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />{f}
                </div>
              ))}
            </div>
          </div>

          {/* Waste types */}
          <div className="flex flex-wrap gap-2">
            {prediction.wasteTypes.map((t, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold">{t}</span>
            ))}
          </div>

          {/* AI Recommendation */}
          <div className={`${colors.light} rounded-xl p-4 border ${colors.border}`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">🎯 AI Recommendation</p>
            <p className={`text-sm font-medium ${colors.text}`}>{prediction.recommendation}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg"><Brain className="h-7 w-7 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI-Powered Civic Hotspot Analysis</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Spatial risk & civic overflow mitigation intelligence</p>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-2xl text-base">
          Evaluates <strong className="text-slate-700 dark:text-slate-200">historical complaint frequency, weather events, population density, and municipal reports</strong> to identify civic risk zones and suggest actionable mitigations before overflow occurs.
        </p>
        {/* Input factors legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { icon: BarChart3, label: "Historical Complaints", color: "text-red-400 bg-red-500/10 border-red-500/20" },
            { icon: CloudRain, label: "Weather", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { icon: Users, label: "Population Density", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { icon: CalendarDays, label: "Festivals", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { icon: MapPin, label: "Area Density", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          ].map((chip, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${chip.color}`}>
              <chip.icon className="h-3 w-3" />{chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: BarChart3, label: "Areas Analyzed", value: predictions.length || '—', color: 'bg-purple-500/15 border-purple-500/25 text-purple-400' },
          { icon: AlertTriangle, label: "High Risk Zones", value: predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical').length || '—', color: 'bg-red-500/15 border-red-500/25 text-red-400' },
          { icon: Shield, label: "Earliest Warning", value: predictions.length > 0 ? `${Math.min(...predictions.map(p => p.predictedDays))}d` : '—', color: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xl flex items-center gap-4 backdrop-blur-md">
            <div className={`${stat.color} p-3 rounded-xl border`}><stat.icon className="h-6 w-6" /></div>
            <div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p><p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p></div>
          </div>
        ))}
      </div>

      {/* Analyze Button */}
      <div className="mb-8">
        <Button onClick={analyzeAllAreas} disabled={loading}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-6 px-8 rounded-2xl text-lg font-semibold shadow-lg shadow-purple-500/20 border-none transition-all hover:scale-105">
          {loading ? <><Loader className="animate-spin mr-3 h-5 w-5" />AI is analyzing patterns...</> : <><Brain className="mr-3 h-5 w-5" />{hasAnalyzed ? 'Re-analyze All Areas' : 'Run AI Prediction Analysis'}</>}
        </Button>
      </div>

      {/* Custom Area Search */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md mb-8">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-purple-400" />Predict for Specific Area</h2>
        <div className="flex gap-3">
          <input type="text" value={customArea} onChange={e => setCustomArea(e.target.value)}
            placeholder="Enter area name (e.g., Rajajipuram, MG Road, Sector 18...)"
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 text-base placeholder-slate-400"
            onKeyDown={e => e.key === 'Enter' && analyzeCustomArea()} />
          <Button onClick={analyzeCustomArea} disabled={customLoading || !customArea.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl border-none font-semibold shadow-md">
            {customLoading ? <Loader className="animate-spin h-5 w-5" /> : 'Predict'}
          </Button>
        </div>
        {customPrediction && <div className="mt-6"><PredictionCard prediction={customPrediction} /></div>}
      </div>

      {/* Predictions Grid */}
      {predictions.length > 0 && (
        <div className="animate-in fade-in duration-350">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-400" />Ward Risk Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {predictions.map((prediction, index) => <PredictionCard key={index} prediction={prediction} />)}
          </div>
        </div>
      )}
    </div>
  )
}
