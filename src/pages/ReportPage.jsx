import { useState } from 'react';
import { Loader2, Share2, PlusCircle } from 'lucide-react';
import { analyzeReport } from '../services/claudeService';
import { submitReportToDb } from '../services/firebase';

export default function ReportPage() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('');
  const [duration, setDuration] = useState('');
  const [affected, setAffected] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const categories = [
    { id: 'water', icon: '💧', label: 'Water' },
    { id: 'roads', icon: '🛣️', label: 'Roads' },
    { id: 'power', icon: '⚡', label: 'Power' },
    { id: 'garbage', icon: '🗑️', label: 'Garbage' },
    { id: 'health', icon: '🏥', label: 'Health' },
    { id: 'education', icon: '🏫', label: 'Education' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (description.length < 20) {
      alert("Description must be at least 20 characters.");
      return;
    }
    if (!category || !description || !ward || !duration) {
      alert("Please fill all required fields and select a category.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Send parameters exactly as they are mapped in the user request
      const selectedCategoryLabel = categories.find(c => c.id === category)?.label || category;
      const result = await analyzeReport(description, selectedCategoryLabel, ward, duration, affected);
      
      const reportPayload = {
        title: result.summary,
        description,
        district: ward,
        state: 'N/A',
        category,
        citizenId: 'anon-' + Math.floor(Math.random() * 100000),
        status: 'PENDING',
        upvotes: 0,
        severity: result.severity,
        caseId: result.caseId,
        responsibleDept: result.responsibleDept,
        actionRequired: result.actionRequired,
        officialToNotify: result.officialToNotify,
        duration,
        affected
      };

      try {
        await submitReportToDb(reportPayload);
      } catch (dbErr) {
        console.error("Firebase write error:", dbErr);
        alert("Warning: AI analyzed it, but could not save to public feed.");
      }

      setReportResult(result);
    } catch (err) {
      console.error(err);
      alert("Critical error: AI analysis failed unexpectedly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Truth Mirror Report',
        text: `Look at this Truth Mirror Case: ${reportResult.summary}. Case ID: ${reportResult.caseId}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert(`Case ID: ${reportResult.caseId} copied to clipboard! (You can click share on mobile!)`);
    }
  };

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setWard('');
    setDuration('');
    setAffected('');
    setReportResult(null);
  };

  const renderBadge = (severity) => {
    const s = severity?.toUpperCase() || 'LOW';
    if (s.includes('HIGH')) return <span className="bg-red-900/50 text-[#E8363D] border border-[#E8363D] px-3 py-1 rounded-full text-xs font-bold tracking-wider">🔴 HIGH</span>;
    if (s.includes('MEDIUM')) return <span className="bg-yellow-900/50 text-yellow-500 border border-yellow-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider">🟡 MEDIUM</span>;
    return <span className="bg-green-900/50 text-green-500 border border-green-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider">🟢 LOW</span>;
  };

  // If a result exists, show the RESULT CARD view instead of the form.
  if (reportResult) {
    return (
      <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-10 pb-10 max-w-2xl mx-auto flex flex-col items-center">
        
        <div className="w-full bg-[#12122A] border border-[#1F1F2E] rounded-xl p-6 shadow-2xl relative overflow-hidden">
          {/* Subtle top decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-[#E8363D]"></div>

          <div className="text-center mb-6 mt-2">
            <h2 className="text-xl md:text-2xl font-black text-green-500 tracking-tight flex items-center justify-center gap-2">
              ✅ REPORT SUBMITTED & ANALYZED
            </h2>
          </div>

          <div className="bg-[#0A0A0F] rounded-lg p-5 flex flex-col items-center justify-center border border-red-900/30 mb-6">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Case ID</p>
            <p className="text-[#E8363D] text-4xl md:text-5xl font-black tracking-tighter">
              {reportResult.caseId}
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Severity</p>
                {renderBadge(reportResult.severity)}
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Estimated Resolution</p>
                <span className="text-white font-bold bg-[#1F1F2E] px-3 py-1 rounded-full text-sm">{reportResult.estimatedResolutionDays} days</span>
              </div>
            </div>

            <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">AI Summary</p>
              <p className="text-white text-sm leading-relaxed font-medium">
                {reportResult.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Responsible Dept</p>
                <p className="text-white text-sm font-semibold">{reportResult.responsibleDept}</p>
              </div>
              <div className="bg-[#1F1F2E]/30 p-4 rounded-lg">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Action Required</p>
                <p className="text-white text-sm font-semibold">{reportResult.actionRequired}</p>
              </div>
            </div>

            <div className="bg-[#1F1F2E]/30 p-4 rounded-lg border-l-2 border-[#E8363D]">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Official To Notify</p>
              <p className="text-white text-sm font-semibold">{reportResult.officialToNotify}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="w-full bg-[#E8363D] hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,51,51,0.3)]"
            >
              <span className="text-xl">📤</span>
              <span>SHARE CASE ID</span>
            </button>
            <button
              onClick={resetForm}
              className="w-full bg-[#1F1F2E] hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">➕</span>
              <span>Report Another Problem</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original UI Form Rendering
  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white px-4 pt-8 pb-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 border-b border-[#1F1F2E] pb-6">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">Report a <span className="text-[#E8363D]">Problem</span></h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed">
          Type your problem. AI will analyze and notify officials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Category Selector */}
        <div>
          <label className="block text-gray-300 font-bold mb-3 text-sm">Select Category *</label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border transition-all ${
                    isSelected 
                      ? 'bg-red-950/60 border-[#E8363D] shadow-[0_0_10px_rgba(255,51,51,0.2)]' 
                      : 'bg-[#12122A] border-[#1F1F2E] hover:bg-[#1A1A24]'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl mb-1">{cat.icon}</span>
                  <span className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-[#E8363D]' : 'text-gray-300'}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          
          <div>
            <label className="block text-gray-300 font-bold mb-2 text-sm">Describe your problem *</label>
            <textarea
              required
              rows="5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8363D] focus:ring-1 focus:ring-[#E8363D] transition-colors resize-none"
              placeholder="Example: There is no water supply in our area for the past 3 days. Around 200 families are affected..."
            ></textarea>
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${description.length < 20 ? 'text-red-400' : 'text-green-500'}`}>
                {description.length}/20 min
              </span>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-bold mb-2 text-sm">Your Ward / Area *</label>
            <input
              type="text"
              required
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#E8363D] focus:ring-1 focus:ring-[#E8363D] transition-colors"
              placeholder="Example: Ward 7, Madhapur"
            />
          </div>

          <div>
             <label className="block text-gray-300 font-bold mb-2 text-sm">How long has this been a problem? *</label>
             <div className="relative">
               <select
                 required
                 value={duration}
                 onChange={(e) => setDuration(e.target.value)}
                 className="w-full appearance-none bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 text-white focus:outline-none focus:border-[#E8363D] focus:ring-1 focus:ring-[#E8363D] transition-colors [&>option]:bg-[#12122A]"
               >
                 <option value="" disabled className="text-gray-600">Select duration...</option>
                 <option value="today">Today</option>
                 <option value="2-3 days">2-3 days</option>
                 <option value="1 week">1 week</option>
                 <option value="2 weeks">2 weeks</option>
                 <option value="1 month">1 month</option>
                 <option value="more than 1 month">More than 1 month</option>
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                 <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
               </div>
             </div>
          </div>

          <div>
             <label className="block text-gray-300 font-bold mb-2 text-sm">How many people are affected?</label>
             <div className="relative">
               <select
                 value={affected}
                 onChange={(e) => setAffected(e.target.value)}
                 className="w-full appearance-none bg-[#12122A] border border-[#1F1F2E] rounded-lg p-4 text-white focus:outline-none focus:border-[#E8363D] focus:ring-1 focus:ring-[#E8363D] transition-colors [&>option]:bg-[#12122A]"
               >
                 <option value="" disabled className="text-gray-600">Select estimate (optional)...</option>
                 <option value="just me">Just me</option>
                 <option value="10-50 people">10-50 people</option>
                 <option value="50-200 people">50-200 people</option>
                 <option value="200-500 people">200-500 people</option>
                 <option value="500+ people">500+ people</option>
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                 <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
               </div>
             </div>
          </div>

        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 text-lg md:text-xl
              ${isSubmitting 
                ? 'bg-[#12122A] text-gray-400 border border-[#1F1F2E] cursor-not-allowed' 
                : 'bg-[#E8363D] hover:bg-red-700 text-white shadow-[0_4px_20px_rgba(255,51,51,0.4)] hover:shadow-[0_4px_25px_rgba(255,51,51,0.6)]'
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>AI is analyzing your problem...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🔍</span>
                <span>ANALYZE & REPORT</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
