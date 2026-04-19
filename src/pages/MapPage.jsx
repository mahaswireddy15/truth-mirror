import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Filter } from 'lucide-react';
import { listenToReports } from '../services/firebase';

// ─── Category colours (as requested) ──────────────────────────────────────────

const CATEGORY_CONFIG = {
  water:       { color: '#EF4444', label: 'Water',       icon: '💧' },
  roads:       { color: '#F97316', label: 'Roads',       icon: '🛣️' },
  electricity: { color: '#EAB308', label: 'Electricity', icon: '⚡' },
  health:      { color: '#3B82F6', label: 'Health',      icon: '🏥' },
  sanitation:  { color: '#A855F7', label: 'Sanitation',  icon: '🗑️' },
  education:   { color: '#10B981', label: 'Education',   icon: '🏫' },
};

const CATEGORY_FILTERS = [
  { id: 'all',         label: 'All',         icon: '🗺️' },
  { id: 'water',       label: 'Water',       icon: '💧' },
  { id: 'roads',       label: 'Roads',       icon: '🛣️' },
  { id: 'electricity', label: 'Electricity', icon: '⚡' },
  { id: 'health',      label: 'Health',      icon: '🏥' },
  { id: 'sanitation',  label: 'Sanitation',  icon: '🗑️' },
];

// ─── Location → Coordinates lookup ────────────────────────────────────────────
// Covers Hyderabad areas, common ward patterns, and major Indian cities.
// Unknown strings fall back to a deterministic hash-based offset from Hyderabad.

const LOCATION_COORDS = {
  // Hyderabad areas
  'madhapur':       [17.4485, 78.3908],
  'ameerpet':       [17.4375, 78.4483],
  'banjara hills':  [17.4138, 78.4492],
  'jubilee hills':  [17.4239, 78.4072],
  'hitech city':    [17.4432, 78.3783],
  'gachibowli':     [17.4400, 78.3489],
  'kondapur':       [17.4604, 78.3565],
  'kukatpally':     [17.4849, 78.3951],
  'secunderabad':   [17.4399, 78.4983],
  'dilsukhnagar':   [17.3686, 78.5264],
  'lb nagar':       [17.3474, 78.5480],
  'uppal':          [17.4009, 78.5581],
  'alwal':          [17.4993, 78.5129],
  'malkajgiri':     [17.4586, 78.5295],
  'begumpet':       [17.4418, 78.4672],
  'punjagutta':     [17.4274, 78.4496],
  'somajiguda':     [17.4261, 78.4633],
  'abids':          [17.3939, 78.4733],
  'nampally':       [17.3888, 78.4674],
  'charminar':      [17.3616, 78.4747],
  'mehdipatnam':    [17.3924, 78.4348],
  'tolichowki':     [17.4063, 78.4152],
  'miyapur':        [17.4965, 78.3541],
  'bachupally':     [17.5300, 78.4049],
  'nizampet':       [17.5127, 78.3978],
  'moosapet':       [17.4601, 78.4193],
  'erragadda':      [17.4559, 78.4342],
  'kukatpally':     [17.4849, 78.3951],
  'lingampally':    [17.4938, 78.3383],
  'chandanagar':    [17.5072, 78.3174],
  'patancheru':     [17.5326, 78.2628],
  'kompally':       [17.5570, 78.4774],
  'tarnaka':        [17.4340, 78.5347],
  'nacharam':       [17.4104, 78.5522],
  'hayathnagar':    [17.3371, 78.5955],
  'ghatkesar':      [17.4481, 78.6953],
  'trimulgherry':   [17.4560, 78.5237],
  'borabanda':      [17.4574, 78.4007],
  'sr nagar':       [17.4591, 78.4218],
  'sanath nagar':   [17.4590, 78.4387],
  // Ward grid (approximate spread across Hyderabad)
  'ward 1':  [17.3800, 78.4750],
  'ward 2':  [17.3900, 78.4850],
  'ward 3':  [17.4000, 78.4600],
  'ward 4':  [17.4100, 78.4700],
  'ward 5':  [17.4200, 78.4820],
  'ward 6':  [17.3700, 78.4680],
  'ward 7':  [17.4300, 78.4500],
  'ward 8':  [17.4400, 78.4600],
  'ward 9':  [17.4500, 78.4720],
  'ward 10': [17.4600, 78.4830],
  'ward 11': [17.3600, 78.4590],
  'ward 12': [17.3500, 78.4700],
  'ward 13': [17.3400, 78.4810],
  'ward 14': [17.4700, 78.4510],
  'ward 15': [17.4800, 78.4650],
  'ward 16': [17.4900, 78.4730],
  'ward 17': [17.3800, 78.5010],
  'ward 18': [17.3900, 78.5110],
  'ward 19': [17.4000, 78.5200],
  'ward 20': [17.4100, 78.5310],
  // Major Indian cities
  'hyderabad':    [17.3850, 78.4867],
  'mumbai':       [19.0760, 72.8777],
  'delhi':        [28.6139, 77.2090],
  'bangalore':    [12.9716, 77.5946],
  'bengaluru':    [12.9716, 77.5946],
  'chennai':      [13.0827, 80.2707],
  'kolkata':      [22.5726, 88.3639],
  'pune':         [18.5204, 73.8567],
  'ahmedabad':    [23.0225, 72.5714],
  'jaipur':       [26.9124, 75.7873],
  'lucknow':      [26.8467, 80.9462],
  'nagpur':       [21.1458, 79.0882],
  'indore':       [22.7196, 75.8577],
  'bhopal':       [23.2599, 77.4126],
  'visakhapatnam':[17.6868, 83.2185],
  'vijayawada':   [16.5062, 80.6480],
  'patna':        [25.5941, 85.1376],
  'surat':        [21.1702, 72.8311],
  'coimbatore':   [11.0168, 76.9558],
};

// Deterministic string hash
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getCoords = (locationStr) => {
  if (!locationStr) return [17.3850, 78.4867];
  const lower = locationStr.toLowerCase().trim();

  // Exact match
  if (LOCATION_COORDS[lower]) return LOCATION_COORDS[lower];

  // Partial match (longest key that appears inside the string)
  let best = null;
  let bestLen = 0;
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (lower.includes(key) && key.length > bestLen) {
      best = coords;
      bestLen = key.length;
    }
  }
  if (best) return best;

  // Deterministic hash-spread around Hyderabad center
  const h = hashStr(lower);
  return [
    17.3850 + ((h % 400) - 200) * 0.0008,
    78.4867 + (((h >> 10) % 400) - 200) * 0.0008,
  ];
};

const normalizeCategory = (cat) => {
  if (!cat) return 'other';
  const l = cat.toLowerCase();
  if (l === 'power') return 'electricity';
  if (l === 'garbage') return 'sanitation';
  return l;
};

// ─── MapFlyTo (must live inside MapContainer) ──────────────────────────────────

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { duration: 1 });
  }, [center, map]);
  return null;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    const unsub = listenToReports(setReports);
    return unsub;
  }, []);

  // Group filtered reports into per-district clusters
  const clusters = useMemo(() => {
    const filtered = reports.filter((r) => {
      const cat = normalizeCategory(r.category);
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (districtFilter !== 'all' && r.district !== districtFilter) return false;
      return true;
    });

    const grouped = {};
    for (const r of filtered) {
      const key = (r.district || 'Unknown').trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }

    return Object.entries(grouped).map(([district, items]) => {
      const catCounts = {};
      for (const item of items) {
        const cat = normalizeCategory(item.category);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
      const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      const dominantCat = sortedCats[0]?.[0] || 'other';
      const statuses = items.reduce((acc, r) => {
        const s = r.status || 'PENDING';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      return {
        district,
        coords: getCoords(district),
        count: items.length,
        dominantCat,
        topIssues: sortedCats.slice(0, 4).map(([cat, count]) => ({ cat, count })),
        statuses,
      };
    });
  }, [reports, categoryFilter, districtFilter]);

  const uniqueDistricts = useMemo(
    () => [...new Set(reports.map((r) => r.district).filter(Boolean))].sort(),
    [reports]
  );

  // Log-scale radius so dense areas don't dwarf sparse ones
  const getRadius = (count) => Math.min(10 + Math.log(count + 1) * 7, 38);

  const handleDistrictSelect = (dist) => {
    setDistrictFilter(dist);
    setSelected(null);
    if (dist !== 'all') setFlyTarget(getCoords(dist));
  };

  const handleMarkerClick = (cluster) => {
    setSelected(cluster);
    setFlyTarget(cluster.coords);
  };

  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white flex flex-col">

      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-4 border-b border-[#1F1F2E]">
        <h1 className="text-2xl font-black uppercase tracking-tight">
          Suffering <span className="text-[#E8363D]">Map</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          Live complaint heatmap — {reports.length} report{reports.length !== 1 ? 's' : ''} across {clusters.length} area{clusters.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="px-4 py-3 space-y-2.5 border-b border-[#1F1F2E]">
        {/* Category pills */}
        <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-0.5">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setCategoryFilter(f.id); setSelected(null); }}
              className={`flex-none whitespace-nowrap px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all
                ${categoryFilter === f.id
                  ? 'bg-red-950/80 border-[#E8363D] text-[#E8363D] shadow-[0_0_8px_rgba(232,54,61,0.3)]'
                  : 'bg-[#12122A] border-[#1F1F2E] text-gray-400 hover:bg-[#1A1A24]'
                }`}
            >
              <span>{f.icon}</span>{f.label}
            </button>
          ))}
        </div>

        {/* District / Ward dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-500 flex-none" />
          <div className="relative flex-1">
            <select
              value={districtFilter}
              onChange={(e) => handleDistrictSelect(e.target.value)}
              className="w-full appearance-none bg-[#12122A] border border-[#1F1F2E] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#E8363D] [&>option]:bg-[#12122A]"
            >
              <option value="all">All Wards / Districts</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-500">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leaflet Map ── */}
      <div className="relative h-[400px] md:h-[480px]">
        <MapContainer
          center={[17.385, 78.4867]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {flyTarget && <MapFlyTo center={flyTarget} />}

          {clusters.map((cluster) => {
            const cfg = CATEGORY_CONFIG[cluster.dominantCat] ?? { color: '#6B7280' };
            const isSelected = selected?.district === cluster.district;
            return (
              <CircleMarker
                key={cluster.district}
                center={cluster.coords}
                radius={getRadius(cluster.count)}
                pathOptions={{
                  color:       isSelected ? '#ffffff' : cfg.color,
                  fillColor:   cfg.color,
                  fillOpacity: isSelected ? 0.92 : 0.68,
                  weight:      isSelected ? 3 : 1.5,
                }}
                eventHandlers={{ click: () => handleMarkerClick(cluster) }}
              />
            );
          })}
        </MapContainer>

        {/* ── Legend overlay (bottom-left) ── */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-[#0A0A0F]/90 border border-[#1F1F2E] rounded-xl p-3 backdrop-blur-sm pointer-events-none">
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2.5">Category</p>
          <div className="space-y-1.5">
            {CATEGORY_FILTERS.filter((f) => f.id !== 'all').map(({ id, label, icon }) => {
              const cfg = CATEGORY_CONFIG[id];
              return (
                <div key={id} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[10px] text-gray-300 leading-none">{icon} {label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1F1F2E] space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-full flex-none border border-gray-500" style={{ width: 10, height: 10 }} />
              <span className="text-[9px] text-gray-600">Small = few reports</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full flex-none border border-gray-500" style={{ width: 18, height: 18 }} />
              <span className="text-[9px] text-gray-600">Large = many reports</span>
            </div>
          </div>
        </div>

        {/* ── Area count badge (top-right) ── */}
        <div className="absolute top-3 right-3 z-[1000] bg-[#0A0A0F]/90 border border-[#1F1F2E] rounded-xl px-3 py-2 backdrop-blur-sm text-center pointer-events-none">
          <p className="text-[#E8363D] text-2xl font-black leading-none">{clusters.length}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">areas</p>
        </div>

        {/* ── Empty state overlay ── */}
        {clusters.length === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
            <div className="bg-[#0A0A0F]/85 border border-[#1F1F2E] rounded-xl px-6 py-5 text-center">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-white font-bold text-sm">No complaints to display</p>
              <p className="text-gray-500 text-xs mt-1 max-w-[200px]">
                {categoryFilter !== 'all' || districtFilter !== 'all'
                  ? 'Try clearing the filters above'
                  : 'Submit a complaint to see it plotted here'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Selected cluster detail panel ── */}
      {selected ? (
        <div className="bg-[#12122A] border-t-2 border-[#E8363D]/40 px-4 py-4 flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-black text-lg flex items-center gap-2">
                <MapPin size={16} className="text-[#E8363D] flex-none" />
                {selected.district}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5 ml-6">
                {selected.count} complaint{selected.count !== 1 ? 's' : ''} reported in this area
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="bg-[#1F1F2E] hover:bg-gray-700 p-1.5 rounded-full transition-colors flex-none"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Top issues */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Top Issues</p>
            <div className="grid grid-cols-2 gap-2">
              {selected.topIssues.map(({ cat, count }) => {
                const cfg = CATEGORY_CONFIG[cat] ?? { color: '#6B7280', label: cat, icon: '📋' };
                return (
                  <div
                    key={cat}
                    className="bg-[#0A0A0F] border border-[#1F1F2E] rounded-lg px-3 py-2.5 flex items-center gap-2"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-none"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-white text-xs font-semibold flex-1 truncate">{cfg.icon} {cfg.label}</span>
                    <span
                      className="text-xs font-black tabular-nums"
                      style={{ color: cfg.color }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status breakdown */}
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Status</p>
            <div className="flex gap-2">
              {Object.entries(selected.statuses).map(([status, count]) => {
                const colour =
                  status === 'PENDING'     ? 'text-yellow-500 border-yellow-800'  :
                  status === 'RESOLVED'    ? 'text-green-500 border-green-800'    :
                  status === 'IGNORED'     ? 'text-[#E8363D] border-red-800'      :
                                             'text-blue-400 border-blue-800';
                return (
                  <div
                    key={status}
                    className={`flex-1 bg-[#0A0A0F] border rounded-lg py-2 text-center ${colour}`}
                  >
                    <p className="text-sm font-black">{count}</p>
                    <p className="text-[9px] uppercase tracking-wide opacity-70 mt-0.5">{status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#1F1F2E] px-4 py-3 text-center">
          <p className="text-gray-600 text-xs">
            {clusters.length > 0
              ? 'Tap a marker on the map to see complaint details'
              : 'No markers to tap — submit a complaint first'}
          </p>
        </div>
      )}
    </div>
  );
}
