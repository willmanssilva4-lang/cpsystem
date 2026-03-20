'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { usePathname } from 'next/navigation';
import { Bell, Search, Settings, MapPin, Calendar, ChevronDown, Menu, X } from 'lucide-react';
import Image from 'next/image';

function TopBar({ user, onMenuClick }: { user: any, onMenuClick: () => void }) {
  return (
    <header className="bg-white border-b border-brand-border h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-6">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-50 rounded-lg transition-colors text-brand-text-main"
        >
          <Menu size={24} />
        </button>
        
        <div className="hidden lg:flex items-center gap-2 text-brand-text-sec font-medium cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-brand-border">
          <Calendar size={18} />
          <span className="text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <ChevronDown size={16} />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-4 text-brand-text-sec">
          <button className="relative hover:text-brand-blue transition-colors p-1">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-green text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">7</span>
          </button>
          <button className="hidden sm:block hover:text-brand-blue transition-colors p-1">
            <Search size={20} />
          </button>
          <button className="hover:text-brand-blue transition-colors p-1">
            <Settings size={20} />
          </button>
        </div>

        <div className="hidden sm:block w-px h-8 bg-brand-border"></div>

        <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-brand-text-main">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-brand-text-sec capitalize">{user?.role || 'Acesso'}</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-blue/10 overflow-hidden border border-brand-border flex items-center justify-center">
            {user?.image ? (
              <Image src={user.image} alt={user.name} width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useERP();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isPdvPage = pathname === '/pdv';

  return (
    <AuthGuard>
      <div className="flex min-h-screen relative">
        {!isLoginPage && !isPdvPage && (
          <Sidebar 
            isOpen={isMobileMenuOpen} 
            onClose={() => setIsMobileMenuOpen(false)} 
          />
        )}
        <main className={`flex-1 flex flex-col min-w-0 ${!isLoginPage && !isPdvPage ? 'bg-brand-bg' : ''}`}>
          {!isLoginPage && !isPdvPage && (
            <TopBar 
              user={user} 
              onMenuClick={() => setIsMobileMenuOpen(true)} 
            />
          )}
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
