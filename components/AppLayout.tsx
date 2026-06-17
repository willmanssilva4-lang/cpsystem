'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalAlert } from '@/components/GlobalAlert';
import { AuthGuard } from '@/components/AuthGuard';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Settings, MapPin, Calendar, ChevronDown, Menu, X, HelpCircle, AlertTriangle, ArrowRight, TrendingUp, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { HelpModal } from '@/components/HelpModal';
import { ContextualHelp } from '@/components/ContextualHelp';
import { getLocalDateString, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function TopBar({ user, onMenuClick, onHelpClick, showMenuToggleOnDesktop }: { user: any, onMenuClick: () => void, onHelpClick: () => void, showMenuToggleOnDesktop?: boolean }) {
  const { products, expenses, lotes, systemSettings, sendEmailNotification, fetchData, isLoading } = useERP();
  const isSuperAdmin = user?.email?.toLowerCase() === 'willmanssilva4@gmail.com';
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [sentEmailNotificationIds, setSentEmailNotificationIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erp_sent_email_notifs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [lastEmailAttempt, setLastEmailAttempt] = useState<number>(0);
  const sendingRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_sent_email_notifs', JSON.stringify(sentEmailNotificationIds));
    }
  }, [sentEmailNotificationIds]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const notifications = useMemo(() => {
    if (!mounted || isSuperAdmin) return [];
    const notifs: any[] = [];
    
    // Low stock notifications
    const lowStock = Array.isArray(products) ? products.filter(p => {
      const isVirtual = p.product_type === 'KIT' || (p.composition && p.composition.length > 0) || !!p.base_product_id;
      const isActive = p.status?.toLowerCase() === 'ativo' || p.status !== 'Inativo';
      return !isVirtual && isActive && (p.stock || 0) <= (p.minStock || 0);
    }) : [];
    lowStock.forEach(p => {
      notifs.push({
        id: `stock-${p.id}`,
        title: 'Estoque baixo',
        message: `O produto "${p.name}" está com estoque baixo (${p.stock} unidades)`,
        time: 'Sistema',
        read: (Array.isArray(readNotificationIds) ? readNotificationIds : []).includes(`stock-${p.id}`)
      });
    });

    // Expired batches
    const today = getLocalDateString();
    const expiredLotes = Array.isArray(lotes) ? lotes.filter(l => l.validade <= today && l.saldoAtual > 0) : [];
    expiredLotes.forEach(l => {
      const product = Array.isArray(products) ? products.find(p => p.id === l.productId) : null;
      const isToday = l.validade === today;
      notifs.push({
        id: `lote-${l.id}`,
        title: isToday ? 'Lote Vence Hoje' : 'Lote Vencido',
        message: isToday 
          ? `O lote "${l.numeroLote}" do produto "${product?.name || 'Desconhecido'}" vence hoje (${l.validade})`
          : `O lote "${l.numeroLote}" do produto "${product?.name || 'Desconhecido'}" venceu em ${l.validade}`,
        time: 'Estoque',
        read: (Array.isArray(readNotificationIds) ? readNotificationIds : []).includes(`lote-${l.id}`)
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
  }, [products, expenses, lotes, readNotificationIds, mounted, isSuperAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Enviar notificações por e-mail
  useEffect(() => {
    if (!systemSettings?.notifications?.email || !user?.email || !mounted) return;

    // Cooldown de 1 minuto entre tentativas de envio para evitar rate limits
    const now = Date.now();
    if (now - lastEmailAttempt < 60000) return;

    // Apenas notificar se houver notificações novas que ainda não foram enviadas ou processadas
    const notificationsToSend = notifications.filter(n => !n.read && !sentEmailNotificationIds.includes(n.id) && !sendingRef.current.has(n.id));
    
    if (notificationsToSend.length > 0) {
      const sendGroupedEmail = async () => {
        const ids = notificationsToSend.map(n => n.id);
        ids.forEach(id => sendingRef.current.add(id));
        setLastEmailAttempt(Date.now());

        console.log(`📧 Tentando enviar e-mail agrupado para ${user.email} com ${notificationsToSend.length} alertas`);
        
        let subject = `ERP Alerta: ${notificationsToSend[0].title}`;
        if (notificationsToSend.length > 1) {
          subject = `ERP Alerta: ${notificationsToSend.length} novas notificações`;
        }

        const html = `
          <div style="font-family: sans-serif; padding: 20px; color: #334155;">
            <h2 style="color: #1e40af;">Resumo de Notificações</h2>
            <p>Você tem ${notificationsToSend.length} novas notificações que requerem sua atenção:</p>
            <div style="margin: 20px 0;">
              ${notificationsToSend.map(n => `
                <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #1e40af; background-color: #f8fafc;">
                  <strong style="display: block; color: #1e40af;">${n.title}</strong>
                  <span style="font-size: 14px;">${n.message}</span>
                </div>
              `).join('')}
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Este é um alerta automático do seu sistema ERP.</p>
          </div>
        `;

        const result = await sendEmailNotification(
          user.email,
          subject,
          notificationsToSend.map(n => `${n.title}: ${n.message}`).join('\n\n'),
          html
        );

        if (result.success) {
          setSentEmailNotificationIds(prev => {
            const newIds = [...new Set([...prev, ...ids])];
            return newIds.slice(-500); // Manter apenas os últimos 500 para não estourar localStorage
          });
        } else {
          // Se falhou, remove do sendingRef para tentar novamente após o cooldown
          ids.forEach(id => sendingRef.current.delete(id));
          // Se foi erro de rate limit, aumenta o cooldown
          if (result.error?.includes('Rate exceeded')) {
            setLastEmailAttempt(Date.now() + 300000); // 5 minutos de cooldown extra
          }
        }
      };

      // Debounce de 5 segundos para agrupar notificações que chegam juntas
      const timer = setTimeout(() => {
        sendGroupedEmail();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications, systemSettings, user, sendEmailNotification, sentEmailNotificationIds, lastEmailAttempt, mounted]);

  const markAsRead = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      setReadNotificationIds([...readNotificationIds, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(Array.from(new Set([...readNotificationIds, ...allIds])));
  };

  return (
    <header id="top-bar" className="bg-white border-b border-brand-border h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Brand Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue-hover z-20" />
      
      <div className="flex items-center gap-2 md:gap-6">
        <button 
          id="mobile-menu-toggle"
          name="mobile-menu-toggle"
          onClick={onMenuClick}
          className={cn("p-2 hover:bg-slate-50 rounded-lg transition-colors text-brand-text-main", !showMenuToggleOnDesktop && "lg:hidden")}
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
            {!isSuperAdmin && (
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
            )}

            {!isSuperAdmin && isNotificationsOpen && (
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

            {!isSuperAdmin && (
              <button 
                id="sync-toggle"
                name="sync-toggle"
                onClick={() => fetchData()}
                disabled={isLoading}
                className="hover:text-brand-blue transition-colors p-1 flex items-center gap-1 group cursor-pointer disabled:opacity-50"
                title="Sincronizar dados com o servidor"
              >
                <RefreshCw size={18} className={isLoading ? "animate-spin text-brand-blue" : "transition-transform group-hover:rotate-45"} />
                <span className="hidden xl:inline text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sincronizar</span>
              </button>
            )}

            {!isSuperAdmin && (
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
            )}
  
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


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, systemSettings, expenses, sales, fetchData } = useERP();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [modalTab, setModalTab] = useState<'overdue' | 'upcoming'>('overdue');
  
  const today = getLocalDateString();

  // Efeito de auto-polling inteligente para atualizar os dados silenciosamente a cada 45 segundos
  useEffect(() => {
    const isLoginPage = pathname === '/login';
    if (isLoginPage) return;

    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          console.log('[AutoSync] Procurando atualizações em segundo plano...');
          fetchData();
        }
      }, 45000); // 45 segundos
    };

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchData, pathname]);

  useEffect(() => {
    if (pathname === '/login' && typeof window !== 'undefined') {
      sessionStorage.removeItem('erp_overdue_alert_shown');
    }
  }, [pathname]);

  useEffect(() => {
    const isLoginPage = pathname === '/login';
    const isPDVPage = pathname === '/pdv';
    const isPriceCheckPage = pathname === '/consulta-preco';

    if (isLoginPage || isPDVPage || isPriceCheckPage) return;

    if (typeof window !== 'undefined' && Array.isArray(expenses) && expenses.length > 0) {
      try {
        const overdue = expenses.filter(e => {
          if (!e) return false;
          const isPaid = e.status === 'Pago' || !!e.paymentDate;
          const dueDateStr = getLocalDateString(e?.dueDate || e?.date);
          return !isPaid && dueDateStr && dueDateStr < today;
        });

        const upcoming = expenses.filter(e => {
          if (!e) return false;
          const isPaid = e.status === 'Pago' || !!e.paymentDate;
          const dueDateStr = getLocalDateString(e?.dueDate || e?.date);
          return !isPaid && dueDateStr && dueDateStr === today;
        });

        if (overdue.length > 0 || upcoming.length > 0) {
          const alreadyShown = sessionStorage.getItem('erp_overdue_alert_shown');
          if (!alreadyShown) {
            setModalTab(overdue.length > 0 ? 'overdue' : 'upcoming');
            setShowOverdueModal(true);
          }
        }
      } catch (err) {
        console.error('Error checking overdue in layout:', err);
      }
    }
  }, [expenses, pathname, today]);

  const overdueExpenses = Array.isArray(expenses)
    ? expenses.filter(e => {
        if (!e) return false;
        const isPaid = e.status === 'Pago' || !!e.paymentDate;
        const dueDateStr = getLocalDateString(e.dueDate || e.date);
        const todayStr = getLocalDateString();
        return !isPaid && dueDateStr < todayStr;
      })
    : [];

  const upcomingExpenses = Array.isArray(expenses)
    ? expenses.filter(e => {
        if (!e) return false;
        const isPaid = e.status === 'Pago' || !!e.paymentDate;
        const dueDateStr = getLocalDateString(e?.dueDate || e?.date);
        return !isPaid && dueDateStr && dueDateStr === today;
      }).sort((a, b) => {
        const dateA = new Date(a.dueDate || a.date).getTime();
        const dateB = new Date(b.dueDate || b.date).getTime();
        return dateA - dateB;
      })
    : [];

  const getDaysDiffValue = (dateInput: string | Date) => {
    try {
      const dateStr = typeof dateInput === 'string' ? dateInput.split('T')[0] : getLocalDateString(dateInput);
      const [y, m, d] = dateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = targetDate.getTime() - todayDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

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
  const isPriceCheckPage = pathname === '/consulta-preco';
  const isEstoquePage = pathname === '/produtos';
  const isComprasPage = pathname.startsWith('/compras');
  const isFinanceiroPage = pathname.startsWith('/financeiro');
  const isCadastrosPage = pathname.startsWith('/cadastros');
  const hideSidebar = isEstoquePage || isComprasPage || isFinanceiroPage || isCadastrosPage;

  return (
    <AuthGuard>
      <div id="app-layout" className="flex min-h-screen relative" suppressHydrationWarning>
          {!isLoginPage && !isPDVPage && !isPriceCheckPage && (
            <Sidebar 
              isOpen={isMobileMenuOpen} 
              onClose={() => setIsMobileMenuOpen(false)} 
              hideOnDesktop={hideSidebar}
            />
          )}
          <main id="main-content" data-id="main-content" data-name="main-content" className={`flex-1 flex flex-col min-w-0 ${!isLoginPage ? 'bg-brand-bg' : ''}`}>
            {!isLoginPage && !isPDVPage && !isPriceCheckPage && (
              <TopBar 
                user={user} 
                onMenuClick={() => setIsMobileMenuOpen(true)} 
                onHelpClick={() => setIsHelpOpen(true)}
                showMenuToggleOnDesktop={hideSidebar}
              />
            )}
            <div id="page-content" data-id="page-content" data-name="page-content" className="flex-1">
              {children}
            </div>
          </main>
          <GlobalAlert />
          <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
          {/* Overdue/Upcoming Expenses Modal Alert */}
          <AnimatePresence>
            {showOverdueModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-[2rem] border border-slate-200/60 shadow-2xl overflow-hidden max-w-lg w-full flex flex-col max-h-[90vh]"
                >
                  <div className="p-7 flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                        modalTab === 'overdue' ? 'bg-rose-50 border-rose-100 text-rose-500' : 
                        'bg-amber-50 border-amber-100 text-amber-500'
                      }`}>
                        {modalTab === 'overdue' && <AlertTriangle size={26} className="animate-pulse" />}
                        {modalTab === 'upcoming' && <Calendar size={26} />}
                      </div>
                      <div className="flex-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest italic transition-colors ${
                          modalTab === 'overdue' ? 'text-rose-500' : 'text-amber-500'
                        }`}>
                          {modalTab === 'overdue' ? 'ALERTA RELEVANTE' : 'PLANEJAMENTO FINANCEIRO'}
                        </span>
                        <h3 className="text-2xl font-black text-slate-850 tracking-tight mt-0.5">
                          {modalTab === 'overdue' ? 'Duplicatas Vencidas' : 'Duplicatas A Vencer'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                          {modalTab === 'overdue' ? 'Identificamos contas com data de vencimento expirada. Regularize seus débitos.' :
                           'Fique atento às contas com vencimento futuro.'}
                        </p>
                      </div>
                    </div>

                    {/* Integrated Sub-tabs */}
                    <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl mt-6 gap-0.5 shrink-0">
                      <button
                        onClick={() => setModalTab('overdue')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
                          modalTab === 'overdue' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Vencidas
                      </button>
                      <button
                        onClick={() => setModalTab('upcoming')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
                          modalTab === 'upcoming' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        A Vencer
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="mt-6 border-y border-slate-100 min-h-[140px] max-h-[300px] overflow-y-auto py-2">
                      {modalTab === 'overdue' && (
                        <div className="space-y-1">
                          {overdueExpenses.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                              Não há duplicatas vencidas no momento 🎉
                            </div>
                          ) : (
                            overdueExpenses.slice(0, 5).map((item, idx) => {
                              const dtStr = getLocalDateString(item?.dueDate || item?.date || '');
                              const displayDate = dtStr ? dtStr.split('-').reverse().join('/') : 'N/A';
                              const daysLate = Math.abs(getDaysDiffValue(dtStr));
                              return (
                                <div key={item?.id || idx} className="py-2.5 flex items-center justify-between text-slate-700">
                                  <div className="min-w-0 pr-4">
                                    <p className="text-xs font-bold text-slate-800 truncate">{item?.description || 'Despesa Sem Descrição'}</p>
                                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1 mt-0.5">
                                      Venceu: {displayDate} ({daysLate} {daysLate === 1 ? 'dia' : 'dias'})
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-rose-600 font-mono">
                                      R$ {(item?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {overdueExpenses.length > 5 && (
                            <div className="pt-2 text-center border-t border-slate-100 mt-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                + {overdueExpenses.length - 5} listadas
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {modalTab === 'upcoming' && (
                        <div className="space-y-1">
                          {upcomingExpenses.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                              Não há vencimentos próximos!
                            </div>
                          ) : (
                            upcomingExpenses.slice(0, 5).map((item, idx) => {
                              const dtStr = getLocalDateString(item?.dueDate || item?.date || '');
                              const displayDate = dtStr ? dtStr.split('-').reverse().join('/') : 'N/A';
                              const daysToDue = getDaysDiffValue(dtStr);
                              return (
                                <div key={item?.id || idx} className="py-2.5 flex items-center justify-between text-slate-700">
                                  <div className="min-w-0 pr-4">
                                    <p className="text-xs font-bold text-slate-800 truncate">{item?.description || 'Despesa Sem Descrição'}</p>
                                    <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                                      daysToDue === 0 ? 'text-rose-500 font-bold' : daysToDue === 1 ? 'text-amber-500' : 'text-slate-400'
                                    }`}>
                                      {displayDate} • {daysToDue === 0 ? 'Hoje' : daysToDue === 1 ? 'Amanhã' : `Em ${daysToDue} dias`}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-slate-900 font-mono">
                                      R$ {(item?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {upcomingExpenses.length > 5 && (
                            <div className="pt-2 text-center border-t border-slate-100 mt-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                + {upcomingExpenses.length - 5} listadas
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Summary & Actions */}
                    <div className="mt-4 flex flex-col gap-4">
                       <div className="flex bg-slate-50 p-3 rounded-xl justify-between items-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            {modalTab === 'overdue' ? 'T. Vencido' : 'T. A Vencer' }
                          </p>
                          <p className={`text-base font-black font-mono ${
                            modalTab === 'overdue' ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            R$ {
                              modalTab === 'overdue' 
                                ? overdueExpenses.reduce((s,e) => s + (e.amount || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2}) 
                                : upcomingExpenses.reduce((s,e) => s + (e.amount || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})
                            }
                          </p>
                       </div>
                       
                       <div className="flex gap-2 justify-end">
                         <button
                           onClick={() => {
                             if (typeof window !== 'undefined') {
                               sessionStorage.setItem('erp_overdue_alert_shown', 'true');
                             }
                             setShowOverdueModal(false);
                           }}
                           className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                         >
                           Fechar
                         </button>
                         <Link
                           href="/financeiro?tab=pagar"
                           onClick={() => {
                             if (typeof window !== 'undefined') {
                               sessionStorage.setItem('erp_overdue_alert_shown', 'true');
                             }
                             setShowOverdueModal(false);
                           }}
                           className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-xs"
                         >
                           Acessar Painel <ArrowRight size={14} />
                         </Link>
                       </div>
                    </div>

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Fixed Help Button [?] */}
          {/* Help button removed */}
        </div>
      </AuthGuard>
    );

}
