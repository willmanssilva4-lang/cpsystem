'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { Search, Tag, Users, Calendar, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import { formatDateTimeBR } from '@/lib/utils';

export default function VouchersPage() {
  const { vouchers, customers, hasPermission, updateVoucher } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!hasPermission('Vendas', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <AlertCircle size={64} className="text-brand-text-sec opacity-20 mb-4" />
        <p className="text-brand-text-sec font-black uppercase tracking-widest text-lg">Acesso Negado</p>
        <p className="text-brand-text-sec max-w-sm mt-2 font-bold text-sm">Você não tem permissão para visualizar vouchers de crédito.</p>
      </div>
    );
  }

  // Filter Vouchers
  const filteredVouchers = vouchers.filter((voucher) => {
    const searchStr = searchQuery.toLowerCase();
    const customer = customers.find(c => c.id === voucher.customerId);
    const matchesSearch = 
      voucher.code.toLowerCase().includes(searchStr) || 
      (customer?.name && customer.name.toLowerCase().includes(searchStr)) ||
      (customer?.document && customer.document.toLowerCase().includes(searchStr));
      
    if (!matchesSearch) return false;
    if (statusFilter !== 'Todos' && voucher.status !== statusFilter) return false;
    
    return true;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCancelVoucher = async (voucher: any) => {
    if (confirm(`Tem certeza que deseja cancelar o vale ${voucher.code}? O saldo será zerado.`)) {
      await updateVoucher({ ...voucher, status: 'Cancelado', currentValue: 0 });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black italic text-brand-text-main uppercase tracking-tighter flex items-center gap-3">
            <Tag className="text-brand-blue" size={40} /> Vales e Créditos
          </h1>
          <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest mt-1">Histórico de Créditos em Loja</p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec opacity-50" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Código do Vale, Cliente ou CPF..."
            className="w-full bg-slate-50 border-2 border-brand-border rounded-xl pl-12 pr-4 py-3 font-bold focus:border-brand-blue outline-none transition-all text-sm uppercase"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {['Todos', 'Ativo', 'Cancelado', 'Utilizado'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                statusFilter === status
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 border-brand-blue'
                  : 'bg-white text-brand-text-sec border-brand-border hover:border-brand-blue/30 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers List */}
      <div className="bg-white border-2 border-brand-border rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-brand-border text-[10px] font-black uppercase text-brand-text-sec tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">Código / Data</th>
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-right">Saldo Atual (Total)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => {
                  const customer = customers.find(c => c.id === voucher.customerId);
                  return (
                    <tr key={voucher.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black italic text-brand-text-main text-lg uppercase tracking-wider">{voucher.code}</span>
                            <button 
                              onClick={() => handleCopyCode(voucher.code)}
                              className="text-brand-text-sec hover:text-brand-blue transition-colors p-1"
                              title="Copiar Código"
                            >
                              {copiedCode === voucher.code ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                          <p className="text-[10px] text-brand-text-sec font-bold flex items-center gap-1">
                            <Calendar size={12} /> {formatDateTimeBR(voucher.createdAt || new Date().toISOString())}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-brand-text-main">{customer.name}</span>
                            <span className="text-[10px] text-brand-text-sec font-black uppercase">{customer.document}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-brand-text-sec font-bold text-xs uppercase">
                            <Users size={14} className="opacity-50" /> Consumidor Final
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-brand-blue text-lg">R$ {voucher.currentValue.toFixed(2)}</p>
                        <p className="text-[10px] text-brand-text-sec font-bold uppercase">De: R$ {voucher.initialValue.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          voucher.status === 'Ativo' ? 'bg-green-100 text-green-700' : 
                          voucher.status === 'Utilizado' ? 'bg-slate-100 text-slate-500' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {voucher.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {voucher.status === 'Ativo' && (
                            <button
                              onClick={() => handleCancelVoucher(voucher)}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Tag size={32} className="text-brand-text-sec opacity-20" />
                      <p className="text-brand-text-sec font-bold uppercase tracking-widest text-xs">Nenhum vale encontrado</p>
                    </div>
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
