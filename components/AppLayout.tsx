'use client';

import React from 'react';
import { useERP } from '@/lib/context';
import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { usePathname } from 'next/navigation';
import { Bell, Search, Settings, MapPin, Calendar, ChevronDown } from 'lucide-react';
import Image from 'next/image';

function TopBar() {
  return (
    <header className="bg-white border-b border-brand-border h-16 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-brand-text-main font-medium cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-brand-border">
          <MapPin size={18} className="text-brand-text-sec" />
          <span className="text-sm">Loja Central</span>
          <ChevronDown size={16} className="text-brand-text-sec" />
        </div>
        <div className="flex items-center gap-2 text-brand-text-sec font-medium cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-brand-border">
          <Calendar size={18} />
          <span className="text-sm">Terça-feira, 25 Abril 2024</span>
          <ChevronDown size={16} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-brand-text-sec">
          <button className="relative hover:text-brand-blue transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-green text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">7</span>
          </button>
          <button className="hover:text-brand-blue transition-colors">
            <Search size={20} />
          </button>
          <button className="hover:text-brand-blue transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="w-px h-8 bg-brand-border"></div>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
          <div className="text-right">
            <p className="text-sm font-semibold text-brand-text-main">Vinícius Souza</p>
            <p className="text-xs text-brand-text-sec">Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 overflow-hidden border border-brand-border">
            <Image src="https://picsum.photos/seed/vinicius/100/100" alt="Vinícius Souza" width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useERP();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isPdvPage = pathname === '/pdv';

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {!isLoginPage && !isPdvPage && <Sidebar />}
        <main className={`flex-1 flex flex-col min-w-0 ${!isLoginPage && !isPdvPage ? 'bg-brand-bg' : ''}`}>
          {!isLoginPage && !isPdvPage && <TopBar />}
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
