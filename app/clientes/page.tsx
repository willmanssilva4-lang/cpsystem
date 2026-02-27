'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag,
  MoreVertical,
  Filter,
  Users,
  ChevronRight,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const { customers } = useERP();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.document.includes(search)
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Customer List */}
      <section className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Clientes</h1>
            <button className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all">
              <UserPlus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((customer) => (
            <div 
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={cn(
                "p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50",
                selectedCustomer?.id === customer.id ? "bg-emerald-50 dark:bg-emerald-900/10 border-r-4 border-emerald-500" : ""
              )}
            >
              <div className="size-12 rounded-full overflow-hidden relative border-2 border-white dark:border-slate-700 shadow-sm">
                <Image 
                  src={customer.image || 'https://i.pravatar.cc/150'} 
                  alt={customer.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{customer.name}</h3>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                    customer.status === 'VIP' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {customer.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{customer.email}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))}
        </div>
      </section>

      {/* Customer Detail Sidebar */}
      <aside className="w-[450px] bg-slate-50 dark:bg-slate-950 overflow-y-auto p-8">
        {selectedCustomer ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="size-32 rounded-3xl overflow-hidden relative shadow-xl border-4 border-white dark:border-slate-800">
                  <Image 
                    src={selectedCustomer.image || 'https://i.pravatar.cc/150'} 
                    alt={selectedCustomer.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {selectedCustomer.status === 'VIP' && (
                  <div className="absolute -top-3 -right-3 bg-amber-400 text-white p-2 rounded-xl shadow-lg">
                    <Star size={20} fill="currentColor" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                <p className="text-slate-500 font-medium">{selectedCustomer.document}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50">Editar</button>
                <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">Nova Venda</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                <p className="text-lg font-black text-emerald-600">R$ {selectedCustomer.totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Compra</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">12 Out</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informações de Contato</h4>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                <ContactItem icon={Mail} label="Email" value={selectedCustomer.email} />
                <ContactItem icon={Phone} label="Telefone" value={selectedCustomer.phone} />
                <ContactItem icon={MapPin} label="Endereço" value="Rua das Flores, 123 - São Paulo, SP" />
                <ContactItem icon={Calendar} label="Cliente desde" value="Janeiro de 2023" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico de Compras</h4>
                <button className="text-xs font-bold text-emerald-600">Ver Tudo</button>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <ShoppingBag size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Venda #8492{i}</p>
                      <p className="text-xs text-slate-500">12/10/2023 • 3 itens</p>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">R$ 450,00</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
            <Users size={64} className="mb-4" />
            <p className="font-bold">Selecione um cliente para ver detalhes</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="size-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}
