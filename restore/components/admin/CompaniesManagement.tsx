'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Building,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useERP } from '@/lib/context';
import { Company } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CompaniesManagementProps {
  isModal?: boolean;
  onClose?: () => void;
}

export function CompaniesManagement({ isModal, onClose }: CompaniesManagementProps) {
  const { user } = useERP();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    companyDocument: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    status: 'Ativo'
  });

  const isSuperAdmin = user?.email?.toLowerCase() === 'willmanssilva4@gmail.com';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        console.error('Failed to fetch companies');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const url = '/api/admin/companies';
      const method = editingCompany ? 'PUT' : 'POST';
      const body = editingCompany 
        ? JSON.stringify({
            id: editingCompany.id,
            name: formData.companyName,
            document: formData.companyDocument,
            status: formData.status
          })
        : JSON.stringify(formData);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingCompany ? 'Empresa atualizada com sucesso!' : 'Empresa e administrador criados com sucesso!');
        setFormData({
          companyName: '',
          companyDocument: '',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          status: 'Ativo'
        });
        fetchCompanies();
        setTimeout(() => {
          setIsFormModalOpen(false);
          setEditingCompany(null);
          setSuccess(null);
        }, 2000);
      } else {
        setError(data.error || (editingCompany ? 'Erro ao atualizar empresa' : 'Erro ao criar empresa'));
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!companyToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/companies?id=${companyToDelete}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchCompanies();
        setIsDeleteModalOpen(false);
        setCompanyToDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao excluir empresa');
      }
    } catch (err) {
      alert('Erro de conexão ao excluir empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document?.includes(searchTerm)
  );

  const content = (
    <div className={cn("space-y-8", isModal ? "p-0" : "p-8 max-w-7xl mx-auto")}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Empresas</h1>
          <p className="text-slate-500">Gerencie os tenants e administradores do sistema multi-empresa.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-support transition-all active:scale-95"
          >
            <Plus size={20} />
            Nova Empresa
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Stats/Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total de Empresas</p>
              <h3 className="text-2xl font-bold text-slate-900">{companies.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Empresas Ativas</p>
              <h3 className="text-2xl font-bold text-slate-900">{companies.filter(c => c.status === 'Ativo').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Aguardando Configuração</p>
              <h3 className="text-2xl font-bold text-slate-900">0</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-6 border-bottom border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Criada em</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-brand-blue mb-2" size={32} />
                    <p className="text-slate-500">Carregando empresas...</p>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Building className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-500">Nenhuma empresa encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue font-bold">
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{company.name}</p>
                          <p className="text-xs text-slate-500">{company.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {company.document || '---'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        company.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === company.id ? null : company.id);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === company.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingCompany(company);
                                setFormData({
                                  ...formData,
                                  companyName: company.name,
                                  companyDocument: company.document || '',
                                  status: company.status || 'Ativo'
                                });
                                setIsFormModalOpen(true);
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-blue transition-colors text-left"
                            >
                              Editar Empresa
                            </button>
                            <button
                              onClick={() => {
                                setCompanyToDelete(company.id);
                                setIsDeleteModalOpen(true);
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                            >
                              Excluir Empresa
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsFormModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h2>
                    <p className="text-sm text-slate-500">{editingCompany ? 'Atualize os dados da empresa.' : 'Cadastre uma nova empresa e seu administrador.'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingCompany(null);
                  }}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 size={20} />
                    {success}
                  </div>
                )}

                <div className={`grid grid-cols-1 ${editingCompany ? '' : 'md:grid-cols-2'} gap-6`}>
                  {/* Company Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={16} />
                      Dados da Empresa
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nome da Empresa</label>
                        <input
                          required
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          placeholder="Ex: Supermercado Central"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">CNPJ / CPF</label>
                        <input
                          type="text"
                          value={formData.companyDocument}
                          onChange={(e) => setFormData({...formData, companyDocument: e.target.value})}
                          placeholder="00.000.000/0001-00"
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                        />
                      </div>
                      {editingCompany && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                          >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Info */}
                  {!editingCompany && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <UserPlus size={16} />
                        Administrador Master
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">Nome do Admin</label>
                          <input
                            required
                            type="text"
                            value={formData.adminName}
                            onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                            placeholder="Nome completo"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">E-mail de Acesso</label>
                          <input
                            required
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                            placeholder="admin@empresa.com"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-slate-700 ml-1">Senha Inicial</label>
                          <input
                            required
                            type="password"
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-brand-blue focus:bg-white transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormModalOpen(false);
                      setEditingCompany(null);
                    }}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-brand-blue text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-support transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {editingCompany ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingCompany ? 'Salvar Alterações' : 'Confirmar Cadastro'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Tem certeza?</h2>
              <p className="text-slate-500 mb-8">
                Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita e removerá todos os dados associados.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-y-auto custom-scrollbar p-8"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
}
