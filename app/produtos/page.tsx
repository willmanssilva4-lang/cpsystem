'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Download, 
  Filter,
  AlertCircle,
  Package,
  TrendingUp,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductForm } from '@/components/ProductForm';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useERP();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedLossProduct, setSelectedLossProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  const handleSaveProduct = (formData: any) => {
    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...formData,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        profit: Number(formData.profit),
        profitPercentage: Number(formData.profitPercentage),
        composition: formData.composition
      });
    } else {
      addProduct({
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        image: formData.image,
        brand: formData.brand,
        unit: formData.unit,
        supplier: formData.supplier,
        group: formData.group,
        subgroup: formData.subgroup,
        profit: Number(formData.profit),
        profitPercentage: Number(formData.profitPercentage),
        composition: formData.composition
      });
    }
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
        setActiveMenuId(null);
      } catch (error: any) {
        console.error('Delete product error:', error);
        alert('Erro ao excluir produto: ' + (error.message || 'Verifique se o produto possui vendas ou perdas registradas.'));
      }
    }
  };

  const handleRegisterLoss = (product: Product) => {
    setSelectedLossProduct(product);
    setShowLossModal(true);
    setActiveMenuId(null);
  };

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen" onClick={() => setActiveMenuId(null)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Gestão de Produtos</h1>
          <p className="text-emerald-600/60 font-medium">Controle total do seu catálogo e inventário.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-8 h-12 bg-emerald-600 text-white rounded-xl font-black italic uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Total de Produtos" value={products.length.toString()} icon={Package} color="emerald" />
        <SummaryCard title="Estoque Baixo" value={lowStockCount.toString()} icon={AlertCircle} color="orange" />
        <SummaryCard title="Valor em Estoque" value={`R$ ${totalStockValue.toLocaleString()}`} icon={TrendingUp} color="emerald" />
        <SummaryCard title="Categorias" value="12" icon={Filter} color="emerald" />
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-emerald-50 flex flex-wrap gap-4 items-center justify-between bg-emerald-50/30">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 h-12 rounded-xl border-emerald-100 bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-medium text-emerald-950 transition-all outline-none"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-xl size-12 bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm">
              <Download size={18} />
            </button>
            <button className="flex items-center justify-center rounded-xl size-12 bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-emerald-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Preço Venda</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Estoque</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-black text-emerald-950 uppercase italic tracking-tight">{product.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-900/60 uppercase italic">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600">R$ {product.salePrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-950 uppercase">{product.stock} {product.unit || 'UN'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest",
                      product.stock <= product.minStock 
                        ? "bg-rose-50 text-rose-600 border border-rose-100" 
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>
                      {product.stock <= product.minStock ? 'Estoque Baixo' : 'Em Estoque'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === product.id ? null : product.id);
                      }}
                      className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-400 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenuId === product.id && (
                      <div className="absolute right-6 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-emerald-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(product);
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-black uppercase italic text-emerald-900 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit size={16} className="text-emerald-600" />
                          Editar Produto
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterLoss(product);
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-black uppercase italic text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors"
                        >
                          <AlertCircle size={16} />
                          Registrar Perda
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product.id);
                          }}
                          className="w-full px-4 py-3 text-left text-xs font-black uppercase italic text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={16} />
                          Excluir Produto
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ProductForm 
          initialData={editingProduct || undefined}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }} 
          onSave={handleSaveProduct} 
        />
      )}

      {showLossModal && selectedLossProduct && (
        <LossModal 
          product={selectedLossProduct}
          onClose={() => {
            setShowLossModal(false);
            setSelectedLossProduct(null);
          }}
        />
      )}
    </div>
  );
}

function LossModal({ product, onClose }: { product: Product, onClose: () => void }) {
  const { addLoss } = useERP();
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Vencimento');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addLoss({
        productId: product.id,
        quantity,
        reason,
        date: new Date().toISOString(),
        totalValue: quantity * product.costPrice
      });
      onClose();
    } catch (error) {
      console.error('Error registering loss:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-emerald-950 tracking-tight">Registrar Perda</h2>
              <p className="text-xs font-medium text-emerald-600/60">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-xl transition-colors text-emerald-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase italic tracking-widest text-emerald-900/40 mb-2">Quantidade</label>
              <input 
                type="number" 
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
              <p className="text-xs text-emerald-600/60 mt-1">Estoque atual: {product.stock}</p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase italic tracking-widest text-emerald-900/40 mb-2">Motivo</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              >
                <option value="Vencimento">Vencimento</option>
                <option value="Avaria">Avaria</option>
                <option value="Quebra">Quebra</option>
                <option value="Roubo/Furto">Roubo/Furto</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-xs font-black uppercase italic tracking-widest text-orange-900/40 mb-1">Impacto Financeiro</p>
              <p className="text-lg font-black text-orange-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quantity * product.costPrice)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-emerald-100 text-emerald-600 font-black italic uppercase tracking-widest rounded-xl hover:bg-emerald-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-500 text-white font-black italic uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar Perda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-emerald-50 text-emerald-600",
    orange: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-emerald-100 flex items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
      <div className={`size-16 rounded-[24px] flex items-center justify-center transition-transform group-hover:scale-110 border-2 border-emerald-100/50 ${colors[color]}`}>
        <Icon size={32} />
      </div>
      <div>
        <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest italic mb-1">{title}</p>
        <p className="text-3xl font-black text-emerald-950 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
