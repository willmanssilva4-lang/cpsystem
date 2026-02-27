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
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
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
        profitPercentage: Number(formData.profitPercentage)
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
      await deleteProduct(id);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="p-8 space-y-8" onClick={() => setActiveMenuId(null)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gestão de Produtos</h1>
          <p className="text-slate-500 dark:text-slate-400">Controle total do seu catálogo e inventário.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 h-12 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Total de Produtos" value={products.length.toString()} icon={Package} color="blue" />
        <SummaryCard title="Estoque Baixo" value={lowStockCount.toString()} icon={AlertCircle} color="orange" />
        <SummaryCard title="Valor em Estoque" value={`R$ ${totalStockValue.toLocaleString()}`} icon={TrendingUp} color="emerald" />
        <SummaryCard title="Categorias" value="12" icon={Filter} color="indigo" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-blue-600 text-sm"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-lg size-10 bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200">
              <Download size={18} />
            </button>
            <button className="flex items-center justify-center rounded-lg size-10 bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço Venda</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg overflow-hidden relative border border-slate-200">
                        <Image 
                          src={product.image} 
                          alt={product.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{product.name}</p>
                        <p className="text-xs text-slate-500">ID: {product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">{product.sku}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">R$ {product.salePrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold">{product.stock} UN</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                      product.stock <= product.minStock 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
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
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenuId === product.id && (
                      <div className="absolute right-6 top-12 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Edit size={16} />
                          Editar Produto
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
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
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
      <div className={`size-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
