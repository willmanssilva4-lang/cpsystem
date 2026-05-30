'use client';

import React, { useState } from 'react';
import { 
  Truck, 
  UserSquare2, 
  CreditCard, 
  Tags, 
  LayoutGrid,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { CustomerModal } from '../../components/CustomerModal';

import Link from 'next/link';

const REGISTRATION_OPTIONS = [
  { icon: Truck, label: 'Fornecedores', description: 'Gerencie seus fornecedores', href: '/cadastros/fornecedores' },
  { icon: UserSquare2, label: 'Funcionários', description: 'Cadastro de equipe e permissões', href: '/cadastros/funcionarios' },
  { icon: CreditCard, label: 'Forma de Pagamento', description: 'Configure métodos de recebimento', href: '/cadastros/pagamentos' },
  { icon: LayoutGrid, label: 'Departamentos', description: 'Departamentos, Categorias e Subcategorias', href: '/cadastros/categorias' },
  { icon: CreditCard, label: 'Maquininhas', description: 'Configure suas máquinas de cartão', href: '/cadastros/maquininhas' },
  { icon: Users, label: 'Clientes', description: 'Cadastro e gestão de clientes', href: '/clientes' },
];

export default function RegistrationsPage() {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const renderCardContent = (option: typeof REGISTRATION_OPTIONS[0], index: number) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="w-full h-full flex flex-col gap-5"
    >
      <div className="w-14 h-14 rounded-3xl bg-brand-bg flex items-center justify-center text-brand-blue border border-brand-border group-hover:bg-brand-blue group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
        <option.icon size={26} strokeWidth={2.5} />
      </div>
      <div>
        <div className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">{option.label}</div>
        <div className="text-[11px] text-brand-text-sec font-bold uppercase italic leading-snug mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {option.description}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-brand-bg/50 min-h-screen relative">
      {/* Visual background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-green/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[2rem] bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 shadow-inner">
            <LayoutGrid size={32} />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-brand-text-main italic uppercase">Central de Cadastros</h1>
            <p className="text-brand-text-sec font-medium text-sm mt-1 max-w-xl">Gerencie as configurações operacionais, equipe, estoque e parceiros do seu sistema em um único painel consolidado.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
        {REGISTRATION_OPTIONS.map((option, index) => (
          option.label === 'Clientes' ? (
            <button
              key={option.label}
              onClick={() => setIsCustomerModalOpen(true)}
              className="group flex flex-col items-start gap-4 p-8 rounded-[2.5rem] border border-brand-border bg-brand-card hover:border-brand-blue/30 hover:shadow-2xl hover:shadow-brand-blue/5 hover:-translate-y-2 transition-all duration-300 text-left active:scale-[0.98] w-full"
            >
              {renderCardContent(option, index)}
            </button>
          ) : (
            <Link
              key={option.label}
              href={option.href || '#'}
              className="group flex flex-col items-start gap-4 p-8 rounded-[2.5rem] border border-brand-border bg-brand-card hover:border-brand-blue/30 hover:shadow-2xl hover:shadow-brand-blue/5 hover:-translate-y-2 transition-all duration-300 text-left active:scale-[0.98] w-full"
            >
              {renderCardContent(option, index)}
            </Link>
          )
        ))}
      </div>

      {isCustomerModalOpen && (
        <CustomerModal onClose={() => setIsCustomerModalOpen(false)} />
      )}
    </div>
  );
}
