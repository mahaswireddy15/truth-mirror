import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AnimatedNumber({ endValue, label }) {
  const [value, setValue] = useState(0);
  const numericEnd = parseInt(endValue.replace(/,/g, '').replace(/%/g, ''));
  const isPercent = endValue.includes('%');
  
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = numericEnd / (duration / 16); // 60fps
    
    if (numericEnd === 0) return;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= numericEnd) {
        setValue(numericEnd);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [numericEnd]);

  const displayString = isPercent ? `${value}%` : value.toLocaleString();

  return (
    <div className="bg-[#12122A] border border-[#1F1F2E] rounded-lg p-5 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-[0_0_10px_rgba(232,54,61,0.2)] transition-shadow">
      <span className="text-3xl md:text-4xl font-black text-white">{displayString}</span>
      <span className="text-xs text-gray-400 mt-2 uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

export default function HomePage() {
  const stats = [
    { value: '47,832', label: 'Problems Today' },
    { value: '2,341', label: 'Officials Notified' },
    { value: '23%', label: 'Issues Resolved' },
    { value: '891', label: 'Ignored 7+ Days' },
  ];

  const categories = [
    { icon: '💧', label: 'Water' },
    { icon: '🛣️', label: 'Roads' },
    { icon: '⚡', label: 'Power' },
    { icon: '🗑️', label: 'Garbage' },
    { icon: '🏥', label: 'Health' },
    { icon: '🏫', label: 'Education' },
  ];

  return (
    <div className="bg-[#0A0A0F] min-h-screen text-white pb-10">
      {/* Section 1 - Hero */}
      <section className="px-4 pt-10 pb-8 flex flex-col items-center text-center max-w-5xl mx-auto">
        <h1 className="flex flex-col gap-1 tracking-tight">
          <span className="text-white text-5xl md:text-6xl font-black uppercase">They Cannot</span>
          <span className="text-[#E8363D] text-5xl md:text-6xl font-black uppercase">Pretend Anymore.</span>
        </h1>
        <p className="text-gray-400 italic mt-6 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
          "Citizens speak. AI listens. Politicians are held accountable."
        </p>
        
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link to="/report" className="w-full sm:w-auto bg-[#E8363D] hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg shadow-[0_0_15px_rgba(232,54,61,0.5)] transition-all flex items-center justify-center gap-2">
            <span className="text-xl">📢</span> Report a Problem
          </Link>
          <Link to="/map" className="w-full sm:w-auto border-2 border-[#E8363D] text-[#E8363D] hover:bg-[#E8363D] hover:text-white font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center gap-2">
            <span className="text-xl">🗺</span> View Suffering Map
          </Link>
        </div>
        
        <p className="text-gray-300 text-sm mt-8 font-medium">
          ⚡ 47,832 problems reported today
        </p>
      </section>

      {/* Section 2 - Live scrolling ticker */}
      <section className="w-full bg-[#1F1F2E] py-3 overflow-hidden border-y border-red-900/40">
        <div className="flex whitespace-nowrap animate-ticker w-fit">
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🔴 Ward 7 Hyderabad: No water — 3 days</span>
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🔴 Ward 12 Delhi: Road broken — 2 weeks</span>
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🟡 Ward 3 Mumbai: Power cuts daily</span>
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🔴 Ward 9 Chennai: Garbage — 5 days</span>
          {/* Duplicated for seamless optical loop */}
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🔴 Ward 7 Hyderabad: No water — 3 days</span>
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🔴 Ward 12 Delhi: Road broken — 2 weeks</span>
          <span className="text-gray-200 font-medium px-6 border-r border-gray-600">🟡 Ward 3 Mumbai: Power cuts daily</span>
          <span className="text-gray-200 font-medium px-6">🔴 Ward 9 Chennai: Garbage — 5 days</span>
        </div>
      </section>

      {/* Section 3 - 4 stat cards */}
      <section className="px-4 py-8 max-w-5xl mx-auto mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <AnimatedNumber key={idx} endValue={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      {/* Section 4 - 6 category cards 2x3 grid */}
      <section className="px-4 pb-12 max-w-5xl mx-auto">
        <h2 className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-4 px-1">Report by Category</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, idx) => (
            <Link key={idx} to="/report" className="bg-[#12122A] hover:bg-[#1A1A24] border border-[#1F1F2E] rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors active:scale-95">
              <span className="text-4xl">{cat.icon}</span>
              <span className="text-gray-200 font-medium text-lg">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 5 - Bottom red urgency bar */}
      <section className="px-4 pb-8 max-w-5xl mx-auto">
        <Link to="/officials" className="block w-full bg-[#E8363D]/20 hover:bg-[#E8363D]/40 border border-[#E8363D] rounded-lg p-5 text-center transition-all">
          <p className="text-red-400 font-bold text-sm md:text-lg flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">
            <span>🚨 891 problems IGNORED for 7+ days</span>
            <span className="text-white hidden md:inline">—</span>
            <span className="text-white underline decoration-[#E8363D] underline-offset-4 mt-1 md:mt-0 active:text-red-300">View Accountability Scores</span>
          </p>
        </Link>
      </section>
    </div>
  );
}
