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
  ShieldCheck,
  ClipboardList,
  Truck,
  LogOut,
  X,
  Tag,
  ChevronDown,
  ChevronRight
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
  { 
    icon: ShoppingCart, 
    label: 'Vendas', 
    subItems: [
      { icon: ShoppingCart, label: 'PDV', href: '/pdv' },
      { icon: ClipboardList, label: 'Histórico de Vendas', href: '/vendas/historico' },
      { icon: Tag, label: 'Devoluções / Estornos', href: '/vendas/devolucoes' },
      { icon: BarChart3, label: 'Auditoria de Vendas', href: '/vendas/auditoria' },
    ]
  },
  { icon: Tag, label: 'Promoções', href: '/promocoes' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
  { icon: ShieldCheck, label: 'Gestão de Empresas', href: '/admin/companies', superAdminOnly: true },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname();
  const { logout, hasPermission, user } = useERP();
  
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);

  const isSuperAdmin = user?.email?.toLowerCase() === 'willmanssilva4@gmail.com';

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const filteredNavItems = isSuperAdmin 
    ? NAV_ITEMS.filter(item => item.label === 'Gestão de Empresas').map(item => ({ ...item, href: '/' }))
    : NAV_ITEMS.map(item => {
      if (item.superAdminOnly && !isSuperAdmin) return null;
      
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(sub => hasPermission(sub.label, 'view'));
        if (filteredSubItems.length > 0) {
          return { ...item, subItems: filteredSubItems };
        }
        return null;
      }
      return hasPermission(item.label, 'view') || item.superAdminOnly || isSuperAdmin ? item : null;
    }).filter(Boolean) as any[];

  const SidebarContent = (
    <aside id="sidebar-nav" name="sidebar-nav" className="w-64 bg-brand-blue-support flex flex-col h-full text-white overflow-hidden">
      <div className="p-8 flex items-center justify-between">
        <Logo size="md" theme="dark" />
        <button 
          id="sidebar-close"
          name="sidebar-close"
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => {
          if (item.subItems) {
            const isExpanded = expandedMenus.includes(item.label);
            const isAnySubActive = item.subItems.some((sub: any) => pathname.startsWith(sub.href));
            
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-3 rounded-xl transition-all text-sm font-bold tracking-wide",
                    isAnySubActive 
                      ? "bg-brand-blue/20 text-white" 
                      : "text-white/60 hover:bg-brand-blue hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={20} className={isAnySubActive ? "text-white" : "text-white/60"} />
                    <span>{item.label}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-6 space-y-1"
                    >
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname.startsWith(sub.href);
                        return (
                          <Link
                            id={`nav-subitem-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                            name={`nav-subitem-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                            data-id={`nav-subitem-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                            data-name={`nav-subitem-${sub.label.toLowerCase().replace(/\s+/g, '-')}`}
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              onClose?.();
                              setExpandedMenus(prev => prev.filter(l => l !== item.label));
                            }}
                            className={cn(
                              "flex items-center gap-4 px-6 py-2.5 rounded-xl transition-all text-xs font-bold tracking-wide",
                              isSubActive 
                                ? "bg-brand-blue text-white shadow-inner" 
                                : "text-white/50 hover:bg-brand-blue/30 hover:text-white"
                            )}
                          >
                            <sub.icon size={16} className={isSubActive ? "text-white" : "text-white/50"} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = pathname === item.href || (item.href === '/produtos' && pathname === '/produtos');
          return (
            <Link
              id={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              name={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              data-id={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              data-name={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
            id="logout-button"
            name="logout-button"
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
      <div className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 self-start">
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

