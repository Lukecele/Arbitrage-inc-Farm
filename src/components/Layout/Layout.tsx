import React from 'react';
import { useConnectWallet } from '@web3-onboard/react';
import { Home, Layers, Activity, Settings, Wallet, Menu, Zap } from 'lucide-react';

import logo from '../../assets/images/arbitrage_inception_logo_1780109116033.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

  const handleWalletAction = () => {
    if (wallet) {
      disconnect(wallet);
    } else {
      connect();
    }
  };

  return (
    <div className="flex h-screen bg-[#0D111C] text-[#E2E8F0] font-sans overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-[#1E293B] bg-[#0A0D14] z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex justify-center items-center font-bold text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5 relative overflow-hidden group">
            <img 
              src={logo} 
              alt="Logo" 
              className="w-10 h-10 rounded-lg relative z-10 group-hover:scale-110 transition-transform object-cover"
            />
            <div className="absolute inset-0 bg-amber-500/10 blur-xl opacity-50"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-tight">ARBITRAGE</span>
            <span className="text-xs font-semibold tracking-[0.2em] text-amber-500 leading-tight">INCEPTION</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem icon={<Layers size={18} />} label="Zap / Earn" active />
        </nav>

        {/* Protocol Health Card */}
        <div className="px-4 py-6 mb-6">
          <div className="bg-[#1E293B]/20 border border-[#1E293B]/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Status</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[10px] font-bold text-green-500">LIVE</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-white">Always Active</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Il protocollo è monitorato 24/7 per garantire la massima stabilità agli investitori.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="h-[72px] border-b border-[#1E293B] flex items-center justify-between px-4 lg:px-6 bg-[#0D111C]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button className="p-2 bg-[#1E293B] rounded-lg text-slate-400 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <img 
              src={logo} 
              alt="Logo" 
              className="w-10 h-10 rounded-md object-cover border border-amber-500/20 shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-tight text-white leading-none">ARBITRAGE</span>
              <span className="text-[10px] font-semibold tracking-wider text-amber-500 leading-none">INCEPTION</span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-sm text-slate-400 font-medium">
            BNB Smart Chain
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleWalletAction}
              disabled={connecting}
              className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#273549] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-transparent hover:border-slate-600"
            >
              <Wallet size={16} className="text-amber-500" />
              {connecting 
                ? 'Connessione...' 
                : wallet 
                  ? `${wallet.accounts[0].address.slice(0, 6)}...${wallet.accounts[0].address.slice(-4)}`
                  : 'Connetti Wallet'
              }
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto w-full flex flex-col items-center py-10 px-4">
          <div className="w-full max-w-[1200px]">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active 
          ? 'bg-[#1E293B] text-white' 
          : 'text-slate-400 hover:bg-[#1E293B]/50 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </a>
  );
}
