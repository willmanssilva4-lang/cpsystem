'use client';

import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('empresa');

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'pdv', label: 'PDV & Impressão', icon: Printer },
    { id: 'precificacao', label: 'Precificação', icon: Calculator },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'dados', label: 'Dados & Backup', icon: Database },
  ];

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Configurações</h2>
        <p className="text-brand-blue/60 font-medium">Gerencie as preferências do sistema e informações da sua empresa.</p>
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
        <div className="flex-1 max-w-4xl">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-brand-border shadow-sm overflow-hidden"
          >
            {activeTab === 'empresa' && <CompanySettings />}
            {activeTab === 'perfil' && <ProfileSettings />}
            {activeTab === 'pdv' && <PdvSettings />}
            {activeTab === 'precificacao' && <PricingSettingsSection />}
            {activeTab === 'notificacoes' && <NotificationSettings />}
            {activeTab === 'seguranca' && <SecuritySettings />}
            {activeTab === 'dados' && <DataSettings />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-6 border-bottom border-slate-50 bg-slate-50/30">
      <h3 className="text-lg font-black italic uppercase text-brand-text-main">{title}</h3>
      <p className="text-xs font-medium text-brand-blue/60">{description}</p>
    </div>
  );
}

function InputGroup({ label, placeholder, type = "text", defaultValue = "" }: { label: string, placeholder?: string, type?: string, defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest italic ml-1">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-brand-border text-brand-text-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-hover/20 transition-all placeholder:text-brand-text-main/20"
      />
    </div>
  );
}

function ToggleGroup({ label, description, defaultChecked = false }: { label: string, description: string, defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50/50 transition-colors">
      <div className="space-y-0.5">
        <p className="text-sm font-black text-brand-text-main uppercase italic">{label}</p>
        <p className="text-xs text-brand-blue/60 font-medium">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-11 h-6 bg-brand-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
      </label>
    </div>
  );
}

function CompanySettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Informações da Empresa" 
        description="Dados cadastrais que aparecerão nos recibos e relatórios." 
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <InputGroup label="Nome Fantasia" defaultValue="Cp Sister PDV" />
            <InputGroup label="Razão Social" defaultValue="Cp Sister Soluções Tecnológicas LTDA" />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="CNPJ" defaultValue="00.000.000/0001-00" />
              <InputGroup label="Inscrição Estadual" defaultValue="Isento" />
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
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-50 pb-2">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputGroup label="Logradouro" defaultValue="Avenida das Américas, 1000" />
            </div>
            <InputGroup label="Número" defaultValue="Sala 204" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputGroup label="Bairro" defaultValue="Barra da Tijuca" />
            <InputGroup label="Cidade" defaultValue="Rio de Janeiro" />
            <InputGroup label="Estado" defaultValue="RJ" />
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Save size={18} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Meu Perfil" 
        description="Gerencie suas informações pessoais e de acesso." 
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-3xl bg-brand-blue flex items-center justify-center text-white text-3xl font-black uppercase italic shadow-xl shadow-brand-blue/20">
            AD
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black text-brand-text-main uppercase italic">Administrador</h4>
            <p className="text-sm text-brand-blue font-medium">admin@cpsister.com.br</p>
            <button className="text-[10px] font-black text-brand-blue uppercase italic hover:text-brand-text-main transition-colors">Alterar Foto</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup label="Nome Completo" defaultValue="Administrador do Sistema" />
          <InputGroup label="E-mail" defaultValue="admin@cpsister.com.br" />
          <InputGroup label="Telefone" defaultValue="(21) 99999-9999" />
          <InputGroup label="Cargo" defaultValue="Proprietário" />
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Save size={18} />
            Atualizar Perfil
          </button>
        </div>
      </div>
    </div>
  );
}

function PdvSettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Configurações do PDV" 
        description="Personalize o comportamento do ponto de venda e impressões." 
      />
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-50 pb-2">Impressão de Recibos</h4>
          <ToggleGroup 
            label="Impressão Automática" 
            description="Imprimir recibo automaticamente após finalizar a venda." 
            defaultChecked={true}
          />
          <ToggleGroup 
            label="Resumo de Itens" 
            description="Mostrar descrição detalhada de cada item no recibo." 
            defaultChecked={true}
          />
          <ToggleGroup 
            label="QR Code Pix" 
            description="Imprimir QR Code para pagamentos via Pix no recibo." 
            defaultChecked={true}
          />
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-50 pb-2">Operacional</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Desconto Máximo (%)" defaultValue="15" type="number" />
            <InputGroup label="Aviso de Estoque Baixo" defaultValue="5" type="number" />
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Save size={18} />
            Salvar Preferências
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Notificações" 
        description="Escolha como e quando você deseja ser notificado." 
      />
      <div className="p-6 space-y-4">
        <ToggleGroup 
          label="Vendas Diárias" 
          description="Receber resumo de vendas ao final do dia." 
          defaultChecked={true}
        />
        <ToggleGroup 
          label="Alertas de Estoque" 
          description="Notificar quando um produto atingir o estoque mínimo." 
          defaultChecked={true}
        />
        <ToggleGroup 
          label="Novos Clientes" 
          description="Avisar quando um novo cliente for cadastrado." 
        />
        <ToggleGroup 
          label="Relatórios Mensais" 
          description="Receber relatórios financeiros por e-mail." 
          defaultChecked={true}
        />
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Segurança" 
        description="Proteja sua conta e defina permissões de acesso." 
      />
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-50 pb-2">Alterar Senha</h4>
          <div className="grid grid-cols-1 gap-4">
            <InputGroup label="Senha Atual" type="password" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nova Senha" type="password" />
              <InputGroup label="Confirmar Nova Senha" type="password" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-brand-text-main/40 uppercase tracking-widest italic border-b border-slate-50 pb-2">Acesso</h4>
          <ToggleGroup 
            label="Autenticação em Duas Etapas" 
            description="Adicione uma camada extra de segurança ao seu login." 
          />
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-brand-blue/20 hover:bg-brand-text-main transition-all">
            <Shield size={18} />
            Atualizar Segurança
          </button>
        </div>
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Dados & Backup" 
        description="Gerencie a exportação e integridade dos seus dados." 
      />
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-brand-border bg-slate-50/30 space-y-4">
            <div className="p-3 w-fit rounded-2xl bg-brand-border text-brand-blue">
              <Database size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-brand-text-main uppercase italic">Backup Completo</h4>
              <p className="text-xs text-brand-blue/60 font-medium">Baixe todos os seus dados em formato JSON ou CSV.</p>
            </div>
            <button className="w-full py-3 bg-white border border-brand-border text-brand-blue rounded-2xl font-black uppercase italic text-xs hover:bg-slate-50 transition-all">
              Exportar Agora
            </button>
          </div>

          <div className="p-6 rounded-3xl border border-rose-100 bg-rose-50/30 space-y-4">
            <div className="p-3 w-fit rounded-2xl bg-rose-100 text-rose-600">
              <Shield size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-950 uppercase italic">Limpar Dados</h4>
              <p className="text-xs text-rose-600/60 font-medium">Remover permanentemente todos os registros de teste.</p>
            </div>
            <button className="w-full py-3 bg-white border border-rose-100 text-rose-600 rounded-2xl font-black uppercase italic text-xs hover:bg-rose-50 transition-all">
              Limpar Banco de Dados
            </button>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-brand-border bg-brand-text-main text-white space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase italic">Sincronização em Nuvem</h4>
              <p className="text-xs text-brand-border/60 font-medium">Seus dados estão sendo sincronizados em tempo real.</p>
            </div>
            <div className="px-3 py-1 bg-brand-blue-hover rounded-full text-[10px] font-black uppercase italic">Ativo</div>
          </div>
          <div className="w-full bg-brand-text-main rounded-full h-2">
            <div className="bg-brand-text-sec h-2 rounded-full w-[85%]"></div>
          </div>
          <p className="text-[10px] font-black text-brand-border/40 uppercase tracking-widest italic">Última sincronização: há 2 minutos</p>
        </div>
      </div>
    </div>
  );
}

function PricingSettingsSection() {
  const { pricingSettings, updatePricingSettings } = useERP();
  const [formData, setFormData] = useState(pricingSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    // Small delay to show the "Saving" state
    setTimeout(() => {
      try {
        updatePricingSettings(formData);
        setIsSaving(false);
        setShowSuccess(true);
        
        // Show native alert as requested, but with a slight delay to ensure UI updates
        setTimeout(() => {
          alert('✅ Configurações de precificação salvas com sucesso!');
        }, 100);

        // Hide the UI success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('Erro ao salvar:', error);
        setIsSaving(false);
        alert('❌ Erro ao salvar as configurações.');
      }
    }, 600);
  };

  return (
    <div className="divide-y divide-slate-50">
      <SectionHeader 
        title="Configurações de Precificação" 
        description="Defina as regras globais de cálculo de preços do sistema." 
      />
      <div className="p-8 space-y-8">
        {/* Method Selection */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
            <Calculator size={12} />
            Sistema trabalha com:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, defaultMethod: 'margin' }))}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                formData.defaultMethod === 'margin' 
                  ? "border-brand-blue-hover bg-slate-50 text-brand-text-main" 
                  : "border-brand-border bg-white text-brand-text-main/40 hover:border-brand-border"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="font-black uppercase italic text-xs">Margem (%)</span>
                <span className="text-[10px] opacity-60">Baseado no valor final</span>
              </div>
              {formData.defaultMethod === 'margin' && <Check size={16} className="text-brand-blue" />}
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, defaultMethod: 'markup' }))}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                formData.defaultMethod === 'markup' 
                  ? "border-brand-blue-hover bg-slate-50 text-brand-text-main" 
                  : "border-brand-border bg-white text-brand-text-main/40 hover:border-brand-border"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="font-black uppercase italic text-xs">Markup (%)</span>
                <span className="text-[10px] opacity-60">Baseado no custo</span>
              </div>
              {formData.defaultMethod === 'markup' && <Check size={16} className="text-brand-blue" />}
            </button>
          </div>
        </div>

        {/* Default Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
              <Percent size={12} />
              Margem Padrão
            </label>
            <div className="relative">
              <input 
                type="number"
                value={formData.defaultMargin}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultMargin: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-lg font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest flex items-center gap-2">
              <Percent size={12} />
              Markup Padrão
            </label>
            <div className="relative">
              <input 
                type="number"
                value={formData.defaultMarkup}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultMarkup: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-lg font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">%</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-brand-border">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl text-brand-blue">
                <Edit3 size={18} />
              </div>
              <div>
                <p className="font-black uppercase italic text-xs text-brand-text-main">Permitir editar no produto?</p>
                <p className="text-[10px] text-brand-text-main/60">Habilita/Desabilita edição manual de preços no cadastro</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, allowEditOnProduct: !prev.allowEditOnProduct }))}
              className={cn(
                "w-14 h-8 rounded-full p-1 transition-all duration-300",
                formData.allowEditOnProduct ? "bg-brand-blue" : "bg-brand-border"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                formData.allowEditOnProduct ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-brand-border">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl text-brand-blue">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="font-black uppercase italic text-xs text-brand-text-main">Arredondamento automático</p>
                <p className="text-[10px] text-brand-text-main/60">Ex: Terminar preços em ,99</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, autoRounding: !prev.autoRounding }))}
              className={cn(
                "w-14 h-8 rounded-full p-1 transition-all duration-300",
                formData.autoRounding ? "bg-brand-blue" : "bg-brand-border"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                formData.autoRounding ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
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
