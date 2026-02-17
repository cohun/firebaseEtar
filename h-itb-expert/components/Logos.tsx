import React from 'react';

// Recreated H-ITB Logo based on description/visual
export const HitbLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-200 border-4 border-[#004e8e] p-2 inline-flex flex-col items-center justify-center font-serif ${className}`}>
    <div className="text-[#004e8e] font-bold text-4xl tracking-tighter flex items-center gap-1">
      <span>H</span>
      <span className="w-4 h-1 bg-[#002f5e] mt-2"></span>
      <span>ITB</span>
    </div>
    <div className="text-[#002f5e] text-[0.6rem] font-bold uppercase tracking-widest mt-1">
      Ipari és Kereskedelmi Kft.
    </div>
  </div>
);

// Recreated ETAR Logo based on description/visual
export const EtarLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative flex items-center justify-center bg-[#9e0b0f] overflow-hidden ${className}`}>
    {/* Concentric circles background effect */}
    <div className="absolute inset-0 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="10" fill="none" stroke="black" strokeWidth="1" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="black" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="black" strokeWidth="1" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="1" />
        </svg>
    </div>
    <span className="relative z-10 text-[#fff200] font-black text-5xl tracking-widest" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
      ETAR
    </span>
  </div>
);