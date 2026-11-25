// @ts-nocheck
'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut, X, Mail, UserCircle, Lock, Eye, EyeOff, Shield, Star, ArrowLeft, ChevronRight, AlertCircle } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { createUser, verifyUserPassword, getUserRole, getUnreadNotifications, markNotificationAsRead, getUserByEmail, getUserBalance } from "@/utils/db/actions"
import { toast } from "react-hot-toast"
import ThemeToggle from "@/app/ThemeToggle"

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string; role?: string } | null>(null);
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<any[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [balance, setBalance] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'volunteer' | 'admin' | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Verify and sync session from /api/auth/me on mount & auth changes
  useEffect(() => {
    const syncSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (data.user) {
          setUserInfo({
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'citizen'
          })
          setLoggedIn(true)
          localStorage.setItem('userEmail', data.user.email)
          localStorage.setItem('userName', data.user.name)
          localStorage.setItem('userRole', data.user.role || 'citizen')
        } else {
          localStorage.removeItem('userEmail')
          localStorage.removeItem('userName')
          localStorage.removeItem('userRole')
          setUserInfo(null)
          setLoggedIn(false)
        }
      } catch {
        setLoggedIn(false)
      }
    }

    syncSession()
    window.addEventListener('authChanged', syncSession)

    const handleOpenLogin = () => {
      setSelectedRole(null)
      setAuthMode('login')
      setLoginError(null)
      setShowLoginModal(true)
    };
    window.addEventListener('openLoginModal', handleOpenLogin);

    return () => {
      window.removeEventListener('authChanged', syncSession)
      window.removeEventListener('openLoginModal', handleOpenLogin)
    }
  }, [])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo?.email) {
        const user = await getUserByEmail(userInfo.email)
        if (user) {
          const unreadNotifications = await getUnreadNotifications(user.id)
          setNotifications(unreadNotifications)
        }
      }
    }
    fetchNotifications()
    const notificationInterval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(notificationInterval)
  }, [userInfo])

  // Fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo?.email) {
        const user = await getUserByEmail(userInfo.email)
        if (user) {
          const userBalance = await getUserBalance(user.id)
          setBalance(userBalance)
        }
      }
    }
    fetchUserBalance()
    const handleBalanceUpdate = (event: CustomEvent) => setBalance(event.detail)
    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener)
    return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener)
  }, [userInfo])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    if (!loginForm.email.trim()) {
      const msg = 'Please enter your email address.'
      setLoginError(msg)
      toast.error(msg)
      return
    }
    if (!loginForm.password.trim()) {
      const msg = 'Please enter your password.'
      setLoginError(msg)
      toast.error(msg)
      return
    }
    if (loginForm.password.trim().length < 6) {
      const msg = 'Password must be at least 6 characters.'
      setLoginError(msg)
      toast.error(msg)
      return
    }
    if (authMode === 'signup' && !loginForm.name.trim()) {
      const msg = 'Please enter your full name.'
      setLoginError(msg)
      toast.error(msg)
      return
    }

    setLoginLoading(true)
    try {
      const email = loginForm.email.trim().toLowerCase()
      const password = loginForm.password.trim()

      if (authMode === 'signup') {
        // Public registration strictly creates Citizen accounts
        if (selectedRole !== 'citizen') {
          const msg = 'Public sign-up is only available for Citizens. Volunteer and Admin roles require authorized assignment.'
          setLoginError(msg)
          toast.error(msg)
          return
        }

        let name = loginForm.name.trim()
        if (!name) {
          const parts = email.split('@')[0].split(/[._-]/)
          name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        }

        // Signup creates the account and sets the session cookie.
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        })
        const signupData = await signupRes.json()

        if (!signupRes.ok || signupData.error) {
          const msg = signupData.error || 'Signup failed. Please try again.'
          setLoginError(msg)
          toast.error(msg)
          return
        }

        const user = signupData.user
        const role = user.role || 'citizen'
        localStorage.setItem('userEmail', user.email)
        localStorage.setItem('userName', user.name)
        localStorage.setItem('userRole', role)
        setUserInfo({ email: user.email, name: user.name, role })
        setLoggedIn(true)
        setShowLoginModal(false)
        setSelectedRole(null)
        setLoginForm({ email: '', password: '', name: '' })
        setLoginError(null)
        toast.success(`Account created. Welcome, ${user.name}!`)
        window.dispatchEvent(new Event('authChanged'))
        router.push('/')
      } else {
        // Sign in with role intent verification
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: selectedRole }),
        })
        const loginData = await loginRes.json()

        if (!loginRes.ok || loginData.error) {
          const msg = loginData.error || 'Login failed. Please check your credentials.'
          setLoginError(msg)
          toast.error(msg)
          return
        }

        const user = loginData.user
        const name = user.name
        const role = user.role || 'citizen'
        localStorage.setItem('userEmail', email)
        localStorage.setItem('userName', name)
        localStorage.setItem('userRole', role)
        setUserInfo({ email, name, role })
        setLoggedIn(true)
        setShowLoginModal(false)
        setSelectedRole(null)
        setLoginError(null)
        setLoginForm({ email: '', password: '', name: '' })
        toast.success(`Welcome back, ${name}! 🎉`)
        window.dispatchEvent(new Event('authChanged'))

        // Role-based redirect
        if (role === 'admin') router.push('/admin/dashboard')
        else if (role === 'volunteer' || role === 'worker') router.push('/volunteer/dashboard')
        else router.push('/')
      }
    } catch (error) {
      console.error("Error logging in:", error)
      const msg = 'Authentication failed. Please try again.'
      setLoginError(msg)
      toast.error(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error:', e)
    }
    setLoggedIn(false)
    setUserInfo(null)
    setBalance(0)
    setNotifications([])
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userRole')
    toast.success('Logged out successfully.')
    window.dispatchEvent(new Event('authChanged'))
  }

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const avatarLetter = userInfo?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <>
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 text-slate-100">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 md:mr-4 text-slate-300 hover:text-slate-100 hover:bg-slate-800/50" onClick={onMenuClick}>
              <Menu className="h-6 w-6" />
            </Button>
            <Link href="/" className="flex items-center">
              <Leaf className="h-6 w-6 md:h-8 md:w-8 text-emerald-400 mr-1 md:mr-2" />
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg text-slate-100">CivicPulse</span>
                <span className="text-[8px] md:text-[10px] text-slate-400 -mt-1">AI-Powered Civic Management Platform</span>
              </div>
            </Link>
          </div>

          {!isMobile && (
            <div className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search civic issues, complaints, tasks..."
                  className="w-full px-4 py-2 border border-slate-800 rounded-full bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" className="text-slate-300">
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1 relative text-slate-300 hover:text-slate-100">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 bg-red-500 text-white">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-slate-800 text-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer text-slate-300"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{notification.type}</span>
                        <span className="text-xs text-slate-400">{notification.message}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="text-slate-400">No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Balance */}
            <div className="mr-1 md:mr-2 flex items-center bg-slate-950 border border-slate-800/80 rounded-full px-2.5 md:px-3 py-1">
              <Coins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-emerald-400" />
              <span className="font-bold text-sm md:text-base text-emerald-400">
                {balance.toFixed(0)}
              </span>
            </div>

            {/* Auth Button / Profile Menu */}
            {!loggedIn ? (
              <Button
                onClick={() => {
                  setSelectedRole(null)
                  setAuthMode('login')
                  setShowLoginModal(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm md:text-base font-semibold rounded-xl"
              >
                Login
                <LogIn className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex items-center text-slate-300 hover:text-slate-100">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm mr-1 shadow-sm">
                      {avatarLetter}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100">
                  <DropdownMenuItem className="font-semibold text-slate-200 focus:bg-slate-800">
                    {userInfo?.name}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-slate-400 cursor-default focus:bg-slate-800">
                    {userInfo?.email} ({userInfo?.role === 'worker' ? 'volunteer' : (userInfo?.role || 'citizen')})
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:text-slate-100 focus:bg-slate-800">
                    <Link href="/settings" className="w-full">Profile & Settings</Link>
                  </DropdownMenuItem>

                  {/* Role-specific quick links in profile dropdown */}
                  {userInfo?.role === 'admin' ? (
                    <>
                      <DropdownMenuItem className="text-emerald-400 focus:bg-slate-800">
                        <Link href="/admin/dashboard" className="w-full">🛡️ Admin Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-blue-400 focus:bg-slate-800">
                        <Link href="/admin/analytics" className="w-full">📊 Civic Analytics</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (userInfo?.role === 'volunteer' || userInfo?.role === 'worker') ? (
                    <>
                      <DropdownMenuItem className="text-amber-400 focus:bg-slate-800">
                        <Link href="/volunteer/dashboard" className="w-full">⭐ Volunteer Tasks</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-emerald-400 focus:bg-slate-800">
                        <Link href="/collect" className="w-full">♻️ Collect Waste</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem className="text-emerald-400 focus:bg-slate-800">
                        <Link href="/report" className="w-full">📍 Report Issue</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-blue-400 focus:bg-slate-800">
                        <Link href="/complaints" className="w-full">📋 My Complaints</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 focus:bg-slate-800 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Role-Selection Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => {
                setShowLoginModal(false)
                setSelectedRole(null)
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* STEP 1: Role Selection */}
            {selectedRole === null ? (
              <div>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 mb-3">
                    <Leaf className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-100">Welcome to CivicPulse</h2>
                  <p className="text-slate-400 text-xs md:text-sm mt-1 text-center">
                    Select your access role to continue:
                  </p>
                </div>

                <div className="space-y-3">
                  {/* A. Citizen */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('citizen')
                      setAuthMode('login')
                      setLoginError(null)
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                          👤 Login as Citizen
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Report issues, track complaints, earn rewards
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* B. Volunteer */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('volunteer')
                      setAuthMode('login')
                      setLoginError(null)
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                        <Star className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-100 group-hover:text-amber-400 transition-colors">
                          ⭐ Login as Volunteer
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Adopt cleanup tasks, verify on-site, earn XP
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* C. Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('admin')
                      setAuthMode('login')
                      setLoginError(null)
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition-colors">
                          🛡️ Login as Admin
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Municipal dashboard, triage, dispatch & analytics
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: Authentication Form for Selected Role */
              <div>
                {/* Back to role selection button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null)
                    setLoginError(null)
                  }}
                  className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-3"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Choose different role
                </button>

                {/* Header */}
                <div className="flex flex-col items-center mb-5">
                  <div className={`p-3 rounded-2xl shadow-lg mb-2.5 ${
                    selectedRole === 'admin'
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                      : selectedRole === 'volunteer'
                      ? 'bg-amber-600/20 border border-amber-500/30 text-amber-400'
                      : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    {selectedRole === 'admin' ? (
                      <Shield className="h-7 w-7 text-blue-400" />
                    ) : selectedRole === 'volunteer' ? (
                      <Star className="h-7 w-7 text-amber-400" />
                    ) : (
                      <User className="h-7 w-7 text-emerald-400" />
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-100 text-center">
                    {selectedRole === 'admin'
                      ? 'Municipal Admin Login'
                      : selectedRole === 'volunteer'
                      ? 'Volunteer Portal Login'
                      : authMode === 'login'
                      ? 'Citizen Sign In'
                      : 'Create Citizen Account'}
                  </h2>

                  <p className="text-slate-400 text-xs text-center mt-1">
                    {selectedRole === 'admin'
                      ? 'Enter your municipal administrator credentials'
                      : selectedRole === 'volunteer'
                      ? 'Enter your assigned volunteer credentials'
                      : authMode === 'login'
                      ? 'Sign in to access your civic action dashboard'
                      : 'Join CivicPulse to report issues and earn rewards'}
                  </p>

                  {/* Citizen Sign In / Sign Up segmented tabs (Only available for Citizens) */}
                  {selectedRole === 'citizen' && (
                    <div className="flex w-full bg-slate-950 p-1 rounded-xl border border-slate-800 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login')
                          setLoginError(null)
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          authMode === 'login'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup')
                          setLoginError(null)
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          authMode === 'signup'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>
                  )}

                  {/* Informational notice for Volunteer & Admin */}
                  {selectedRole !== 'citizen' && (
                    <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-center">
                      🔒 Access requires authorized {selectedRole === 'admin' ? 'administrative' : 'volunteer'} role assignment.
                    </div>
                  )}
                </div>

                {/* Form */}
                {/* Error banner */}
                {loginError && (
                  <div className="mb-3.5 animate-in fade-in">
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{loginError}</span>
                    </div>
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-3">
                  {authMode === 'signup' && selectedRole === 'citizen' && (
                    <div className="relative">
                      <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={loginForm.name}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, name: e.target.value }))}
                        required={authMode === 'signup'}
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-950 text-slate-200 placeholder-slate-500"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-950 text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="w-full pl-11 pr-11 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm bg-slate-950 text-slate-200 placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className={`w-full py-5 text-sm md:text-base font-bold rounded-xl shadow-lg transition-all mt-2 text-white ${
                      selectedRole === 'admin'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/20'
                        : selectedRole === 'volunteer'
                        ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 shadow-amber-600/20'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                    }`}
                  >
                    {loginLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        {selectedRole === 'admin'
                          ? 'Sign In as Admin'
                          : selectedRole === 'volunteer'
                          ? 'Sign In as Volunteer'
                          : authMode === 'login'
                          ? 'Sign In as Citizen'
                          : 'Register Citizen Account'}
                      </>
                    )}
                  </Button>
                </form>

                {/* Footer notes */}
                {selectedRole === 'citizen' ? (
                  <p className="text-xs text-center text-slate-400 mt-4">
                    {authMode === 'login' ? (
                      <>
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('signup')
                            setLoginError(null)
                          }}
                          className="text-emerald-400 font-bold hover:underline"
                        >
                          Sign Up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('login')
                            setLoginError(null)
                          }}
                          className="text-emerald-400 font-bold hover:underline"
                        >
                          Sign In
                        </button>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-center text-slate-500 mt-4">
                    Public sign-up is open to all community members as Citizens.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}