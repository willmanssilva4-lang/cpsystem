'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { CustomerModal } from '@/components/CustomerModal';
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
  Star,
  Edit2,
  Trash2,
  Zap,
  TrendingUp,
  Target,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const { customers, sales, products, categorias, subcategorias, hasPermission, deleteCustomer } = useERP();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customers[0]?.id || null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const customerSales = React.useMemo(() => {
    return sales.filter(s => s.customerId === selectedCustomer?.id);
  }, [sales, selectedCustomer]);

  // CRM Insights Calculation
  const crmInsights = React.useMemo(() => {
    if (!selectedCustomer || customerSales.length === 0) return null;

    const productCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    customerSales.forEach(sale => {
      sale.items.forEach(item => {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
        
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const catId = product.subcategoria_id;
          if (catId) {
            const sub = subcategorias.find(s => s.id === catId);
            if (sub) {
              const cat = categorias.find(c => c.id === sub.categoria_id);
              if (cat) {
                categoryCounts[cat.nome] = (categoryCounts[cat.nome] || 0) + item.quantity;
              }
            }
          }
        }
      });
    });

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, qty]) => {
        const p = products.find(prod => prod.id === id);
        return { name: p?.name || 'Produto', qty };
      });

    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { topProducts, topCategory };
  }, [selectedCustomer, customerSales, products, categorias, subcategorias]);

  if (!hasPermission('Clientes', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Users size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o módulo de Clientes.</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.document.includes(search)
  );

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(selectedCustomer.id);
      setSelectedCustomerId(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* Customer List */}
      <section className={cn(
        "flex-1 flex flex-col border-r border-brand-border bg-brand-card",
        selectedCustomerId && "hidden lg:flex"
      )}>
        <div className="p-4 md:p-6 border-b border-brand-border space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-black text-brand-text-main uppercase italic">Clientes</h1>
            <button 
              onClick={() => {
                setCustomerToEdit(null);
                setShowCustomerModal(true);
              }}
              className="p-2 bg-brand-blue-hover text-white rounded-lg hover:bg-brand-blue transition-all"
            >
              <UserPlus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 h-11 bg-slate-50 border-brand-border rounded-xl text-sm"
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredCustomers.map((customer) => (
            <div 
              key={customer.id}
              onClick={() => setSelectedCustomerId(customer.id)}
              className={cn(
                "p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-slate-50",
                selectedCustomer?.id === customer.id ? "bg-slate-50 border-r-4 border-brand-blue" : ""
              )}
            >
              <div className="size-12 rounded-full overflow-hidden relative border-2 border-white shadow-sm shrink-0">
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
                  <h3 className="font-bold text-brand-text-main truncate">{customer.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                      customer.status === 'VIP' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {customer.status}
                    </span>
                    {customer.isClubMember && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Crown size={8} />
                        Clube
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 truncate">{customer.email}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))}
        </div>
      </section>

      {/* Customer Detail Sidebar */}
      <aside className={cn(
        "w-full lg:w-[450px] bg-brand-bg overflow-y-auto p-4 md:p-8",
        !selectedCustomerId && "hidden lg:block",
        selectedCustomerId && "block"
      )}>
        {selectedCustomerId && (
          <button 
            onClick={() => setSelectedCustomerId(null)}
            className="lg:hidden mb-6 flex items-center gap-2 text-brand-blue font-bold uppercase italic text-xs"
          >
            <ChevronRight size={16} className="rotate-180" />
            Voltar para a lista
          </button>
        )}
        {selectedCustomer ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="size-32 rounded-3xl overflow-hidden relative shadow-xl border-4 border-white">
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
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-black text-brand-text-main">{selectedCustomer.name}</h2>
                  {selectedCustomer.isClubMember && (
                    <div className="bg-blue-600 text-white p-1 rounded-lg shadow-lg shadow-blue-600/20" title="Membro do Clube">
                      <Crown size={16} />
                    </div>
                  )}
                </div>
                <p className="text-slate-500 font-medium">{selectedCustomer.document}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setCustomerToEdit(selectedCustomer);
                    setShowCustomerModal(true);
                  }}
                  className="px-4 py-2 bg-white border border-brand-border rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-100 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
                <button className="px-4 py-2 bg-brand-blue-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue-hover/20 hover:bg-brand-blue">Nova Venda</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Gasto</p>
                <p className="text-lg font-black text-brand-blue">R$ {customerSales.reduce((acc, s) => acc + s.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Compra</p>
                <p className="text-lg font-black text-brand-text-main">
                  {customerSales.length > 0 
                    ? new Date(customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* CRM Insights Section */}
            {selectedCustomer.isClubMember && crmInsights && (
              <div className="space-y-4 p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-600/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase italic tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    CRM Insights Clube
                  </h4>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">IA Ativa</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-200 uppercase">Categoria Preferida</p>
                      <p className="text-sm font-black">{crmInsights.topCategory}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-blue-200 uppercase">Produtos Frequentes</p>
                    <div className="flex flex-wrap gap-2">
                      {crmInsights.topProducts.map((p, i) => (
                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">
                          {p.name} ({p.qty})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-amber-400 text-blue-900 flex items-center justify-center shrink-0">
                        <Target size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-200 uppercase">Sugestão de Oferta</p>
                        <p className="text-xs font-medium leading-relaxed">
                          Este cliente tem alta recorrência em <span className="font-bold text-amber-400">{crmInsights.topCategory}</span>. 
                          Crie uma oferta exclusiva de &quot;Leve 3 Pague 2&quot; para aumentar o ticket.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informações de Contato</h4>
              <div className="bg-brand-card rounded-2xl border border-brand-border divide-y divide-slate-100">
                <ContactItem icon={Mail} label="Email" value={selectedCustomer.email} />
                <ContactItem icon={Phone} label="Telefone" value={selectedCustomer.phone} />
                <ContactItem icon={MapPin} label="Endereço" value="Rua das Flores, 123 - São Paulo, SP" />
                <ContactItem icon={Calendar} label="Cliente desde" value="Janeiro de 2023" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico de Compras</h4>
                <button className="text-xs font-bold text-brand-blue">Ver Tudo</button>
              </div>
              <div className="space-y-3">
                {customerSales.length > 0 ? (
                  customerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((sale) => (
                    <div key={sale.id} className="bg-brand-card p-4 rounded-2xl border border-brand-border flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">Venda #{sale.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(sale.date).toLocaleDateString('pt-BR')} • {sale.items.length} itens
                        </p>
                      </div>
                      <p className="text-sm font-black text-brand-text-main">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-slate-400 font-bold">Nenhuma compra registrada.</p>
                )}
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

      {showCustomerModal && (
        <CustomerModal 
          customerToEdit={customerToEdit}
          onClose={() => {
            setShowCustomerModal(false);
            setCustomerToEdit(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-2">Excluir Cliente</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Tem certeza que deseja excluir <strong>{selectedCustomer?.name}</strong>? Esta ação removerá permanentemente os dados do cadastro.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-sm font-medium text-brand-text-main">{value}</p>
      </div>
    </div>
  );
}
