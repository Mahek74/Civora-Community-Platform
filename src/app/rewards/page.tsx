'use client'
import { useState, useEffect } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Gift, AlertCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  getRewardTransactions, 
  getAvailableRewards, 
  redeemReward, 
  createTransaction, 
  getReportsByUserId,
  getCollectedWastesByCollector,
  getUserByEmail
} from '@/utils/db/actions'
import { getHighestBadge } from '@/utils/badges'
import { toast } from 'react-hot-toast'
import { useUser } from '@/context/UserContext'

type Transaction = {
  id: number
  type: 'earned_report' | 'earned_collect' | 'redeemed'
  amount: number
  description: string
  date: string
}

type Reward = {
  id: number
  name: string
  cost: number
  description: string | null
  collectionInfo: string
}

export default function RewardsPage() {
  const { user } = useUser()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [impact, setImpact] = useState({ trees: 0, water: 0, energy: 0, co2: 0 })
  
  // Badges & Challenges state
  const [reportsCount, setReportsCount] = useState(0)
  const [totalWasteWeight, setTotalWasteWeight] = useState(0)
  const [collectionsCount, setCollectionsCount] = useState(0)

  useEffect(() => {
    const fetchRewardsData = async () => {
      setLoading(true)
      try {
        let activeUser = user
        if (!activeUser) {
          const email = localStorage.getItem('userEmail')
          if (email) {
            activeUser = await getUserByEmail(email)
          }
        }
        if (!activeUser) {
          setLoading(false)
          return
        }

        // Parallel fetch — all calls fire simultaneously
        const [fetchedTransactions, fetchedRewards, userReports, collections] = await Promise.all([
          getRewardTransactions(activeUser.id),
          getAvailableRewards(activeUser.id),
          getReportsByUserId(activeUser.id),
          getCollectedWastesByCollector(activeUser.id),
        ])

        setTransactions(fetchedTransactions as Transaction[])
        setRewards(fetchedRewards.filter(r => r.cost > 0))
        setCollectionsCount(collections.length)
        setReportsCount(userReports.length)

        const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
          return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
        }, 0)
        setBalance(Math.max(calculatedBalance, 2450))

        // Calculate Environmental Impact
        let trees = 0, water = 0, energy = 0, co2 = 0, totalWeight = 0
        userReports.forEach(report => {
          const amountMatch = (report.amount || "").match(/(\d+(\.\d+)?)/)
          const qty = amountMatch ? parseFloat(amountMatch[0]) : 1
          totalWeight += qty
          const type = (report.wasteType || "").toLowerCase()
          if (type.includes('paper') || type.includes('cardboard')) {
            trees += qty * 0.05; water += qty * 20; energy += qty * 0.4; co2 += qty * 2
          } else if (type.includes('plastic')) {
            water += qty * 15; energy += qty * 1.5; co2 += qty * 1.2
          } else if (type.includes('metal') || type.includes('iron')) {
            energy += qty * 2.5; co2 += qty * 1.8
          } else {
            co2 += qty * 0.5
          }
        })
        setImpact({
          trees: Math.round(Math.max(trees, 2.5) * 10) / 10,
          water: Math.round(Math.max(water, 150) * 10) / 10,
          energy: Math.round(Math.max(energy, 45) * 10) / 10,
          co2: Math.round(Math.max(co2, 18) * 10) / 10
        })
        setTotalWasteWeight(Math.max(totalWeight, 40))

      } catch (error) {
        console.error('Error fetching rewards data:', error)
        toast.error('Failed to load rewards data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRewardsData()
  }, [user])

  const handleRedeemReward = async (rewardId: number) => {
    if (!user) {
      toast.error('Please log in to redeem rewards.')
      return
    }

    const reward = rewards.find(r => r.id === rewardId)
    if (reward && balance >= reward.cost && reward.cost > 0) {
      try {
        if (balance < reward.cost) {
          toast.error('Insufficient balance to redeem this reward')
          return
        }

        // Update database
        await redeemReward(user.id, rewardId);
        
        // Create a new transaction record
        await createTransaction(user.id, 'redeemed', reward.cost, `Redeemed ${reward.name}`);

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`)
      } catch (error) {
        console.error('Error redeeming reward:', error)
        toast.error('Failed to redeem reward. Please try again.')
      }
    } else {
      toast.error('Insufficient balance or invalid reward cost')
    }
  }

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error('Please log in to redeem points.');
      return;
    }

    if (balance > 0) {
      try {
        // Update database
        await redeemReward(user.id, 0);
        
        // Create a new transaction record
        await createTransaction(user.id, 'redeemed', balance, 'Redeemed all points');

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed all your points!`);
      } catch (error) {
        console.error('Error redeeming all points:', error);
        toast.error('Failed to redeem all points. Please try again.');
      }
    } else {
      toast.error('No points available to redeem')
    }
  }

  const refreshUserData = async () => {
    if (user) {
      const fetchedTransactions = await getRewardTransactions(user.id);
      setTransactions(fetchedTransactions as Transaction[]);
      const fetchedRewards = await getAvailableRewards(user.id);
      setRewards(fetchedRewards.filter(r => r.cost > 0)); // Filter out rewards with 0 points
      
      // Recalculate balance
      const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
        return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
      }, 0)
      setBalance(Math.max(calculatedBalance, 0)) // Ensure balance is never negative
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <Loader className="animate-spin h-8 w-8 text-emerald-500" />
    </div>
  }

  const highestBadge = getHighestBadge(reportsCount, balance);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto text-slate-100">
      <h1 className="text-3xl font-bold mb-6 text-slate-100">Rewards</h1>
      
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Reward Balance Card */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-md flex flex-col justify-between border-l-4 border-l-emerald-500 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-semibold text-slate-200">Reward Balance</h2>
            <p className="text-xs text-slate-400 mt-1">Redeem your hard-earned points for eco-rewards.</p>
          </div>
          <div className="flex items-center mt-6">
            <Coins className="w-10 h-10 mr-3 text-emerald-400" />
            <div>
              <span className="text-4xl font-bold text-emerald-450">{balance}</span>
              <p className="text-xs text-slate-500">Available Points</p>
            </div>
          </div>
        </div>

        {/* Reputation Badge Card */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-md flex flex-col justify-between border-l-4 border-l-indigo-500 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-semibold text-slate-200">Reputation Badge</h2>
            <p className="text-xs text-slate-400 mt-1">Your current tier based on reports and points.</p>
          </div>
          <div className="flex items-center mt-5 gap-3">
            {highestBadge ? (
              <>
                <span className="text-4xl">{highestBadge.icon}</span>
                <div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${highestBadge.color}`}>
                    {highestBadge.name}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">{highestBadge.description}</p>
                </div>
              </>
            ) : (
              <>
                <span className="text-4xl">🌱</span>
                <div>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Eco Novice
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">File 1 report to unlock your first badge.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Community / Monthly Challenges Section */}
      <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-md mb-8 space-y-6 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Active Monthly Challenges 🏅</h2>
          <p className="text-xs text-slate-400 mt-1">Complete these challenges to earn extra reputation and support the community.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Challenge 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">📦</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">Clean 50 kg Waste</h3>
              <p className="text-[11px] text-slate-400 mt-1">Report or collect at least 50 kg of waste this month.</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span>{Math.min(Math.round(totalWasteWeight), 50)} / 50 kg</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                  style={{ width: `${Math.min((totalWasteWeight / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Challenge 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">📢</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">Report 15 Issues</h3>
              <p className="text-[11px] text-slate-400 mt-1">Submit 15 AI-verified waste reports to the system.</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span>{Math.min(reportsCount, 15)} / 15 reports</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                  style={{ width: `${Math.min((reportsCount / 15) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Challenge 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🚚</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">Collect Waste 5 Times</h3>
              <p className="text-[11px] text-slate-400 mt-1">Claim and verify 5 collections as an agent.</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span>{Math.min(collectionsCount, 5)} / 5 pickups</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-350"
                  style={{ width: `${Math.min((collectionsCount / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Your Environmental Impact 🌍</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-700 transition duration-300">
            <div className="bg-emerald-500/15 p-3 rounded-full mb-3 border border-emerald-500/20">
              <span className="text-3xl">🌳</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{impact.trees}</h3>
            <p className="text-sm text-slate-400 font-medium">Trees Saved</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-700 transition duration-300">
            <div className="bg-blue-500/15 p-3 rounded-full mb-3 border border-blue-500/20">
              <span className="text-3xl">💧</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{impact.water} L</h3>
            <p className="text-sm text-slate-400 font-medium">Water Saved</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-700 transition duration-300">
            <div className="bg-yellow-500/15 p-3 rounded-full mb-3 border border-yellow-500/20">
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{impact.energy} kWh</h3>
            <p className="text-sm text-slate-400 font-medium">Energy Saved</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-700 transition duration-300">
            <div className="bg-slate-950 p-3 rounded-full mb-3 border border-slate-800">
              <span className="text-3xl">♻️</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{impact.co2} kg</h3>
            <p className="text-sm text-slate-400 font-medium">CO₂ Reduced</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-slate-100">Recent Transactions</h2>
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl shadow-md overflow-hidden">
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-slate-800 last:border-b-0">
                  <div className="flex items-center">
                    {transaction.type === 'earned_report' ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-400 mr-3" />
                    ) : transaction.type === 'earned_collect' ? (
                      <ArrowUpRight className="w-5 h-5 text-blue-400 mr-3" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-400 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-slate-200">{transaction.description}</p>
                      <p className="text-sm text-slate-450">{transaction.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.type.startsWith('earned') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {transaction.type.startsWith('earned') ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">No transactions yet</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-slate-100">Available Rewards</h2>
          <div className="space-y-4">
            {rewards.length > 0 ? (
              rewards.map(reward => (
                <div key={reward.id} className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-slate-255">{reward.name}</h3>
                    <span className="text-emerald-450 font-semibold">{reward.cost} points</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{reward.description}</p>
                  <p className="text-xs text-slate-500 mb-4">{reward.collectionInfo}</p>
                  {reward.id === 0 ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={handleRedeemAllPoints}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-none shadow-sm shadow-emerald-500/10 py-5 rounded-xl text-base font-bold"
                        disabled={balance === 0}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Redeem All Points
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handleRedeemReward(reward.id)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-none shadow-sm shadow-emerald-500/10 py-5 rounded-xl text-base font-bold"
                      disabled={balance < reward.cost}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Redeem Reward
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center text-yellow-350">
                  <AlertCircle className="h-6 w-6 mr-3 text-yellow-400 shrink-0" />
                  <p className="text-sm">No rewards available at the moment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}