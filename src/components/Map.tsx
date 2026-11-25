// @ts-nocheck
'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, Loader, X, Navigation, MapPin, Flame, Layers } from 'lucide-react'

/* ── Static hotspot fallback data ─────────────────────────────── */
const HOTSPOTS = [
  { id: 1, lat: 28.6139, lng: 77.2090, label: 'Connaught Place, Delhi', severity: 'high', type: 'Garbage Dumping', reports: 12 },
  { id: 2, lat: 28.7041, lng: 77.1025, label: 'Rohini Sector 14, Delhi', severity: 'medium', type: 'Open Burning', reports: 7 },
  { id: 3, lat: 28.5355, lng: 77.3910, label: 'Noida Sector 62', severity: 'high', type: 'Industrial Waste', reports: 19 },
  { id: 4, lat: 28.4595, lng: 77.0266, label: 'Gurugram MG Road', severity: 'low', type: 'Littering', reports: 4 },
  { id: 5, lat: 28.6562, lng: 77.2410, label: 'Civil Lines, Delhi', severity: 'medium', type: 'Waterway Pollution', reports: 9 },
]

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
  pending: '#3b82f6',
  verified: '#10b981',
}

const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Verified',
  completed: 'Completed',
}

import { useTheme } from '@/context/ThemeContext'

interface MapProps {
  height?: string
  reports?: any[]
}

export default function IssueMap({ height = '500px', reports = [] }: MapProps) {
  const { theme } = useTheme()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const searchResultLayerRef = useRef<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimeoutRef = useRef<any>(null)
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'garbage' | 'road' | 'water' | 'other'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all')

  /* ── Listen for Theme Changes and update map style ──────────────────── */
  useEffect(() => {
    if (!tileLayerRef.current) return
    const url = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    tileLayerRef.current.setUrl(url)
  }, [theme])

  /* ── Initialize Leaflet map ──────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    let active = true

    import('leaflet').then((L) => {
      if (!active) return
      if (mapInstanceRef.current) return

      import('leaflet/dist/leaflet.css')

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current) return

      // Reset the leaflet id to avoid the "already initialized" error during dev/hot reloading
      if ((mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }

      const map = L.map(mapRef.current, {
        center: [28.6139, 77.2090],
        zoom: 11,
        zoomControl: true,
      })

      const initialUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

      const tileLayer = L.tileLayer(initialUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      tileLayerRef.current = tileLayer
      mapInstanceRef.current = map

      window.L = L
      import('leaflet.heat').then(() => {
        if (!active) return
        if (viewMode === 'heatmap') {
          renderHeatmap(L, map, reports)
        } else {
          renderMarkers(L, map, reports)
        }
      })
    })

    return () => {
      active = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        tileLayerRef.current = null
      }
    }
  }, [])

  /* ── Re-render map layers when reports or viewMode change ────── */
  useEffect(() => {
    if (!mapInstanceRef.current) return
    let active = true

    import('leaflet').then((L) => {
      if (!active || !mapInstanceRef.current) return
      window.L = L
      import('leaflet.heat').then(() => {
        if (!active || !mapInstanceRef.current) return
        // Remove all existing layers except tile layer
        mapInstanceRef.current.eachLayer((layer: any) => {
          if (!(layer instanceof L.TileLayer)) {
            mapInstanceRef.current.removeLayer(layer)
          }
        })

        if (viewMode === 'heatmap') {
          renderHeatmap(L, mapInstanceRef.current, reports)
        } else {
          renderMarkers(L, mapInstanceRef.current, reports)
        }
      })
    })

    return () => {
      active = false
    }
  }, [reports, viewMode, categoryFilter, statusFilter])

  /* ── Create a marker with pulse ring + popup ─────────────────── */
  function addMarker(L: any, map: any, spot: any) {
    const sev = spot.severity?.toLowerCase() || 'medium'
    const color = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium
    const radius = sev === 'high' || sev === 'critical' ? 13 : sev === 'medium' ? 10 : 8

    const pulseIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:${radius * 3}px;height:${radius * 3}px;
        border-radius:50%;
        background:${color}30;
        border:2px solid ${color}70;
        animation:map-pulse 2s infinite;
      "></div>`,
      iconSize: [radius * 3, radius * 3],
      iconAnchor: [radius * 1.5, radius * 1.5],
    })
    L.marker([spot.lat, spot.lng], { icon: pulseIcon }).addTo(map)

    const circle = L.circleMarker([spot.lat, spot.lng], {
      radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map)

    const statusText = STATUS_LABEL[spot.status as string] || spot.status || 'Reported'
    const reportDate = spot.date || 'Today'
    const complaintId = spot.complaintId || `CIV-2026-${Math.floor(1000 + Math.random() * 9000)}`

    circle.bindPopup(`
      <div style="font-family:sans-serif;color:#f8fafc;padding:4px;min-width:210px;">
        <div style="font-size:11px;font-family:monospace;color:#34d399;font-weight:700;margin-bottom:2px;">
          ${complaintId}
        </div>
        <div style="font-size:14px;font-weight:800;color:#f1f5f9;margin-bottom:6px;">
          ${spot.type || 'Civic Issue'}
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <span style="
            background:${color}20;color:${color};
            border:1px solid ${color}55;border-radius:999px;
            padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;
          ">${spot.severity || 'High'}</span>
          <span style="
            background:rgba(59,130,246,0.15);color:#60a5fa;
            border:1px solid rgba(59,130,246,0.3);border-radius:999px;
            padding:2px 8px;font-size:10px;font-weight:700;
          ">${statusText}</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">📍 ${spot.label}</div>
        <div style="font-size:10px;color:#64748b;margin-bottom:10px;">📅 Reported: ${reportDate}</div>
        <a href="/complaints" style="
          display:block;text-align:center;background:#10b981;color:#ffffff;
          padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;
        ">View Complaint Details →</a>
      </div>
    `, { maxWidth: 280 })
  }

  /* ── Render all markers ──────────────────────────────────────── */
  function renderMarkers(L: any, map: any, reports: any[]) {
    // Filter reports by category and status
    const filterReport = (typeStr: string = '', statusStr: string = '') => {
      const t = typeStr.toLowerCase()
      const s = statusStr.toLowerCase()
      
      let passCategory = true
      if (categoryFilter === 'garbage') passCategory = t.includes('garbage') || t.includes('waste') || t.includes('dump')
      else if (categoryFilter === 'road') passCategory = t.includes('road') || t.includes('pothole')
      else if (categoryFilter === 'water') passCategory = t.includes('water') || t.includes('drain') || t.includes('pipeline')
      else if (categoryFilter === 'other') passCategory = !t.includes('garbage') && !t.includes('road') && !t.includes('water')

      let passStatus = true
      if (statusFilter === 'pending') passStatus = s.includes('pending')
      else if (statusFilter === 'in_progress') passStatus = s.includes('progress') || s.includes('under')
      else if (statusFilter === 'resolved') passStatus = s.includes('resolved') || s.includes('verified') || s.includes('completed')

      return passCategory && passStatus
    }

    // Add static hotspots
    HOTSPOTS.forEach((spot) => {
      if (filterReport(spot.type, 'in_progress')) {
        addMarker(L, map, { ...spot, isNew: false, date: '12 Aug 2024' })
      }
    })

    // Add DB reports with stored coordinates
    const withCoords = reports.filter(r =>
      r.verificationResult?.latitude && r.verificationResult?.longitude
    )
    withCoords.forEach((report) => {
      if (filterReport(report.wasteType, report.status)) {
        const lat = parseFloat(report.verificationResult.latitude)
        const lng = parseFloat(report.verificationResult.longitude)
        if (isNaN(lat) || isNaN(lng)) return
        addMarker(L, map, {
          lat,
          lng,
          label: report.location,
          severity: report.status === 'verified' || report.status === 'resolved' ? 'low' : 'high',
          type: report.wasteType,
          amount: report.amount,
          status: report.status,
          complaintId: report.complaintId,
          date: report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Recent',
          isNew: true,
        })
      }
    })

    // Geocode reports that have no stored coordinates
    const withoutCoords = reports.filter(r =>
      !r.verificationResult?.latitude && r.location
    )
    withoutCoords.forEach((report) => {
      const q = encodeURIComponent(report.location)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
        .then(r => r.json())
        .then(data => {
          if (data?.[0] && mapInstanceRef.current) {
            const lat = parseFloat(data[0].lat)
            const lng = parseFloat(data[0].lon)
            if (isNaN(lat) || isNaN(lng)) return
            addMarker(L, mapInstanceRef.current, {
              lat, lng,
              label: report.location,
              severity: 'medium',
              type: report.wasteType,
              amount: report.amount,
              status: report.status,
              isNew: true,
            })
          }
        })
        .catch(() => {})
    })
  }

  /* ── Render heat layer ───────────────────────────────────────── */
  function renderHeatmap(L: any, map: any, reports: any[]) {
    const coordsList: any[] = []
    
    // Add static hotspots
    HOTSPOTS.forEach(spot => {
      const intensity = spot.severity === 'high' ? 0.9 : spot.severity === 'medium' ? 0.6 : 0.3
      coordsList.push([spot.lat, spot.lng, intensity])
    })

    // Add DB reports
    const withCoords = reports.filter(r =>
      r.verificationResult?.latitude && r.verificationResult?.longitude
    )
    withCoords.forEach(report => {
      const lat = parseFloat(report.verificationResult.latitude)
      const lng = parseFloat(report.verificationResult.longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        coordsList.push([lat, lng, 0.8])
      }
    })

    // Create Leaflet Heat Layer
    // @ts-ignore
    L.heatLayer(coordsList, {
      radius: 35,
      blur: 20,
      maxZoom: 13,
      gradient: {
        0.3: '#3b82f6', // blue (low)
        0.5: '#10b981', // green
        0.7: '#eab308', // yellow
        0.9: '#f97316', // orange
        1.0: '#ef4444'  // red (high density)
      }
    }).addTo(map)
  }

  /* ── Search suggestions from Nominatim ──────────────────────── */
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setSearchError('')

    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)
    if (!val.trim() || val.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(val)}&accept-language=en`
        )
        const data = await res.json()
        setSuggestions(data || [])
        setShowSuggestions(true)
      } catch {}
    }, 400)
  }

  /* ── Fly to selected suggestion ─────────────────────────────── */
  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    setSearchQuery(item.display_name)
    setSuggestions([])
    setShowSuggestions(false)

    if (!mapInstanceRef.current) return

    // Remove previous search marker
    if (searchResultLayerRef.current) {
      mapInstanceRef.current.removeLayer(searchResultLayerRef.current)
    }

    import('leaflet').then((L) => {
      const searchIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          background:#6366f1;border:3px solid white;
          transform:rotate(-45deg);
          box-shadow:0 4px 12px rgba(99,102,241,0.4);
        "></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      })
      const marker = L.marker([lat, lng], { icon: searchIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family:sans-serif;font-weight:700;font-size:13px;color:#6366f1">
            📍 ${item.display_name.split(',').slice(0, 3).join(', ')}
          </div>
        `)
        .openPopup()
      searchResultLayerRef.current = marker
      mapInstanceRef.current.flyTo([lat, lng], 14, { animate: true, duration: 1.2 })
    })
  }

  /* ── Submit search on enter / button click ───────────────────── */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError('')
    setSuggestions([])
    setShowSuggestions(false)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
      )
      const data = await res.json()
      if (data?.[0]) {
        handleSelectSuggestion(data[0])
      } else {
        setSearchError('Area not found. Try a different location name.')
      }
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setSearchError('')
    if (searchResultLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(searchResultLayerRef.current)
      searchResultLayerRef.current = null
    }
  }

  /* ── My Location ─────────────────────────────────────────────── */
  const goToMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([latitude, longitude], 14, { animate: true, duration: 1 })
      }
    })
  }

  return (
    <div style={{ height, width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <style>{`
        @keyframes map-pulse {
          0%   { transform: scale(1); opacity: 0.8; }
          70%  { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .map-search-box { position:absolute; top:12px; left:50%; transform:translateX(-50%); z-index:1000; width:90%; max-width:440px; }
        .map-legend { position:absolute; bottom:24px; left:12px; z-index:1000; background:rgba(15,23,42,0.9); backdrop-filter:blur(12px); border-radius:12px; padding:10px 14px; font-size:11px; font-family:sans-serif; border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 20px rgba(0,0,0,0.3); color:#f8fafc; }
        .map-my-location { position:absolute; bottom:24px; right:12px; z-index:1000; background:rgba(15,23,42,0.9); backdrop-filter:blur(12px); border-radius:12px; padding:8px 12px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#f1f5f9; transition:all 0.15s; }
        .map-my-location:hover { background:rgba(16,185,129,0.15); color:#34d399; border-color:rgba(16,185,129,0.3); }
        .map-view-toggle { position:absolute; bottom:24px; right:140px; z-index:1000; background:rgba(15,23,42,0.9); backdrop-filter:blur(12px); border-radius:12px; padding:8px 12px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#f1f5f9; transition:all 0.15s; }
        .map-view-toggle:hover { background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); }
        .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95) !important; backdrop-filter: blur(12px) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 16px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95) !important; border: 1px solid rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Search Bar */}
      <div className="map-search-box">
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderRadius: '14px', padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', gap: '8px' }}>
            <Search style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any area, city, landmark..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'sans-serif', background: 'transparent', color: '#f8fafc' }}
            />
            {searchQuery && (
              <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{ background: '#10b981', border: 'none', borderRadius: '9px', padding: '6px 14px', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              {searching ? <Loader style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : null}
              Search
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999, overflow: 'hidden', maxHeight: '220px', overflowY: 'auto', backdropFilter: 'blur(16px)' }}>
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestion(item)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <MapPin style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>{item.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {searchError && (
            <div style={{ marginTop: '6px', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontFamily: 'sans-serif' }}>
              {searchError}
            </div>
          )}

          {/* Category & Status Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
            {/* Category Pills */}
            {(['all', 'garbage', 'road', 'water'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  border: '1px solid',
                  cursor: 'pointer',
                  background: categoryFilter === cat ? '#10b981' : 'rgba(15,23,42,0.85)',
                  borderColor: categoryFilter === cat ? '#10b981' : 'rgba(255,255,255,0.15)',
                  color: categoryFilter === cat ? '#ffffff' : '#94a3b8',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {cat === 'all' ? 'All Types' : cat}
              </button>
            ))}

            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', display: 'flex', alignItems: 'center' }}>|</span>

            {/* Status Pills */}
            {(['all', 'pending', 'in_progress', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  border: '1px solid',
                  cursor: 'pointer',
                  background: statusFilter === st ? '#3b82f6' : 'rgba(15,23,42,0.85)',
                  borderColor: statusFilter === st ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                  color: statusFilter === st ? '#ffffff' : '#94a3b8',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {st === 'all' ? 'All Status' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapRef} style={{ flex: 1, borderRadius: '1rem', zIndex: 0, minHeight: 0 }} />

      {/* Legend */}
      <div className="map-legend">
        <div style={{ fontWeight: 800, color: '#374151', marginBottom: 6 }}>📌 Legend</div>
        {viewMode === 'heatmap' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(to right, #3b82f6, #10b981, #ef4444)', flexShrink: 0 }} />
              <span style={{ color: '#6b7280' }}>Heat Intensity (Low → High)</span>
            </div>
          </>
        ) : (
          [
            { color: '#ef4444', label: 'High severity / Active' },
            { color: '#f97316', label: 'Medium severity' },
            { color: '#eab308', label: 'Low severity' },
            { color: '#10b981', label: 'Verified / Collected' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: '#6b7280' }}>{label}</span>
            </div>
          ))
        )}
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: '10px' }}>
          {reports.length > 0 ? `${reports.length} live reports loaded` : 'Sample hotspots shown'}
        </div>
      </div>

      {/* Map Mode Toggle Button */}
      <button 
        className="map-view-toggle" 
        onClick={() => setViewMode(prev => prev === 'markers' ? 'heatmap' : 'markers')}
      >
        {viewMode === 'markers' ? (
          <>
            <Flame style={{ width: 14, height: 14, color: '#ef4444' }} />
            Heatmap View
          </>
        ) : (
          <>
            <Layers style={{ width: 14, height: 14, color: '#10b981' }} />
            Markers View
          </>
        )}
      </button>

      {/* My Location Button */}
      <button className="map-my-location" onClick={goToMyLocation}>
        <Navigation style={{ width: 14, height: 14 }} />
        My Location
      </button>
    </div>
  )
}