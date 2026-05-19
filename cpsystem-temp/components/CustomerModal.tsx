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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <User className="text-brand-blue" size={24} />
            {customerToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User size={12} /> Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} /> CPF / CNPJ
              </label>
              <input
                type="text"
                required
                value={formData.document}
                onChange={e => setFormData(prev => ({ ...prev, document: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Phone size={12} /> Telefone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                placeholder="joao@email.com"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status do Cliente</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Ativo', 'Inativo', 'VIP', 'Em Débito'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status }))}
                    className={cn(
                      "h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      formData.status === status 
                        ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20" 
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 md:col-span-2 p-4 bg-brand-blue/5 dark:bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase italic tracking-tight text-brand-blue">Cliente Clube</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Participa do programa de fidelidade</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isClubMember: !prev.isClubMember }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    formData.isClubMember ? "bg-brand-blue" : "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formData.isClubMember ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              {formData.isClubMember && formData.clubJoinDate && (
                <div className="mt-2 pt-2 border-t border-brand-blue/10">
                  <p className="text-[10px] text-brand-blue font-bold uppercase tracking-wider">
                    Membro desde: {new Date(formData.clubJoinDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex gap-3 border-t border-slate-100 dark:border-slate-800">
            {customerToEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="h-12 px-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-2 h-12 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-blue/20"
            >
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
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
