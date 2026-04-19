import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-[56px] bg-[#0A0A0F] border-b border-[#1F1F2E] flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-600 rounded-full"></div>
        <div className="text-[22px] tracking-tight">
          <span className="text-white font-bold">TRUTH</span>
          <span className="text-[#E8363D] font-bold ml-1">MIRROR</span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <NavLink 
          to="/reports" 
          className={({isActive}) => `text-xs font-black tracking-widest uppercase transition-colors ${isActive ? 'text-[#E8363D]' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Reports
        </NavLink>
        <div className="flex items-center gap-2 bg-red-950/30 px-2 py-1 rounded-full border border-red-900/30">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-500 text-[10px] font-bold tracking-widest">LIVE</span>
        </div>
      </div>
    </nav>
  );
}
