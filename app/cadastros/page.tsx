'use client';

import React from 'react';
import { 
  Truck, 
  UserSquare2, 
  CreditCard, 
  Layers, 
  FolderTree, 
  Tags, 
  LayoutGrid 
} from 'lucide-react';
import { motion } from 'motion/react';

import Link from 'next/link';

const REGISTRATION_OPTIONS = [
  { icon: Truck, label: 'Fornecedores', description: 'Gerencie seus fornecedores', href: '/cadastros/fornecedores' },
  { icon: UserSquare2, label: 'Funcionários', description: 'Cadastro de equipe e permissões', href: '/cadastros/funcionarios' },
  { icon: CreditCard, label: 'Forma de Pagamento', description: 'Configure métodos de recebimento', href: '/cadastros/pagamentos' },
  { icon: LayoutGrid, label: 'Sessão/Departamento', description: 'Organize sua loja por setores', href: '/cadastros/departamentos' },
  { icon: Layers, label: 'Grupo', description: 'Agrupamento principal de produtos', href: '/cadastros/grupos' },
  { icon: FolderTree, label: 'Subgrupo', description: 'Subdivisões dos grupos', href: '/cadastros/subgrupos' },
  { icon: Tags, label: 'Categoria', description: 'Categorização para relatórios', href: '/cadastros/categorias' },
];

export default function RegistrationsPage() {
  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Central de Cadastros</h1>
        <p className="text-brand-blue/60 font-medium">Gerencie as configurações base do seu sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {REGISTRATION_OPTIONS.map((option, index) => (
          <Link
            key={option.label}
            href={option.href}
            className="group flex flex-col items-start gap-4 p-6 rounded-[32px] border border-brand-border bg-white hover:border-brand-blue-hover hover:shadow-xl hover:-translate-y-1 transition-all text-left active:scale-[0.98]"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="w-full h-full flex flex-col gap-4"
            >
              <div className="bg-slate-50 text-brand-blue p-4 rounded-2xl group-hover:bg-brand-blue group-hover:text-white transition-colors border border-brand-border/50 w-fit">
                <option.icon size={32} />
              </div>
              <div>
                <div className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">{option.label}</div>
                <div className="text-xs text-brand-text-main/40 font-bold uppercase italic leading-tight mt-2">{option.description}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
