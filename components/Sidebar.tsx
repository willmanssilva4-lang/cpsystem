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
  LogOut,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useERP } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ClipboardList, label: 'Cadastros', href: '/cadastros' },
  { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
  { icon: Package, label: 'Estoque', href: '/produtos' },
  { icon: Truck, label: 'Compras', href: '/compras' },
  { icon: ShoppingCart, label: 'Vendas', href: '/pdv' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const { logout, hasPermission } = useERP();

  const filteredNavItems = NAV_ITEMS.filter(item => {
    return hasPermission(item.label, 'view');
  });

  const SidebarContent = (
    <aside className="w-64 bg-brand-blue-support flex flex-col h-full text-white overflow-hidden">
      <div className="p-8 flex items-center justify-between">
        <Logo size="md" theme="dark" />
        <button 
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/produtos' && pathname === '/produtos');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-4 px-6 py-3 rounded-xl transition-all text-sm font-bold tracking-wide",
                isActive 
                  ? "bg-brand-blue text-white shadow-inner" 
                  : "text-white/60 hover:bg-brand-blue hover:text-white"
              )}
            >
              <item.icon size={20} className={isActive ? "text-white" : "text-white/60"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Graphic/Gradient */}
      <div className="relative h-40 mt-auto shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-blue to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
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

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {SidebarContent}
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

