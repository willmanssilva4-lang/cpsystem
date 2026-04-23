'use client';

import React, { useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { Plus, Search, Filter, Edit, Trash2, Tag, Percent, ShoppingBag, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import PromotionModal from '@/components/PromotionModal';
import { Promotion } from '@/lib/types';

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Promoções e Ofertas</h1>
        {user?.role === 'Administrador' && (
          <button
            onClick={() => {
              setEditingPromotion(undefined);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nova Promoção
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar promoção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="PRICE">Preço Promocional</option>
            <option value="PERCENTAGE">Desconto %</option>
            <option value="BUY_X_GET_Y">Leve X Pague Y</option>
            <option value="COMBO">Combo</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Promoção</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Tipo</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Período</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-600">Vendas</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-600">Desc. Total</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-600">Status</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPromotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {promo.name}
                      {promo.onlyForClubMembers && (
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200 uppercase">
                          Clube
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {promo.targetType === 'ALL' ? 'Todos os produtos' : 
                       promo.targetType === 'CATEGORY' ? 'Categoria específica' : 'Produto específico'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getPromotionTypeIcon(promo.type)}
                      <span className="text-gray-700">{getPromotionTypeLabel(promo.type)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-gray-700">
                      {formatDate(promo.startDate)} até {formatDate(promo.endDate)}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-bold text-gray-900">
                      {sales.reduce((acc, sale) => acc + sale.items.filter(i => i.promotionId === promo.id).reduce((sum, i) => sum + i.quantity, 0), 0)}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-bold text-green-600">
                      R$ {sales.reduce((acc, sale) => acc + sale.items.filter(i => i.promotionId === promo.id).reduce((sum, i) => sum + (i.discount || 0) * i.quantity, 0), 0).toFixed(2).replace('.', ',')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      promo.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {promo.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {user?.role === 'Administrador' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedPromotions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Nenhuma promoção encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between overflow-x-auto">
            <div className="text-sm text-gray-500 whitespace-nowrap mr-4">
              Mostrando <span className="font-medium text-gray-900">{startIndex + 1}</span> a <span className="font-medium text-gray-900">{endIndex}</span> de <span className="font-medium text-gray-900">{totalItems}</span> promoções
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Lógica simplificada para mostrar apenas algumas páginas se houver muitas
                  if (
                    totalPages > 7 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - currentPage) > 1
                  ) {
                    if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 hover:bg-white text-gray-600'
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
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={20} />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Promoção</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta promoção? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPromotionToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
