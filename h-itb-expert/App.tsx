import React from 'react';
import { ExpertAvatar } from './components/ExpertAvatar';
import { ChatBox } from './components/ChatBox';
import { BookOpen, Wrench, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Navbar / Top Branding Strip */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-[#004e8e] font-bold tracking-tight text-xl">
            H-ITB <span className="text-gray-400 font-light">|</span> Emelőgép Szakértő
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-2 hover:text-[#004e8e] cursor-pointer"><ShieldCheck size={16}/> Biztonság</span>
            <span className="flex items-center gap-2 hover:text-[#004e8e] cursor-pointer"><BookOpen size={16}/> Jogszabályok</span>
            <span className="flex items-center gap-2 hover:text-[#004e8e] cursor-pointer"><Wrench size={16}/> Vizsgálatok</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Intro Section */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Üdvözöljük a Virtuális Szakértői Irodában
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Tegye fel kérdéseit emelőgépekkel, teherfelvevő eszközökkel és az ETAR rendszerrel kapcsolatban. Szakértőnk azonnal válaszol.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Visual Representation */}
          <div className="flex flex-col gap-6">
            <ExpertAvatar />
            
            {/* Context Cards */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Hivatalos Szakvélemény</h4>
                  <p className="text-xs text-gray-500">Minden válaszunk megfelel a hatályos EBSZ előírásoknak.</p>
               </div>
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
                    <Wrench size={24} />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">ETAR Integráció</h4>
                  <p className="text-xs text-gray-500">Azonnali segítség a nyilvántartó rendszer használatában.</p>
               </div>
            </div>
          </div>

          {/* Right Column: Chat Interface */}
          <div className="flex flex-col">
            <ChatBox />
            
            {/* Disclaimer */}
            <div className="mt-4 text-[10px] text-gray-400 text-center lg:text-right">
              <p>A mesterséges intelligencia által generált válaszok tájékoztató jellegűek. Hivatalos szakvéleményért kérjük vegye fel a kapcsolatot munkatársainkkal.</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;