'use client';

import React, { useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { Plus, Search, Filter, Edit, Trash2, Tag, Percent, ShoppingBag, Layers, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import PromotionModal from '@/components/PromotionModal';
import { Promotion } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export default function PromocoesPage() {
  const { promotions, deletePromotion, sales, user } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>(undefined);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setPromotionToDelete(id);
  };

  const confirmDelete = async () => {
    if (promotionToDelete) {
      try {
        await deletePromotion(promotionToDelete);
      } catch (error: any) {
        console.error('Erro ao excluir:', error);
        // You could add a toast notification here
      } finally {
        setPromotionToDelete(null);
      }
    }
  };

  const filteredPromotions = promotions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Cálculos de paginação
  const totalItems = filteredPromotions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedPromotions = filteredPromotions.slice(startIndex, startIndex + itemsPerPage);

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'PRICE': return 'Preço Promocional';
      case 'PERCENTAGE': return 'Desconto %';
      case 'BUY_X_GET_Y': return 'Leve X Pague Y';
      case 'COMBO': return 'Combo';
      default: return type;
    }
  };

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'PRICE': return <Tag className="w-4 h-4 text-blue-500" />;
      case 'PERCENTAGE': return <Percent className="w-4 h-4 text-green-500" />;
      case 'BUY_X_GET_Y': return <ShoppingBag className="w-4 h-4 text-orange-500" />;
      case 'COMBO': return <Layers className="w-4 h-4 text-purple-500" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Campanhas & Ofertas</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão de Promoções e Descontos do PDV</p>
        </div>
        {(user?.role?.trim().toLowerCase() === 'administrador' || user?.role?.trim().toLowerCase() === 'admin' || user?.role?.trim().toLowerCase() === 'gerente') && (
          <button
            onClick={() => {
              setEditingPromotion(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20 active:scale-95 text-sm cursor-pointer"
          >
            <Plus size={20} />
            Nova Promoção
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar promoção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none"
          >
            <option value="ALL">TODOS OS TIPOS</option>
            <option value="PRICE">PREÇO PROMOCIONAL</option>
            <option value="PERCENTAGE">DESCONTO %</option>
            <option value="BUY_X_GET_Y">LEVE X PAGUE Y</option>
            <option value="COMBO">COMBO</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none"
          >
            <option value="ALL">TODOS OS STATUS</option>
            <option value="ACTIVE">ATIVA</option>
            <option value="INACTIVE">INATIVA</option>
          </select>
        </div>
      </div>

      {/* Listings Table / Cards */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Promoção</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Período</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendas</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Desc. Total</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPromotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                  <td className="py-5 px-6">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="font-black text-sm uppercase">{promo.name}</span>
                      {promo.onlyForClubMembers && (
                        <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-900/50 uppercase tracking-wider">
                          Clube
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                      {promo.targetType === 'ALL' ? 'Todos os produtos' : 
                       promo.targetType === 'CATEGORY' ? 'Categoria específica' : 'Produto específico'}
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        {getPromotionTypeIcon(promo.type)}
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{getPromotionTypeLabel(promo.type)}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span>{formatDate(promo.startDate)}</span>
                      <span className="text-slate-300 font-sans">→</span>
                      <span>{formatDate(promo.endDate)}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <div className="font-mono font-black text-slate-700 dark:text-slate-300 text-sm">
                      {sales.reduce((acc, sale) => acc + sale.items.filter((i: any) => i.promotionId === promo.id).reduce((sum: number, i: any) => sum + i.quantity, 0), 0)}
                    </div>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {sales.reduce((acc, sale) => acc + sale.items.filter((i: any) => i.promotionId === promo.id).reduce((sum: number, i: any) => sum + (i.discount || 0) * i.quantity, 0), 0).toFixed(2).replace('.', ',')}
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    {(() => {
                      const todayStr = getLocalDateString();
                      const endStr = getLocalDateString(promo.endDate);
                      const isExpired = promo.status === 'ACTIVE' && todayStr > endStr;
                      return (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          isExpired
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50'
                            : promo.status === 'ACTIVE' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50' 
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-800'
                        }`}>
                          {isExpired ? 'Expirada' : promo.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-5 px-6 text-right">
                    {(user?.role?.trim().toLowerCase() === 'administrador' || user?.role?.trim().toLowerCase() === 'admin' || user?.role?.trim().toLowerCase() === 'gerente') && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-2 text-slate-400 hover:text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedPromotions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Nenhuma promoção ou campanha cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap mr-4">
              Mostrando <span className="font-extrabold text-slate-700 dark:text-slate-300">{startIndex + 1}</span> a <span className="font-extrabold text-slate-700 dark:text-slate-300">{endIndex}</span> de <span className="font-extrabold text-slate-700 dark:text-slate-300">{totalItems}</span> promoções
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    totalPages > 7 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - currentPage) > 1
                  ) {
                    if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-2 text-slate-400">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <PromotionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          promotion={editingPromotion}
        />
      )}

      {promotionToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 border border-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase italic mb-2">Excluir Promoção</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed mb-6">Tem certeza que deseja excluir esta promoção? Esta ação é irreversível e removerá todos os descontos associados.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPromotionToDelete(null)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
