'use client'
import { useState } from 'react'
import { BookOpen, Laptop, FileText, Briefcase, Users, Search, Plus, MapPin, Star, MessageCircle, X, Loader, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

type Category = 'all' | 'books' | 'notes' | 'electronics' | 'projects' | 'internships' | 'teams'

type ResourceItem = {
  id: number
  title: string
  category: Category
  description: string
  price: string
  condition: string
  location: string
  postedBy: string
  postedTime: string
  rating: number
  image?: string
  tags: string[]
}

const categories: { id: Category; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'all', label: 'All', icon: Search, color: 'text-slate-300', bg: 'bg-slate-850' },
  { id: 'books', label: 'Books', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { id: 'notes', label: 'Notes', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  { id: 'electronics', label: 'Electronics', icon: Laptop, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { id: 'projects', label: 'Projects', icon: Briefcase, color: 'text-green-400', bg: 'bg-green-500/15' },
  { id: 'internships', label: 'Referrals', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  { id: 'teams', label: 'Team Finder', icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/15' },
]

const sampleItems: ResourceItem[] = [
  { id: 1, title: 'Engineering Mathematics - B.S. Grewal', category: 'books', description: 'Complete textbook, minimal highlighting. Perfect for 1st-2nd year engineering students.', price: '₹250', condition: 'Good', location: 'AKTU Campus, Lucknow', postedBy: 'Rahul V.', postedTime: '2h ago', rating: 4.5, tags: ['Engineering', 'Math', '1st Year'] },
  { id: 2, title: 'Data Structures & Algorithms Notes', category: 'notes', description: 'Handwritten notes covering Trees, Graphs, DP, Sorting. Gate-level preparation quality.', price: 'Free', condition: 'Digital', location: 'Online', postedBy: 'Priya S.', postedTime: '5h ago', rating: 5, tags: ['DSA', 'GATE', 'CS'] },
  { id: 3, title: 'Old HP Laptop - i5, 8GB RAM', category: 'electronics', description: 'Working condition, battery holds 2hrs. Good for coding and assignments.', price: '₹12,000', condition: 'Fair', location: 'Gomti Nagar, Lucknow', postedBy: 'Aman K.', postedTime: '1d ago', rating: 3.5, tags: ['Laptop', 'HP', 'Coding'] },
  { id: 4, title: 'Mini Project: Smart Waste Segregator', category: 'projects', description: 'Arduino-based waste segregation system with full documentation & code. Ready to present.', price: '₹1,500', condition: 'Complete', location: 'Indiranagar, Lucknow', postedBy: 'Sneha M.', postedTime: '3d ago', rating: 4, tags: ['Arduino', 'IoT', 'Mini Project'] },
  { id: 5, title: 'Internship Referral - TCS Digital', category: 'internships', description: 'Can refer for TCS Digital 2026 batch. Looking for CSE/IT students with 7+ CGPA.', price: 'Free', condition: 'Referral', location: 'Remote', postedBy: 'Vikash R.', postedTime: '6h ago', rating: 5, tags: ['TCS', 'Internship', 'CSE'] },
  { id: 6, title: 'Operating Systems - Galvin (9th Ed)', category: 'books', description: 'International edition, all chapters intact. Great for OS course preparation.', price: '₹180', condition: 'Good', location: 'Aliganj, Lucknow', postedBy: 'Deepak T.', postedTime: '4h ago', rating: 4, tags: ['OS', 'CS', 'Galvin'] },
  { id: 7, title: 'React.js + Node.js Project Template', category: 'projects', description: 'Full stack MERN template with authentication, dashboard, and API integration. Save weeks of work.', price: '₹500', condition: 'Digital', location: 'Online', postedBy: 'Palak V.', postedTime: '1d ago', rating: 4.5, tags: ['React', 'Node.js', 'MERN'] },
  { id: 8, title: 'Internship Referral - Google SWE Intern', category: 'internships', description: 'Googler offering referral for SWE Intern 2026. Need strong DSA + CP profile.', price: 'Free', condition: 'Referral', location: 'Bangalore', postedBy: 'Ankit G.', postedTime: '12h ago', rating: 5, tags: ['Google', 'SWE', 'Internship'] },
  { id: 9, title: 'Scientific Calculator - Casio fx-991EX', category: 'electronics', description: 'Used for 2 semesters only. Perfect working condition with original cover.', price: '₹800', condition: 'Excellent', location: 'Hazratganj, Lucknow', postedBy: 'Ritu D.', postedTime: '8h ago', rating: 4.5, tags: ['Calculator', 'Casio', 'Engineering'] },
  { id: 10, title: 'Need Frontend Dev for Hackathon', category: 'teams', description: 'Looking for a React/Next.js developer for upcoming Smart India Hackathon. Backend is ready.', price: 'Free', condition: 'Team', location: 'Online / Lucknow', postedBy: 'Aryan K.', postedTime: '1h ago', rating: 4.8, tags: ['Hackathon', 'React', 'Frontend'] },
]

export default function ExchangePage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPostModal, setShowPostModal] = useState(false)
  const [items, setItems] = useState<ResourceItem[]>(sampleItems)

  // New listing form state
  const [newItem, setNewItem] = useState({
    title: '', category: 'books' as Category, description: '', price: '', condition: '', location: '', tags: ''
  })

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const handlePostSubmit = () => {
    if (!newItem.title || !newItem.description) {
      toast.error('Please fill in title and description')
      return
    }
    const created: ResourceItem = {
      id: Date.now(),
      title: newItem.title,
      category: newItem.category,
      description: newItem.description,
      price: newItem.price || 'Free',
      condition: newItem.condition || 'Good',
      location: newItem.location || 'Your Location',
      tags: newItem.tags ? newItem.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      postedBy: 'You',
      postedTime: 'Just now',
      rating: 5,
    }
    setItems(prev => [created, ...prev])
    toast.success('🎉 Your listing has been posted successfully!')
    setShowPostModal(false)
    setNewItem({ title: '', category: 'books', description: '', price: '', condition: '', location: '', tags: '' })
  }

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent': return 'bg-green-500/15 text-green-400 border border-green-500/25'
      case 'good': return 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
      case 'fair': return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
      case 'digital': return 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
      case 'complete': return 'bg-teal-500/15 text-teal-400 border border-teal-500/25'
      case 'referral': return 'bg-pink-500/15 text-pink-400 border border-pink-500/25'
      default: return 'bg-slate-800 text-slate-350'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Student Exchange Hub</h1>
              <p className="text-slate-400 text-sm">Share resources, grow together</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowPostModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-6 py-5 text-base shadow-lg transition-all hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          Post a Resource
        </Button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 shadow-sm mb-6 flex gap-3 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search books, notes, projects, referrals..."
            className="w-full pl-12 pr-4 py-3 border-none bg-transparent focus:outline-none text-slate-100 placeholder-slate-500 text-base"
          />
        </div>
        <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
          <Filter className="h-5 w-5" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? `${cat.bg} ${cat.color} shadow-sm ring-1 ring-slate-700`
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 border border-slate-800/80 hover:text-slate-200'
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
            {cat.id !== 'all' && (
              <span className="bg-slate-950/40 px-1.5 py-0.5 rounded text-xs">
                {items.filter(i => i.category === cat.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map(item => {
          const cat = categories.find(c => c.id === item.category)!
          return (
            <div key={item.id} className="bg-slate-900/70 rounded-2xl border border-slate-800/80 overflow-hidden hover:shadow-xl hover:border-slate-750 transition-all duration-300 hover:-translate-y-1 flex flex-col">
              {/* Category Banner */}
              <div className={`${cat.bg} px-5 py-3 flex justify-between items-center border-b border-slate-800/50`}>
                <div className="flex items-center gap-2">
                  <cat.icon className={`h-4 w-4 ${cat.color}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getConditionColor(item.condition)}`}>
                  {item.condition}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-100 mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-slate-450 mb-4 line-clamp-2 flex-1">{item.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800/80 rounded-md text-xs">{tag}</span>
                  ))}
                </div>

                {/* Price & Location */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xl font-bold ${item.price === 'Free' ? 'text-emerald-400' : 'text-slate-100'}`}>
                    {item.price}
                  </span>
                  <span className="text-xs text-slate-450 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-indigo-400" /> {item.location}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {item.postedBy.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-350">{item.postedBy}</p>
                      <p className="text-[10px] text-slate-500">{item.postedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-slate-300">{item.rating}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm rounded-xl border-none shadow-sm" onClick={() => toast.success('Request sent to seller!')}>
                    {item.price === 'Free' ? 'Request' : 'Buy Now'}
                  </Button>
                  <Button variant="outline" className="px-3 rounded-xl border-slate-800 hover:bg-slate-800 text-slate-300" onClick={() => toast.success('Chat started!')}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800">
          <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-200">No resources found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your search or category filter.</p>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPostModal(false)}>
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100">Post a Resource</h2>
              <button onClick={() => setShowPostModal(false)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-400 hover:text-slate-250" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-350 mb-1">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g., Engineering Physics Textbook"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-350 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value as Category })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-slate-200">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-350 mb-1">Description *</label>
                <textarea
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Describe the item/resource in detail..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-350 mb-1">Price</label>
                  <input
                    type="text"
                    value={newItem.price}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="₹0 or Free"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-350 mb-1">Condition</label>
                  <input
                    type="text"
                    value={newItem.condition}
                    onChange={e => setNewItem({ ...newItem, condition: e.target.value })}
                    placeholder="Good / Fair / Digital"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-350 mb-1">Location</label>
                <input
                  type="text"
                  value={newItem.location}
                  onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="e.g., Gomti Nagar, Lucknow"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button onClick={handlePostSubmit} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-5 rounded-xl text-base font-semibold border-none mt-2 shadow-lg">
                <Plus className="mr-2 h-5 w-5" /> Post Resource
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
