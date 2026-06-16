'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Save, Building2, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Supplier } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function FornecedoresPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, hasPermission } = useERP();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
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

  const formatDocument = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return digits
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const fetchCnpjData = async (cnpjInput: string) => {
    const cleanCnpj = cnpjInput.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      alert('Por favor, informe um CNPJ com 14 dígitos para buscar.');
      return;
    }
    
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!res.ok) {
        throw new Error('Erro na consulta do CNPJ');
      }
      
      const data = await res.json();
      
      const companyName = data.razao_social || '';
      const brandName = data.nome_fantasia || '';
      const emailVal = data.email || '';
      
      let phoneVal = '';
      if (data.ddd_telefone_1) {
        const rawPhone = data.ddd_telefone_1.replace(/\D/g, '');
        if (rawPhone.length === 10) {
          phoneVal = `(${rawPhone.slice(0, 2)}) ${rawPhone.slice(2, 6)}-${rawPhone.slice(6)}`;
        } else if (rawPhone.length === 11) {
          phoneVal = `(${rawPhone.slice(0, 2)}) ${rawPhone.slice(2, 7)}-${rawPhone.slice(7)}`;
        } else {
          phoneVal = rawPhone;
        }
      }
      
      let fullAddress = '';
      if (data.logradouro) {
        fullAddress = `${data.logradouro}`;
        if (data.numero) fullAddress += `, ${data.numero}`;
        if (data.bairro) fullAddress += `, ${data.bairro}`;
        if (data.municipio && data.uf) fullAddress += `, ${data.municipio} - ${data.uf}`;
        if (data.cep) fullAddress += ` (CEP: ${data.cep})`;
      }
      
      setFormData(prev => ({
        ...prev,
        name: companyName ? companyName.toUpperCase() : prev.name,
        tradeName: brandName ? brandName.toUpperCase() : prev.tradeName,
        phone: phoneVal ? phoneVal.toUpperCase() : prev.phone,
        email: emailVal ? emailVal.toUpperCase() : prev.email,
        address: fullAddress ? fullAddress.toUpperCase() : prev.address
      }));
      
    } catch (err) {
      console.error(err);
      
      // Fallback API
      try {
        const resFallback = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
        if (resFallback.ok) {
          const dataFb = await resFallback.json();
          const companyName = dataFb.razao_social || '';
          const brandName = dataFb.estabelecimento?.nome_fantasia || '';
          const emailVal = dataFb.estabelecimento?.email || '';
          let phoneVal = '';
          const ddd = dataFb.estabelecimento?.ddd1 || '';
          const tel = dataFb.estabelecimento?.telefone1 || '';
          if (ddd && tel) phoneVal = `(${ddd}) ${tel}`;
          
          let fullAddress = '';
          const est = dataFb.estabelecimento;
          if (est?.logradouro) {
            fullAddress = `${est.logradouro}`;
            if (est.numero) fullAddress += `, ${est.numero}`;
            if (est.bairro) fullAddress += `, ${est.bairro}`;
            if (est.cidade?.nome && est.estado?.sigla) {
              fullAddress += `, ${est.cidade.nome} - ${est.estado.sigla}`;
            }
          }
          
          setFormData(prev => ({
            ...prev,
            name: companyName ? companyName.toUpperCase() : prev.name,
            tradeName: brandName ? brandName.toUpperCase() : prev.tradeName,
            phone: phoneVal ? phoneVal.toUpperCase() : prev.phone,
            email: emailVal ? emailVal.toUpperCase() : prev.email,
            address: fullAddress ? fullAddress.toUpperCase() : prev.address
          }));
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
      
      alert('Não foi possível recuperar os dados do CNPJ automaticamente. Por favor, preencha manualmente.');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.document.includes(search)
  );

  const handleEdit = (supplier: Supplier) => {
    let nameVal = supplier.name;
    let tradeVal = '';
    if (supplier.name.includes(' | ')) {
      const parts = supplier.name.split(' | ');
      nameVal = parts[0];
      tradeVal = parts[1];
    }
    setFormData({
      name: nameVal,
      tradeName: tradeVal,
      document: supplier.document,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setSupplierToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      await deleteSupplier(supplierToDelete);
      setSupplierToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.document) {
      alert('Preencha os campos obrigatórios (Razão Social e CNPJ/CPF)');
      return;
    }

    const payloadName = formData.tradeName 
      ? `${formData.name} | ${formData.tradeName}` 
      : formData.name;

    const payload = {
      name: payloadName.toUpperCase(),
      document: formData.document,
      phone: formData.phone,
      email: formData.email,
      address: formData.address
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateSupplier({ id: editingId, ...payload } as any);
      } else {
        await addSupplier(payload as any);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', tradeName: '', document: '', phone: '', email: '', address: '' });
    } catch (err: any) {
      console.error(err);
      if (err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('violates unique constraint')) {
        alert('Este CNPJ/CPF já está cadastrado para outro fornecedor neste estabelecimento!');
      } else {
        alert(`Erro ao salvar fornecedor: ${err?.message || 'Erro desconhecido'}`);
      }
    } finally {
      setSaving(false);
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
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h1>
            <p className="text-brand-blue/60 font-medium text-sm">Preencha os dados do fornecedor.</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">CNPJ / CPF</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.document}
                    onChange={e => setFormData({...formData, document: formatDocument(e.target.value)})}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                  />
                  {formData.document.replace(/\D/g, '').length === 14 && (
                    <button
                      type="button"
                      onClick={() => fetchCnpjData(formData.document)}
                      disabled={loadingCnpj}
                      className="px-5 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic text-xs tracking-wider shadow-md shadow-brand-blue/15 hover:bg-brand-text-main disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                      {loadingCnpj ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search size={14} />
                          <span>Buscar CNPJ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {formData.document.replace(/\D/g, '').length === 14 && !loadingCnpj && (
                  <p className="text-[10px] text-brand-green font-bold tracking-wide italic ml-1">✓ CNPJ válido. Clique no botão acima para consultar e preencher automaticamente.</p>
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Razão Social / Nome completo *</label>
                <input 
                  type="text"
                  placeholder="Ex: Distribuidora XYZ Ltda"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Nome Fantasia</label>
                <input 
                  type="text"
                  placeholder="Ex: Supermercado do João"
                  value={formData.tradeName}
                  onChange={e => setFormData({...formData, tradeName: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Telefone</label>
                <input 
                  type="text"
                  placeholder="(00) 0000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">E-mail</label>
                <input 
                  type="email"
                  placeholder="contato@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Endereço Completo</label>
                <input 
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover disabled:bg-slate-300 disabled:shadow-none transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Fornecedor</span>
                  </>
                )}
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
              setFormData({ name: '', tradeName: '', document: '', phone: '', email: '', address: '' });
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
        <div className="md:hidden space-y-4 pb-4">
          {filteredSuppliers.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
              Nenhum fornecedor encontrado.
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div className="flex flex-col flex-grow min-w-0">
                    {(() => {
                      const hasTrade = supplier.name.includes(' | ');
                      const parts = supplier.name.split(' | ');
                      const mainName = hasTrade ? parts[1] : supplier.name;
                      const subName = hasTrade ? parts[0] : '';
                      return (
                        <>
                          <span className="text-sm font-black text-brand-text-main truncate">{mainName}</span>
                          {subName && (
                            <span className="text-xs text-brand-text-main/50 font-bold italic truncate">{subName}</span>
                          )}
                        </>
                      );
                    })()}
                    <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest mt-0.5">CNPJ/CPF: {supplier.document}</span>
                  </div>
                </div>

                {/* Contato e Endereço inline no card mobile */}
                <div className="space-y-2 border-t border-slate-50 pt-3">
                    {supplier.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-text-main/60">
                            <Phone size={14} className="shrink-0" />
                            <span className="truncate">{supplier.phone}</span>
                        </div>
                    )}
                    {supplier.email && (
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-text-main/60">
                            <Mail size={14} className="shrink-0" />
                            <span className="truncate">{supplier.email}</span>
                        </div>
                    )}
                    {supplier.address && (
                        <div className="flex items-start gap-2 text-xs font-bold text-brand-text-main/60">
                            <MapPin size={14} className="shrink-0 mt-0.5" />
                            <span className="leading-tight">{supplier.address}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                  <button 
                    onClick={() => handleEdit(supplier)} 
                    className="p-2 text-brand-text-main/60 hover:text-brand-blue bg-slate-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.id)} 
                    className="p-2 text-brand-text-main/60 hover:text-rose-500 bg-slate-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                          {(() => {
                            const hasTrade = supplier.name.includes(' | ');
                            const parts = supplier.name.split(' | ');
                            const mainName = hasTrade ? parts[1] : supplier.name;
                            const subName = hasTrade ? parts[0] : '';
                            return (
                              <>
                                <span className="text-sm font-black text-brand-text-main">{mainName}</span>
                                {subName && (
                                  <span className="text-xs text-brand-text-main/50 font-bold italic">{subName}</span>
                                )}
                              </>
                            );
                          })()}
                          <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest mt-0.5">CNPJ/CPF: {supplier.document}</span>
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

      {/* Centered Exclusion Confirmation Modal */}
      <AnimatePresence>
        {supplierToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-brand-border p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative z-50 animate-in zoom-in-95 duration-150"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                <AlertTriangle size={28} />
              </div>

              <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-2">
                Excluir Fornecedor
              </h3>

              <p className="text-xs text-brand-text-main/70 font-bold uppercase tracking-wide leading-relaxed mb-6">
                Tem certeza que deseja excluir este fornecedor?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setSupplierToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 border border-slate-200/50"
                >
                  Não, Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase italic tracking-wider transition-all shadow-md shadow-rose-600/10 active:scale-95"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
