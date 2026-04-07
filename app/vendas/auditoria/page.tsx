'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { Search, Calendar, ShieldCheck, User, Clock, AlertTriangle, Info, CheckCircle2, RotateCcw, Tag, Trash2, Eye, X, Terminal, Globe } from 'lucide-react';
import { getLocalDateString, formatDateTimeBR } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';

export default function SalesAuditPage() {
  const { discountLogs, returns, auditLogs, systemUsers, hasPermission } = useERP();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [startDate, setStartDate] = useState(getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 30)))); // Default to last 30 days
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [filterType, setFilterType] = useState<'all' | 'discount' | 'return' | 'venda' | 'cancelamento'>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const auditEvents = useMemo(() => {
    const events: any[] = [];

    // Add discount logs
    discountLogs.forEach(log => {
      events.push({
        id: `discount-${log.id}`,
        type: 'discount',
        date: log.date,
        user: log.appliedBy,
        details: `${log.method === 'percentage' ? log.value + '%' : 'R$ ' + log.value.toFixed(2)} de desconto em ${log.saleId ? 'Venda #' + log.saleId.substring(0, 8).toUpperCase() : 'Item'}`,
        reason: log.reason || 'Desconto no PDV',
        severity: log.value > 20 || (log.method === 'value' && log.value > 100) ? 'high' : 'medium',
        rawData: log
      });
    });

    // Add returns
    returns.forEach(ret => {
      events.push({
        id: `return-${ret.id}`,
        type: 'return',
        date: ret.date,
        user: ret.userId,
        details: `Devolução ${ret.type} de R$ ${ret.total.toFixed(2)}${ret.saleId ? ` na Venda #${ret.saleId.substring(0, 8).toUpperCase()}` : ''}`,
        reason: ret.items[0]?.reason || 'Não informado',
        severity: ret.type === 'TOTAL' ? 'high' : 'medium',
        rawData: ret
      });
    });

    // Add general audit logs related to sales
    auditLogs.filter(log => log.module === 'vendas').forEach(log => {
      // Avoid duplication if possible, but audit logs are more granular
      events.push({
        id: `audit-${log.id}`,
        type: log.action === 'venda' ? 'venda' : log.action === 'devolução' ? 'return' : 'cancelamento',
        date: log.createdAt,
        user: log.userId,
        details: `${log.action.toUpperCase()}: ${log.module.toUpperCase()} #${log.entityId?.substring(0, 8).toUpperCase() || 'N/A'}`,
        reason: log.action === 'venda' ? 'Operação Normal' : 'Ação de Auditoria',
        severity: log.action === 'cancelamento' ? 'high' : 'low',
        rawData: log,
        isAuditLog: true
      });
    });

    return events
      .filter(event => {
        const eventDate = getLocalDateString(new Date(event.date));
        const matchesDate = eventDate >= startDate && eventDate <= endDate;
        const matchesType = filterType === 'all' || event.type === filterType;
        const matchesSearch = 
          event.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.reason && event.reason.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesDate && matchesType && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [discountLogs, returns, auditLogs, startDate, endDate, filterType, searchQuery]);

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
                {auditEvents.length > 0 ? (
                  auditEvents.map((event) => {
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
              Mostrando {auditEvents.length} eventos de auditoria
            </p>
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

                {selectedEvent.isAuditLog && (selectedEvent.rawData?.oldData || selectedEvent.rawData?.newData) && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest">Dados da Operação (JSON)</label>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedEvent.rawData.oldData && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Estado Anterior</p>
                          <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto font-mono">
                            {JSON.stringify(selectedEvent.rawData.oldData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedEvent.rawData.newData && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Novo Estado / Dados Enviados</p>
                          <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto font-mono">
                            {JSON.stringify(selectedEvent.rawData.newData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
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
