'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, Phone, Mail, FileText, Trash2 } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CustomerModalProps {
  onClose: () => void;
  customerToEdit?: Customer;
}

export function CustomerModal({ onClose, customerToEdit }: CustomerModalProps) {
  const { addCustomer, updateCustomer, deleteCustomer, user } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    status: 'Ativo' as 'Ativo' | 'Inativo' | 'VIP' | 'Em Débito',
    image: '',
    isClubMember: false,
    clubJoinDate: ''
  });

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name,
        document: customerToEdit.document,
        phone: customerToEdit.phone,
        email: customerToEdit.email,
        status: customerToEdit.status,
        image: customerToEdit.image || '',
        isClubMember: customerToEdit.isClubMember || false,
        clubJoinDate: customerToEdit.clubJoinDate || ''
      });
    }
  }, [customerToEdit]);

  const handleDelete = async () => {
    if (!customerToEdit) return;
    
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToEdit.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cliente.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.name) throw new Error('O nome é obrigatório.');
      if (!formData.document) throw new Error('O CPF/CNPJ é obrigatório.');

      const customerData = {
        ...formData,
        companyId: user?.companyId || '',
        totalSpent: customerToEdit?.totalSpent || 0,
        clubJoinDate: formData.isClubMember && !formData.clubJoinDate ? new Date().toISOString() : formData.clubJoinDate
      };

      if (customerToEdit) {
        await updateCustomer({ ...customerData, id: customerToEdit.id } as Customer);
      } else {
        await addCustomer({ ...customerData, id: crypto.randomUUID() } as Customer);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-brand-card border border-brand-border rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-bg/50">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-brand-text-main flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
              <User size={20} />
            </div>
            {customerToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase italic flex items-center gap-3 border border-rose-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-text-sec flex items-center gap-1.5 ml-1">
                <User size={12} /> Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                className="w-full h-12 px-5 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-slate-300"
                placeholder="Ex: JOÃO SILVA"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-text-sec flex items-center gap-1.5 ml-1">
                <FileText size={12} /> CPF / CNPJ
              </label>
              <input
                type="text"
                required
                value={formData.document}
                onChange={e => setFormData(prev => ({ ...prev, document: e.target.value.toUpperCase() }))}
                className="w-full h-12 px-5 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-slate-300"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-text-sec flex items-center gap-1.5 ml-1">
                <Phone size={12} /> Telefone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value.toUpperCase() }))}
                className="w-full h-12 px-5 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-slate-300"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-text-sec flex items-center gap-1.5 ml-1">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value.toUpperCase() }))}
                className="w-full h-12 px-5 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all placeholder:text-slate-300"
                placeholder="JOAO@EMAIL.COM"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-text-sec ml-1">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Ativo', 'Inativo', 'VIP', 'Em Débito'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                    className={cn(
                      "h-12 rounded-xl text-[10px] font-black uppercase tracking-widest italic border transition-all",
                      formData.status === status 
                        ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20" 
                        : "bg-brand-bg text-slate-500 border-brand-border hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 p-5 bg-brand-blue/5 rounded-2xl border border-brand-blue/10">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase italic tracking-tight text-brand-blue">Cliente Clube</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase italic">Programa de fidelidade</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isClubMember: !prev.isClubMember }))}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                    formData.isClubMember ? "bg-brand-blue" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                      formData.isClubMember ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-3 border-t border-brand-border">
            {customerToEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="h-14 px-6 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 bg-brand-bg text-brand-text-sec rounded-2xl font-black text-xs uppercase tracking-widest italic hover:bg-slate-100 transition-all border border-brand-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-2 h-14 px-8 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest italic hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-blue/20"
            >
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Cadastro'}
            </button>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-2">Excluir Cliente</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Tem certeza que deseja excluir este cliente? Esta ação removerá permanentemente os dados do cadastro.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
