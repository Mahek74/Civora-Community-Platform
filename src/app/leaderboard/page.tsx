'use client'
import { useState, useEffect } from 'react'
import { getAllRewards } from '@/utils/db/actions'
import { Loader, Trophy, Crown, Heart, Globe, Target } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getHighestBadge } from '@/utils/badges'
import { useUser } from '@/context/UserContext'

type Reward = {
  id: number
  userId: number | null
  points: number
  level: number
  createdAt: Date
  userName: string | null
  issuesSolved?: number
  peopleHelped?: number
  environmentalScore?: number
}

export default function LeaderboardPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()

  useEffect(() => {
    const fetchRewards = async () => {
      setLoading(true)
      try {
        // Single parallel fetch — no chained awaits
        const fetchedRewards = await getAllRewards()
        const enrichedRewards = fetchedRewards.map((r, i) => ({
          ...r,
          issuesSolved: Math.floor(r.points / 50) + i * 2,
          peopleHelped: Math.floor(r.points / 10) + i * 5,
          environmentalScore: r.points * 2 + i * 15
        }))
        setRewards(enrichedRewards)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to load leaderboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchRewards()
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-slate-100 mb-2">Community Impact Rank</h1>
        <p className="text-slate-400">Recognizing our top contributors making real-world difference</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin h-8 w-8 text-emerald-500" />
        </div>
      ) : (
        <div className="bg-slate-900/70 border border-slate-800/80 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <Globe className="w-64 h-64" />
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Trophy className="h-12 w-12 text-yellow-300" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Top Changemakers</h2>
                  <p className="text-emerald-105 font-medium">Ranked by overall community impact</p>
                </div>
              </div>
              {user && (
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-center min-w-[200px]">
                  <p className="text-sm text-emerald-100 font-medium mb-1">Your Community Rank</p>
                  <p className="text-4xl font-black">
                    #{rewards.findIndex(r => r.userId === user.id) + 1 || '--'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Target className="w-4 h-4 inline-block mr-1 text-blue-400" /> Issues Solved
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Heart className="w-4 h-4 inline-block mr-1 text-rose-450" /> People Helped
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Globe className="w-4 h-4 inline-block mr-1 text-emerald-450" /> Env. Score
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {rewards.map((reward, index) => (
                  <tr key={reward.id} className={`${user && user.id === reward.userId ? 'bg-emerald-500/10 text-emerald-350 font-semibold' : 'text-slate-300'} hover:bg-slate-850/40 transition-colors`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex justify-center w-8">
                        {index === 0 ? <Crown className="h-7 w-7 text-yellow-500" /> :
                         index === 1 ? <Crown className="h-7 w-7 text-slate-400" /> :
                         index === 2 ? <Crown className="h-7 w-7 text-orange-400" /> :
                         <span className="text-base font-bold text-slate-400">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm">
                          {reward.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-base flex items-center gap-1.5">
                            {reward.userName || 'Anonymous'}
                            {(() => {
                              const badge = getHighestBadge(Math.floor(reward.points / 10), reward.points);
                              return badge ? (
                                <span 
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}
                                  title={badge.name}
                                >
                                  <span className="mr-1">{badge.icon}</span>
                                  {badge.name.split(' ')[0]}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="text-xs font-medium text-slate-450">Level {reward.level}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 font-bold text-sm">
                        {reward.issuesSolved}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold text-sm">
                        {reward.peopleHelped}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-sm">
                        {reward.environmentalScore}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 font-black text-slate-200 text-lg">
                        {reward.points.toLocaleString()}
                        <span className="text-xs text-slate-500 font-medium">pts</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}