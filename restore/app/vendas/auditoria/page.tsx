'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { Search, Calendar, ShieldCheck, User, Clock, AlertTriangle, Info, CheckCircle2, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { getLocalDateString, formatDateTimeBR } from '@/lib/utils';

export default function SalesAuditPage() {
  const { discountLogs, returns, systemUsers, hasPermission } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [filterType, setFilterType] = useState<'all' | 'discount' | 'return' | 'cancellation'>('all');

  const auditEvents = useMemo(() => {
    const events: any[] = [];

    // Add discount logs
    discountLogs.forEach(log => {
      events.push({
        id: log.id,
        type: 'discount',
        date: log.date,
        user: log.userId,
        details: `${log.type === 'percentage' ? log.value + '%' : 'R$ ' + log.value.toFixed(2)} de desconto em ${log.saleId ? 'Venda #' + log.saleId.substring(0, 8).toUpperCase() : 'Item'}`,
        reason: log.reason,
        severity: log.value > 20 || (log.type === 'value' && log.value > 100) ? 'high' : 'medium'
      });
    });

    // Add returns
    returns.forEach(ret => {
      events.push({
        id: ret.id,
        type: 'return',
        date: ret.date,
        user: ret.userId,
        details: `Devolução ${ret.type} de R$ ${ret.total.toFixed(2)} na Venda #${ret.saleId.substring(0, 8).toUpperCase()}`,
        reason: ret.items[0]?.reason || 'Não informado',
        severity: ret.type === 'TOTAL' ? 'high' : 'medium'
      });
    });

    return events
      .filter(event => {
        const eventDate = getLocalDateString(new Date(event.date));
        const matchesDate = eventDate >= startDate && eventDate <= endDate;
        const matchesType = filterType === 'all' || event.type === filterType;
        const matchesSearch = 
          event.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesDate && matchesType && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [discountLogs, returns, startDate, endDate, filterType, searchQuery]);

  if (!hasPermission('vendas', 'auditoria')) {
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
          <div className="flex gap-2">
            {(['all', 'discount', 'return'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === type 
                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                    : 'bg-white border-2 border-brand-border text-brand-text-sec hover:bg-slate-50'
                }`}
              >
                {type === 'all' ? 'Todos' : type === 'discount' ? 'Descontos' : 'Devoluções'}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {auditEvents.length > 0 ? (
                  auditEvents.map((event) => {
                    const eventUser = systemUsers.find(u => u.id === event.user);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              event.type === 'discount' ? 'bg-amber-100 text-amber-600' :
                              event.type === 'return' ? 'bg-blue-100 text-blue-600' :
                              'bg-rose-100 text-rose-600'
                            }`}>
                              {event.type === 'discount' ? <Tag size={18} /> :
                               event.type === 'return' ? <RotateCcw size={18} /> :
                               <Trash2 size={18} />}
                            </div>
                            <div>
                              <p className="font-black italic text-brand-text-main uppercase leading-tight">
                                {event.type === 'discount' ? 'Desconto Aplicado' :
                                 event.type === 'return' ? 'Devolução Realizada' :
                                 'Venda Cancelada'}
                              </p>
                              <p className="text-[10px] text-brand-text-sec font-bold">{formatDateTimeBR(event.date)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-brand-text-sec" />
                            <span className="font-bold text-brand-text-main uppercase text-xs">{eventUser?.nome || 'Sistema'}</span>
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
        </div>
      </div>
  );
}
