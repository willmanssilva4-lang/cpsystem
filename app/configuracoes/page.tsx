'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  User, 
  Printer, 
  Database, 
  Bell, 
  Shield, 
  Save,
  Image as ImageIcon,
  Smartphone,
  Globe,
  CreditCard,
  Calculator,
  Percent,
  Edit3,
  Sparkles,
  Check,
  Users,
  Lock,
  Plus,
  Search,
  MoreVertical,
  Activity,
  UserCheck,
  UserX,
  Key
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { hasPermission } = useERP();
  const [activeTab, setActiveTab] = useState('empresa');

  if (!hasPermission('Configurações', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Settings size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar as Configurações.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'funcionarios', label: 'Funcionários', icon: Users },
    { id: 'usuarios', label: 'Usuários', icon: User },
    { id: 'perfis', label: 'Perfis de Acesso', icon: Shield },
    { id: 'permissoes', label: 'Permissões', icon: Lock },
    { id: 'sistema', label: 'Config. do Sistema', icon: Settings },
  ];

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Configurações</h2>
        <p className="text-brand-blue/60 font-medium">Gerencie as preferências do sistema, usuários e permissões.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Navegação das Configurações */}
        <div className="lg:w-64 flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-black uppercase italic tracking-tight text-left ${
                activeTab === tab.id 
                  ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                  : "text-brand-text-main/60 hover:bg-slate-50 hover:text-brand-text-main"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="flex-1 max-w-5xl">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden"
          >
            {activeTab === 'empresa' && <CompanySettings />}
            {activeTab === 'funcionarios' && <EmployeesSettings />}
            {activeTab === 'usuarios' && <UsersSettings />}
            {activeTab === 'perfis' && <ProfilesSettings />}
            {activeTab === 'permissoes' && <PermissionsSettings />}
            {activeTab === 'sistema' && <SystemSettings />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, action }: { title: string, description: string, action?: React.ReactNode }) {
  return (
    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-black italic uppercase text-brand-text-main">{title}</h3>
        <p className="text-xs font-medium text-brand-blue/60 mt-1">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function InputGroup({ label, placeholder, type = "text", defaultValue, value, onChange }: { label: string, placeholder?: string, type?: string, defaultValue?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all placeholder:text-brand-text-main/20"
      />
    </div>
  );
}

function SelectGroup({ label, options }: { label: string, options: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">{label}</label>
      <select className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all">
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function ToggleGroup({ label, description, defaultChecked = false, onChange }: { label: string, description: string, defaultChecked?: boolean, onChange?: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50/50 transition-colors border border-transparent hover:border-slate-100">
      <div className="space-y-0.5 pr-4">
        <p className="text-sm font-black text-brand-text-main uppercase italic">{label}</p>
        <p className="text-xs text-brand-blue/60 font-medium">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" defaultChecked={defaultChecked} onChange={e => onChange?.(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
      </label>
    </div>
  );
}

function CompanySettings() {
  const { companySettings, updateCompanySettings } = useERP();
  const [formData, setFormData] = useState(companySettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        updateCompanySettings(formData);
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Erro ao salvar:', error);
        setIsSaving(false);
        alert('❌ Erro ao salvar as configurações.');
      }
    }, 600);
  };

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Informações da Empresa" 
        description="Dados cadastrais que aparecerão nos recibos e relatórios." 
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <InputGroup 
              label="Nome Fantasia" 
              value={formData.tradeName} 
              onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))} 
            />
            <InputGroup 
              label="Razão Social" 
              value={formData.legalName} 
              onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))} 
            />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="CNPJ" 
                value={formData.cnpj} 
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))} 
              />
              <InputGroup 
                label="Inscrição Estadual" 
                value={formData.stateRegistration} 
                onChange={(e) => setFormData(prev => ({ ...prev, stateRegistration: e.target.value }))} 
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-2">
            <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Logo da Empresa</label>
            <div className="aspect-square rounded-3xl border-2 border-dashed border-brand-border bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-brand-border/50 transition-colors group">
              <ImageIcon className="text-brand-border group-hover:text-brand-blue-hover transition-colors" size={32} />
              <span className="text-[10px] font-black text-brand-text-sec uppercase italic">Alterar Logo</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputGroup 
                label="Logradouro" 
                value={formData.address.street} 
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))} 
              />
            </div>
            <InputGroup 
              label="Número" 
              value={formData.address.number} 
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, number: e.target.value } }))} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputGroup 
              label="Bairro" 
              value={formData.address.neighborhood} 
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, neighborhood: e.target.value } }))} 
            />
            <InputGroup 
              label="Cidade" 
              value={formData.address.city} 
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))} 
            />
            <InputGroup 
              label="Estado" 
              value={formData.address.state} 
              onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))} 
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-6">
          <div className={cn(
            "flex items-center gap-2 text-brand-blue font-black uppercase italic text-xs transition-all duration-500",
            showSuccess ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          )}>
            <Check size={16} className="bg-brand-border rounded-full p-0.5" />
            Configurações salvas!
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
                Salvar Alterações
              </>
            )}
          </button>
        </div>
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
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Nome Completo" placeholder="Ex: João da Silva" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            <InputGroup label="CPF" placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
            <InputGroup label="Telefone" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <InputGroup label="Cargo" placeholder="Ex: Vendedor" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
            <InputGroup label="Data de Admissão" type="date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
            <InputGroup label="Salário Base (Opcional)" type="number" placeholder="R$ 0,00" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
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
          <div className="flex justify-end pt-6">
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-hover transition-all">
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
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
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
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(emp)} className="p-2 text-brand-text-main/40 hover:text-brand-blue transition-all">
                        <Edit3 size={16} />
                      </button>
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

function UsersSettings() {
  const { systemUsers, employees, accessProfiles, addSystemUser, updateSystemUser, deleteSystemUser } = useERP();
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
    supervisorCode: ''
  });

  const handleEdit = (user: any) => {
    setFormData({
      username: user.username,
      email: user.email || '',
      employeeId: user.employeeId || '',
      profileId: user.profileId || '',
      storeId: user.storeId || 'Todas as Lojas',
      status: user.status,
      password: '',
      confirmPassword: '',
      supervisorCode: user.supervisorCode || ''
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
      supervisorCode: formData.supervisorCode
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
    setFormData({ username: '', email: '', employeeId: '', profileId: '', storeId: 'Todas as Lojas', status: 'Ativo', password: '', confirmPassword: '', supervisorCode: '' });
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
            <InputGroup label="Nome de Usuário (Login)" placeholder="Ex: joao.silva" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            <InputGroup label="E-mail (Opcional)" placeholder="Ex: joao@empresa.com" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <InputGroup label={editingId ? "Nova Senha (opcional)" : "Senha"} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <InputGroup label={editingId ? "Confirmar Nova Senha" : "Confirmar Senha"} type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
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
                <option value="Loja Principal">Loja Principal</option>
                <option value="Filial Centro">Filial Centro</option>
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
              label="Código de Autorização PDV (PIN)" 
              placeholder="Ex: 1234" 
              value={formData.supervisorCode} 
              onChange={e => setFormData({...formData, supervisorCode: e.target.value})} 
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
            setFormData({ username: '', email: '', employeeId: '', profileId: '', storeId: 'Todas as Lojas', status: 'Ativo', password: '', confirmPassword: '', supervisorCode: '' });
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
                  const emp = employees.find(e => e.id === user.employeeId);
                  const prof = accessProfiles.find(p => p.id === user.profileId);
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
                        <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest">{prof?.name || 'Sem Perfil'}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-brand-text-main/60">{user.storeId || 'Todas'}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          user.status === 'Ativo' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEdit(user)} className="p-2 text-brand-text-main/40 hover:text-brand-blue transition-all">
                          <Edit3 size={16} />
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
            <InputGroup label="Nome do Perfil" placeholder="Ex: Vendedor" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <InputGroup label="Descrição" placeholder="Ex: Acesso restrito a vendas" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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

function SystemSettings() {
  const { systemSettings, updateSystemSettings } = useERP();
  const [formData, setFormData] = useState(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  const handleSave = () => {
    setIsSaving(true);
    updateSystemSettings(formData);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Configurações do Sistema" 
        description="Ajustes globais, PDV, Precificação e Backup." 
      />
      <div className="p-6 space-y-8">
        
        {/* General Settings */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2 flex items-center gap-2">
            <Settings size={14} /> Geral
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Tema</label>
              <select 
                value={formData.theme}
                onChange={e => setFormData({...formData, theme: e.target.value as any})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Idioma</label>
              <select 
                value={formData.language}
                onChange={e => setFormData({...formData, language: e.target.value as any})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Moeda</label>
              <select 
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value as any})}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
              </select>
            </div>
            <InputGroup label="Fuso Horário" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2 flex items-center gap-2">
            <Bell size={14} /> Notificações
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToggleGroup 
              label="Notificações por Email" 
              description="Receber alertas importantes por email." 
              defaultChecked={formData.notifications.email}
              onChange={(checked) => setFormData({...formData, notifications: {...formData.notifications, email: checked}})}
            />
            <ToggleGroup 
              label="Notificações Push" 
              description="Receber alertas no navegador/app." 
              defaultChecked={formData.notifications.push}
              onChange={(checked) => setFormData({...formData, notifications: {...formData.notifications, push: checked}})}
            />
            <ToggleGroup 
              label="Notificações por SMS" 
              description="Receber alertas críticos por SMS." 
              defaultChecked={formData.notifications.sms}
              onChange={(checked) => setFormData({...formData, notifications: {...formData.notifications, sms: checked}})}
            />
          </div>
        </div>

        {/* Data & Backup */}
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2 flex items-center gap-2">
            <Database size={14} /> Dados & Backup
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl border border-brand-border bg-slate-50/30 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-brand-text-main uppercase italic">Backup Completo</h4>
                <p className="text-xs text-brand-blue/60 font-medium">Baixe todos os seus dados.</p>
              </div>
              <button className="w-full py-3 bg-white border border-brand-border text-brand-blue rounded-2xl font-black uppercase italic text-xs hover:bg-slate-50 transition-all">
                Exportar Agora
              </button>
            </div>
            <div className="p-6 rounded-3xl border border-rose-100 bg-rose-50/30 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-rose-950 uppercase italic">Limpar Dados</h4>
                <p className="text-xs text-rose-600/60 font-medium">Remover registros de teste.</p>
              </div>
              <button className="w-full py-3 bg-white border border-rose-100 text-rose-600 rounded-2xl font-black uppercase italic text-xs hover:bg-rose-50 transition-all">
                Limpar Banco
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6">
          <div className={cn(
            "flex items-center gap-2 text-brand-blue font-black uppercase italic text-xs transition-all duration-500",
            showSuccess ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          )}>
            <Check size={16} className="bg-brand-border rounded-full p-0.5" />
            Configurações salvas!
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
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
