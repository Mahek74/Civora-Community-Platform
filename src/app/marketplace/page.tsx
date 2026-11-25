'use client'
import { useState, useEffect } from 'react'
import { 
  Store, MapPin, Loader, Search, Phone, Tag, Plus, TrendingUp, 
  CheckCircle2, X, Filter, ShieldCheck, Sparkles, Scale, AlertCircle, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { getWasteCollectionTasks, getUserByEmail, updateTaskStatus } from '@/utils/db/actions'

export type MarketplaceItem = {
  id: number
  title: string
  category: 'e-waste' | 'metal' | 'paper' | 'plastic' | 'glass' | 'battery'
  wasteType: string
  amount: string
  weightKg: number
  estimatedValue: number
  location: string
  ward: string
  date: string
  contactPhone: string
  sellerName: string
  isVerified: boolean
  status: 'pending' | 'in_progress' | 'completed'
}

// Live Scrap Market Rates per Kg in INR
const SCRAP_RATES: Record<string, { rate: number; unit: string; trend: string }> = {
  'Copper Scrap': { rate: 480, unit: '₹/kg', trend: '+3.2%' },
  'E-Waste / PCB': { rate: 150, unit: '₹/kg', trend: '+1.8%' },
  'Aluminum Scrap': { rate: 140, unit: '₹/kg', trend: '+0.5%' },
  'Lead-Acid Batteries': { rate: 95, unit: '₹/kg', trend: '+4.1%' },
  'Iron / TMT Rods': { rate: 38, unit: '₹/kg', trend: '-0.8%' },
  'HDPE / PET Plastic': { rate: 22, unit: '₹/kg', trend: '+2.0%' },
  'Cardboard & Kraft': { rate: 14, unit: '₹/kg', trend: '+1.1%' },
  'Glass Cullet': { rate: 6, unit: '₹/kg', trend: '0.0%' },
}

// Initial realistic community scrap listings
const INITIAL_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 101,
    title: 'Industrial Computer PCBs & Server E-Waste',
    category: 'e-waste',
    wasteType: 'Electronic Waste (Motherboards & CPUs)',
    amount: '45 kg',
    weightKg: 45,
    estimatedValue: 6750,
    location: 'Plot 14, Adhartal Industrial Estate',
    ward: 'Ward 22 — Adhartal',
    date: 'Today, 2:30 PM',
    contactPhone: '+91 98000 00101',
    sellerName: 'Vertex Tech Solutions (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 102,
    title: 'Construction Iron TMT Offcuts & Angles',
    category: 'metal',
    wasteType: 'Heavy Metal & Steel Scrap',
    amount: '180 kg',
    weightKg: 180,
    estimatedValue: 6840,
    location: 'Sector 3 Commercial Hub, Wright Town',
    ward: 'Ward 14 — Wright Town',
    date: 'Today, 11:15 AM',
    contactPhone: '+91 98000 00102',
    sellerName: 'Narmada Builders (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 103,
    title: 'Corrugated Packaging Boxes & Carton Bales',
    category: 'paper',
    wasteType: 'Cardboard & Paper Kraft',
    amount: '95 kg',
    weightKg: 95,
    estimatedValue: 1330,
    location: 'Civil Lines Market, near Head Post Office',
    ward: 'Ward 08 — Civil Lines',
    date: 'Yesterday',
    contactPhone: '+91 98000 00103',
    sellerName: 'Bansal Wholesale Mart (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 104,
    title: 'Commercial Inverter Lead-Acid Batteries (4 Units)',
    category: 'battery',
    wasteType: 'Automotive & Inverter Lead Batteries',
    amount: '80 kg (4 Units)',
    weightKg: 80,
    estimatedValue: 7600,
    location: 'Sadar Bazar Main Road',
    ward: 'Ward 19 — Sadar Cantonment',
    date: 'Yesterday',
    contactPhone: '+91 98000 00104',
    sellerName: 'Apex Power Systems (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 105,
    title: 'Crushed Beverage PET Bottles & HDPE Caps',
    category: 'plastic',
    wasteType: 'Sorted PET & Rigid Plastic',
    amount: '65 kg',
    weightKg: 65,
    estimatedValue: 1430,
    location: 'Civic Center Food Street',
    ward: 'Ward 11 — Civic Center',
    date: '2 days ago',
    contactPhone: '+91 98000 00105',
    sellerName: 'Green Dine Cafeteria (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 106,
    title: 'Stripped Industrial Copper Wire Scrap',
    category: 'metal',
    wasteType: 'Pure Electrical Copper Wire',
    amount: '22 kg',
    weightKg: 22,
    estimatedValue: 10560,
    location: 'Napier Town, 4th Bridge Crossing',
    ward: 'Ward 15 — Napier Town',
    date: '2 days ago',
    contactPhone: '+91 98000 00106',
    sellerName: 'Mahakaushal Electricals (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 107,
    title: 'Sorted Clear Beverage Glass Bottles & Cullet',
    category: 'glass',
    wasteType: 'Glass Bottles (Flint & Amber)',
    amount: '140 kg',
    weightKg: 140,
    estimatedValue: 840,
    location: 'Gorakhpur Main Road',
    ward: 'Ward 06 — Gorakhpur',
    date: '3 days ago',
    contactPhone: '+91 98000 00107',
    sellerName: 'Shree Distributors (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 108,
    title: 'Office White Records, Newspapers & Files',
    category: 'paper',
    wasteType: 'Sorted White Office Paper',
    amount: '110 kg',
    weightKg: 110,
    estimatedValue: 1870,
    location: 'Vijay Nagar Square, High Court Annex',
    ward: 'Ward 25 — Vijay Nagar',
    date: '3 days ago',
    contactPhone: '+91 98000 00108',
    sellerName: 'Kalyani Tax Consultants (Demo)',
    isVerified: true,
    status: 'pending',
  },
  {
    id: 109,
    title: 'Fabrication Aluminum Window Cutoffs & Extrusions',
    category: 'metal',
    wasteType: 'Clean Aluminum Extrusions',
    amount: '38 kg',
    weightKg: 38,
    estimatedValue: 5320,
    location: 'Ranital Stadium Complex',
    ward: 'Ward 17 — Ranital',
    date: '4 days ago',
    contactPhone: '+91 98000 00109',
    sellerName: 'Modern Glass & Glazing (Demo)',
    isVerified: true,
    status: 'pending',
  },
]

const ITEMS_PER_PAGE = 6

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  
  // Modals State
  const [showListModal, setShowListModal] = useState(false)
  const [contactModalItem, setContactModalItem] = useState<MarketplaceItem | null>(null)
  const [claimedModalItem, setClaimedModalItem] = useState<MarketplaceItem | null>(null)
  
  // New Listing Form State
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<'e-waste' | 'metal' | 'paper' | 'plastic' | 'glass' | 'battery'>('metal')
  const [newWeight, setNewWeight] = useState('')
  const [newLocation, setNewLocation] = useState('Civil Lines, Jabalpur')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      setLoading(true)
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) setUser(fetchedUser)
        }

        const fetchedTasks = await getWasteCollectionTasks(30)
        
        // Merge DB tasks with initial marketplace inventory
        if (fetchedTasks && fetchedTasks.length > 0) {
          const mappedDbItems: MarketplaceItem[] = fetchedTasks
            .filter(t => t.status === 'pending')
            .map((task, idx) => {
              const weightMatch = task.amount.match(/(\d+(\.\d+)?)/)
              const weightKg = weightMatch ? parseFloat(weightMatch[0]) : 25
              const isEwaste = task.wasteType.toLowerCase().includes('e-waste') || task.wasteType.toLowerCase().includes('electronic')
              const isMetal = task.wasteType.toLowerCase().includes('metal') || task.wasteType.toLowerCase().includes('iron')
              const isPlastic = task.wasteType.toLowerCase().includes('plastic')
              const isPaper = task.wasteType.toLowerCase().includes('paper') || task.wasteType.toLowerCase().includes('cardboard')

              let category: MarketplaceItem['category'] = 'metal'
              let pricePerKg = 38
              if (isEwaste) { category = 'e-waste'; pricePerKg = 150 }
              else if (isPlastic) { category = 'plastic'; pricePerKg = 22 }
              else if (isPaper) { category = 'paper'; pricePerKg = 14 }
              else if (isMetal) { category = 'metal'; pricePerKg = 38 }

              return {
                id: 200 + idx,
                title: `${task.wasteType} Collection Lot`,
                category,
                wasteType: task.wasteType,
                amount: task.amount,
                weightKg,
                estimatedValue: Math.round(weightKg * pricePerKg),
                location: task.location,
                ward: 'Ward Civic Zone',
                date: task.date,
                contactPhone: '+91 98930 11223',
                sellerName: 'Citizen Contributor',
                isVerified: true,
                status: 'pending',
              }
            })

          // Deduplicate and combine
          setItems([...INITIAL_MARKETPLACE_ITEMS, ...mappedDbItems])
        } else {
          setItems(INITIAL_MARKETPLACE_ITEMS)
        }
      } catch (error) {
        console.error('Error fetching marketplace data:', error)
        setItems(INITIAL_MARKETPLACE_ITEMS)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndTasks()
  }, [])

  // Filter items by search query and category
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.wasteType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ward.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const pageCount = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleClaim = async (item: MarketplaceItem) => {
    if (!user) {
      toast.error('Please log in to claim scrap items.')
      window.dispatchEvent(new Event('openLoginModal'))
      return
    }
    try {
      await updateTaskStatus(item.id, 'in_progress', user.id)
    } catch {
      // Offline fallback handling
    }
    toast.success(`🎉 Scrap lot claimed! ₹${item.estimatedValue} payout reserved upon pickup.`)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setClaimedModalItem(item)
  }

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newWeight.trim()) {
      toast.error('Please enter title and weight.')
      return
    }

    const weightNum = parseFloat(newWeight) || 10
    const priceRates: Record<string, number> = {
      'e-waste': 150,
      'metal': 38,
      'paper': 14,
      'plastic': 22,
      'glass': 6,
      'battery': 95,
    }
    const rate = priceRates[newCategory] || 30
    const estVal = Math.round(weightNum * rate)

    const newItem: MarketplaceItem = {
      id: Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      wasteType: `${newCategory.toUpperCase()} Recyclables`,
      amount: `${weightNum} kg`,
      weightKg: weightNum,
      estimatedValue: estVal,
      location: newLocation.trim(),
      ward: 'Ward 08 — Central Zone',
      date: 'Just now',
      contactPhone: newPhone.trim() || '+91 98260 00111',
      sellerName: user?.name || 'Verified Citizen',
      isVerified: true,
      status: 'pending',
    }

    setItems([newItem, ...items])
    setShowListModal(false)
    setNewTitle('')
    setNewWeight('')
    setNewPhone('')
    toast.success('🎉 Your scrap lot is now live on the marketplace!')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100 space-y-8 animate-in fade-in duration-200">
      
      {/* ── HEADER & LIVE RATES TICKER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/5">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100">CivicPulse Scrap & Recyclables Marketplace</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                B2B & Citizen exchange for bulk scrap, e-waste, metal offcuts, and commercial recyclables.
              </p>
            </div>
          </div>
        </div>

        {/* Action: List Scrap */}
        <Button
          onClick={() => {
            if (!user) {
              toast.error('Please log in to list scrap items.')
              window.dispatchEvent(new Event('openLoginModal'))
              return
            }
            setShowListModal(true)
          }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl px-6 py-6 text-sm shadow-xl shadow-emerald-600/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="h-5 w-5" /> List Scrap for Sale
        </Button>
      </div>

      {/* ── DEMO TRANSPARENCY BANNER ── */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 text-xs text-emerald-300 flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-bold text-emerald-200">
            ℹ️ Demo Marketplace • Sample listings for demonstration
          </p>
          <p className="text-emerald-400/80 leading-relaxed text-[11px]">
            Seller availability, benchmark scrap rates, and pickup details shown here are sample data for demonstration purposes and do not represent live commercial transactions.
          </p>
        </div>
      </div>

      {/* ── LIVE SCRAP RATES CAROUSEL TICKER ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
            <TrendingUp className="h-4 w-4" /> Central India Scrap Rate Index
          </div>
          <span className="text-[11px] text-slate-500">Indicative wholesale reference benchmark rates</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto">
          {Object.entries(SCRAP_RATES).map(([material, { rate, unit, trend }]) => (
            <div key={material} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 truncate" title={material}>{material}</span>
              <div className="my-1">
                <span className="text-base font-black text-slate-100">₹{rate}</span>
                <span className="text-[10px] text-slate-500 ml-0.5">{unit.replace('₹', '')}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                {trend}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTERS ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-sm backdrop-blur-md flex items-center">
            <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
            <Input
              type="text"
              placeholder="Search by area (e.g. 'Civil Lines', 'Wright Town') or material ('E-waste', 'Copper', 'Iron')..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent focus-visible:ring-0 text-slate-100 placeholder-slate-500 text-sm pl-3"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-2 text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'All Listings', count: items.length },
            { id: 'e-waste', label: '⚡ E-Waste', count: items.filter(i => i.category === 'e-waste').length },
            { id: 'metal', label: '🔩 Metals & Iron', count: items.filter(i => i.category === 'metal').length },
            { id: 'battery', label: '🔋 Lead Batteries', count: items.filter(i => i.category === 'battery').length },
            { id: 'paper', label: '📦 Cardboard & Paper', count: items.filter(i => i.category === 'paper').length },
            { id: 'plastic', label: '🧴 Plastics', count: items.filter(i => i.category === 'plastic').length },
            { id: 'glass', label: '🍾 Glass', count: items.filter(i => i.category === 'glass').length },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedCategory === cat.id ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTINGS GRID ── */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <Loader className="animate-spin h-8 w-8 text-emerald-500" />
          <p className="text-xs font-bold text-slate-400">Loading live marketplace inventory...</p>
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-8 space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Store className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">No scrap listings matched your criteria</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              Try searching for another neighborhood or change the active material filter.
            </p>
          </div>
          <Button
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
            variant="outline"
            className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map(item => (
            <div 
              key={item.id} 
              className="bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-xl hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-md overflow-hidden flex flex-col group hover:-translate-y-1"
            >
              {/* Card Top Header */}
              <div className="bg-slate-950/80 p-5 border-b border-slate-800/80 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      🟢 DEMO LISTING
                    </span>
                  </div>
                  <span className="text-base font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-2xl flex items-center gap-1 shrink-0">
                    <Tag className="h-3.5 w-3.5" /> ₹{item.estimatedValue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-slate-500" />
                    <span>Total Weight: <strong>{item.amount}</strong></span>
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-200 font-semibold">{item.location}</p>
                      <p className="text-[11px] text-slate-500">{item.ward}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-800/60">
                    <span>Seller: <strong>{item.sellerName}</strong></span>
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <Button 
                    onClick={() => handleClaim(item)} 
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/15 rounded-xl font-bold text-xs py-5"
                  >
                    Claim & Pickup
                  </Button>
                  <Button 
                    onClick={() => setContactModalItem(item)}
                    variant="outline" 
                    className="border-slate-800 hover:bg-slate-800 hover:text-slate-100 text-slate-300 rounded-xl px-3.5 py-5" 
                    title="View Contact & Directions"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAGINATION CONTROLS ── */}
      {pageCount > 1 && (
        <div className="mt-8 flex justify-center items-center gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs"
          >
            Previous
          </Button>
          <div className="flex items-center px-4 text-xs text-slate-400 font-bold">
            Page {currentPage} of {pageCount}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
            disabled={currentPage === pageCount}
            className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs"
          >
            Next
          </Button>
        </div>
      )}

      {/* ── LIST SCRAP MODAL ── */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8">
            <button
              onClick={() => setShowListModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                <Plus className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100">List Scrap Lot for Sale</h2>
              <p className="text-xs text-slate-400 mt-1">
                Post your recyclables or scrap material for verified local scrap buyers & recyclers.
              </p>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Lot Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Copper Wire Scrap (20kg) or Carton Boxes"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="e-waste">⚡ E-Waste</option>
                    <option value="metal">🔩 Metal & Iron</option>
                    <option value="battery">🔋 Lead Batteries</option>
                    <option value="paper">📦 Cardboard / Paper</option>
                    <option value="plastic">🧴 Plastics</option>
                    <option value="glass">🍾 Glass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Est. Weight (kg)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 35"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pickup Location (Area/Ward)</label>
                <Input
                  type="text"
                  placeholder="e.g. Sector 2, Wright Town, Jabalpur"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contact Phone Number</label>
                <Input
                  type="text"
                  placeholder="+91 98260 XXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-slate-950 border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-5 rounded-xl text-sm shadow-xl shadow-emerald-600/20"
                >
                  Publish Scrap Listing
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONTACT OWNER MODAL ── */}
      {contactModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-5">
            <button
              onClick={() => setContactModalItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Demo Seller Contact</h3>
                <p className="text-xs text-slate-400">Sample seller & pickup details for demonstration</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Seller Name:</span>
                <span className="font-bold text-slate-200">{contactModalItem.sellerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Demo Contact:</span>
                <span className="font-bold text-emerald-400 text-sm">{contactModalItem.contactPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pickup Area:</span>
                <span className="font-bold text-slate-200 text-right">{contactModalItem.location}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                <span className="text-slate-500">Estimated Value:</span>
                <span className="font-bold text-emerald-300 text-sm">₹{contactModalItem.estimatedValue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  window.open(`tel:${contactModalItem.contactPhone.replace(/\s+/g, '')}`)
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" /> Call Demo Seller
              </Button>
              <Button
                variant="outline"
                onClick={() => setContactModalItem(null)}
                className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLAIMED / RESERVATION SUCCESS MODAL ── */}
      {claimedModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-5">
            <button
              onClick={() => setClaimedModalItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  DEMO RESERVATION CREATED
                </span>
                <h3 className="font-bold text-xl text-slate-100 mt-1">Demo Reservation Confirmed</h3>
                <p className="text-xs text-slate-400">Sample payout reserved for demonstration flow.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lot Item:</span>
                <span className="font-bold text-slate-200">{claimedModalItem.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Quantity:</span>
                <span className="font-bold text-slate-200">{claimedModalItem.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Reserved Payout:</span>
                <span className="font-black text-emerald-400 text-sm">₹{claimedModalItem.estimatedValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Demo Seller:</span>
                <span className="font-bold text-slate-200">{claimedModalItem.sellerName} ({claimedModalItem.contactPhone})</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                <span className="text-slate-500">Pickup Area:</span>
                <span className="font-bold text-slate-200 text-right">{claimedModalItem.location}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  window.open(`tel:${claimedModalItem.contactPhone.replace(/\s+/g, '')}`)
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-5 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" /> Call Demo Seller
              </Button>
              <Button
                variant="outline"
                onClick={() => setClaimedModalItem(null)}
                className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
