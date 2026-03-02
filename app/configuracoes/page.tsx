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
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('empresa');

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'pdv', label: 'PDV & Impressão', icon: Printer },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'dados', label: 'Dados & Backup', icon: Database },
  ];

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Configurações</h2>
        <p className="text-emerald-600/60 font-medium">Gerencie as preferências do sistema e informações da sua empresa.</p>
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
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                  : "text-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-700"
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
            className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden"
          >
            {activeTab === 'empresa' && <CompanySettings />}
            {activeTab === 'perfil' && <ProfileSettings />}
            {activeTab === 'pdv' && <PdvSettings />}
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
    <div className="p-6 border-bottom border-emerald-50 bg-emerald-50/30">
      <h3 className="text-lg font-black italic uppercase text-emerald-950">{title}</h3>
      <p className="text-xs font-medium text-emerald-600/60">{description}</p>
    </div>
  );
}

function InputGroup({ label, placeholder, type = "text", defaultValue = "" }: { label: string, placeholder?: string, type?: string, defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic ml-1">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-emerald-950 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-emerald-900/20"
      />
    </div>
  );
}

function ToggleGroup({ label, description, defaultChecked = false }: { label: string, description: string, defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50/50 transition-colors">
      <div className="space-y-0.5">
        <p className="text-sm font-black text-emerald-950 uppercase italic">{label}</p>
        <p className="text-xs text-emerald-600/60 font-medium">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-11 h-6 bg-emerald-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  );
}

function CompanySettings() {
  return (
    <div className="divide-y divide-emerald-50">
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
            <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic ml-1">Logo da Empresa</label>
            <div className="aspect-square rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-emerald-100/50 transition-colors group">
              <ImageIcon className="text-emerald-300 group-hover:text-emerald-500 transition-colors" size={32} />
              <span className="text-[10px] font-black text-emerald-400 uppercase italic">Alterar Logo</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic border-b border-emerald-50 pb-2">Endereço</h4>
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
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
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
    <div className="divide-y divide-emerald-50">
      <SectionHeader 
        title="Meu Perfil" 
        description="Gerencie suas informações pessoais e de acesso." 
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-3xl bg-emerald-600 flex items-center justify-center text-white text-3xl font-black uppercase italic shadow-xl shadow-emerald-600/20">
            AD
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black text-emerald-950 uppercase italic">Administrador</h4>
            <p className="text-sm text-emerald-600 font-medium">admin@cpsister.com.br</p>
            <button className="text-[10px] font-black text-emerald-600 uppercase italic hover:text-emerald-800 transition-colors">Alterar Foto</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup label="Nome Completo" defaultValue="Administrador do Sistema" />
          <InputGroup label="E-mail" defaultValue="admin@cpsister.com.br" />
          <InputGroup label="Telefone" defaultValue="(21) 99999-9999" />
          <InputGroup label="Cargo" defaultValue="Proprietário" />
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
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
    <div className="divide-y divide-emerald-50">
      <SectionHeader 
        title="Configurações do PDV" 
        description="Personalize o comportamento do ponto de venda e impressões." 
      />
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h4 className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic border-b border-emerald-50 pb-2">Impressão de Recibos</h4>
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
          <h4 className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic border-b border-emerald-50 pb-2">Operacional</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Desconto Máximo (%)" defaultValue="15" type="number" />
            <InputGroup label="Aviso de Estoque Baixo" defaultValue="5" type="number" />
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
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
    <div className="divide-y divide-emerald-50">
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
    <div className="divide-y divide-emerald-50">
      <SectionHeader 
        title="Segurança" 
        description="Proteja sua conta e defina permissões de acesso." 
      />
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic border-b border-emerald-50 pb-2">Alterar Senha</h4>
          <div className="grid grid-cols-1 gap-4">
            <InputGroup label="Senha Atual" type="password" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nova Senha" type="password" />
              <InputGroup label="Confirmar Nova Senha" type="password" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h4 className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic border-b border-emerald-50 pb-2">Acesso</h4>
          <ToggleGroup 
            label="Autenticação em Duas Etapas" 
            description="Adicione uma camada extra de segurança ao seu login." 
          />
        </div>

        <div className="flex justify-end pt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">
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
    <div className="divide-y divide-emerald-50">
      <SectionHeader 
        title="Dados & Backup" 
        description="Gerencie a exportação e integridade dos seus dados." 
      />
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 space-y-4">
            <div className="p-3 w-fit rounded-2xl bg-emerald-100 text-emerald-600">
              <Database size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-emerald-950 uppercase italic">Backup Completo</h4>
              <p className="text-xs text-emerald-600/60 font-medium">Baixe todos os seus dados em formato JSON ou CSV.</p>
            </div>
            <button className="w-full py-3 bg-white border border-emerald-100 text-emerald-600 rounded-2xl font-black uppercase italic text-xs hover:bg-emerald-50 transition-all">
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

        <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-950 text-white space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase italic">Sincronização em Nuvem</h4>
              <p className="text-xs text-emerald-200/60 font-medium">Seus dados estão sendo sincronizados em tempo real.</p>
            </div>
            <div className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase italic">Ativo</div>
          </div>
          <div className="w-full bg-emerald-900 rounded-full h-2">
            <div className="bg-emerald-400 h-2 rounded-full w-[85%]"></div>
          </div>
          <p className="text-[10px] font-black text-emerald-200/40 uppercase tracking-widest italic">Última sincronização: há 2 minutos</p>
        </div>
      </div>
    </div>
  );
}
