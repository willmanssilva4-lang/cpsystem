'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Settings, MapPin, Calendar, ChevronDown, Menu, X, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { HelpModal } from '@/components/HelpModal';
import { ContextualHelp } from '@/components/ContextualHelp';
import { getLocalDateString } from '@/lib/utils';

function TopBar({ user, onMenuClick, onHelpClick }: { user: any, onMenuClick: () => void, onHelpClick: () => void }) {
  const { products, expenses, lotes, systemSettings, sendEmailNotification } = useERP();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [sentEmailNotificationIds, setSentEmailNotificationIds] = useState<string[]>([]);
  const sendingRef = React.useRef<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const notifications = useMemo(() => {
    if (!mounted) return [];
    const notifs: any[] = [];
    
    // Low stock notifications
    const lowStock = products.filter(p => p.stock <= p.minStock && p.has_had_stock);
    lowStock.forEach(p => {
      notifs.push({
        id: `stock-${p.id}`,
        title: 'Estoque baixo',
        message: `O produto "${p.name}" está com estoque baixo (${p.stock} unidades)`,
        time: 'Sistema',
        read: readNotificationIds.includes(`stock-${p.id}`)
      });
    });

    // Expired batches
    const today = getLocalDateString();
    const expiredLotes = lotes.filter(l => l.validade <= today && l.saldoAtual > 0);
    expiredLotes.forEach(l => {
      const product = products.find(p => p.id === l.productId);
      const isToday = l.validade === today;
      notifs.push({
        id: `lote-${l.id}`,
        title: isToday ? 'Lote Vence Hoje' : 'Lote Vencido',
        message: isToday 
          ? `O lote "${l.numeroLote}" do produto "${product?.name || 'Desconhecido'}" vence hoje (${l.validade})`
          : `O lote "${l.numeroLote}" do produto "${product?.name || 'Desconhecido'}" venceu em ${l.validade}`,
        time: 'Estoque',
        read: readNotificationIds.includes(`lote-${l.id}`)
      });
    });

    // Expired products
    const expiredProducts = products.filter(p => p.validade && p.validade <= today && p.stock > 0);
    expiredProducts.forEach(p => {
      const isToday = p.validade === today;
      notifs.push({
        id: `prod-${p.id}`,
        title: isToday ? 'Produto Vence Hoje' : 'Produto Vencido',
        message: isToday
          ? `O produto "${p.name}" vence hoje (${p.validade})`
          : `O produto "${p.name}" venceu em ${p.validade}`,
        time: 'Estoque',
        read: readNotificationIds.includes(`prod-${p.id}`)
      });
    });

    // Pending expenses
    const pendingExpenses = expenses.filter(e => !e.paymentDate && e.dueDate <= today);
    pendingExpenses.forEach(e => {
      notifs.push({
        id: `exp-${e.id}`,
        title: e.dueDate < today ? 'Despesa Atrasada' : 'Despesa Vence Hoje',
        message: `${e.description} no valor de R$ ${e.amount.toFixed(2)}`,
        time: 'Financeiro',
        read: readNotificationIds.includes(`exp-${e.id}`)
      });
    });

    return notifs;
  }, [products, expenses, lotes, readNotificationIds, mounted]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Enviar notificações por e-mail
  useEffect(() => {
    if (!systemSettings?.notifications?.email || !user?.email) return;

    // Apenas notificar se houver notificações novas que ainda não foram enviadas ou processadas
    const notificationsToSend = notifications.filter(n => !n.read && !sentEmailNotificationIds.includes(n.id) && !sendingRef.current.has(n.id));
    
    if (notificationsToSend.length > 0) {
      notificationsToSend.forEach(async (notification) => {
        sendingRef.current.add(notification.id);
        
        console.log(`📧 Tentando enviar e-mail para ${user.email} sobre: ${notification.title}`);
        const success = await sendEmailNotification(
          user.email,
          `ERP Alerta: ${notification.title}`,
          notification.message,
          `
            <div style="font-family: sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #1e40af;">${notification.title}</h2>
              <p>${notification.message}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">Este é um alerta automático do seu sistema ERP.</p>
            </div>
          `
        );

        if (success) {
          setSentEmailNotificationIds(prev => [...prev, notification.id]);
        } else {
          sendingRef.current.delete(notification.id);
        }
      });
    }
  }, [notifications, systemSettings, user, sendEmailNotification, sentEmailNotificationIds]);

  const markAsRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      setReadNotificationIds([...readNotificationIds, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(Array.from(new Set([...readNotificationIds, ...allIds])));
  };

  const isSuperAdmin = user?.email?.toLowerCase() === 'willmanssilva4@gmail.com';

  return (
    <header id="top-bar" className="bg-white border-b border-brand-border h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-6">
        <button 
          id="mobile-menu-toggle"
          name="mobile-menu-toggle"
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-50 rounded-lg transition-colors text-brand-text-main"
        >
          <Menu size={24} />
        </button>
        
        <div id="date-display" className="hidden lg:flex items-center gap-2 text-brand-text-sec font-medium cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-brand-border">
          <Calendar size={18} />
          <span className="text-sm">
            {mounted ? new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Carregando...'}
          </span>
          <ChevronDown size={16} />
        </div>
      </div>

          <div id="top-bar-actions" data-id="top-bar-actions" data-name="top-bar-actions" className="flex items-center gap-3 md:gap-6">
          <div id="notifications-container" data-id="notifications-container" data-name="notifications-container" className="flex items-center gap-2 md:gap-4 text-brand-text-sec relative">
            <button 
              id="notifications-toggle"
              name="notifications-toggle"
              className="relative hover:text-brand-blue transition-colors p-1"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-green text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-brand-border overflow-hidden z-50">
              <div className="p-4 border-b border-brand-border flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-brand-text-main">Notificações</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-brand-blue hover:underline font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-4 border-b border-brand-border hover:bg-slate-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-brand-text-main' : 'text-brand-text-sec'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-brand-text-sec whitespace-nowrap ml-2">{notification.time}</span>
                      </div>
                      <p className="text-xs text-brand-text-sec line-clamp-2">{notification.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-brand-text-sec text-sm">
                    Nenhuma notificação no momento.
                  </div>
                )}
              </div>
            </div>
          )}

            <button 
              id="help-toggle"
              name="help-toggle"
              onClick={onHelpClick}
              className="hover:text-brand-blue transition-colors p-1 flex items-center gap-1 group"
              title="Modo Ajuda"
            >
              <HelpCircle size={20} />
              <span className="hidden xl:inline text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ajuda</span>
            </button>
  
            {!isSuperAdmin && (
              <Link id="settings-link" href="/configuracoes" className="hover:text-brand-blue transition-colors p-1">
                <Settings size={20} />
              </Link>
            )}
          </div>
  
          <div className="hidden sm:block w-px h-8 bg-brand-border"></div>
  
          <div 
            id="user-profile-toggle"
            className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors"
            onClick={() => !isSuperAdmin && (window.location.href = '/configuracoes')}
          >
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-brand-text-main">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-brand-text-sec capitalize">{user?.role || 'Acesso'}</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-blue/10 overflow-hidden border border-brand-border flex items-center justify-center">
            {user?.image ? (
              <Image src={user.image} alt={user.name || 'User'} width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
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

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalAlert } from '@/components/GlobalAlert';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, systemSettings } = useERP();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (!systemSettings?.theme) return;
    
    const root = window.document.documentElement;
    const theme = systemSettings.theme;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [systemSettings?.theme]);
  
  const isLoginPage = pathname === '/login';
  const isPDVPage = pathname === '/pdv';

  return (
    <AuthGuard>
      <div id="app-layout" className="flex min-h-screen relative" suppressHydrationWarning>
          {!isLoginPage && !isPDVPage && (
            <Sidebar 
              isOpen={isMobileMenuOpen} 
              onClose={() => setIsMobileMenuOpen(false)} 
            />
          )}
          <main id="main-content" data-id="main-content" data-name="main-content" className={`flex-1 flex flex-col min-w-0 ${!isLoginPage ? 'bg-brand-bg' : ''}`}>
            {!isLoginPage && !isPDVPage && (
              <TopBar 
                user={user} 
                onMenuClick={() => setIsMobileMenuOpen(true)} 
                onHelpClick={() => setIsHelpOpen(true)}
              />
            )}
            <div id="page-content" data-id="page-content" data-name="page-content" className="flex-1">
              {children}
            </div>
          </main>
          <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
          <GlobalAlert />

          {/* Fixed Help Button [?] */}
          {/* Help button removed */}
        </div>
      </AuthGuard>
    );
}
