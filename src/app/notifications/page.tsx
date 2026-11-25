'use client'
import { useState, useEffect } from 'react'
import { Bell, CheckCircle2, Coins, ClipboardList, AlertTriangle, User, ShoppingBag, Leaf, Loader } from 'lucide-react'
import { getUserByEmail, getUnreadNotifications, markNotificationAsRead } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'reward', message: 'You earned +20 points for complaint CIV-2026-4821 being verified!', isRead: false, createdAt: new Date(), icon: Coins, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 2, type: 'complaint', message: 'Your complaint CIV-2026-4821 has been assigned to worker Ramesh Kumar.', isRead: false, createdAt: new Date(Date.now() - 3600000), icon: User, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { id: 3, type: 'complaint', message: 'Complaint CIV-2026-3412 has been verified by the municipality!', isRead: true, createdAt: new Date(Date.now() - 7200000), icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 4, type: 'sos', message: '🚨 SOS Alert for area Gomti Nagar has been resolved by volunteer.', isRead: true, createdAt: new Date(Date.now() - 86400000), icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  { id: 5, type: 'reward', message: 'Community Cleanup Event reward: +100 points credited!', isRead: true, createdAt: new Date(Date.now() - 2 * 86400000), icon: Leaf, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' },
  { id: 6, type: 'marketplace', message: 'Your eco reward (Steel Bottle) has been dispatched to your address.', isRead: true, createdAt: new Date(Date.now() - 3 * 86400000), icon: ShoppingBag, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
]

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS as any[])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const email = localStorage.getItem('userEmail')
      if (!email) { setLoading(false); return }
      const u = await getUserByEmail(email)
      if (!u) { setLoading(false); return }
      setUser(u)
      try {
        const dbNotifs = await getUnreadNotifications(u.id)
        if (dbNotifs.length > 0) {
          const enriched = dbNotifs.map(n => ({
            ...n,
            icon: n.type === 'reward' ? Coins : n.type === 'sos' ? AlertTriangle : CheckCircle2,
            color: n.type === 'reward' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
          }))
          setNotifications([...enriched, ...MOCK_NOTIFICATIONS.filter(m => m.isRead)])
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const markRead = async (id: number) => {
    await markNotificationAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllRead = () => {
    notifications.forEach(n => { if (!n.isRead) markRead(n.id) })
    toast.success('All notifications marked as read!')
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg relative">
              <Bell className="h-7 w-7 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">{unreadCount}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{unreadCount} unread alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">Mark all read</button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map(notif => {
          const Icon = notif.icon || Bell
          return (
            <div key={notif.id} onClick={() => !notif.isRead && markRead(notif.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${notif.isRead ? 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70' : 'bg-white dark:bg-slate-900/70 border-slate-300 dark:border-slate-700 shadow-sm'}`}>
              <div className={`p-2.5 rounded-xl border shrink-0 ${notif.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>{notif.message}</p>
                <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
              </div>
              {!notif.isRead && <div className="h-2.5 w-2.5 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
            </div>
          )
        })}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg font-semibold">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No notifications at the moment.</p>
        </div>
      )}
    </div>
  )
}
