'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Database, 
  Bell, 
  Save,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Trash2,
  Info
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { hasPermission } = useERP();
  const [activeTab, setActiveTab] = useState('empresa');

  useEffect(() => {
    console.log('⚙️ SettingsPage mounted', { activeTab });
  }, [activeTab]);

  if (typeof hasPermission !== 'function') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
    { id: 'sistema', label: 'Config. do Sistema', icon: Settings },
  ];

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Configurações</h2>
        <p className="text-brand-blue/60 font-medium">Gerencie as preferências da empresa e do sistema.</p>
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
          <div
            className="bg-white rounded-3xl border border-brand-border shadow-sm min-h-[400px]"
          >
            {activeTab === 'empresa' ? <CompanySettings /> : <SystemSettings />}
          </div>
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



function SystemSettings() {
  const { 
    systemSettings, updateSystemSettings,
    products, sales, customers, suppliers, expenses, losses,
    departamentos, categorias, expenseCategories, subcategorias,
    stockMovements, inventories, employees, systemUsers,
    accessProfiles, permissions, pricingSettings, companySettings,
    paymentMethods, maquininhas, promotions, discountLogs,
    cashRegisters, cashMovements, cashClosings, lotes
  } = useERP();

  useEffect(() => {
    console.log('🖥️ SystemSettings mounted', { hasSettings: !!systemSettings });
  }, [systemSettings]);

  const [formData, setFormData] = useState(systemSettings || {
    theme: 'system',
    language: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    notifications: { email: true, push: true, sms: false }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (systemSettings) {
      setFormData(systemSettings);
    }
  }, [systemSettings]);

  const handleSave = () => {
    if (!formData) return;
    setIsSaving(true);
    updateSystemSettings(formData);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleExportData = () => {
    const dataToExport = {
      products, sales, customers, suppliers, expenses, losses,
      departamentos, categorias, expenseCategories, subcategorias,
      stockMovements, inventories, employees, systemUsers,
      accessProfiles, permissions, pricingSettings, companySettings,
      systemSettings, paymentMethods, maquininhas, promotions, 
      discountLogs, cashRegisters, cashMovements, cashClosings, lotes,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_erp_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    console.log('🚀 Iniciando limpeza de dados...');
    setIsClearing(true);
    setClearStatus('idle');
    try {
      const tables = [
        'sale_items',
        'sales',
        'cash_movements',
        'cash_closings',
        'expenses',
        'losses',
        'stock_movements',
        'inventories',
        'purchase_order_items',
        'purchase_orders',
        'quotation_items',
        'quotation_suppliers',
        'quotation_responses',
        'quotations',
        'authorization_logs',
        'vendas_descontos',
        'produto_lotes',
        'promotions',
        'audit_logs'
      ];

      for (const table of tables) {
        try {
          console.log(`🧹 Limpando tabela: ${table}`);
          const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (error) {
            // Se for erro 404, a tabela não existe, podemos ignorar silenciosamente
            if (error.code === 'PGRST116' || (error as any).status === 404) {
              console.log(`ℹ️ Tabela ${table} não encontrada no banco, pulando...`);
            } else {
              console.warn(`⚠️ Aviso ao limpar tabela ${table}:`, error.message);
            }
          }
        } catch (e) {
          console.log(`ℹ️ Erro ao acessar tabela ${table}, provavelmente não existe.`);
        }
      }

      console.log('✅ Limpeza concluída com sucesso');
      setClearStatus('success');
    } catch (error) {
      console.error('❌ Erro crítico ao limpar dados:', error);
      setClearStatus('error');
    } finally {
      console.log('🏁 Finalizando processo de limpeza');
      setIsClearing(false);
    }
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
              <button 
                onClick={handleExportData}
                className="w-full py-3 bg-white border border-brand-border text-brand-blue rounded-2xl font-black uppercase italic text-xs hover:bg-slate-50 transition-all"
              >
                Exportar Agora
              </button>
            </div>
            <div className="p-6 rounded-3xl border border-rose-100 bg-rose-50/30 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-rose-950 uppercase italic">Limpar Dados</h4>
                <p className="text-xs text-rose-600/60 font-medium">Remover registros de teste.</p>
              </div>
              <button 
                onClick={() => setShowConfirmClear(true)}
                className="w-full py-3 bg-white border border-rose-100 text-rose-600 rounded-2xl font-black uppercase italic text-xs hover:bg-rose-50 transition-all"
              >
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

      {/* Modal de Confirmação de Limpeza */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 border border-rose-100 animate-in zoom-in duration-200"
          >
            {clearStatus === 'idle' ? (
              <>
                <div className="space-y-2 text-center">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="text-rose-500" size={32} />
                  </div>
                  <h3 className="text-xl font-black uppercase italic text-rose-950">Limpar Banco de Dados?</h3>
                  <p className="text-sm text-rose-600/60 font-medium">
                    Esta ação irá remover permanentemente todos os registros de vendas, compras, movimentações e financeiro. Os cadastros de produtos e clientes serão mantidos.
                  </p>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Esta ação não pode ser desfeita.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase italic text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase italic text-xs hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isClearing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Limpando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Sim, Limpar Tudo
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : clearStatus === 'success' ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-xl font-black uppercase italic text-emerald-950">Sucesso!</h3>
                <p className="text-sm text-emerald-600/60 font-medium">
                  O banco de dados foi limpo com sucesso.
                </p>
                <button 
                  onClick={() => { setShowConfirmClear(false); setClearStatus('idle'); }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-xs hover:bg-emerald-700 transition-all"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-rose-500" size={32} />
                </div>
                <h3 className="text-xl font-black uppercase italic text-rose-950">Erro</h3>
                <p className="text-sm text-rose-600/60 font-medium">
                  Ocorreu um erro ao tentar limpar os dados. Verifique o console para mais detalhes.
                </p>
                <button 
                  onClick={() => { setShowConfirmClear(false); setClearStatus('idle'); }}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase italic text-xs hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
