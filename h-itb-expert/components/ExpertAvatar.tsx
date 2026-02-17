import React from 'react';

export const ExpertAvatar: React.FC = () => {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700 group">
      
      {/* Background/Image Layer */}
      <img 
        src="exp.png" 
        alt="H-ITB Szakértő" 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Overlay: Name Tag */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-xl z-20 w-3/4 md:w-auto">
        <div className="text-center">
          <h2 className="text-white font-bold text-lg md:text-xl">H-ITB Szakértő</h2>
          <p className="text-blue-300 text-xs md:text-sm uppercase tracking-wider font-semibold">Vezető Emelőgép Szakértő</p>
        </div>
      </div>
    </div>
  );
};