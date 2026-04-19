import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans relative">
      <Navbar />
      <main className="pt-[56px] pb-16">
        <Outlet />
      </main>
      
      {/* Floating Action Button */}
      {location.pathname !== '/report' && (
        <Link to="/report" className="fixed bottom-20 md:bottom-6 right-4 md:right-8 bg-[#E8363D] hover:bg-red-700 text-white shadow-[0_4px_15px_rgba(232,54,61,0.5)] p-4 rounded-full z-40 transition-transform hover:scale-110 flex items-center justify-center border border-red-500">
          <span className="text-xl">📢</span>
        </Link>
      )}

      <BottomNav />
    </div>
  );
}
