'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Users,
  User,
  Shield,
  Lock,
  Plus,
  Save,
  Edit3,
  Check,
  UserCheck,
  UserX,
  Key,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

const GLOBAL_PROFILES_MAP: Record<string, string> = {
  '00000000-0000-0000-0000-000000000000': 'Administrador',
  'f8ab109e-2361-4521-9e5e-0f57ea773b50': 'Caixa',
  '2c5c33b7-bfc3-46c6-a236-e7ef70906c19': 'Caixa',
  '825d7f60-4152-4597-862b-e00021de47b8': 'Caixa',
  'e962be8b-7f3f-4c86-a52a-eda3c7f3aff7': 'Gerente',
  'fd8c75ae-db58-40b2-b7e6-c9800d484caf': 'Financeiro',
};

export default function FuncionariosPage() {
  const { hasPermission } = useERP();
  const [activeTab, setActiveTab] = useState('funcionarios');

  if (!hasPermission('Cadastros', 'view')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-slate-600 mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'funcionarios', label: 'Funcionários', icon: Users },
    { id: 'usuarios', label: 'Usuários', icon: User },
    { id: 'perfis', label: 'Perfis de Acesso', icon: Shield },
    { id: 'permissoes', label: 'Permissões', icon: Lock },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-brand-bg min-h-screen">
      <div className="flex items-center gap-4">
        <Link href="/cadastros" className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-brand-blue">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Funcionários</h1>
          <p className="text-brand-blue/60 font-medium text-sm">Cadastro de equipe e permissões.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase italic text-xs transition-all whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                    : "text-brand-text-main/60 hover:bg-slate-50 hover:text-brand-blue"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden"
          >
            {activeTab === 'funcionarios' && <EmployeesSettings />}
            {activeTab === 'usuarios' && <UsersSettings />}
            {activeTab === 'perfis' && <ProfilesSettings />}
            {activeTab === 'permissoes' && <PermissionsSettings />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, action }: { title: string, description: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/30">
      <div>
        <h2 className="text-lg font-black text-brand-text-main uppercase italic">{title}</h2>
        <p className="text-xs font-bold text-brand-text-main/40 uppercase tracking-widest mt-1">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function InputGroup({ label, placeholder, type = "text", value, onChange, disabled = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function ToggleGroup({ label, description, defaultChecked = false, onChange }: any) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newValue = !checked;
    setChecked(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <div className="flex items-start justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-brand-blue/30 transition-all cursor-pointer" onClick={handleToggle}>
      <div className="space-y-1 pr-4">
        <h4 className="text-sm font-black text-brand-text-main uppercase italic leading-tight">{label}</h4>
        <p className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest leading-relaxed">{description}</p>
      </div>
      <div className={cn(
        "w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out shrink-0",
        checked ? "bg-brand-blue" : "bg-slate-200"
      )}>
        <div className={cn(
          "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out",
          checked ? "translate-x-6" : "translate-x-0"
        )} />
      </div>
    </div>
  );
}

function EmployeesSettings() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useERP();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    phone: '',
    role: '',
    admissionDate: '',
    salary: '',
    status: 'Ativo'
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEmployee(deleteConfirm.id);
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (emp: any) => {
    setFormData({
      fullName: emp.fullName,
      cpf: emp.cpf,
      phone: emp.phone || '',
      role: emp.role,
      admissionDate: emp.admissionDate,
      salary: emp.salary ? emp.salary.toString() : '',
      status: emp.status
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.cpf || !formData.role || !formData.admissionDate) {
      alert('Preencha os campos obrigatórios (Nome, CPF, Cargo, Data de Admissão)');
      return;
    }

    const payload = {
      fullName: formData.fullName,
      cpf: formData.cpf,
      phone: formData.phone,
      role: formData.role,
      admissionDate: formData.admissionDate,
      salary: formData.salary ? Number(formData.salary) : undefined,
      status: formData.status as 'Ativo' | 'Inativo'
    };

    if (editingId) {
      await updateEmployee({ id: editingId, ...payload });
    } else {
      await addEmployee(payload);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ fullName: '', cpf: '', phone: '', role: '', admissionDate: '', salary: '', status: 'Ativo' });
  };

  if (showForm) {
    return (
      <div className="divide-y divide-slate-100">
        <SectionHeader 
          title={editingId ? "Editar Funcionário" : "Novo Funcionário"} 
          description="Cadastro completo da pessoa física." 
          action={
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-xs font-black uppercase italic text-brand-text-main/40 hover:text-brand-text-main">
              Voltar
            </button>
          }
        />
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <InputGroup label="Nome Completo" placeholder="Ex: João da Silva" value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} />
            <InputGroup label="CPF" placeholder="000.000.000-00" value={formData.cpf} onChange={(e: any) => setFormData({...formData, cpf: e.target.value})} />
            <InputGroup label="Telefone" placeholder="(00) 00000-0000" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
            <InputGroup label="Cargo" placeholder="Ex: Vendedor" value={formData.role} onChange={(e: any) => setFormData({...formData, role: e.target.value})} />
            <InputGroup label="Data de Admissão" type="date" value={formData.admissionDate} onChange={(e: any) => setFormData({...formData, admissionDate: e.target.value})} />
            <InputGroup label="Salário Base (Opcional)" type="number" placeholder="R$ 0,00" value={formData.salary} onChange={(e: any) => setFormData({...formData, salary: e.target.value})} />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-end pt-4 md:pt-6 gap-3">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-3 rounded-2xl font-black uppercase italic text-sm text-brand-text-main/60 hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all">
              <Save size={18} />
              Salvar Funcionário
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Funcionários" 
        description="Gestão de colaboradores, cargos e comissões." 
        action={
          <button onClick={() => {
            setFormData({ fullName: '', cpf: '', phone: '', role: '', admissionDate: '', salary: '', status: 'Ativo' });
            setEditingId(null);
            setShowForm(true);
          }} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Plus size={16} />
            Novo Funcionário
          </button>
        }
      />
      <div className="p-6">
        {/* Mobile View */}
        <div className="md:hidden space-y-4 pb-4">
          {employees.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
              Nenhum funcionário cadastrado.
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    emp.status === 'Ativo' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    <User size={20} />
                  </div>
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-sm font-black text-brand-text-main truncate">{emp.fullName}</span>
                    <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest mt-0.5">CPF: {emp.cpf}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-brand-text-main/60 border-t border-slate-50 pt-3">
                  <span className="bg-slate-50/50 px-2 py-1 rounded-md">{emp.role}</span>
                  <span className="bg-slate-50/50 px-2 py-1 rounded-md">{new Date(emp.admissionDate).toLocaleDateString('pt-BR')}</span>
                  <span className={cn(
                    "px-2 py-1 rounded-md font-black uppercase",
                    emp.status === 'Ativo' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>{emp.status}</span>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                  <button 
                    onClick={() => handleEdit(emp)} 
                    className="p-2 text-brand-text-main/60 hover:text-brand-blue bg-slate-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(emp.id, emp.fullName)} 
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

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Cargo</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Admissão</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
                    Nenhum funcionário cadastrado.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-brand-text-main">{emp.fullName}</span>
                        <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest">CPF: {emp.cpf}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-brand-text-main/60">{emp.role}</td>
                    <td className="px-6 py-4 text-sm font-bold text-brand-text-main/60">{new Date(emp.admissionDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        emp.status === 'Ativo' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(emp)} 
                        className="p-2 text-brand-text-main/40 hover:text-brand-blue bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id, emp.fullName)} 
                        className="p-2 text-brand-text-main/40 hover:text-rose-500 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-md w-full p-5 sm:p-6 text-center space-y-4 sm:space-y-6"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base sm:text-lg font-black text-brand-text-main uppercase italic">Excluir Colaborador</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                Tem certeza que deseja excluir o funcionário <strong className="text-brand-text-main font-bold">"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-black uppercase italic text-xs transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl sm:rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-rose-500/20 transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function UsersSettings() {
  const { systemUsers, employees, accessProfiles, addSystemUser, updateSystemUser, deleteSystemUser, companySettings } = useERP();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    employeeId: '',
    profileId: '',
    storeId: 'Todas as Lojas',
    status: 'Ativo',
    password: '',
    confirmPassword: '',
    supervisorCode: '',
    userNumber: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, username: string } | null>(null);

  const handleDelete = (id: string, username: string) => {
    setDeleteConfirm({ id, username });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSystemUser(deleteConfirm.id);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (user: any) => {
    const currentProfileId = user.profileId || user.profile_id || '';
    const globalProfileName = currentProfileId ? (GLOBAL_PROFILES_MAP[currentProfileId.toLowerCase()] || null) : null;
    
    let matchedProfile = accessProfiles.find(p => p.id === currentProfileId);
    if (!matchedProfile && globalProfileName) {
      matchedProfile = accessProfiles.find(p => p.name?.trim()?.toLowerCase() === globalProfileName.toLowerCase());
    }

    let rawStoreId = user.storeId || user.store_id || 'Todas as Lojas';
    if (rawStoreId === 'Todas' || rawStoreId === 'todas' || rawStoreId === 'todas as lojas' || rawStoreId === 'Todas os Lojas') {
      rawStoreId = 'Todas as Lojas';
    }

    setFormData({
      username: user.username,
      email: user.email || '',
      employeeId: user.employeeId || user.employee_id || '',
      profileId: matchedProfile ? matchedProfile.id : currentProfileId,
      storeId: rawStoreId,
      status: user.status,
      password: '',
      confirmPassword: '',
      supervisorCode: user.supervisorCode || user.supervisor_code || '',
      userNumber: user.userNumber || ''
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.profileId) {
      alert('Preencha os campos obrigatórios (Nome de Usuário, Perfil)');
      return;
    }

    if (!editingId && (!formData.password || formData.password !== formData.confirmPassword)) {
      alert('As senhas não coincidem ou estão vazias.');
      return;
    }

    const payload = {
      username: formData.username,
      email: formData.email,
      employeeId: formData.employeeId || undefined,
      profileId: formData.profileId,
      storeId: formData.storeId,
      status: formData.status as 'Ativo' | 'Inativo',
      supervisorCode: `${formData.userNumber}|${formData.supervisorCode}`,
      userNumber: formData.userNumber
    };

    console.log('handleSave - editingId:', editingId);

    if (editingId) {
      if (formData.password && formData.password !== formData.confirmPassword) {
        alert('As senhas não coincidem.');
        return;
      }
      console.log('Calling updateSystemUser for ID:', editingId);
      await updateSystemUser({ id: editingId, ...payload }, formData.password || undefined);
    } else {
      console.log('Calling addSystemUser');
      await addSystemUser(payload, formData.password);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ username: '', email: '', employeeId: '', profileId: '', storeId: 'Todas as Lojas', status: 'Ativo', password: '', confirmPassword: '', supervisorCode: '', userNumber: '' });
  };

  if (showForm) {
    return (
      <div className="divide-y divide-slate-100">
        <SectionHeader 
          title={editingId ? "Editar Usuário" : "Novo Usuário"} 
          description="Crie credenciais de acesso e vincule a um funcionário." 
          action={
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-xs font-black uppercase italic text-brand-text-main/40 hover:text-brand-text-main">
              Voltar
            </button>
          }
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Vincular a Funcionário (Pessoa)</label>
              <select 
                value={formData.employeeId}
                onChange={e => setFormData({...formData, employeeId: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="">Selecione um funcionário...</option>
                {employees.length === 0 ? (
                  <option disabled>Nenhum funcionário cadastrado</option>
                ) : (
                  employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))
                )}
              </select>
            </div>
            <InputGroup label="Nome de Usuário (Login)" placeholder="Ex: joao.silva" value={formData.username} onChange={(e: any) => setFormData({...formData, username: e.target.value})} />
            <InputGroup label="E-mail (Opcional)" placeholder="Ex: joao@empresa.com" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
            <InputGroup label={editingId ? "Nova Senha (opcional)" : "Senha"} type="password" value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
            <InputGroup label={editingId ? "Confirmar Nova Senha" : "Confirmar Senha"} type="password" value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Perfil de Acesso (Cargo)</label>
              <select 
                value={formData.profileId}
                onChange={e => setFormData({...formData, profileId: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="">Selecione um perfil...</option>
                {accessProfiles.length === 0 ? (
                  <option disabled>Nenhum perfil encontrado</option>
                ) : (
                  accessProfiles.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Loja Permitida</label>
              <select 
                value={formData.storeId}
                onChange={e => setFormData({...formData, storeId: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="Todas as Lojas">Todas as Lojas</option>
                {companySettings?.tradeName && (
                  <option value={companySettings.tradeName}>{companySettings.tradeName}</option>
                )}
                {formData.storeId && formData.storeId !== 'Todas as Lojas' && formData.storeId !== companySettings?.tradeName && (
                  <option value={formData.storeId}>{formData.storeId}</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <InputGroup 
              label="Número do Usuário (Automático)" 
              value={formData.userNumber} 
              readOnly
              className="opacity-50 cursor-not-allowed"
            />
            <InputGroup 
              label="Código de Autorização PDV (PIN)" 
              placeholder="Ex: 1234" 
              value={formData.supervisorCode} 
              onChange={(e: any) => setFormData({...formData, supervisorCode: e.target.value})} 
            />
          </div>
          <div className="flex justify-end pt-6">
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all">
              <Save size={18} />
              Salvar Usuário
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeUsers = systemUsers.filter(u => u.status === 'Ativo').length;
  const blockedUsers = systemUsers.filter(u => u.status === 'Inativo').length;

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Usuários do Sistema" 
        description="Gestão de acessos, senhas e perfis." 
        action={
          <button onClick={() => {
            const maxNum = Math.max(0, ...systemUsers.map(u => parseInt(u.userNumber) || 0));
            setFormData({ username: '', email: '', employeeId: '', profileId: '', storeId: 'Todas as Lojas', status: 'Ativo', password: '', confirmPassword: '', supervisorCode: '', userNumber: (maxNum + 1).toString().padStart(3, '0') });
            setEditingId(null);
            setShowForm(true);
          }} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Plus size={16} />
            Novo Usuário
          </button>
        }
      />
      <div className="p-6 space-y-6">
        {/* Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Total Usuários</p>
              <p className="text-xl font-black text-brand-text-main">{systemUsers.length}</p>
            </div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Ativos</p>
              <p className="text-xl font-black text-emerald-600">{activeUsers}</p>
            </div>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <UserX size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest">Bloqueados</p>
              <p className="text-xl font-black text-rose-600">{blockedUsers}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Loja</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {systemUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm font-bold text-brand-text-main/40">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                systemUsers.map(user => {
                  const emp = employees.find(e => e.id === (user.employeeId || user.employee_id));
                  const currentProfileId = user.profileId || user.profile_id || '';
                  const globalProfileName = currentProfileId ? (GLOBAL_PROFILES_MAP[currentProfileId.toLowerCase()] || null) : null;
                  
                  let prof = accessProfiles.find(p => p.id === currentProfileId);
                  if (!prof && globalProfileName) {
                    prof = accessProfiles.find(p => p.name?.trim()?.toLowerCase() === globalProfileName.toLowerCase());
                  }
                  
                  const profName = prof ? prof.name : (globalProfileName || 'Sem Perfil');
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-brand-text-main">{user.username}</span>
                          <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest">{user.email || 'Sem e-mail'}</span>
                          <span className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest">{emp?.fullName || 'Não vinculado'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest">{profName}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-brand-text-main/60">
                        {(() => {
                          const displayStore = user.storeId || user.store_id || 'Todas as Lojas';
                          if (displayStore === 'Todas' || displayStore === 'todas' || displayStore === 'todas as lojas' || displayStore === 'Todas os Lojas') {
                            return 'Todas as Lojas';
                          }
                          return displayStore;
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          user.status === 'Ativo' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(user)} 
                          className="p-2 text-brand-text-main/40 hover:text-brand-blue bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id, user.username)} 
                          className="p-2 text-brand-text-main/40 hover:text-rose-500 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-md w-full p-5 sm:p-6 text-center space-y-4 sm:space-y-6"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-base sm:text-lg font-black text-brand-text-main uppercase italic">Excluir Login de Acesso</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
                Tem certeza que deseja excluir o usuário <strong className="text-brand-text-main font-bold">"{deleteConfirm.username}"</strong>? Esta ação removerá permanentemente suas credenciais de acesso.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-black uppercase italic text-xs transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl sm:rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-rose-500/20 transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ProfilesSettings() {
  const { accessProfiles, addAccessProfile, updateAccessProfile, deleteAccessProfile } = useERP();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleEdit = (profile: any) => {
    setFormData({
      name: profile.name,
      description: profile.description || ''
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('Preencha o nome do perfil');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description
    };

    if (editingId) {
      await updateAccessProfile({ id: editingId, ...payload });
    } else {
      await addAccessProfile(payload);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  if (showForm) {
    return (
      <div className="divide-y divide-slate-100">
        <SectionHeader 
          title={editingId ? "Editar Perfil" : "Novo Perfil"} 
          description="Crie e gerencie os níveis de acesso ao sistema." 
          action={
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-xs font-black uppercase italic text-brand-text-main/40 hover:text-brand-text-main">
              Voltar
            </button>
          }
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Nome do Perfil" placeholder="Ex: Vendedor" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
            <InputGroup label="Descrição" placeholder="Ex: Acesso restrito a vendas" value={formData.description} onChange={(e: any) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="flex justify-end pt-6">
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all">
              <Save size={18} />
              Salvar Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Perfis de Acesso" 
        description="Crie e gerencie os níveis de acesso ao sistema." 
        action={
          <button onClick={() => {
            setFormData({ name: '', description: '' });
            setEditingId(null);
            setShowForm(true);
          }} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-black uppercase italic text-xs shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Plus size={16} />
            Novo Perfil
          </button>
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accessProfiles.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-sm font-bold text-brand-text-main/40 border border-dashed border-slate-200 rounded-2xl">
              Nenhum perfil cadastrado.
            </div>
          ) : (
            accessProfiles.map((perfil) => (
              <div key={perfil.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-brand-blue transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-brand-blue/10 flex items-center justify-center text-brand-text-main/40 group-hover:text-brand-blue transition-all">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-brand-text-main uppercase italic">{perfil.name}</h4>
                    <p className="text-[10px] text-brand-text-main/40 font-bold uppercase tracking-widest mt-0.5">
                      {perfil.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleEdit(perfil)} className="text-brand-text-main/40 hover:text-brand-blue p-2">
                  <Edit3 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PermissionsSettings() {
  const { accessProfiles, permissions, updatePermissions } = useERP();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [currentPerms, setCurrentPerms] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const modules = ['Dashboard', 'Estoque', 'Financeiro', 'Vendas', 'Relatórios', 'Configurações', 'Clientes', 'Compras', 'Cadastros'];

  useEffect(() => {
    if (selectedProfileId) {
      const profilePerms = permissions.filter(p => p.profileId === selectedProfileId);
      const initialPerms = modules.map(mod => {
        const existing = profilePerms.find(p => p.module === mod);
        return existing || {
          module: mod,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false
        };
      });
      setCurrentPerms(initialPerms);
    } else {
      setCurrentPerms([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfileId, permissions]);

  const handleCheckboxChange = (moduleIndex: number, field: string, value: boolean) => {
    const newPerms = [...currentPerms];
    newPerms[moduleIndex] = { ...newPerms[moduleIndex], [field]: value };
    setCurrentPerms(newPerms);
  };

  const handleSave = async () => {
    if (!selectedProfileId) return;
    setIsSaving(true);
    await updatePermissions(selectedProfileId, currentPerms);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Permissões Detalhadas" 
        description="Controle granular de acesso por módulo e ações." 
      />
      <div className="p-6 space-y-8">
        <div className="max-w-xs space-y-1.5">
          <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Selecionar Perfil para Editar</label>
          <select 
            value={selectedProfileId}
            onChange={e => setSelectedProfileId(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
          >
            <option value="">Selecione um perfil...</option>
            {accessProfiles.map(prof => (
              <option key={prof.id} value={prof.id}>{prof.name}</option>
            ))}
          </select>
        </div>

        {selectedProfileId && (
          <>
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Módulo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Visualizar</th>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Criar</th>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Editar</th>
                    <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Excluir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentPerms.map((perm, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 text-sm font-black text-brand-text-main uppercase italic">{perm.module}</td>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={perm.canView} onChange={e => handleCheckboxChange(i, 'canView', e.target.checked)} className="w-4 h-4 accent-brand-blue cursor-pointer" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={perm.canCreate} onChange={e => handleCheckboxChange(i, 'canCreate', e.target.checked)} className="w-4 h-4 accent-brand-blue cursor-pointer" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={perm.canEdit} onChange={e => handleCheckboxChange(i, 'canEdit', e.target.checked)} className="w-4 h-4 accent-brand-blue cursor-pointer" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={perm.canDelete} onChange={e => handleCheckboxChange(i, 'canDelete', e.target.checked)} className="w-4 h-4 accent-brand-blue cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2 flex items-center gap-2">
                <Key size={14} /> Permissões Especiais (Nível ERP)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleGroup label="Aprovação para Ajustes de Estoque" description="Exige senha de gerente para efetivar divergências." defaultChecked />
                <ToggleGroup label="Aprovação para Cancelamento" description="Exige senha de gerente para cancelar vendas." defaultChecked />
                <ToggleGroup label="Permissão por Loja" description="Restringe o usuário apenas à loja vinculada." defaultChecked />
                <ToggleGroup label="Bloqueio por IP" description="Permite acesso apenas da rede da empresa." />
                <ToggleGroup label="Registro de Logs" description="Grava histórico de 'quem fez o quê' no sistema." defaultChecked />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className={cn(
                "flex items-center gap-2 text-brand-blue font-black uppercase italic text-xs transition-all duration-500",
                showSuccess ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
              )}>
                <Check size={16} className="bg-brand-border rounded-full p-0.5" />
                Permissões salvas!
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                  isSaving ? "bg-brand-text-sec" : "bg-brand-blue shadow-brand-blue/20 hover:bg-brand-text-main"
                )}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Permissões
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
