'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Save, Award, Lock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getReportsByUserId, getOrCreateReward } from '@/utils/db/actions'
import { getUserBadges, getHighestBadge } from '@/utils/badges'
import { toast } from 'react-hot-toast'

type UserSettings = {
  name: string
  email: string
  phone: string
  address: string
  notifications: boolean
}

export default function SettingsPage() {
  const [lang, setLang] = useState("English")
  const [settings, setSettings] = useState<UserSettings>({
    name: 'Loading...',
    email: 'Loading...',
    phone: '+91 98765 43210',
    address: 'Eco Residency, Sector 5, New Delhi',
    notifications: true,
  })
  
  const [dbUser, setDbUser] = useState<any>(null)
  const [reportsCount, setReportsCount] = useState(0)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch real database info
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      try {
        const email = localStorage.getItem('userEmail')
        if (email) {
          const user = await getUserByEmail(email)
          if (user) {
            setDbUser(user)
            setSettings(prev => ({
              ...prev,
              name: user.name,
              email: user.email
            }))
            
            // Fetch reports
            const reports = await getReportsByUserId(user.id)
            setReportsCount(reports.length)
            
            // Fetch reward points
            const reward = await getOrCreateReward(user.id)
            if (reward) {
              setPoints(reward.points)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Profile settings updated locally!')
  }

  const badges = getUserBadges(reportsCount, points)
  const highestBadge = getHighestBadge(reportsCount, points)

  return (
    <div className="min-h-screen py-8 bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            ⚙️ Account settings & profile
          </h1>
          <p className="text-slate-400 mt-1">Manage your details, choose options, and track reporter tier achievements.</p>
        </div>

        {/* Gamified Achievements Card */}
        <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Award className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Reporter Achievements & Tiers</h2>
              <p className="text-xs text-slate-400">Unlock community tags by reporting waste and earning reward points</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Current Reputation Tier Block */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reputation Title</span>
              {highestBadge ? (
                <div className="space-y-2">
                  <div className="text-5xl">{highestBadge.icon}</div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${highestBadge.color}`}>
                    {highestBadge.name}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {highestBadge.description}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 animate-pulse">
                  <div className="text-5xl">🌱</div>
                  <div className="text-sm font-bold text-slate-500 bg-slate-850 px-3 py-1 rounded-full border border-slate-800">
                    Eco Novice
                  </div>
                  <p className="text-xs text-slate-400">
                    File your first report to unlock your initial reputation tier!
                  </p>
                </div>
              )}
              
              <div className="w-full border-t border-slate-800 pt-3 flex justify-between text-xs text-slate-400">
                <span>Reports filed: <strong>{reportsCount}</strong></span>
                <span>Total points: <strong>{points}</strong></span>
              </div>
            </div>

            {/* Achievements List Block */}
            <div className="md:col-span-2 space-y-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Achievements Checklist</span>
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {badges.map(badge => (
                  <div 
                    key={badge.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all duration-200 ${
                      badge.unlocked 
                        ? 'bg-slate-950/70 border-slate-800 text-slate-200' 
                        : 'bg-slate-950 border-slate-900 opacity-45 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <div className="font-bold text-slate-200">{badge.name}</div>
                        <div className="text-xs text-slate-400">{badge.requirement}</div>
                      </div>
                    </div>

                    <div>
                      {badge.unlocked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Language & Voice Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Preferences</h2>
          <div>
            <label className="block mb-2 font-medium text-sm text-slate-300">Choose Language:</label>
            <select 
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full p-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:ring-1 focus:ring-green-400 focus:border-green-400 transition"
            >
              <option>English</option>
              <option>हिंदी</option>
              <option>मराठी</option>
              <option>தமிழ்</option>
            </select>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 text-sm leading-relaxed text-slate-300">
            🎙️ <b>Voice Reporting Enabled:</b> You can speak “Report Plastic Waste” → system parses and records automatically.
          </div>
        </div>

        {/* Account Settings Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-slate-100">Account details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {[
              { label: 'Full Name', name: 'name', type: 'text', icon: User },
              { label: 'Email Address', name: 'email', type: 'email', icon: Mail },
              { label: 'Phone Number', name: 'phone', type: 'tel', icon: Phone },
              { label: 'Address', name: 'address', type: 'text', icon: MapPin },
            ].map(({ label, name, type, icon: Icon }) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium mb-1.5 text-slate-300">{label}</label>
                <div className="relative">
                  <input
                    type={type}
                    id={name}
                    name={name}
                    value={settings[name as keyof UserSettings] as string}
                    onChange={handleInputChange}
                    className="pl-10 w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                  <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifications"
                name="notifications"
                checked={settings.notifications}
                onChange={handleInputChange}
                className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="notifications" className="text-sm text-slate-300">
                Receive email notifications for verified complaints and challenge releases
              </label>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition py-3 rounded-xl font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
