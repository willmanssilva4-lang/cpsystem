'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { Search, Calendar, ShieldCheck, User, Clock, AlertTriangle, Info, CheckCircle2, RotateCcw, Tag, Trash2, Eye, X, Terminal, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString, formatDateTimeBR } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

export default function SalesAuditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesAuditContent />
    </Suspense>
  );
}

function SalesAuditContent() {
  const { discountLogs, returns, auditLogs, systemUsers, hasPermission, products, sales } = useERP();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
  }); // Default to the first day of the current month
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [filterType, setFilterType] = useState<'all' | 'discount' | 'return' | 'venda' | 'cancelamento'>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const parseIfNeeded = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return data;
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, filterType]);

  const auditEvents = useMemo(() => {
    const events: any[] = [];

    // Add discount logs with snake_case and camelCase fallback
    discountLogs.forEach(log => {
      const logId = log.id;
      const logDate = log.date || log.created_at || new Date().toISOString();
      const logAppliedBy = log.appliedBy || log.applied_by || 'Sistema';
      const logMethod = log.method;
      const logValue = Number(log.value) || 0;
      const logSaleId = log.saleId || log.sale_id;
      const logReason = log.reason || 'Desconto no PDV';
      const logPercentage = log.percentage;

      events.push({
        id: `discount-${logId}`,
        type: 'discount',
        date: logDate,
        user: logAppliedBy,
        details: `${logMethod === 'percentage' ? (logPercentage || logValue) + '%' : 'R$ ' + logValue.toFixed(2)} de desconto em ${logSaleId && logSaleId !== 'PENDING' ? 'Venda #' + logSaleId.substring(0, 8).toUpperCase() : 'Item'}`,
        reason: logReason,
        severity: logValue > 20 || (logMethod === 'value' && logValue > 100) ? 'high' : 'medium',
        rawData: log
      });
    });

    // Add returns with snake_case and camelCase fallback
    returns.forEach(ret => {
      const retId = ret.id;
      const retDate = ret.date || ret.created_at || new Date().toISOString();
      const retUserId = ret.userId || ret.user_id || 'Sistema';
      const retType = ret.type || 'TOTAL';
      const retTotal = Number(ret.total) || 0;
      const retSaleId = ret.saleId || ret.sale_id;
      const retReason = (ret.items && ret.items[0]?.reason) || ret.reason || 'Não informado';

      events.push({
        id: `return-${retId}`,
        type: 'return',
        date: retDate,
        user: retUserId,
        details: `Devolução ${retType} de R$ ${retTotal.toFixed(2)}${retSaleId ? ` na Venda #${retSaleId.substring(0, 8).toUpperCase()}` : ''}`,
        reason: retReason,
        severity: retType === 'TOTAL' ? 'high' : 'medium',
        rawData: ret
      });
    });

    // Add general audit logs related to sales with full robustness
    auditLogs.filter(log => log.module === 'vendas' || log.module === 'sales' || log.module_name === 'vendas').forEach(log => {
      const logId = log.id;
      const logAction = log.action || log.action_name || '';
      const logCreatedAt = log.createdAt || log.created_at || new Date().toISOString();
      const logUserId = log.userId || log.user_id || 'Sistema';
      const logModule = log.module || log.module_name || 'vendas';
      const logEntityId = log.entityId || log.entity_id;

      let sev = 'low';
      if (logAction === 'cancelamento' || logAction === 'exclusão' || logAction === 'delete' || logAction === 'cancel') {
        sev = 'high';
      } else if (logAction === 'edit' || logAction === 'edição' || logAction === 'update') {
        sev = 'medium';
      }

      events.push({
        id: `audit-${logId}`,
        type: logAction === 'venda' || logAction === 'sale' ? 'venda' : logAction.includes('devol') || logAction.includes('ret') ? 'return' : 'cancelamento',
        date: logCreatedAt,
        user: logUserId,
        details: `${logAction.toUpperCase()}: ${logModule.toUpperCase()} #${logEntityId?.substring(0, 8).toUpperCase() || 'N/A'}`,
        reason: logAction === 'venda' || logAction === 'sale' ? 'Operação Normal' : 'Ação de Auditoria',
        severity: sev,
        rawData: log,
        isAuditLog: true
      });
    });

    // Add sales as native audit events so the auditor can inspect all actual commercial operations
    sales.forEach(sale => {
      const saleId = sale.id;
      const saleDate = sale.date || sale.created_at || new Date().toISOString();
      const saleUserId = sale.userId || sale.user_id || 'Sistema';
      const total = Number(sale.total) || 0;
      const discount = Number(sale.discount) || 0;
      const subtotal = Number(sale.subtotal) || total;
      const isCancelled = sale.status === 'Cancelada' || sale.status === 'cancelada';

      // Avoid duplicate if an auditLog of 'cancelamento' or similar exists for the same sale
      const hasDetailedAudit = auditLogs.some(log => 
        (log.entityId === saleId || log.entity_id === saleId) && 
        (log.action === 'cancelamento' || log.action_name === 'cancelamento' || log.action === 'cancel' || log.action_name === 'cancel')
      );

      if (isCancelled && hasDetailedAudit) {
        // Skip adding the simplified sale cancelled event since a detailed audit log represents it
        return;
      }

      // Add a clean venda or cancelamento event
      events.push({
        id: `sale-${saleId}`,
        type: isCancelled ? 'cancelamento' : 'venda',
        date: saleDate,
        user: saleUserId,
        details: isCancelled 
          ? `Venda Cancelada #${saleId.substring(0, 8).toUpperCase()} no valor de R$ ${total.toFixed(2)}`
          : `Nova Venda #${saleId.substring(0, 8).toUpperCase()} concluída no valor de R$ ${total.toFixed(2)}`,
        reason: isCancelled ? 'Venda Cancelada' : 'Operação de Venda Standard',
        severity: isCancelled ? 'high' : 'low',
        rawData: {
          id: saleId,
          total: total,
          discount: discount,
          subtotal: subtotal,
          items: sale.items || [],
          payments: sale.payments || [],
          paymentMethod: sale.paymentMethod || sale.payment_method || 'DINHEIRO',
          status: sale.status || 'completed',
          userId: saleUserId,
          saleId: saleId,
        },
        isSaleEvent: true
      });

      // If the sale has discounts, virtualize a discount log to populate search & details
      if (discount > 0 && !discountLogs.some(log => log.saleId === saleId || log.sale_id === saleId)) {
        events.push({
          id: `discount-sale-${saleId}`,
          type: 'discount',
          date: saleDate,
          user: saleUserId,
          details: `Desconto de R$ ${discount.toFixed(2)} concedido na Venda #${saleId.substring(0, 8).toUpperCase()}`,
          reason: 'Item com desconto de Checkout',
          severity: discount > 20 ? 'high' : 'medium',
          rawData: {
            id: `virtual-disc-${saleId}`,
            saleId: saleId,
            appliedBy: saleUserId,
            value: discount,
            method: 'value',
            reason: 'Consolidado na Venda',
            date: saleDate
          }
        });
      }
    });

    return events
      .filter(event => {
        const eventDate = getLocalDateString(new Date(event.date));
        const matchesDate = eventDate >= startDate && eventDate <= endDate;
        const matchesType = filterType === 'all' || event.type === filterType;
        
        let matchesSearch = false;
        if (!searchQuery) {
          matchesSearch = true;
        } else {
          const query = searchQuery.toLowerCase();
          const detailsMatch = event.details.toLowerCase().includes(query);
          const reasonMatch = event.reason && event.reason.toLowerCase().includes(query);
          
          const rawId = event.rawData?.saleId || event.rawData?.sale_id || event.rawData?.entityId || event.rawData?.entity_id || '';
          const rawIdMatch = rawId && typeof rawId === 'string' && (rawId.toLowerCase().includes(query) || query.includes(rawId.toLowerCase()));
          
          // Fallback check if searching with a full UUID against truncated #XXXXXXXX pattern
          const truncatedQueryMatch = query.length > 8 && event.details.toLowerCase().includes(query.substring(0, 8).toLowerCase());

          matchesSearch = !!(detailsMatch || reasonMatch || rawIdMatch || truncatedQueryMatch);
        }
        
        return matchesDate && matchesType && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [discountLogs, returns, auditLogs, sales, startDate, endDate, filterType, searchQuery]);

  const totalPages = Math.ceil(auditEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return auditEvents.slice(start, start + itemsPerPage);
  }, [auditEvents, currentPage]);

  const relatedSale = useMemo(() => {
    if (!selectedEvent) return null;
    const saleId = selectedEvent.rawData?.saleId || selectedEvent.rawData?.sale_id || selectedEvent.rawData?.entityId || selectedEvent.rawData?.entity_id;
    if (!saleId || saleId === 'PENDING') return null;
    return sales?.find(s => s.id === saleId);
  }, [selectedEvent, sales]);

  const renderFriendlyData = (data: any) => {
    if (!data) return null;

    // Check if it's a sale
    if (data.items && Array.isArray(data.items) && data.total !== undefined) {
      return (
        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-brand-border shadow-inner">
          <div className="flex justify-between items-center border-b border-brand-border pb-4">
            <h4 className="text-xs font-black text-brand-text-main uppercase tracking-widest">Resumo da Operação</h4>
            <span className="text-sm font-black text-brand-blue">TOTAL: R$ {Number(data.total).toFixed(2)}</span>
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Itens</p>
            {data.items.map((item: any, idx: number) => {
              const product = products.find(p => p.id === item.productId || p.id === item.product_id);
              const price = Number(item.price || item.unit_price || 0);
              return (
                <div key={idx} className="flex justify-between text-xs font-bold text-brand-text-main">
                  <span className="flex-1 truncate mr-4">{item.quantity}x {product?.name || item.name || 'Produto não encontrado'}</span>
                  <span className="whitespace-nowrap">R$ {(price * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {data.payments && data.payments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-brand-border">
              <p className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Formas de Pagamento</p>
              {data.payments.map((pay: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs font-bold text-brand-text-main">
                  <span className="uppercase">{pay.method}</span>
                  <span>R$ {Number(pay.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t border-brand-border flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold text-brand-text-sec uppercase tracking-widest">
              <span>Subtotal</span>
              <span>R$ {Number(data.subtotal || data.total).toFixed(2)}</span>
            </div>
            {Number(data.discount || 0) > 0 && (
              <div className="flex justify-between text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                <span>Desconto</span>
                <span>- R$ {Number(data.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black text-brand-text-main uppercase tracking-widest pt-1">
              <span>Líquido</span>
              <span>R$ {Number(data.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!hasPermission('Vendas', 'view')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-brand-text-sec font-bold uppercase tracking-widest">Acesso Negado</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black italic text-brand-text-main uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="text-brand-blue" size={40} /> Auditoria de Vendas
            </h1>
            <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest mt-1">Monitoramento de Descontos e Reversões</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex bg-white border-2 border-brand-border rounded-2xl p-1 shadow-sm">
              <div className="flex items-center px-3 gap-2 border-r border-brand-border">
                <Calendar size={16} className="text-brand-text-sec" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold uppercase outline-none"
                />
              </div>
              <div className="flex items-center px-3 gap-2">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold uppercase outline-none"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['all', 'venda', 'discount', 'return', 'cancelamento'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filterType === type 
                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                    : 'bg-white border-2 border-brand-border text-brand-text-sec hover:bg-slate-50'
                }`}
              >
                {type === 'all' ? 'Todos' : 
                 type === 'venda' ? 'Vendas' :
                 type === 'discount' ? 'Descontos' : 
                 type === 'return' ? 'Devoluções' : 'Cancelamentos'}
              </button>
            ))}
          </div>
          
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 bg-white border-2 border-brand-border rounded-2xl pl-12 pr-4 py-3 font-bold text-sm focus:border-brand-blue outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white border-2 border-brand-border rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-brand-border text-[10px] font-black uppercase text-brand-text-sec tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">Evento / Data</th>
                  <th className="px-6 py-4 text-left">Usuário</th>
                  <th className="px-6 py-4 text-left">Detalhes</th>
                  <th className="px-6 py-4 text-left">Motivo</th>
                  <th className="px-6 py-4 text-center">Nível</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {paginatedEvents.length > 0 ? (
                  paginatedEvents.map((event) => {
                    const eventUser = systemUsers.find(u => u.id === event.user || u.email === event.user);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              event.type === 'venda' ? 'bg-emerald-100 text-emerald-600' :
                              event.type === 'discount' ? 'bg-amber-100 text-amber-600' :
                              event.type === 'return' ? 'bg-blue-100 text-blue-600' :
                              'bg-rose-100 text-rose-600'
                            }`}>
                              {event.type === 'venda' ? <CheckCircle2 size={18} /> :
                               event.type === 'discount' ? <Tag size={18} /> :
                               event.type === 'return' ? <RotateCcw size={18} /> :
                               <Trash2 size={18} />}
                            </div>
                            <div>
                              <p className="font-black italic text-brand-text-main uppercase leading-tight">
                                {event.type === 'venda' ? 'Venda Registrada' :
                                 event.type === 'discount' ? 'Desconto Aplicado' :
                                 event.type === 'return' ? 'Devolução Realizada' :
                                 'Ação Crítica'}
                              </p>
                              <p className="text-[10px] text-brand-text-sec font-bold">{formatDateTimeBR(event.date)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-brand-text-sec" />
                            <span className="font-bold text-brand-text-main uppercase text-xs">
                              {eventUser?.full_name || eventUser?.username || event.user || 'Sistema'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-brand-text-main">{event.details}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs italic text-brand-text-sec">{event.reason}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            event.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                            event.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-brand-green/10 text-brand-green'
                          }`}>
                            {event.severity === 'high' ? 'Crítico' :
                             event.severity === 'medium' ? 'Alerta' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => setSelectedEvent(event)}
                            className="p-2 hover:bg-brand-blue/10 text-brand-blue rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-brand-text-sec font-bold uppercase tracking-widest opacity-50">Nenhum evento registrado no período</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-brand-border flex items-center justify-between">
            <p className="text-sm text-brand-text-sec font-bold uppercase tracking-widest">
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, auditEvents.length)} a {Math.min(currentPage * itemsPerPage, auditEvents.length)} de {auditEvents.length} eventos
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-brand-border text-brand-text-sec hover:bg-white disabled:opacity-30 transition-all font-black uppercase italic text-[10px] flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                
                <div className="hidden md:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                    })
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="text-brand-text-sec px-1 text-[10px] font-black">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all border ${
                            currentPage === page 
                              ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' 
                              : 'text-brand-text-sec hover:bg-white border-brand-border'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <div className="md:hidden flex items-center px-4">
                  <span className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Pág {currentPage} de {totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-brand-border text-brand-text-sec hover:bg-white disabled:opacity-30 transition-all font-black uppercase italic text-[10px] flex items-center gap-1"
                >
                  Próximo
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Audit Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-brand-text-main/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-brand-border"
            >
              <div className="p-8 border-b border-brand-border flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                    selectedEvent.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                    selectedEvent.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-brand-blue/10 text-brand-blue'
                  }`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic text-brand-text-main uppercase tracking-tight">Detalhes da Auditoria</h2>
                    <p className="text-[10px] text-brand-text-sec font-bold uppercase tracking-widest">ID: {selectedEvent.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={24} className="text-brand-text-sec" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> Data e Hora
                    </label>
                    <p className="font-bold text-brand-text-main">{formatDateTimeBR(selectedEvent.date)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest flex items-center gap-1">
                      <User size={10} /> Usuário Responsável
                    </label>
                    <p className="font-bold text-brand-text-main uppercase">
                      {systemUsers.find(u => u.id === selectedEvent.user || u.email === selectedEvent.user)?.full_name || selectedEvent.user || 'Sistema'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest flex items-center gap-1">
                      <Terminal size={10} /> Terminal
                    </label>
                    <p className="font-bold text-brand-text-main">{selectedEvent.rawData?.terminal || 'Terminal PDV'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest flex items-center gap-1">
                      <Globe size={10} /> Endereço IP
                    </label>
                    <p className="font-bold text-brand-text-main">{selectedEvent.rawData?.ip || 'Local'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Descrição do Evento</label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-brand-border">
                    <p className="font-bold text-brand-text-main text-sm">{selectedEvent.details}</p>
                  </div>
                </div>

                {selectedEvent.reason && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Motivo / Justificativa</label>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="italic text-amber-900 text-sm font-medium">{selectedEvent.reason}</p>
                    </div>
                  </div>
                )}

                {(selectedEvent.isAuditLog || selectedEvent.rawData?.oldData || selectedEvent.rawData?.old_data || selectedEvent.rawData?.newData || selectedEvent.rawData?.new_data) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-brand-border" />
                      <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Dados da Operação</label>
                      <div className="h-px flex-1 bg-brand-border" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {(selectedEvent.rawData?.oldData || selectedEvent.rawData?.old_data) && (
                        (() => {
                          const parsedOld = parseIfNeeded(selectedEvent.rawData.oldData || selectedEvent.rawData.old_data);
                          return parsedOld ? (
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                <RotateCcw size={12} /> Estado Anterior
                              </p>
                              {renderFriendlyData(parsedOld)}
                              <details className="group">
                                <summary className="text-[10px] font-bold text-brand-text-sec uppercase tracking-widest cursor-pointer hover:text-brand-blue transition-colors list-none flex items-center gap-1">
                                  <span>Ver JSON Bruto</span>
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto font-mono">
                                  {JSON.stringify(parsedOld, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ) : null;
                        })()
                      )}
                      {(selectedEvent.rawData?.newData || selectedEvent.rawData?.new_data) && (
                        (() => {
                          const parsedNew = parseIfNeeded(selectedEvent.rawData.newData || selectedEvent.rawData.new_data);
                          return parsedNew ? (
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={12} /> Novo Estado / Dados Enviados
                              </p>
                              {renderFriendlyData(parsedNew)}
                              <details className="group">
                                <summary className="text-[10px] font-bold text-brand-text-sec uppercase tracking-widest cursor-pointer hover:text-brand-blue transition-colors list-none flex items-center gap-1">
                                  <span>Ver JSON Bruto</span>
                                </summary>
                                <pre className="mt-2 p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto font-mono">
                                  {JSON.stringify(parsedNew, null, 2)}
                                </pre>
                              </details>
                            </div>
                          ) : null;
                        })()
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'discount' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-brand-border" />
                      <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Dados do Desconto</label>
                      <div className="h-px flex-1 bg-brand-border" />
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-brand-border space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Método</span>
                          <span className="font-bold text-brand-text-main uppercase">
                            {(selectedEvent.rawData?.method || '').toLowerCase() === 'percentage' ? 'Percentual' : 'Valor'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Valor do Desconto</span>
                          <span className="font-black text-rose-500 font-mono text-sm">
                            {(selectedEvent.rawData?.method || '').toLowerCase() === 'percentage' 
                              ? `${selectedEvent.rawData?.percentage || selectedEvent.rawData?.value || 0}%` 
                              : `R$ ${Number(selectedEvent.rawData?.value || 0).toFixed(2)}`}
                          </span>
                        </div>
                        {selectedEvent.rawData?.saleId && selectedEvent.rawData?.saleId !== 'PENDING' && (
                          <div>
                            <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Código da Venda</span>
                            <span className="font-mono font-bold text-brand-text-main uppercase">
                              #{selectedEvent.rawData?.saleId?.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {(selectedEvent.rawData?.authorizedBy || selectedEvent.rawData?.authorized_by) && (
                          <div>
                            <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Autorizado por</span>
                            <span className="font-bold text-brand-text-main uppercase">
                              {selectedEvent.rawData?.authorizedBy || selectedEvent.rawData?.authorized_by}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedEvent.rawData?.productId && (
                        <div className="pt-4 border-t border-brand-border space-y-1">
                          <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Produto Afetado</span>
                          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-brand-border">
                            <Tag size={14} className="text-amber-500" />
                            <span className="font-bold text-xs text-brand-text-main uppercase">
                              {products.find(p => p.id === selectedEvent.rawData?.productId)?.name || 'Produto não identificado'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'return' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-brand-border" />
                      <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Dados da Devolução</label>
                      <div className="h-px flex-1 bg-brand-border" />
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-brand-border space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                        <div>
                          <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Tipo da Devolução</span>
                          <span className="font-black text-brand-text-main uppercase text-[11px]">{selectedEvent.rawData?.type || 'ESTORNO'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Total Devolvido</span>
                          <span className="font-black text-brand-blue font-mono">
                            R$ {Number(selectedEvent.rawData?.total || 0).toFixed(2)}
                          </span>
                        </div>
                        {(selectedEvent.rawData?.saleId || selectedEvent.rawData?.sale_id) && (
                          <div>
                            <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Venda De Origem</span>
                            <span className="font-mono font-bold text-brand-text-main uppercase">
                              #{(selectedEvent.rawData?.saleId || selectedEvent.rawData?.sale_id)?.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {(selectedEvent.rawData?.refundMethod || selectedEvent.rawData?.refund_method) && (
                          <div>
                            <span className="text-[10px] text-brand-text-sec font-black uppercase tracking-widest block leading-none mb-1">Método de Reembolso</span>
                            <span className="font-bold text-brand-text-main uppercase">
                              {selectedEvent.rawData?.refundMethod || selectedEvent.rawData?.refund_method}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedEvent.rawData?.items && Array.isArray(selectedEvent.rawData?.items) && selectedEvent.rawData.items.length > 0 && (
                        <div className="pt-4 border-t border-brand-border space-y-3">
                          <p className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Produtos Devolvidos</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {selectedEvent.rawData.items.map((item: any, idx: number) => {
                              const product = products.find(p => p.id === item.productId || p.id === item.product_id);
                              return (
                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-brand-border text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-brand-text-main uppercase">
                                      {product?.name || item.name || 'Produto não encontrado'}
                                    </span>
                                    <span className="text-[10px] text-brand-text-sec font-mono mt-0.5">
                                      {item.quantity} un x R$ {Number(item.price || item.unit_price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <span className="font-black font-mono text-brand-text-main whitespace-nowrap">
                                    R$ {(Number(item.price || item.unit_price || 0) * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {relatedSale && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-brand-border" />
                      <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Cupom de Venda Relacionada</label>
                      <div className="h-px flex-1 bg-brand-border" />
                    </div>
                    {renderFriendlyData(relatedSale)}
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-brand-border flex justify-end">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="px-8 py-3 bg-brand-text-main text-white rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-brand-text-main/90 transition-all active:scale-95"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
