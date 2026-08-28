export default function Header() {
  return (
    <header className="border-b border-[#242e3f] bg-[#0f1521]/80 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#63B3ED] flex items-center justify-center text-[#2D3748] font-black text-lg shadow">
          C
        </div>
        <span className="font-bold text-lg text-white tracking-wide">
          Command Center
        </span>
      </div>
      <div className="flex items-center space-x-2 text-xs font-medium text-[#90CDF4] bg-[#90CDF4]/10 border border-[#90CDF4]/20 px-3 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-[#63B3ED] animate-pulse"></span>
        <span>System Operations</span>
      </div>
    </header>
  );
}
