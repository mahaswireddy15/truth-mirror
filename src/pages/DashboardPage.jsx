import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const stats = [
    { label: 'Problems Today', value: '47,832', color: 'text-[#E8363D]' },
    { label: 'Officials Notified', value: '2,341', color: 'text-amber-500' },
    { label: 'Resolution Rate', value: '23%', color: 'text-green-500' },
    { label: 'Ignored 7+ Days', value: '891', color: 'text-[#E8363D]' },
  ];

  const barData = [
    { name: 'Water', value: 12400 },
    { name: 'Roads', value: 8900 },
    { name: 'Power', value: 7200 },
    { name: 'Garbage', value: 9800 },
    { name: 'Health', value: 5400 },
    { name: 'Education', value: 4100 },
  ];

  const lineData = [
    { name: 'Mon', value: 4200 },
    { name: 'Tue', value: 5800 },
    { name: 'Wed', value: 6100 },
    { name: 'Thu', value: 7400 },
    { name: 'Fri', value: 8200 },
    { name: 'Sat', value: 9100 },
    { name: 'Sun', value: 6800 },
  ];

  const topIgnored = [
    { problem: 'No water supply for 2 weeks', ward: 'Ward 12', days: 14, official: 'Councillor Ahmed Khan' },
    { problem: 'Sewer overflowing on main street', ward: 'Ward 7', days: 9, official: 'Councillor Ravi Kumar' },
    { problem: 'Streetlights dead in sector 4', ward: 'North Zone', days: 8, official: 'MLA R. Naidu' },
    { problem: 'Garbage dump uncollected', ward: 'Zone 3', days: 7, official: 'MLA Priya Sharma' },
    { problem: 'Pothole causing severe accidents', ward: 'Ward 9', days: 5, official: 'Councillor M. Devi' },
  ];

  return (
    <div className="bg-[#0A0A0F] min-h-[calc(100vh-120px)] text-white px-4 pt-8 pb-10 max-w-6xl mx-auto">
      <div className="text-center border-b border-[#1F1F2E] pb-6 mb-8">
        <h1 className="text-3xl font-black uppercase text-white tracking-tight">LIVE <span className="text-[#E8363D]">DASHBOARD</span></h1>
      </div>

      {/* Row 1 — 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-[#12122A] border border-[#1F1F2E] p-4 rounded-xl text-center shadow-lg">
            <p className={`text-2xl md:text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Row 2 — Bar chart */}
      <div className="bg-[#12122A] border border-[#1F1F2E] p-4 md:p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-sm font-black uppercase text-gray-300 mb-4 tracking-widest px-1">Problems by Category</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#1F1F2E'}} contentStyle={{backgroundColor: '#0A0A0F', borderColor: '#1F1F2E', color: 'white', borderRadius: '8px'}} />
              <Bar dataKey="value" fill="#E8363D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Two small charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#12122A] border border-[#1F1F2E] p-4 md:p-6 rounded-xl shadow-lg">
          <h2 className="text-sm font-black uppercase text-gray-300 mb-4 tracking-widest px-1">Problems This Week</h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#0A0A0F', borderColor: '#1F1F2E', color: 'white', borderRadius: '8px'}} />
                <Line type="monotone" dataKey="value" stroke="#E8363D" strokeWidth={3} dot={{ fill: '#0A0A0F', stroke: '#E8363D', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#E8363D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase text-gray-300 tracking-widest px-1">Current Status Breakdown</h2>
          <div className="bg-[#12122A] border border-[#1F1F2E] p-6 lg:p-8 rounded-xl shadow-lg flex justify-between items-center h-full">
            <div className="text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Resolved</p>
              <p className="text-2xl lg:text-3xl font-black text-green-500">23% 🟢</p>
            </div>
            <div className="text-center border-l border-r border-[#1F1F2E] px-4 lg:px-8">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">In Progress</p>
              <p className="text-2xl lg:text-3xl font-black text-amber-500">31% 🟡</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Ignored</p>
              <p className="text-2xl lg:text-3xl font-black text-[#E8363D]">46% 🔴</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — Top ignored problems table */}
      <div className="bg-[#12122A] border border-[#1F1F2E] rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#1F1F2E]">
          <h2 className="text-sm font-black uppercase text-gray-300 tracking-widest px-1">Top Ignored Problems</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0F] text-gray-500 text-[10px] md:text-xs uppercase tracking-widest font-black">
                <th className="p-4 border-b border-[#1F1F2E]">Problem</th>
                <th className="p-4 border-b border-[#1F1F2E]">Ward</th>
                <th className="p-4 border-b border-[#1F1F2E]">Days Ignored</th>
                <th className="p-4 border-b border-[#1F1F2E]">Official</th>
              </tr>
            </thead>
            <tbody>
              {topIgnored.map((item, idx) => (
                <tr key={idx} className="border-b border-[#1F1F2E]/50 hover:bg-[#1A1A24] transition-colors">
                  <td className="p-4 text-xs md:text-sm font-bold text-gray-200">{item.problem}</td>
                  <td className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{item.ward}</td>
                  <td className="p-4">
                    <span className="bg-[#E8363D]/20 text-[#E8363D] border border-[#E8363D]/50 px-2 py-1 rounded text-[10px] md:text-xs font-black uppercase tracking-widest">
                      {item.days} days
                    </span>
                  </td>
                  <td className={`p-4 text-xs font-bold ${item.days >= 7 ? 'text-[#E8363D]' : 'text-gray-300'}`}>
                    {item.official}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
