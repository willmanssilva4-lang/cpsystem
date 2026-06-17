'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Info,
  Lock
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import TotemAdsManagement from '@/components/admin/TotemAdsManagement';

export default function SettingsPage() {
  const { hasPermission, user } = useERP();
  const [activeTab, setActiveTab] = useState('empresa');

  if (typeof hasPermission !== 'function') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user?.email?.toLowerCase() === 'willmanssilva4@gmail.com';

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
    { id: 'seguranca', label: 'Segurança', icon: Lock },
    { id: 'totem', label: 'Gestão do Totem', icon: ImageIcon },
  ];

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Configurações</h2>
        <p className="text-brand-blue/60 font-medium">Gerencie as preferências da empresa, do sistema, segurança e totem.</p>
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
            {activeTab === 'empresa' && <CompanySettings />}
            {activeTab === 'sistema' && <SystemSettings />}
            {activeTab === 'seguranca' && <SecuritySettings />}
            {activeTab === 'totem' && <TotemAdsManagement />}
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
  const [formData, setFormData] = useState<any>(companySettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setFormData(companySettings);
    }
  }, [companySettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCompanySettings(formData);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setIsSaving(false);
      alert('❌ Erro ao salvar as configurações. A imagem pode ser muito grande.');
    }
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
              value={formData?.tradeName || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), tradeName: e.target.value }))} 
            />
            <InputGroup 
              label="Razão Social" 
              value={formData?.legalName || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), legalName: e.target.value }))} 
            />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="CNPJ" 
                value={formData?.cnpj || ''} 
                onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), cnpj: e.target.value }))} 
              />
              <InputGroup 
                label="Inscrição Estadual" 
                value={formData?.stateRegistration || ''} 
                onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), stateRegistration: e.target.value }))} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="E-mail" 
                value={formData?.email || ''} 
                onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), email: e.target.value }))} 
              />
              <InputGroup 
                label="Telefone" 
                value={formData?.phone || ''} 
                onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), phone: e.target.value }))} 
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-2">
            <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Logo da Empresa</label>
            <label className="aspect-square rounded-3xl border-2 border-dashed border-brand-border bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-brand-border/50 transition-colors group relative overflow-hidden">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new window.Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400;
                        const MAX_HEIGHT = 400;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                          if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                          }
                        } else {
                          if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                          }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const dataUrl = canvas.toDataURL('image/png', 0.8);
                          setFormData((prev: any) => ({ ...(prev || {}), logo: dataUrl }));
                        }
                      };
                      if (event.target?.result) {
                        img.src = event.target.result as string;
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              {formData?.logo ? (
                <div className="relative w-full h-full p-2">
                  <Image 
                    src={formData.logo} 
                    alt="Logo" 
                    fill 
                    className="object-contain" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <>
                  <ImageIcon className="text-brand-border group-hover:text-brand-blue-hover transition-colors" size={32} />
                  <span className="text-[10px] font-black text-brand-text-sec uppercase italic">Alterar Logo</span>
                </>
              )}
            </label>
          </div>
        </div>
        
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputGroup 
                label="Logradouro" 
                value={formData?.address?.street || ''} 
                onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), address: { ...(prev?.address || {}), street: e.target.value } }))} 
              />
            </div>
            <InputGroup 
              label="Número" 
              value={formData?.address?.number || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), address: { ...(prev?.address || {}), number: e.target.value } }))} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputGroup 
              label="Bairro" 
              value={formData?.address?.neighborhood || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), address: { ...(prev?.address || {}), neighborhood: e.target.value } }))} 
            />
            <InputGroup 
              label="Cidade" 
              value={formData?.address?.city || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), address: { ...(prev?.address || {}), city: e.target.value } }))} 
            />
            <InputGroup 
              label="Estado" 
              value={formData?.address?.state || ''} 
              onChange={(e) => setFormData((prev: any) => ({ ...(prev || {}), address: { ...(prev?.address || {}), state: e.target.value } }))} 
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



function SecuritySettings() {
  console.log('SecuritySettings rendering');
  const { changePassword } = useERP();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    const { error } = await changePassword(newPassword);
    
    setIsSaving(false);
    if (error) {
      setError('Erro ao alterar a senha: ' + error.message);
    } else {
      setShowSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="divide-y divide-slate-100">
      <SectionHeader 
        title="Segurança" 
        description="Altere sua senha de acesso ao sistema." 
      />
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <InputGroup 
            label="Nova Senha" 
            type="password"
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <InputGroup 
            label="Confirmar Nova Senha" 
            type="password"
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
          />
        </div>
        
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-6">
          <div className={cn(
            "flex items-center gap-2 text-brand-blue font-black uppercase italic text-xs transition-all duration-500",
            showSuccess ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          )}>
            <Check size={16} className="bg-brand-border rounded-full p-0.5" />
            Senha alterada com sucesso!
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
                Alterar Senha
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
    systemSettings, updateSystemSettings, sendEmailNotification,
    products, sales, customers, suppliers, expenses, losses,
    departamentos, categorias, expenseCategories, subcategorias,
    stockMovements, inventories, employees, systemUsers,
    accessProfiles, permissions, pricingSettings, companySettings,
    paymentMethods, maquininhas, promotions, discountLogs,
    cashRegisters, cashMovements, cashClosings, lotes,
    returns, auditLogs, vouchers, advertisements
  } = useERP();

  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testEmailError, setTestEmailError] = useState('');
  const [testEmailRecipient, setTestEmailRecipient] = useState('willmanssilva1@gmail.com');

  useEffect(() => {
    console.log('🖥️ SystemSettings mounted', { hasSettings: !!systemSettings });
  }, [systemSettings]);

  const [formData, setFormData] = useState<any>(systemSettings || {
    theme: 'system',
    language: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    notifications: { email: true, push: true, sms: false, senderEmail: '' }
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
    try {
      const dataToExport = {
        products, sales, customers, suppliers, expenses, losses,
        departamentos, categorias, expenseCategories, subcategorias,
        stockMovements, inventories, employees, systemUsers,
        accessProfiles, permissions, pricingSettings, companySettings,
        systemSettings, paymentMethods, maquininhas, promotions, 
        discountLogs, cashRegisters, cashMovements, cashClosings, lotes,
        returns, auditLogs, vouchers, advertisements,
        exportDate: new Date().toISOString()
      };

      const seen = new WeakSet();
      const dataStr = JSON.stringify(dataToExport, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return undefined; // skip circular reference
          }
          seen.add(value);
        }
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }, 2);

      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_erp_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err: any) {
      console.error("Erro ao exportar backup:", err);
      alert(`Não foi possível gerar o backup: ${err.message || err}`);
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const processImport = async () => {
    if (!importFile) return;
    
    console.log("🚀 Iniciando processamento do backup:", importFile.name);
    setIsImporting(true);
    setShowImportConfirm(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("📖 Lendo conteúdo do arquivo...");
      const text = await importFile.text();
      
      if (!text || text.trim() === '') {
        throw new Error("O arquivo de backup está vazio.");
      }

      let importedData: any;
      try {
        importedData = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("O conteúdo do arquivo não é um JSON válido.");
      }

      // Reconstrução de sale_items a partir dos items das vendas
      if (!importedData.sale_items && !importedData.saleItems && importedData.sales && Array.isArray(importedData.sales)) {
        const itemsList: any[] = [];
        importedData.sales.forEach((s: any) => {
          if (s && s.items && Array.isArray(s.items)) {
            s.items.forEach((item: any) => {
              itemsList.push({
                sale_id: s.id,
                product_id: item.productId || item.product_id,
                quantity: item.quantity,
                price: item.price,
                original_price: item.originalPrice !== undefined ? item.originalPrice : (item.original_price ?? item.price),
                discount: item.discount || 0,
                promotion_id: item.promotionId || item.promotion_id || null,
                company_id: s.companyId || s.company_id || null,
                store_id: s.storeId || s.store_id || null
              });
            });
          }
        });
        if (itemsList.length > 0) {
          importedData.sale_items = itemsList;
        }
      }

      // Mapeamento alternativo para lotes
      if (importedData.lotes && !importedData.produto_lotes) {
        importedData.produto_lotes = importedData.lotes;
      }

      const isUUID = (str: any) => {
        if (typeof str !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };

      const generateUUID = () => {
        if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
          return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const dateFields = [
        'validade', 'date', 'due_date', 'payment_date', 'issue_date',
        'opened_at', 'closed_at', 'created_at', 'updated_at',
        'start_date', 'end_date', 'admission_date'
      ];

      const uuidFields = [
        'id', 'company_id', 'category_id', 'department_id', 'departamento_id', 
        'subcategoria_id', 'supplier_id', 'product_id', 'produto_id', 
        'sale_id', 'customer_id', 'user_id', 'cash_register_id', 
        'maquininha_id', 'lote_id', 'fornecedor_id', 'profile_id'
      ];

      const tableColumns: Record<string, string[]> = {
        products: [
          'id', 'name', 'category', 'sku', 'cost_price', 'sale_price', 'stock', 'min_stock', 
          'image', 'composition', 'status', 'created_at', 'category_id', 'department', 
          'group', 'subgroup', 'subcategoria_id', 'validade', 'company_id', 'codigo_mercadologico', 
          'has_had_stock', 'wholesale_price', 'control_stock', 'club_price', 'product_type', 
          'base_product_id', 'conversion_factor', 'wholesale_min_qty', 'term_price', 'linha', 
          'sabor', 'gramatura', 'tipo_embalagem', 'segmento', 'supplier', 'section', 'unit', 'barcode', 'brand'
        ],
        customers: ['id', 'name', 'email', 'phone', 'document', 'status', 'address', 'notes', 'company_id', 'created_at'],
        suppliers: ['id', 'name', 'cnpj', 'phone', 'email', 'address', 'status', 'company_id', 'created_at'],
        expenses: [
          'id', 'description', 'amount', 'category', 'category_id', 'due_date', 'payment_date', 
          'status', 'payment_method', 'company_id', 'created_at', 'supplier_id', 'issue_date', 
          'financial_account', 'store_id', 'is_recurring'
        ],
        sales: [
          'id', 'date', 'total', 'subtotal', 'discount', 'status', 'payments', 'payment_method', 
          'customer_id', 'user_id', 'cash_register_id', 'maquininha_id', 'tax_amount', 'net_amount', 
          'company_id', 'store_id', 'created_at'
        ],
        sale_items: ['id', 'sale_id', 'product_id', 'quantity', 'price', 'original_price', 'discount', 'promotion_id', 'company_id', 'store_id', 'created_at'],
        departamentos: ['id', 'nome', 'company_id', 'created_at'],
        categorias: ['id', 'nome', 'departamento_id', 'department_id', 'company_id', 'created_at'],
        subcategorias: ['id', 'nome', 'categoria_id', 'category_id', 'company_id', 'created_at'],
        stock_movements: ['id', 'product_id', 'type', 'quantity', 'origin', 'date', 'user_id', 'user_name', 'company_id', 'created_at', 'cost', 'lote_id'],
        inventories: ['id', 'date', 'status', 'type', 'responsible', 'notes', 'company_id', 'created_at'],
        maquininhas: ['id', 'nome', 'credenciadora', 'taxa_debito', 'taxa_credito_vista', 'taxa_credito_parcelado', 'ativo', 'company_id', 'created_at'],
        payment_methods: [
          'id', 'name', 'active', 'company_id', 'created_at', 'tax_debt', 'tax_credit_1x', 
          'tax_credit_2_6x', 'tax_credit_7_12x', 'tax_pix', 'installments_max', 'receive_days_debt', 'receive_days_credit'
        ],
        advertisements: ['id', 'title', 'imageUrl', 'image_url', 'link', 'status', 'company_id', 'created_at'],
        produto_lotes: ['id', 'produto_id', 'numero_lote', 'validade', 'saldo_atual', 'data_entrada', 'custo_unit', 'quantidade_inicial', 'company_id', 'fornecedor_id'],
        system_settings: ['id', 'company_name', 'company_document', 'address', 'phone', 'email', 'theme', 'logo_url', 'company_id', 'created_at', 'logo', 'receipt_footer_message'],
        system_users: ['id', 'username', 'email', 'full_name', 'employee_id', 'profile_id', 'store_id', 'active', 'supervisor_code', 'company_id', 'created_at'],
        promotions: ['id', 'name', 'type', 'status', 'start_date', 'end_date', 'target_type', 'target_id', 'product_prices', 'discount_value', 'company_id', 'created_at'],
        returns: ['id', 'sale_id', 'date', 'reason', 'total', 'company_id', 'created_at'],
        employees: ['id', 'name', 'role', 'phone', 'email', 'admission_date', 'salary', 'status', 'company_id', 'created_at'],
        access_profiles: ['id', 'name', 'description', 'company_id', 'created_at'],
        permissions: ['id', 'profile_id', 'module', 'action', 'company_id', 'created_at'],
        expense_categories: ['id', 'name', 'company_id', 'created_at'],
        losses: ['id', 'product_id', 'lote_id', 'quantity', 'reason', 'date', 'total_value', 'company_id', 'created_at'],
        discount_logs: ['id', 'sale_id', 'user_id', 'discount_amount', 'reason', 'date', 'company_id', 'created_at'],
        audit_logs: ['id', 'user_id', 'action', 'details', 'created_at', 'company_id'],
        vouchers: ['id', 'code', 'type', 'value', 'status', 'min_purchase', 'expiration_date', 'company_id', 'created_at'],
        cash_registers: ['id', 'status', 'opening_balance', 'closing_balance', 'opened_at', 'closed_at', 'opened_by', 'closed_by', 'company_id', 'created_at'],
        cash_movements: ['id', 'register_id', 'cash_register_id', 'type', 'amount', 'reason', 'created_by', 'company_id', 'created_at'],
        cash_closings: ['id', 'cash_register_id', 'payment_method', 'expected_amount', 'informed_amount', 'difference_amount', 'closed_at', 'closed_by', 'company_id', 'created_at']
      };

      const mapAndCleanItem = (tableName: string, item: any, allowedColumns: string[]) => {
        if (!item || typeof item !== 'object') return null;
        
        const clean: any = {};
        const mappingRules: Record<string, string> = {
          companyId: 'company_id',
          storeId: 'store_id',
          customerId: 'customer_id',
          userId: 'user_id',
          cashRegisterId: 'cash_register_id',
          registerId: 'cash_register_id',
          maquininhaId: 'maquininha_id',
          paymentMethod: 'payment_method',
          taxAmount: 'tax_amount',
          netAmount: 'net_amount',
          originalPrice: 'original_price',
          promotionId: 'promotion_id',
          productId: 'product_id',
          produtoId: 'produto_id',
          loteId: 'lote_id',
          categoryId: 'category_id',
          subcategoryId: 'subcategoria_id',
          subcategoriaId: 'subcategoria_id',
          supervisorCode: 'supervisor_code',
          admissionDate: 'admission_date',
          costPrice: 'cost_price',
          salePrice: 'sale_price',
          wholesalePrice: 'wholesale_price',
          wholesaleMinQty: 'wholesale_min_qty',
          clubPrice: 'club_price',
          termPrice: 'term_price',
          minStock: 'min_stock',
          controlStock: 'control_stock',
          productType: 'product_type',
          baseProductId: 'base_product_id',
          conversionFactor: 'conversion_factor',
          codigoMercadologico: 'codigo_mercadologico',
          dueDate: 'due_date',
          paymentDate: 'payment_date',
          issueDate: 'issue_date',
          isRecurring: 'is_recurring',
          paymentType: 'payment_type',
          financialAccount: 'financial_account',
          supplierId: 'supplier_id',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          totalValue: 'total_value',
          productPrices: 'product_prices',
          discountValue: 'discount_value',
          targetType: 'target_type',
          targetId: 'target_id',
          startDate: 'start_date',
          endDate: 'end_date',
          openingBalance: 'opening_balance',
          closingBalance: 'closing_balance',
          informedSum: 'informed_sum',
          differenceAmount: 'difference_amount',
          openedAt: 'opened_at',
          closedAt: 'closed_at',
          openedBy: 'opened_by',
          closedBy: 'closed_by',
          createdBy: 'created_by',
          movementType: 'movement_type',
          numeroLote: 'numero_lote',
          dataEntrada: 'data_entrada',
          custoUnit: 'custo_unit',
          quantidadeInicial: 'quantidade_inicial',
          saldoAtual: 'saldo_atual',
          fornecedorId: 'fornecedor_id'
        };

        if (tableName === 'categorias' && item.departamentoId !== undefined && item.department_id === undefined) {
          clean.departamento_id = item.departamentoId;
        }
        if (tableName === 'subcategorias' && item.categoriaId !== undefined && item.category_id === undefined) {
          clean.categoria_id = item.categoriaId;
        }

        for (const [key, val] of Object.entries(item)) {
          const mappedKey = mappingRules[key] || key;
          clean[mappedKey] = val;
        }

        const dbPayload: any = {};
        for (const col of allowedColumns) {
          let val = clean[col];
          if (val === undefined) {
            const camelKey = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            val = item[camelKey] !== undefined ? item[camelKey] : item[col];
          }

          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            val = null;
          }

          if (col === 'id' && val === null) {
            val = generateUUID();
          }

          if (val !== null) {
            if (uuidFields.includes(col)) {
              if (typeof val === 'string' && !isUUID(val)) {
                if (col === 'id') {
                  val = generateUUID();
                } else {
                  val = null;
                }
              }
            }

            if (dateFields.includes(col) && val !== null) {
              const d = new Date(val);
              if (isNaN(d.getTime())) {
                val = null;
              } else {
                val = d.toISOString();
              }
            }

            if (col === 'payments' && typeof val === 'string') {
              try { val = JSON.parse(val); } catch (e) {}
            }
            if (col === 'composition' && typeof val === 'string') {
              try { val = JSON.parse(val); } catch (e) {}
            }
            if (col === 'product_prices' && typeof val === 'string') {
              try { val = JSON.parse(val); } catch (e) {}
            }
          }

          if (val !== null && val !== undefined) {
            dbPayload[col] = val;
          }
        }

        return dbPayload;
      };

      // Mapeamento EXATO para o LocalStorage
      const keyMap: Record<string, string> = {
        products: 'erp_products',
        erp_products: 'erp_products',
        sales: 'erp_sales',
        erp_sales: 'erp_sales',
        customers: 'erp_customers',
        erp_customers: 'erp_customers',
        suppliers: 'suppliers',
        erp_suppliers: 'suppliers',
        expenses: 'erp_expenses',
        erp_expenses: 'erp_expenses',
        paymentMethods: 'payment_methods',
        payment_methods: 'payment_methods',
        maquininhas: 'maquininhas',
        promotions: 'promotions',
        systemSettings: 'system_settings',
        system_settings: 'system_settings',
        pricingSettings: 'pricingSettings',
        pricing_settings: 'pricingSettings',
        companySettings: 'system_settings',
        company_settings: 'system_settings',
        stockMovements: 'stock_movements',
        stock_movements: 'stock_movements',
        lotes: 'produto_lotes',
        produto_lotes: 'produto_lotes',
        losses: 'losses',
        inventories: 'inventories',
        departamentos: 'departamentos',
        categorias: 'categorias',
        subcategorias: 'subcategorias',
        expenseCategories: 'expense_categories',
        expense_categories: 'expense_categories',
        employees: 'employees',
        systemUsers: 'system_users',
        system_users: 'system_users',
        accessProfiles: 'access_profiles',
        access_profiles: 'access_profiles',
        permissions: 'permissions',
        discountLogs: 'discount_logs',
        discount_logs: 'discount_logs',
        cashRegisters: 'cash_registers',
        cash_registers: 'cash_registers',
        cashMovements: 'cash_movements',
        cash_movements: 'cash_movements',
        cashClosings: 'cash_closings',
        cash_closings: 'cash_closings',
        returns: 'returns',
        auditLogs: 'audit_logs',
        audit_logs: 'audit_logs',
        vouchers: 'vouchers',
        advertisements: 'advertisements',
        sale_items: 'sale_items'
      };

      // 1. Salvar no LocalStorage (fallback offline e cache imediato)
      let localStorageSuccessCount = 0;
      const importedKeys: string[] = [];

      for (const [key, value] of Object.entries(importedData)) {
        const storageKey = keyMap[key] || (key.startsWith('erp_') ? key : null);
        if (!storageKey) continue;

        try {
          if (value !== undefined && value !== null) {
            localStorage.setItem(storageKey, JSON.stringify(value));
            localStorageSuccessCount++;
            importedKeys.push(key);
          }
        } catch (e) {
          console.error(`Erro ao salvar no localStorage para a chave ${key}:`, e);
        }
      }

      // 2. Salvar no Supabase se configurado e conectado
      const isSupabaseConnected = !!supabase && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      let databaseSuccessCount = 0;

      if (isSupabaseConnected) {
        console.log("🌐 Conectado ao Supabase - Iniciando sincronização do backup com banco...");
        
        const dbTablesOrder = [
          { key: 'accessProfiles', dbTable: 'access_profiles' },
          { key: 'permissions', dbTable: 'permissions' },
          { key: 'expenseCategories', dbTable: 'expense_categories' },
          { key: 'paymentMethods', dbTable: 'payment_methods' },
          { key: 'maquininhas', dbTable: 'maquininhas' },
          { key: 'departamentos', dbTable: 'departamentos' },
          { key: 'categorias', dbTable: 'categorias' },
          { key: 'subcategorias', dbTable: 'subcategorias' },
          { key: 'employees', dbTable: 'employees' },
          { key: 'suppliers', dbTable: 'suppliers' },
          { key: 'customers', dbTable: 'customers' },
          { key: 'advertisements', dbTable: 'advertisements' },
          { key: 'systemSettings', dbTable: 'system_settings' },
          { key: 'vouchers', dbTable: 'vouchers' },
          { key: 'products', dbTable: 'products' },
          { key: 'systemUsers', dbTable: 'system_users' },
          { key: 'promotions', dbTable: 'promotions' },
          { key: 'cashRegisters', dbTable: 'cash_registers' },
          { key: 'cashMovements', dbTable: 'cash_movements' },
          { key: 'cashClosings', dbTable: 'cash_closings' },
          { key: 'sales', dbTable: 'sales' },
          { key: 'sale_items', dbTable: 'sale_items' },
          { key: 'returns', dbTable: 'returns' },
          { key: 'produto_lotes', dbTable: 'produto_lotes' },
          { key: 'stockMovements', dbTable: 'stock_movements' },
          { key: 'inventories', dbTable: 'inventories' },
          { key: 'losses', dbTable: 'losses' },
          { key: 'expenses', dbTable: 'expenses' },
          { key: 'discountLogs', dbTable: 'discount_logs' },
          { key: 'auditLogs', dbTable: 'audit_logs' }
        ];

        // Limpar tabelas antigas no banco (ordem reversa para chaves estrangeiras)
        console.log("🧹 Limpando as tabelas existentes no banco...");
        for (let i = dbTablesOrder.length - 1; i >= 0; i--) {
          const { dbTable } = dbTablesOrder[i];
          try {
            await supabase.from(dbTable).delete().not('id', 'is', null);
          } catch (e) {
            console.warn(`Erro de limpeza na tabela ${dbTable}:`, e);
          }
        }

        // Inserir os registros no banco na ordem de dependência correta
        for (const { key, dbTable } of dbTablesOrder) {
          const arrayData = importedData[key] || importedData[dbTable];
          if (!arrayData || !Array.isArray(arrayData) || arrayData.length === 0) continue;

          console.log(`📥 Importando para o Supabase: ${arrayData.length} registros para ${dbTable}...`);
          
          const allowedCols = tableColumns[dbTable] || [];
          const cleanedPayloads = arrayData
            .map(item => mapAndCleanItem(dbTable, item, allowedCols))
            .filter(Boolean);

          if (cleanedPayloads.length === 0) continue;

          try {
            const { error } = await supabase.from(dbTable).insert(cleanedPayloads);
            if (error) {
              console.warn(`Bulk insert falhou na tabela ${dbTable}. Tentando individualmente...`, error.message);
              for (const p of cleanedPayloads) {
                const { error: err2 } = await supabase.from(dbTable).insert([p]);
                if (err2) {
                  console.error(`Falha ao inserir linha na tabela ${dbTable}:`, err2.message, p);
                }
              }
            }
            databaseSuccessCount++;
          } catch (err: any) {
            console.error(`Erro inserindo tabela ${dbTable}:`, err);
          }
        }
      }

      const syncResultMsg = isSupabaseConnected
        ? `Restauração Completa!\n\n${localStorageSuccessCount} módulos salvos localmente.\nSincronizados e carregados com sucesso no banco de dados.`
        : `${localStorageSuccessCount} módulos restaurados localmente!`;

      alert(`${syncResultMsg}\n\nO sistema será reiniciado.`);
      window.location.reload();
    } catch (err: any) {
      alert(`Erro no processo de importação: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setShowImportConfirm(true);
  };

  const handleClearData = async () => {
    console.log('🚀 Iniciando limpeza de dados...');
    setIsClearing(true);
    setClearStatus('idle');
    try {
      const tables = [
        'sale_items',
        'vendas_descontos',
        'return_items',
        'returns',
        'sales',
        'cash_movements',
        'cash_sales_summary',
        'cash_closings',
        'cash_registers',
        'expenses',
        'losses',
        'stock_movements',
        'inventories',
        'purchase_order_items',
        'purchase_orders',
        'quotation_items',
        'quotation_responses',
        'quotation_suppliers',
        'quotations',
        'authorization_logs',
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
            .not('id', 'is', null);
          
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

      // Limpar caches do localStorage para que os fallbacks não restaurem as tabelas vazias
      const localKeysToClear = [
        'stock_movements',
        'inventories',
        'erp_sales',
        'erp_expenses',
        'produto_lotes',
        'promotions',
        'returns',
        'losses',
        'discount_logs',
        'audit_logs',
        'vouchers',
        'cash_registers',
        'cash_movements',
        'cash_closings',
        'sale_items'
      ];
      for (const key of localKeysToClear) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Erro ao limpar cache local para chave ${key}:`, e);
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

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setTestEmailStatus('idle');
    setTestEmailError('');
    
    try {
      const result = await sendEmailNotification(
        testEmailRecipient,
        'ERP: Teste de Notificação',
        'Este é um e-mail de teste enviado das configurações do seu ERP.',
        `
          <div style="font-family: sans-serif; padding: 20px; color: #334155;">
            <h2 style="color: #1e40af;">Teste de Notificação</h2>
            <p>Este é um e-mail de teste enviado das configurações do seu ERP.</p>
            <p>Se você recebeu esta mensagem, sua integração com o Resend está funcionando corretamente!</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Este é um alerta automático do seu sistema ERP.</p>
          </div>
        `,
        formData?.notifications?.senderEmail
      );

      if (result.success) {
        setTestEmailStatus('success');
        setTimeout(() => setTestEmailStatus('idle'), 3000);
      } else {
        setTestEmailStatus('error');
        setTestEmailError(result.error || 'Erro desconhecido ao enviar e-mail.');
      }
    } catch (error: any) {
      setTestEmailStatus('error');
      setTestEmailError(error.message || 'Erro desconhecido');
    } finally {
      setIsTestingEmail(false);
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
                value={formData?.theme || 'system'}
                onChange={e => setFormData((prev: any) => ({...(prev || {}), theme: e.target.value as any}))}
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
                value={formData?.language || 'pt-BR'}
                onChange={e => setFormData((prev: any) => ({...(prev || {}), language: e.target.value as any}))}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">Moeda</label>
              <select 
                value={formData?.currency || 'BRL'}
                onChange={e => setFormData((prev: any) => ({...(prev || {}), currency: e.target.value as any}))}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all"
              >
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar ($)</option>
              </select>
            </div>
            <InputGroup label="Fuso Horário" value={formData?.timezone || ''} onChange={e => setFormData((prev: any) => ({...(prev || {}), timezone: e.target.value}))} />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-100 pb-2 flex items-center gap-2">
            <Bell size={14} /> Notificações
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <ToggleGroup 
                label="Notificações por Email" 
                description="Receber alertas importantes por email." 
                defaultChecked={formData?.notifications?.email || false}
                onChange={(checked) => setFormData((prev: any) => ({...(prev || {}), notifications: {...(prev?.notifications || {}), email: checked}}))}
              />
              
              {formData?.notifications?.email && (
                <div className="pt-2">
                  <InputGroup 
                    label="E-mail de Envio (Remetente)" 
                    placeholder="ex: willmanssilva1@gmail.com"
                    value={formData?.notifications?.senderEmail || ''} 
                    onChange={e => setFormData((prev: any) => ({...(prev || {}), notifications: {...(prev?.notifications || {}), senderEmail: e.target.value}}))} 
                  />
                  <InputGroup 
                    label="E-mail de Destino (Recebimento)" 
                    placeholder="ex: willmanssilva1@gmail.com"
                    value={formData?.notifications?.recipientEmail || ''} 
                    onChange={e => setFormData((prev: any) => ({...(prev || {}), notifications: {...(prev?.notifications || {}), recipientEmail: e.target.value}}))} 
                  />
                  <p className="text-[10px] text-brand-text-main/50 mt-1 ml-1">
                    Deixe em branco para usar o padrão. Requer domínio verificado no Resend.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl border border-brand-border bg-slate-50/30 flex flex-col gap-3">
              <div className="space-y-2">
                <h4 className="text-xs font-black text-brand-text-main uppercase italic">Teste de E-mail</h4>
                <p className="text-[10px] text-brand-blue/60 font-medium leading-tight">
                  Envie um e-mail de teste para validar sua configuração.
                </p>
                <InputGroup 
                  label="E-mail de Destino" 
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                />
              </div>
              <button 
                onClick={handleTestEmail}
                disabled={isTestingEmail}
                className={cn(
                  "w-full py-2 rounded-xl font-black uppercase italic text-[10px] transition-all flex items-center justify-center gap-2",
                  testEmailStatus === 'success' ? "bg-emerald-500 text-white" :
                  testEmailStatus === 'error' ? "bg-rose-500 text-white" :
                  "bg-white border border-brand-border text-brand-blue hover:bg-slate-50"
                )}
              >
                {isTestingEmail ? (
                  <>
                    <div className="w-3 h-3 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : testEmailStatus === 'success' ? (
                  <>
                    <Check size={12} />
                    E-mail Enviado!
                  </>
                ) : testEmailStatus === 'error' ? (
                  <>
                    <AlertTriangle size={12} />
                    Erro no Envio
                  </>
                ) : (
                  "Enviar E-mail de Teste"
                )}
              </button>
              {testEmailStatus === 'error' && (
                <p className="text-[9px] text-rose-500 font-bold text-center">{testEmailError}</p>
              )}
            </div>
            <ToggleGroup 
              label="Notificações Push" 
              description="Receber alertas no navegador/app." 
              defaultChecked={formData?.notifications?.push || false}
              onChange={(checked) => setFormData((prev: any) => ({...(prev || {}), notifications: {...(prev?.notifications || {}), push: checked}}))}
            />
            <ToggleGroup 
              label="Notificações por SMS" 
              description="Receber alertas críticos por SMS." 
              defaultChecked={formData?.notifications?.sms || false}
              onChange={(checked) => setFormData((prev: any) => ({...(prev || {}), notifications: {...(prev?.notifications || {}), sms: checked}}))}
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
              <div className="flex flex-col gap-3 relative">
                {isImporting && (
                  <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-brand-border shadow-inner">
                    <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-[10px] text-brand-blue font-black uppercase italic animate-pulse">Restaurando...</span>
                  </div>
                )}

                {showImportConfirm && !isImporting && (
                  <div className="absolute inset-0 z-20 bg-brand-blue text-white rounded-2xl p-4 flex flex-col justify-between border border-brand-blue shadow-xl animate-in zoom-in-95 duration-200">
                    <div>
                      <h5 className="text-[10px] font-black uppercase italic mb-1">Confirmar Restauração?</h5>
                      <p className="text-[9px] font-medium opacity-90 leading-tight">Isso irá substituir seus dados atuais pelos dados do arquivo.</p>
                      <p className="text-[8px] mt-1 font-mono opacity-70 truncate">{importFile?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={processImport}
                        className="flex-1 py-2 bg-white text-brand-blue rounded-xl font-black uppercase italic text-[9px] hover:bg-slate-50 transition-all"
                      >
                        Sim, Restaurar
                      </button>
                      <button 
                        onClick={() => { setShowImportConfirm(false); setImportFile(null); }}
                        className="flex-1 py-2 bg-transparent border border-white/30 text-white rounded-xl font-black uppercase italic text-[9px] hover:bg-white/10 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleExportData}
                  disabled={isImporting || showImportConfirm}
                  className="w-full py-3 bg-white border border-brand-border text-brand-blue rounded-2xl font-black uppercase italic text-xs hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                >
                  Exportar Agora
                </button>
                <label className={cn(
                  "w-full py-3 border rounded-2xl font-black uppercase italic text-xs transition-all cursor-pointer text-center flex items-center justify-center shadow-lg relative overflow-hidden group",
                  isImporting 
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-brand-blue border-brand-blue text-white hover:bg-brand-blue-hover"
                )}>
                  {!isImporting && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />}
                  {isImporting ? 'Aguarde...' : 'Importar Backup (Restaurar)'}
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportBackup} 
                    className="hidden" 
                    disabled={isImporting}
                  />
                </label>
                <div className="text-[10px] rounded-2xl bg-brand-blue/5 border border-brand-border/40 p-3 leading-normal text-brand-blue/80 font-bold space-y-1 mt-1">
                  <p>💡 <strong>Dica de Download:</strong></p>
                  <p>Se o download não iniciar, é porque o painel de visualização lateral restringe downloads por motivos de segurança do navegador.</p>
                  <p>Para baixar normalmente, clique no botão para <strong>abrir o app em uma nova aba</strong> e faça o download por lá!</p>
                </div>
              </div>
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
                    Esta ação irá remover permanentemente todos os dados do sistema. Os cadastros de produtos, usuários, funcionários, fornecedores e clientes serão mantidos.
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
                  onClick={() => { setShowConfirmClear(false); setClearStatus('idle'); window.location.reload(); }}
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
