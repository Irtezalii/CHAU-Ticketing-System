import { Agentation } from "agentation";

export default function Header() {
  return (

    <header className="border-b border-[#1f2937] bg-[#0c1017]/80 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <Agentation />
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-black text-lg shadow">
          C
        </div>
        <span className="font-bold text-lg text-white tracking-wide">
          Command Center
        </span>
      </div>
      <div className="flex items-center space-x-2 text-xs font-medium text-[#34d399] bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
        <span>System Operations</span>
      </div>
    </header>
  );
}
