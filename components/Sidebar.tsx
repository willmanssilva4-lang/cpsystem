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
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ShoppingCart, label: 'Vendas/PDV', href: '/pdv' },
  { icon: Truck, label: 'Compras', href: '/compras' },
  { icon: Package, label: 'Produtos', href: '/produtos' },
  { icon: ClipboardList, label: 'Cadastros', href: '/cadastros' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center justify-center">
        <Logo size="sm" hideText theme="light" />
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-black uppercase italic tracking-tight",
                isActive 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                  : "text-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-700"
              )}
            >
              <item.icon size={20} className={isActive ? "text-emerald-200" : ""} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-black uppercase italic tracking-tight",
            pathname === '/configuracoes'
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
              : "text-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-700"
          )}
        >
          <Settings size={20} className={pathname === '/configuracoes' ? "text-emerald-200" : ""} />
          <span>Configurações</span>
        </Link>
      </nav>
    </aside>
  );
}
