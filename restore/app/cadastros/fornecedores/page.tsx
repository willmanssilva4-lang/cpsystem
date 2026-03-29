'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Save, Building2, MapPin, Phone, Mail } from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Supplier } from '@/lib/types';

export default function FornecedoresPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, hasPermission } = useERP();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: ''
  });

  if (!hasPermission('Cadastros', 'view')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-slate-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.document.includes(search)
  );

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      document: supplier.document,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      await deleteSupplier(id);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.document) {
      alert('Preencha os campos obrigatórios (Nome e CNPJ/CPF)');
      return;
    }

    const payload = {
      name: formData.name,
      document: formData.document,
      phone: formData.phone,
      email: formData.email,
      address: formData.address
    };

    if (editingId) {
      await updateSupplier({ id: editingId, ...payload });
    } else {
      await addSupplier(payload as any);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', document: '', phone: '', email: '', address: '' });
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
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h1>
            <p className="text-brand-blue/60 font-medium text-sm">Preencha os dados do fornecedor.</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Razão Social / Nome</label>
                <input 
                  type="text"
                  placeholder="Ex: Distribuidora XYZ Ltda"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">CNPJ / CPF</label>
                <input 
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.document}
                  onChange={e => setFormData({...formData, document: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Telefone</label>
                <input 
                  type="text"
                  placeholder="(00) 0000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">E-mail</label>
                <input 
                  type="email"
                  placeholder="contato@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Endereço Completo</label>
                <input 
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all"
              >
                <Save size={18} />
                Salvar Fornecedor
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
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Fornecedores</h1>
            <p className="text-brand-blue/60 font-medium text-sm">Gerencie seus fornecedores.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/40" size={18} />
            <input 
              type="text"
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ name: '', document: '', phone: '', email: '', address: '' });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Fornecedor</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Contato</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Endereço</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-brand-text-main">{supplier.name}</span>
                          <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest">CNPJ/CPF: {supplier.document}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-text-main/60">
                            <Phone size={12} />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-text-main/60">
                            <Mail size={12} />
                            {supplier.email}
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-xs text-brand-text-main/40 italic">Sem contato</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1.5 text-xs font-bold text-brand-text-main/60 max-w-xs">
                        {supplier.address ? (
                          <>
                            <MapPin size={14} className="shrink-0 mt-0.5" />
                            <span className="truncate">{supplier.address}</span>
                          </>
                        ) : (
                          <span className="text-brand-text-main/40 italic">Não informado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(supplier)} 
                          className="p-2 text-brand-text-main/40 hover:text-brand-blue bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)} 
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
