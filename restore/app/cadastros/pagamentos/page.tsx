'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Save, CreditCard, Percent, DollarSign } from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/lib/types';

export default function PagamentosPage() {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, hasPermission } = useERP();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Dinheiro' as PaymentMethod['type'],
    taxPercentage: '',
    taxFixed: '',
    active: true
  });

  if (!hasPermission('Cadastros', 'view')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-slate-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const filteredMethods = paymentMethods.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (method: PaymentMethod) => {
    setFormData({
      name: method.name,
      type: method.type || 'Dinheiro',
      taxPercentage: (method.taxPercentage || 0).toString(),
      taxFixed: (method.taxFixed || 0).toString(),
      active: method.active
    });
    setEditingId(method.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    console.log('PagamentosPage: handleDelete called with ID:', id);
    // Removed native confirm() because it's blocked in the iframe sandbox
    console.log('PagamentosPage: Proceeding with deletion.');
    await deletePaymentMethod(id);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      alert('Preencha os campos obrigatórios (Nome e Tipo)');
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      taxPercentage: Number(formData.taxPercentage) || 0,
      taxFixed: Number(formData.taxFixed) || 0,
      active: formData.active
    };

    let success = false;
    if (editingId) {
      success = await updatePaymentMethod({ id: editingId, ...payload });
    } else {
      success = await addPaymentMethod(payload);
    }

    if (success) {
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', type: 'Dinheiro', taxPercentage: '', taxFixed: '', active: true });
    }
  };

  if (showForm) {
    return (
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-brand-bg min-h-screen">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setShowForm(false); setEditingId(null); }}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-brand-blue"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">
              {editingId ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </h1>
            <p className="text-brand-blue/60 font-medium text-sm">Configure as taxas e detalhes do método.</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Nome da Forma de Pagamento</label>
                <input 
                  type="text"
                  placeholder="Ex: Cartão de Crédito Master"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Tipo no Sistema</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Crédito">Cartão de Crédito</option>
                  <option value="Débito">Cartão de Débito</option>
                  <option value="Voucher">Voucher / Vale</option>
                  <option value="Fiado">Fiado / Crediário</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Status</label>
                <select 
                  value={formData.active ? 'true' : 'false'}
                  onChange={e => setFormData({...formData, active: e.target.value === 'true'})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                >
                  <option value="true">Ativo (Visível no PDV)</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Taxa Percentual (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxPercentage}
                    onChange={e => setFormData({...formData, taxPercentage: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Taxa Fixa (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxFixed}
                    onChange={e => setFormData({...formData, taxFixed: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all"
              >
                <Save size={18} />
                Salvar Método
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/cadastros" className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-brand-blue">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Formas de Pagamento</h1>
            <p className="text-brand-blue/60 font-medium text-sm">Configure métodos de recebimento e taxas.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={18} />
            <input 
              type="text"
              placeholder="Buscar método..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ name: '', type: 'Dinheiro', taxPercentage: '', taxFixed: '', active: true });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Método</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Método</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Taxas</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
                    Nenhuma forma de pagamento encontrada.
                  </td>
                </tr>
              ) : (
                filteredMethods.map(method => (
                  <tr key={method.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                          <CreditCard size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-brand-text-main">{method.name}</span>
                          <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest">Tipo: {method.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {method.taxPercentage > 0 && (
                          <span className="text-xs font-bold text-brand-text-main/60">
                            {method.taxPercentage}%
                          </span>
                        )}
                        {method.taxFixed > 0 && (
                          <span className="text-xs font-bold text-brand-text-main/60">
                            R$ {method.taxFixed.toFixed(2)}
                          </span>
                        )}
                        {method.taxPercentage === 0 && method.taxFixed === 0 && (
                          <span className="text-xs text-brand-text-main/40 italic">Sem taxas</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        method.active ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {method.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(method)} 
                          className="p-2 text-brand-text-main/40 hover:text-brand-blue bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(method.id)} 
                          className="p-2 text-brand-text-main/40 hover:text-rose-500 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
