import { useState, useEffect } from 'react';
import { Clock, MapPin, ThumbsUp, ShieldAlert, FileBarChart, Loader2 } from 'lucide-react';
import { listenToReports, upvoteReportInDb, saveReportLog } from '../services/firebase';
import { generateGovernmentReport } from '../services/geminiService';
import ReportModal from '../components/ReportModal';

// ── Ward → official roster (matches OfficialsPage seed data) ──────────────────
const WARD_OFFICIALS = {
  'ward 3':     'Ward Officer T. Venkat',
  'ward 7':     'Councillor Ravi Kumar',
  'ward 9':     'Councillor M. Devi',
  'ward 12':    'Councillor Ahmed Khan',
  'zone 3':     'MLA Priya Sharma',
  'south zone': 'Deputy Mayor S. Lakshmi',
  'north zone': 'MLA R. Naidu',
  'city':       'Commissioner B. Reddy',
};

const getOfficialForWard = (ward) => {
  const lower = ward.toLowerCase();
  for (const [key, name] of Object.entries(WARD_OFFICIALS)) {
    if (lower.includes(key) || key.includes(lower)) return name;
  }
  return `Area Officer, ${ward}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60)        return `${s}s ago`;
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000)   return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
};

const STATUS_BADGE = {
  PENDING:     'bg-orange-500/10 text-orange-400 border-orange-500/25',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  RESOLVED:    'bg-green-500/10 text-green-400 border-green-500/25',
  IGNORED:     'bg-red-500/10 text-red-400 border-red-500/25',
};

const SEVERITY_BORDER = (sev) => {
  if (sev?.includes('HIGH'))   return 'border-red-500/50';
  if (sev?.includes('MEDIUM')) return 'border-yellow-500/50';
  return 'border-green-500/30';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalReport, setModalReport]   = useState(null);

  useEffect(() => {
    const unsub = listenToReports((data) => { setReports(data); setLoading(false); });
    return unsub;
  }, []);

  // ── Generate report ──────────────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    // Aggregate unresolved complaints by ward
    const unresolved = reports.filter(
      (r) => !r.status || r.status === 'PENDING' || r.status === 'IGNORED'
    );

    if (unresolved.length === 0) {
      alert('No unresolved complaints found. Submit some complaints first, or all current ones are already resolved!');
      return;
    }

    setIsGenerating(true);
    try {
      // Group by ward (district field)
      const wardGroups = {};
      for (const r of unresolved) {
        const ward = (r.district || 'Unknown').trim();
        if (!wardGroups[ward]) wardGroups[ward] = [];
        wardGroups[ward].push(r);
      }

      // Build structured ward summary for Gemini
      const wardData = Object.entries(wardGroups).map(([ward, items]) => {
        const categories = {};
        let totalSev = 0;
        for (const item of items) {
          const cat = (item.category || 'other').toLowerCase();
          categories[cat] = (categories[cat] || 0) + 1;
          totalSev += item.severityScore ?? (
            item.severity === 'HIGH' ? 8 : item.severity === 'MEDIUM' ? 5 : 2
          );
        }
        return { ward, total: items.length, categories, avgSeverity: totalSev / items.length };
      }).sort((a, b) => b.total - a.total);

      // Call Gemini to generate the bilingual report
      const geminiReport = await generateGovernmentReport(wardData);

      // Build notification log — one entry per ward official
      const now = new Date().toISOString();
      const notificationLog = wardData.map((w) => ({
        ward: w.ward,
        official: getOfficialForWard(w.ward),
        notifiedAt: now,
        complaintsCount: w.total,
      }));

      // Persist log to Firestore / mock DB
      await saveReportLog({
        reportId: geminiReport.reportId,
        wardsCovered: wardData.map((w) => w.ward),
        totalUnresolved: unresolved.length,
        wardCount: wardData.length,
        notificationLog,
      }).catch((e) => console.error('saveReportLog non-fatal:', e));

      // Open modal
      setModalReport({
        ...geminiReport,
        generatedAt: now,
        totalUnresolved: unresolved.length,
        wardCount: wardData.length,
        notificationLog,
      });
    } catch (err) {
      console.error('Report generation error:', err);
      alert('Report generation failed unexpectedly. Check the console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredReports = filter === 'ALL'
    ? reports
    : reports.filter((r) => r.category === filter);

  const unresolvedCount = reports.filter(
    (r) => !r.status || r.status === 'PENDING' || r.status === 'IGNORED'
  ).length;

  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-6 pb-24 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-[#E8363D]" /> Live <span className="text-[#E8363D]">Reports</span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Public feed of civic problems. Officials are watching.</p>
          </div>

          {/* Category filter pills */}
          <div className="flex bg-[#12122A] p-1 rounded-lg border border-[#1F1F2E]">
            {['ALL', 'water', 'roads', 'power', 'garbage'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded capitalize transition-colors ${
                  filter === f ? 'bg-[#1F1F2E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Report button — full width below header */}
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || loading}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all border ${
            isGenerating || loading
              ? 'bg-[#12122A] text-gray-500 border-[#1F1F2E] cursor-not-allowed'
              : 'bg-[#12122A] hover:bg-[#1a1a30] text-white border-[#E8363D]/50 hover:border-[#E8363D] shadow-[0_0_12px_rgba(232,54,61,0.15)] hover:shadow-[0_0_20px_rgba(232,54,61,0.25)]'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin text-[#E8363D]" />
              <span>Gemini is drafting the report…</span>
            </>
          ) : (
            <>
              <FileBarChart size={16} className="text-[#E8363D]" />
              <span>Generate AI Government Report</span>
              {unresolvedCount > 0 && (
                <span className="ml-1 bg-[#E8363D] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unresolvedCount} unresolved
                </span>
              )}
            </>
          )}
        </button>

        {/* Generating progress bar */}
        {isGenerating && (
          <div className="w-full bg-[#1F1F2E] rounded-full h-0.5 overflow-hidden">
            <div className="h-full bg-[#E8363D] rounded-full animate-pulse w-full" />
          </div>
        )}
      </div>

      {/* ── Report list ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-[#12122A] p-5 rounded-xl border border-[#1F1F2E] h-40" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-[#12122A] border border-[#1F1F2E] rounded-xl border-dashed">
          <p className="text-gray-500 text-lg">No reports yet.</p>
          <p className="text-gray-400 font-bold mt-2">Be the first to speak up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`bg-[#12122A] p-5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${SEVERITY_BORDER(report.severity)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2 items-center flex-wrap">
                  {report.status && (
                    <span className={`border px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${STATUS_BADGE[report.status] ?? ''}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs font-medium bg-[#1F1F2E] px-2 py-0.5 rounded capitalize">
                    {report.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs font-medium flex-none">
                  <Clock size={11} />
                  {formatTimeAgo(report.createdAt)}
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-100 mb-2 leading-tight">
                {report.title || 'Untitled Report'}
              </h3>

              <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                {report.description}
              </p>

              <div className="flex justify-between items-center pt-3 border-t border-[#1F1F2E]">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold uppercase tracking-wide">
                  <MapPin size={13} className="text-[#E8363D]" />
                  {report.district}{report.state && report.state !== 'N/A' ? `, ${report.state}` : ''}
                </div>
                <button
                  onClick={() => upvoteReportInDb(report.id)}
                  className="flex items-center gap-1.5 bg-[#1F1F2E] hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors text-sm font-bold active:scale-95"
                >
                  <ThumbsUp size={13} />
                  <span>{report.upvotes || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Report Modal ── */}
      {modalReport && (
        <ReportModal report={modalReport} onClose={() => setModalReport(null)} />
      )}
    </div>
  );
}
