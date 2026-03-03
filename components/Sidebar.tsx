'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Wallet, 
  BarChart3, 
  Settings,
  ClipboardList,
  Truck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useERP } from '@/lib/context';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
  { icon: Package, label: 'Estoque', href: '/produtos' },
  { icon: ShoppingCart, label: 'Vendas', href: '/pdv' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useERP();

  return (
    <aside className="w-64 bg-[#0A1931] flex flex-col h-screen sticky top-0 text-white overflow-hidden">
      <div className="p-8 flex items-center justify-start">
        <Logo size="md" theme="dark" />
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href === '/produtos' && pathname === '/produtos');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-6 py-3 rounded-xl transition-all text-sm font-bold tracking-wide",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} className={isActive ? "text-white" : "text-white/60"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Graphic/Gradient */}
      <div className="relative h-48 mt-auto">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-blue to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="relative w-full h-32 opacity-20">
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-brand-blue rounded-full blur-2xl"></div>
            <div className="absolute bottom-8 right-8 w-16 h-16 bg-brand-green rounded-full blur-3xl"></div>
          </div>
          <button
            onClick={logout}
            className="relative z-10 w-full flex items-center gap-3 px-6 py-3 rounded-xl transition-all text-sm font-bold text-white/60 hover:bg-rose-500/20 hover:text-rose-400"
          >
            <LogOut size={20} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

