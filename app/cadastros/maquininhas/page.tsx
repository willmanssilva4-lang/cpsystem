'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Save, CreditCard, Percent, Smartphone } from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Maquininha } from '@/lib/types';

export default function MaquininhasPage() {
  const { maquininhas, addMaquininha, updateMaquininha, deleteMaquininha, hasPermission } = useERP();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    taxa_debito: '',
    taxa_credito: '',
    taxa_credito_parcelado: '',
    ativo: true
  });

  if (!hasPermission('Cadastros', 'view')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-slate-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const filteredMaquininhas = maquininhas.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (maquininha: Maquininha) => {
    setFormData({
      nome: maquininha.nome,
      taxa_debito: (maquininha.taxa_debito || 0).toString(),
      taxa_credito: (maquininha.taxa_credito || 0).toString(),
      taxa_credito_parcelado: (maquininha.taxa_credito_parcelado || 0).toString(),
      ativo: maquininha.ativo
    });
    setEditingId(maquininha.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta maquininha?')) {
      await deleteMaquininha(id);
    }
  };

  const handleSave = async () => {
    if (!formData.nome) {
      alert('Preencha o nome da maquininha');
      return;
    }

    const payload = {
      nome: formData.nome,
      taxa_debito: Number(formData.taxa_debito) || 0,
      taxa_credito: Number(formData.taxa_credito) || 0,
      taxa_credito_parcelado: Number(formData.taxa_credito_parcelado) || 0,
      ativo: formData.ativo
    };

    if (editingId) {
      await updateMaquininha({ id: editingId, ...payload } as Maquininha);
    } else {
      await addMaquininha(payload);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ nome: '', taxa_debito: '', taxa_credito: '', taxa_credito_parcelado: '', ativo: true });
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
              {editingId ? 'Editar Maquininha' : 'Nova Maquininha'}
            </h1>
            <p className="text-brand-blue/60 font-medium text-sm">Configure as taxas da maquininha de cartão.</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Nome da Maquininha</label>
                <input 
                  type="text"
                  placeholder="Ex: Stone, PagSeguro, Cielo"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Taxa Débito (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_debito}
                    onChange={e => setFormData({...formData, taxa_debito: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Taxa Crédito à Vista (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_credito}
                    onChange={e => setFormData({...formData, taxa_credito: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Taxa Crédito Parcelado (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.taxa_credito_parcelado}
                    onChange={e => setFormData({...formData, taxa_credito_parcelado: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Status</label>
                <select 
                  value={formData.ativo ? 'true' : 'false'}
                  onChange={e => setFormData({...formData, ativo: e.target.value === 'true'})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all"
              >
                <Save size={18} />
                Salvar Maquininha
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
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Maquininhas de Cartão</h1>
            <p className="text-brand-blue/60 font-medium text-sm">Gerencie as taxas das operadoras de cartão.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={18} />
            <input 
              type="text"
              placeholder="Buscar maquininha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ nome: '', taxa_debito: '', taxa_credito: '', taxa_credito_parcelado: '', ativo: true });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nova Maquininha</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Maquininha</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Taxa Débito</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Taxa Crédito</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Taxa Parcelado</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMaquininhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
                    Nenhuma maquininha encontrada.
                  </td>
                </tr>
              ) : (
                filteredMaquininhas.map(maquininha => (
                  <tr key={maquininha.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                          <Smartphone size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-brand-text-main">{maquininha.nome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-text-main/60">{maquininha.taxa_debito}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-text-main/60">{maquininha.taxa_credito}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-text-main/60">{maquininha.taxa_credito_parcelado}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        maquininha.ativo ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {maquininha.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(maquininha)} 
                          className="p-2 text-brand-text-main/40 hover:text-brand-blue bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(maquininha.id)} 
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
