import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { 
  MapPin, Trash, Coins, Medal, Settings, Home, Store, Brain, 
  AlertTriangle, Bot, ClipboardList, Star, Shield, 
  Users, UserCheck, CheckSquare, BarChart3, ShieldCheck 
} from "lucide-react"
import { useUser } from "@/context/UserContext"

// ── CITIZEN MODULES ──
const citizenItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/report", icon: MapPin, label: "Report Civic Issue" },
  { href: "/complaints", icon: ClipboardList, label: "My Complaints" },
  { href: "/assistant", icon: Bot, label: "AI Assistant" },
  { href: "/sos", icon: AlertTriangle, label: "Emergency Reporting" },
  { href: "/marketplace", icon: Store, label: "Marketplace" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
]

// ── VOLUNTEER MODULES ──
const volunteerItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/volunteer/dashboard", icon: Star, label: "Assigned Tasks" },
  { href: "/collect", icon: Trash, label: "Collect Waste" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
]

// ── ADMIN MODULES (ALL 13 REQUIRED MODULES) ──
const adminItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/admin/dashboard", icon: Shield, label: "Admin Dashboard" },
  { href: "/complaints", icon: ClipboardList, label: "Complaints / Reports" },
  { href: "/admin/dashboard", icon: Users, label: "User Management" },
  { href: "/admin/dashboard", icon: UserCheck, label: "Volunteer / Worker Mgmt" },
  { href: "/admin/dashboard", icon: CheckSquare, label: "Task Assignment" },
  { href: "/predictor", icon: Brain, label: "AI Predictor" },
  { href: "/admin/analytics", icon: MapPin, label: "Hotspot / Map Analytics" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/rewards", icon: Coins, label: "Rewards Management" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
  { href: "/admin/dashboard", icon: ShieldCheck, label: "Admin Panel" },
]

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (open && onClose) {
      onClose();
    }
  }, [pathname]);

  const rawRole = user?.role || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null) || 'citizen';
  const role = rawRole === 'worker' ? 'volunteer' : rawRole;

  const currentNavItems = role === 'admin' 
    ? adminItems 
    : role === 'volunteer' 
    ? volunteerItems 
    : citizenItems;

  const handleItemClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside className={`bg-slate-900/95 lg:bg-slate-900/60 backdrop-blur-md border-r pt-20 border-slate-800/80 text-slate-100 w-64 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col justify-between shadow-2xl lg:shadow-none`}>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto pt-4 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {currentNavItems.map((item, idx) => (
            <Link key={`${item.href}-${idx}`} href={item.href} passHref onClick={handleItemClick}>
              <Button 
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={`w-full justify-start py-2.5 rounded-xl transition-all duration-200 ${
                  pathname === item.href 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold shadow-lg shadow-emerald-500/5" 
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                }`} 
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="text-sm truncate">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* Settings */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          <Link href="/settings" passHref onClick={handleItemClick}>
            <Button 
              variant={pathname === "/settings" ? "secondary" : "outline"}
              className={`w-full py-2.5 rounded-xl transition-all duration-200 ${
                pathname === "/settings"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-slate-400 border-slate-800 hover:bg-slate-800/50 hover:text-slate-100"
              }`} 
            >
              <Settings className="mr-3 h-5 w-5" />
              <span className="text-base">Settings</span>
            </Button>
          </Link>
        </div>

      </aside>
    </>
  )
}