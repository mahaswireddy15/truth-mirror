import { NavLink } from 'react-router-dom';
import { Home, Megaphone, Mic, Map, Users, LayoutDashboard } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/report', label: 'Report', icon: Megaphone },
    { path: '/voice-report', label: 'Voice', icon: Mic },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/officials', label: 'Officials', icon: Users },
    { path: '/dashboard', label: 'Stats', icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0F] border-t border-[#1F1F2E] z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            end
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-300'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
