import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { listenToReports } from '../services/firebase';

// ─── Registered officials roster ──────────────────────────────────────────────
// `ward` is used to fuzzy-match against the `district` field on each Firestore report.
const ROSTER = [
  { id: 'ward-7',     ward: 'Ward 7',     name: 'Ravi Kumar',   designation: 'Councillor',   fullName: 'Councillor Ravi Kumar'    },
  { id: 'zone-3',     ward: 'Zone 3',     name: 'Priya Sharma', designation: 'MLA',           fullName: 'MLA Priya Sharma'         },
  { id: 'city',       ward: 'City',       name: 'B. Reddy',     designation: 'Commissioner',  fullName: 'Commissioner B. Reddy'    },
  { id: 'ward-12',    ward: 'Ward 12',    name: 'Ahmed Khan',   designation: 'Councillor',    fullName: 'Councillor Ahmed Khan'    },
  { id: 'south-zone', ward: 'South Zone', name: 'S. Lakshmi',   designation: 'Deputy Mayor',  fullName: 'Deputy Mayor S. Lakshmi'  },
  { id: 'ward-3',     ward: 'Ward 3',     name: 'T. Venkat',    designation: 'Ward Officer',  fullName: 'Ward Officer T. Venkat'   },
  { id: 'north-zone', ward: 'North Zone', name: 'R. Naidu',     designation: 'MLA',           fullName: 'MLA R. Naidu'             },
  { id: 'ward-9',     ward: 'Ward 9',     name: 'M. Devi',      designation: 'Councillor',    fullName: 'Councillor M. Devi'       },
];

// Seed stats shown when no live Firestore data exists for a ward yet.
// lastActiveDays is converted to a real Date so `formatRelativeTime` works uniformly.
const SEEDS = {
  'ward-7':     { total: 47,  resolved: 11,  ignored: 36, lastActiveDays: 8  },
  'zone-3':     { total: 89,  resolved: 54,  ignored: 35, lastActiveDays: 2  },
  'city':       { total: 234, resolved: 182, ignored: 52, lastActiveDays: 0  },
  'ward-12':    { total: 63,  resolved: 11,  ignored: 52, lastActiveDays: 12 },
  'south-zone': { total: 112, resolved: 61,  ignored: 51, lastActiveDays: 3  },
  'ward-3':     { total: 98,  resolved: 80,  ignored: 18, lastActiveDays: 0  },
  'north-zone': { total: 77,  resolved: 26,  ignored: 51, lastActiveDays: 6  },
  'ward-9':     { total: 54,  resolved: 24,  ignored: 30, lastActiveDays: 4  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const score = (resolved, total) =>
  total > 0 ? Math.round((resolved / total) * 100) : 0;

const scoreHex = (s) =>
  s >= 70 ? '#22C55E' : s >= 40 ? '#F59E0B' : '#E8363D';

const scoreTw = (s) =>
  s >= 70 ? 'text-green-500' : s >= 40 ? 'text-amber-500' : 'text-[#E8363D]';

const bgTw = (s) =>
  s >= 70 ? 'bg-green-500' : s >= 40 ? 'bg-amber-500' : 'bg-[#E8363D]';

const cardBorder = (s) =>
  s >= 70 ? 'border-green-900/40' : s >= 40 ? 'border-amber-900/40' : 'border-red-900/40';

const formatRelativeTime = (date) => {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(ms / 86_400_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
};

/** Fuzzy ward matcher: does the report district mention this official's ward? */
const wardMatches = (district, officialWard) => {
  const d = district.toLowerCase();
  const w = officialWard.toLowerCase();
  return d === w || d.includes(w) || w.includes(d);
};

// ─── Custom Recharts tooltip ───────────────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ backgroundColor: '#0A0A0F', border: '1px solid #1F1F2E', borderRadius: 8, padding: '10px 14px', fontSize: 11 }}>
      <p style={{ color: '#fff', fontWeight: 900, marginBottom: 2 }}>{d.fullName}</p>
      <p style={{ color: '#6B7280', marginBottom: 6 }}>{d.ward}</p>
      <p style={{ color: scoreHex(d.score), fontWeight: 700 }}>Score: {d.score}/100</p>
      <p style={{ color: '#D1D5DB' }}>Total:    {d.total}</p>
      <p style={{ color: '#22C55E' }}>Resolved: {d.resolved}</p>
      <p style={{ color: '#E8363D' }}>Ignored:  {d.ignored}</p>
      {d.lastReported && (
        <p style={{ color: '#9CA3AF', marginTop: 4 }}>
          Last reported: {formatRelativeTime(d.lastReported)}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OfficialsPage() {
  const [reports, setReports]   = useState([]);
  const [sortOrder, setSortOrder] = useState('worst');

  useEffect(() => {
    const unsub = listenToReports(setReports);
    return unsub;
  }, []);

  // ── Compute per-official accountability stats ──────────────────────────────
  const officialStats = useMemo(() => {
    // Group reports by district
    const wardGroups = {};
    for (const r of reports) {
      const ward = (r.district || '').trim();
      if (!ward) continue;
      if (!wardGroups[ward]) wardGroups[ward] = [];
      wardGroups[ward].push(r);
    }

    // Build stats for each rostered official
    const stats = ROSTER.map((official) => {
      // Collect every ward group that matches this official
      const matchedKeys = Object.keys(wardGroups).filter((w) =>
        wardMatches(w, official.ward)
      );

      if (matchedKeys.length > 0) {
        // ── Live path: merge all matching ward groups ──
        const group    = matchedKeys.flatMap((k) => wardGroups[k]);
        const total    = group.length;
        const resolved = group.filter((r) => (r.status || '').toUpperCase() === 'RESOLVED').length;
        const ignored  = group.filter((r) => (r.status || '').toUpperCase() === 'IGNORED').length;
        const pending  = total - resolved - ignored;

        const timestamps = group
          .map((r) => r.createdAt?.toDate?.())
          .filter(Boolean);
        const lastReported = timestamps.length
          ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
          : null;

        return { ...official, total, resolved, ignored, pending, lastReported,
                 score: score(resolved, total), isLive: true };
      } else {
        // ── Seed path: use hardcoded fallback ──
        const s = SEEDS[official.id] ?? { total: 0, resolved: 0, ignored: 0, lastActiveDays: null };
        const lastReported = s.lastActiveDays != null
          ? new Date(Date.now() - s.lastActiveDays * 86_400_000)
          : null;
        return {
          ...official,
          total:    s.total,
          resolved: s.resolved,
          ignored:  s.ignored,
          pending:  s.total - s.resolved - s.ignored,
          lastReported,
          score:    score(s.resolved, s.total),
          isLive:   false,
        };
      }
    });

    // Add ad-hoc officials for any ward that has live data but no roster entry
    const coveredWards = new Set(
      stats.flatMap((o) =>
        Object.keys(wardGroups).filter((w) => wardMatches(w, o.ward))
      )
    );
    for (const [ward, group] of Object.entries(wardGroups)) {
      if (coveredWards.has(ward)) continue;
      const total    = group.length;
      const resolved = group.filter((r) => (r.status || '').toUpperCase() === 'RESOLVED').length;
      const ignored  = group.filter((r) => (r.status || '').toUpperCase() === 'IGNORED').length;
      const timestamps = group.map((r) => r.createdAt?.toDate?.()).filter(Boolean);
      const lastReported = timestamps.length
        ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
        : null;
      stats.push({
        id: `adhoc-${ward}`, ward, name: ward,
        designation: 'Area Officer', fullName: `Area Officer, ${ward}`,
        total, resolved, ignored, pending: total - resolved - ignored,
        lastReported, score: score(resolved, total), isLive: true,
      });
    }

    return stats;
  }, [reports]);

  // Sorted list for cards (user-controlled)
  const sortedOfficials = useMemo(() => {
    const copy = [...officialStats];
    return sortOrder === 'worst'
      ? copy.sort((a, b) => a.score - b.score)
      : copy.sort((a, b) => b.score - a.score);
  }, [officialStats, sortOrder]);

  // Chart data sorted worst→best (ascending) so worst appears at top of horizontal chart.
  // `fill` is embedded per-item — Recharts 3.x reads it automatically, replacing Cell.
  const chartData = useMemo(
    () => [...officialStats]
      .sort((a, b) => a.score - b.score)
      .map((o) => ({ ...o, fill: scoreHex(o.score) })),
    [officialStats]
  );

  // ── Summary numbers ──────────────────────────────────────────────────────────
  const totalComplaints = officialStats.reduce((s, o) => s + o.total, 0);
  const avgScore  = officialStats.length
    ? Math.round(officialStats.reduce((s, o) => s + o.score, 0) / officialStats.length)
    : 0;
  const crisisCount = officialStats.filter((o) => o.score < 40).length;
  const goodCount   = officialStats.filter((o) => o.score >= 70).length;
  const liveCount   = officialStats.filter((o) => o.isLive).length;

  // ── Chart height: 44px per official row, 220px minimum ──────────────────────
  const chartH = Math.max(chartData.length * 44, 220);

  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-8 pb-12 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="text-center border-b border-[#1F1F2E] pb-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tight">
          ACCOUNTABILITY <span className="text-[#E8363D]">SCORES</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed italic max-w-md mx-auto">
          "Every official. Every problem. Every score. Public. Forever."
        </p>

        {liveCount > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {liveCount} ward{liveCount !== 1 ? 's' : ''} powered by live Firestore data
          </div>
        )}

        <button className="mt-5 bg-[#E8363D] hover:bg-red-700 text-white font-black py-3 px-8 rounded-lg transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(255,51,51,0.3)]">
          <span className="text-lg">📢</span> SHARE THIS PAGE
        </button>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Complaints', value: totalComplaints.toLocaleString(), tw: 'text-white' },
          { label: 'Avg Score',        value: `${avgScore}/100`,                tw: scoreTw(avgScore) },
          { label: 'In Crisis (<40)',  value: crisisCount,                       tw: 'text-[#E8363D]' },
          { label: 'Performing Well',  value: goodCount,                         tw: 'text-green-500' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12122A] border border-[#1F1F2E] rounded-xl p-4 text-center">
            <p className={`text-2xl md:text-3xl font-black ${s.tw}`}>{s.value}</p>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Recharts horizontal bar chart ── */}
      <div className="bg-[#12122A] border border-[#1F1F2E] rounded-xl p-4 md:p-6 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-black uppercase text-gray-300 tracking-widest">
            Accountability Ranking
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-none" />≥ 70
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 flex-none" />40 – 70
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#E8363D] flex-none" />&lt; 40
            </span>
          </div>
        </div>

        <div style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 52, left: 8, bottom: 4 }}
              barCategoryGap="30%"
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#1F1F2E" />

              {/* Threshold reference lines */}
              <ReferenceLine x={40} stroke="#F59E0B" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />
              <ReferenceLine x={70} stroke="#22C55E" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />

              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 40, 50, 70, 75, 100]}
                stroke="#374151"
                fontSize={9}
                tickLine={false}
                axisLine={{ stroke: '#1F1F2E' }}
                tickFormatter={(v) => `${v}`}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                stroke="none"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9CA3AF', fontWeight: 700 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />

              <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}
                label={{ position: 'right', fontSize: 10, fontWeight: 900, fill: '#9CA3AF',
                         formatter: (v) => `${v}` }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-gray-600 text-[10px] text-right mt-2 tracking-wide">
          Dashed lines at 40 and 70 mark the accountability thresholds
        </p>
      </div>

      {/* ── Sort buttons ── */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setSortOrder('worst')}
          className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
            sortOrder === 'worst'
              ? 'bg-[#E8363D] text-white shadow-[0_0_15px_rgba(255,51,51,0.4)]'
              : 'bg-[#12122A] text-gray-400 border border-[#1F1F2E] hover:bg-[#1A1A24]'
          }`}
        >
          Worst First
        </button>
        <button
          onClick={() => setSortOrder('best')}
          className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
            sortOrder === 'best'
              ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]'
              : 'bg-[#12122A] text-gray-400 border border-[#1F1F2E] hover:bg-[#1A1A24]'
          }`}
        >
          Best First
        </button>
      </div>

      {/* ── Official cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sortedOfficials.map((o) => (
          <div
            key={o.id}
            className={`bg-[#12122A] border ${cardBorder(o.score)} rounded-xl p-5 shadow-lg relative overflow-hidden transition-all hover:border-gray-600`}
          >
            {/* Score-tier top stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
              style={{ backgroundColor: scoreHex(o.score) }}
            />

            {/* Live badge */}
            {o.isLive && (
              <span className="absolute top-3 right-3 flex items-center gap-1 bg-green-950/60 border border-green-900/60 text-green-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}

            {/* Designation + ward label */}
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">
              {o.designation} · {o.ward}
            </p>

            {/* Name + score side-by-side */}
            <div className="flex items-start justify-between mb-3 pr-12">
              <h2 className="text-lg font-black text-white leading-snug">
                {o.fullName || o.name}
              </h2>
              <div className="text-right flex-none ml-3">
                <span className={`text-4xl font-black tracking-tighter ${scoreTw(o.score)}`}>
                  {o.score}
                </span>
                <span className="text-gray-500 text-xs font-bold">/100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#0A0A0F] rounded-full h-2 mb-4 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${bgTw(o.score)}`}
                style={{ width: `${o.score}%` }}
              />
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-3 divide-x divide-[#1F1F2E] bg-[#0A0A0F] border border-[#1F1F2E] rounded-xl p-3 mb-4">
              <div className="text-center px-2">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Received</p>
                <p className="text-white font-black text-lg leading-none">{o.total}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Resolved</p>
                <p className="text-green-500 font-black text-lg leading-none">{o.resolved}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Ignored</p>
                <p className="text-[#E8363D] font-black text-lg leading-none">{o.ignored}</p>
              </div>
            </div>

            {/* Status icon row */}
            <div className="flex items-center gap-3 mb-4">
              {o.score >= 70 && (
                <span className="flex items-center gap-1 text-green-500 text-[10px] font-black uppercase tracking-wide">
                  <CheckCircle size={12} /> Performing Well
                </span>
              )}
              {o.score >= 40 && o.score < 70 && (
                <span className="flex items-center gap-1 text-amber-500 text-[10px] font-black uppercase tracking-wide">
                  <AlertTriangle size={12} /> Needs Attention
                </span>
              )}
              {o.score < 40 && (
                <span className="flex items-center gap-1 text-[#E8363D] text-[10px] font-black uppercase tracking-wide">
                  <TrendingDown size={12} /> In Crisis
                </span>
              )}
              {/* Score emoji */}
              <span className="ml-auto text-sm">
                {o.score >= 70 ? '🟢' : o.score >= 40 ? '🟡' : '🔴'}
              </span>
            </div>

            {/* Last reported to footer */}
            <div className="flex items-center justify-between border-t border-[#1F1F2E] pt-3">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock size={11} className="flex-none" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Last reported to</span>
              </div>
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  o.lastReported ? 'text-white' : 'text-gray-600'
                }`}
              >
                {o.lastReported ? formatRelativeTime(o.lastReported) : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
