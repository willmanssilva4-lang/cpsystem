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
  TrendingDown,
  X,
  Edit,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Coins,
  History,
  ArrowLeftRight,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductForm } from '@/components/ProductForm';
import PricingSettingsModal from '@/components/PricingSettingsModal';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, stockMovements, inventories, addStockMovement, addInventory, user } = useERP();
  const [showModal, setShowModal] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedLossProduct, setSelectedLossProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('produtos');

  // Adjustment form state
  const [adjustmentProductId, setAdjustmentProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ENTRADA' | 'SAÍDA'>('ENTRADA');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Correção de Saldo');
  const [isAdjusting, setIsAdjusting] = useState(false);

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
        composition: formData.composition,
        status: formData.status
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
        composition: formData.composition,
        status: formData.status
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
    // Close menu first to avoid UI glitches
    setActiveMenuId(null);
    
    if (window.confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      try {
        await deleteProduct(id);
        alert('Produto excluído com sucesso!');
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

  const handleStockAdjustment = async () => {
    if (!adjustmentProductId || adjustmentQty <= 0) {
      alert('Selecione um produto e informe uma quantidade válida.');
      return;
    }

    setIsAdjusting(true);
    try {
      await addStockMovement({
        productId: adjustmentProductId,
        type: 'AJUSTE',
        quantity: adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty,
        origin: `Ajuste: ${adjustmentReason}`,
        date: new Date().toISOString(),
        userId: user?.email || 'system',
        userName: user?.name || 'Sistema'
      });
      
      alert('Ajuste realizado com sucesso!');
      setAdjustmentQty(0);
      setAdjustmentProductId('');
    } catch (error) {
      console.error('Adjustment error:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleStartInventory = async () => {
    if (window.confirm('Deseja iniciar um novo inventário geral?')) {
      try {
        await addInventory({
          date: new Date().toISOString(),
          location: 'Loja Principal',
          itemsCounted: products.length,
          divergenceValue: 0,
          status: 'Em Andamento',
          notes: 'Inventário iniciado via painel de gestão.'
        });
        alert('Novo inventário iniciado!');
      } catch (error) {
        console.error('Inventory error:', error);
      }
    }
  };

  return (
    <div className="p-8 space-y-6 bg-brand-bg min-h-screen" onClick={() => setActiveMenuId(null)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-brand-text-main">Gestão de Produtos</h1>
          <p className="text-brand-text-sec text-sm">Controle total do seu catálogo e inventário.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPricingSettings(true)}
            className="flex items-center justify-center w-10 h-10 bg-white border border-brand-border text-brand-text-sec rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            title="Configurações de Precificação"
          >
            <Settings2 size={18} />
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 h-10 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue-hover transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-brand-border gap-8">
        {[
          { id: 'produtos', label: 'Produtos', icon: Package },
          { id: 'movimentacoes', label: 'Movimentações', icon: History },
          { id: 'ajustes', label: 'Ajustes de Estoque', icon: ArrowLeftRight },
          { id: 'inventario', label: 'Inventário', icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-2 transition-all font-black uppercase italic text-xs tracking-widest",
              activeTab === tab.id 
                ? "border-brand-blue text-brand-blue" 
                : "border-transparent text-brand-text-main/40 hover:text-brand-text-main/60"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'produtos' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <SummaryCard title="Total de Produtos" value={products.length.toString()} icon={Package} color="green" />
            <SummaryCard title="Estoque Baixo" value={lowStockCount.toString()} icon={AlertCircle} color="red" />
            <SummaryCard title="Quantidade Total" value={products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} icon={Package} color="blue" />
            <SummaryCard title="Estoque Valorizado" value={`R$ ${totalStockValue.toLocaleString()}`} icon={TrendingUp} color="orange" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                  <Package size={16} />
                  <span>Todas as Categorias</span>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm font-medium text-slate-700 transition-all outline-none"
                    placeholder="Buscar por produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <BarChart3 size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" />
                <div className="flex items-center gap-2 text-slate-400">
                  <ChevronLeft size={18} className="cursor-pointer hover:text-slate-600" />
                  <ChevronRight size={18} className="cursor-pointer hover:text-slate-600" />
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium cursor-pointer hover:text-brand-blue">
                  <Download size={16} />
                  <span>Exportar</span>
                  <ChevronDown size={14} />
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium cursor-pointer hover:text-brand-blue">
                  <Package size={16} />
                  <span>Todas as Categorias</span>
                  <ChevronDown size={14} />
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                <Trash2 size={16} className="text-slate-400 cursor-pointer hover:text-rose-500" />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                  <Download size={16} />
                  <span>Exportar</span>
                </button>
                <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="w-12 px-6 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" />
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Custo</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Venda</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="w-12 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                            <Package size={16} />
                          </div>
                          <span className="font-bold text-slate-700">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{product.stock}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {product.costPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {product.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={product.stock <= product.minStock ? 'Estoque Baixo' : (product.status === 'Inativo' ? 'Indisponivel' : 'Disponivel')} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        >
                          <Search size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Mostrando {filteredProducts.length} de {products.length} produtos
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <ChevronLeft size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map(page => (
                      <button 
                        key={page}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                          page === 1 ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <ChevronRight size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'movimentacoes' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight">Histórico de Movimentações Global</h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
                  <Download size={14} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem/Destino</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockMovements.length > 0 ? (
                    stockMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50).map((mov) => (
                      <tr key={mov.id} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                          {new Date(mov.date).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-700">{mov.productName || 'Produto Excluído'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                            mov.type === 'ENTRADA' ? "bg-emerald-100 text-emerald-600" : 
                            mov.type === 'SAÍDA' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {mov.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{mov.origin}</td>
                        <td className={cn(
                          "px-6 py-4 text-xs font-black text-center",
                          mov.quantity > 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{mov.userName || mov.userId}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                        Nenhuma movimentação encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ajustes' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 space-y-8">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight">Ajuste de Estoque em Massa</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Selecione os produtos para ajustar o saldo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Selecionar Produto:</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={adjustmentProductId}
                      onChange={(e) => setAdjustmentProductId(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue text-sm font-bold text-slate-700 transition-all outline-none appearance-none"
                    >
                      <option value="">Selecione um produto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) - Estoque: {p.stock}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Tipo de Ajuste:</label>
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button 
                        onClick={() => setAdjustmentType('ENTRADA')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-xs transition-all",
                          adjustmentType === 'ENTRADA' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <TrendingUp size={16} />
                        Entrada
                      </button>
                      <button 
                        onClick={() => setAdjustmentType('SAÍDA')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-xs transition-all",
                          adjustmentType === 'SAÍDA' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-rose-500"
                        )}
                      >
                        <TrendingDown size={16} />
                        Saída
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Quantidade:</label>
                    <input 
                      type="number"
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xl font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Motivo do Ajuste:</label>
                  <select 
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="Correção de Saldo">Correção de Saldo</option>
                    <option value="Avaria / Quebra">Avaria / Quebra</option>
                    <option value="Vencimento">Vencimento</option>
                    <option value="Bonificação">Bonificação</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <button 
                  onClick={handleStockAdjustment}
                  disabled={isAdjusting}
                  className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl shadow-brand-blue/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAdjusting ? 'Processando...' : 'Confirmar Ajuste de Estoque'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Instruções</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    O ajuste de estoque é uma operação crítica. Certifique-se de que o motivo selecionado condiz com a realidade física. 
                    <br /><br />
                    Todas as alterações serão registradas no histórico de movimentações com o seu usuário.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventario' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight">Inventário Geral</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Gestão de contagens físicas</p>
              </div>
              <button 
                onClick={handleStartInventory}
                className="bg-brand-blue hover:bg-brand-blue-hover text-white px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
              >
                Iniciar Novo Inventário
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-brand-blue shadow-sm">
                  <ClipboardList size={32} />
                </div>
                {inventories.length > 0 ? (
                  <>
                    <div>
                      <h4 className="text-sm font-black text-slate-700 uppercase italic">Último Inventário</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(inventories[0].date).toLocaleDateString('pt-BR')} - {inventories[0].location}
                      </p>
                    </div>
                    <div className="w-full h-px bg-slate-200" />
                    <div className="grid grid-cols-2 w-full gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Contados</p>
                        <p className="text-lg font-black text-slate-700">{inventories[0].itemsCounted}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Divergência</p>
                        <p className={cn(
                          "text-lg font-black",
                          inventories[0].divergenceValue < 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                          R$ {inventories[0].divergenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase italic">Nenhum Inventário Realizado</h4>
                  </div>
                )}
                <button className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase italic hover:bg-white transition-all">
                  Ver Relatório Detalhado
                </button>
              </div>

              <div className="md:col-span-2 bg-slate-50 p-8 rounded-[32px] border border-slate-200 border-dashed flex flex-col items-center justify-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm">
                  <History size={40} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-400 uppercase italic">Histórico de Inventários</h4>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Visualize contagens passadas e reconciliações</p>
                </div>
                <button className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-brand-blue transition-all">
                  Acessar Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPricingSettings && (
        <PricingSettingsModal onClose={() => setShowPricingSettings(false)} />
      )}

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
    <div className="fixed inset-0 bg-brand-blue/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-warning/10 flex items-center justify-center text-brand-warning">
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-text-main">Registrar Perda</h2>
              <p className="text-sm text-brand-text-sec">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-brand-text-sec">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-main mb-1.5">Quantidade</label>
              <input 
                type="number" 
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-brand-border rounded-lg text-brand-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                required
              />
              <p className="text-xs text-brand-text-sec mt-1.5">Estoque atual: {product.stock}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-main mb-1.5">Motivo</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-brand-border rounded-lg text-brand-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                required
              >
                <option value="Vencimento">Vencimento</option>
                <option value="Avaria">Avaria</option>
                <option value="Quebra">Quebra</option>
                <option value="Roubo/Furto">Roubo/Furto</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="p-4 bg-brand-warning/10 rounded-lg border border-brand-warning/20">
              <p className="text-xs font-medium text-brand-warning mb-1">Impacto Financeiro</p>
              <p className="text-lg font-bold text-brand-warning">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quantity * product.costPrice)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-brand-border text-brand-text-main font-medium rounded-lg hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-brand-warning text-white font-medium rounded-lg hover:bg-brand-warning/90 transition-all shadow-sm disabled:opacity-50"
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
    green: "bg-brand-green/10 text-brand-green",
    red: "bg-brand-danger/10 text-brand-danger",
    blue: "bg-brand-blue/10 text-brand-blue",
    orange: "bg-amber-500/10 text-amber-500",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={32} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 mb-1">{title}</p>
        <p className={cn(
          "text-2xl font-black",
          color === 'orange' ? "text-amber-500" : "text-slate-700"
        )}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'Disponivel': 'bg-brand-green text-white',
    'Estoque Baixo': 'bg-amber-100 text-amber-600',
    'Pago': 'bg-brand-blue text-white',
    'Indisponivel': 'bg-brand-danger text-white',
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider",
      styles[status] || 'bg-slate-100 text-slate-600'
    )}>
      {status}
    </span>
  );
}
