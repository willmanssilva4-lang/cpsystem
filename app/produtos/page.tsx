'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Download, 
  Upload,
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
import * as XLSX from 'xlsx';
import { cn, formatDateTimeBR } from '@/lib/utils';
import { ProductForm } from '@/components/ProductForm';
import PricingSettingsModal from '@/components/PricingSettingsModal';
import { InventorySessionModal } from '@/components/InventorySessionModal';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, stockMovements, inventories, addStockMovement, addInventory, user, hasPermission, subcategorias, categorias, departamentos, pricingSettings, setCustomAlert, fetchData } = useERP();
  const [showModal, setShowModal] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedLossProduct, setSelectedLossProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('produtos');
  const [showInventorySession, setShowInventorySession] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [currentMovPage, setCurrentMovPage] = useState(1);
  const movItemsPerPage = 10;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const getSubcategoriaName = (product: Product) => {
    if (!product.subcategoria_id) return 'Sem Subcategoria';
    const sub = subcategorias.find(s => s.id === product.subcategoria_id);
    return sub ? sub.nome : 'Sem Subcategoria';
  };

  const getCategoryName = (product: Product) => {
    if (!product.subcategoria_id) return 'Sem Categoria';
    const sub = subcategorias.find(s => s.id === product.subcategoria_id);
    if (!sub) return 'Sem Categoria';
    const cat = categorias.find(c => c.id === sub.categoria_id);
    return cat ? cat.nome : 'Sem Categoria';
  };

  const getDepartamentoName = (product: Product) => {
    if (!product.subcategoria_id) return 'Sem Departamento';
    const sub = subcategorias.find(s => s.id === product.subcategoria_id);
    if (!sub) return 'Sem Departamento';
    const cat = categorias.find(c => c.id === sub.categoria_id);
    if (!cat) return 'Sem Departamento';
    const dep = departamentos.find(d => d.id === cat.departamento_id);
    return dep ? dep.nome : 'Sem Departamento';
  };

  const getCodigoMercadologico = (product: Product) => {
    if (product.codigo_mercadologico) return product.codigo_mercadologico;
    if (!product.subcategoria_id) return '';
    const sub = subcategorias.find(s => s.id === product.subcategoria_id);
    if (!sub) return '';
    const cat = categorias.find(c => c.id === sub.categoria_id);
    if (!cat) return sub.codigo || '';
    const dep = departamentos.find(d => d.id === cat.departamento_id);
    if (!dep) return `${cat.codigo || ''}.${sub.codigo || ''}`;
    return `${dep.codigo || ''}.${cat.codigo || ''}.${sub.codigo || ''}`;
  };

  const exportProducts = () => {
    const worksheet = XLSX.utils.json_to_sheet(products.map(p => ({
      Nome: p.name,
      SKU: p.sku,
      'Cód. Mercadológico': getCodigoMercadologico(p),
      Departamento: getDepartamentoName(p),
      Categoria: getCategoryName(p),
      Subcategoria: getSubcategoriaName(p),
      'Unidade de Medida': p.unit || 'UN',
      'Preço de Custo': p.costPrice,
      'Preço de Venda': p.salePrice,
      Estoque: p.stock,
      'Estoque Mínimo': p.minStock,
      Status: p.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'produtos.xlsx');
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const exportTemplate = () => {
    const templateData = [{
      Nome: 'Produto Exemplo',
      SKU: 'PROD-001',
      Departamento: 'Alimentos',
      Categoria: 'Mercearia',
      Subcategoria: 'Grãos',
      'Unidade de Medida': 'UN',
      'Preço de Custo': 10.50,
      'Preço de Venda': 20.00,
      Estoque: 100,
      'Estoque Mínimo': 10,
      Status: 'Ativo'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    XLSX.writeFile(workbook, 'modelo_importacao_produtos.xlsx');
  };

  const importProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      const processImports = async () => {
        let importedCount = 0;
        let duplicateCount = 0;
        const totalItems = json.length;
        
        setImportProgress({ current: 0, total: totalItems });

        for (let i = 0; i < totalItems; i++) {
          const item = json[i] as any;
          setImportProgress({ current: i + 1, total: totalItems });

          let subcategoria_id = '';
          if (item.Subcategoria) {
            const sub = subcategorias.find(s => s.nome.toLowerCase() === String(item.Subcategoria).toLowerCase());
            if (sub) {
              subcategoria_id = sub.id;
            }
          }

          const parseNumber = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            const str = String(val).replace(',', '.');
            const num = Number(str);
            return isNaN(num) ? 0 : num;
          };

          const costPrice = parseNumber(item['Preço de Custo']);
          const salePrice = parseNumber(item['Preço de Venda']);
          const profit = Math.round((salePrice - costPrice) * 100) / 100;
          let profitPercentage = 0;
          
          if (pricingSettings?.defaultMethod === 'markup') {
            profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
          } else {
            profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
          }

          const success = await addProduct({
            id: Math.random().toString(36).substr(2, 9),
            name: item.Nome,
            sku: item.SKU ? String(item.SKU) : '',
            unit: item['Unidade de Medida'] || 'UN',
            subcategoria_id: subcategoria_id,
            costPrice: costPrice,
            salePrice: salePrice,
            profit: profit,
            profitPercentage: Math.round(profitPercentage * 100) / 100,
            stock: parseNumber(item.Estoque),
            minStock: parseNumber(item['Estoque Mínimo']),
            status: item.Status || 'Ativo',
            image: 'https://images.unsplash.com/photo-1605600659873-d808a1d85f8c?q=80&w=400&h=400&auto=format&fit=crop'
          } as Product, true); // true para skipFetch

          if (success) {
            importedCount++;
          } else {
            duplicateCount++;
          }
          
          // Pequeno delay para evitar rate limit do Supabase (max 5 requests/sec)
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        // Atualiza os dados apenas uma vez no final
        await fetchData();
        setIsImporting(false);
        
        if (duplicateCount > 0) {
          setCustomAlert({
            message: `${importedCount} produtos importados. ${duplicateCount} produtos ignorados por código duplicado.`,
            type: 'warning'
          });
        } else {
          setCustomAlert({
            message: 'Produtos importados com sucesso!',
            type: 'success'
          });
        }
      };

      processImports();
    };
    reader.readAsBinaryString(file);
  };


  // Adjustment form state
  const [adjustmentProductId, setAdjustmentProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ENTRADA' | 'SAÍDA'>('ENTRADA');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Correção de Saldo');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState({
    date: '',
    category: '',
    status: ''
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name && p.name.toLowerCase().includes(search.toLowerCase())) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (selectedCategory) {
      if (!p.subcategoria_id) return false;
      const sub = subcategorias.find(s => s.id === p.subcategoria_id);
      if (!sub) return false;
      return sub.categoria_id === selectedCategory;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock && p.has_had_stock).length;

  const handleSaveProduct = async (formData: any) => {
    let success = false;
    if (editingProduct) {
      success = await updateProduct({
        ...editingProduct,
        ...formData,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        profit: Number(formData.profit),
        profitPercentage: Number(formData.profitPercentage),
        composition: formData.composition,
        status: formData.status,
        subcategoria_id: formData.subcategoria_id,
        category: formData.category || 'PADRAO',
        subgroup: formData.subgroup || 'PADRAO'
      });
    } else {
      success = await addProduct({
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        sku: formData.sku,
        subcategoria_id: formData.subcategoria_id,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        image: formData.image,
        brand: formData.brand,
        unit: formData.unit,
        supplier: formData.supplier,
        profit: Number(formData.profit),
        profitPercentage: Number(formData.profitPercentage),
        composition: formData.composition,
        status: formData.status,
        category: formData.category || 'PADRAO',
        subgroup: formData.subgroup || 'PADRAO'
      });
    }

    if (success) {
      setShowModal(false);
      setEditingProduct(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    // Close menu first to avoid UI glitches
    setActiveMenuId(null);
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete);
        // alert('Produto excluído com sucesso!');
      } catch (error: any) {
        console.error('Delete product error:', error);
        // alert('Erro ao excluir produto: ' + (error.message || 'Verifique se o produto possui vendas ou perdas registradas.'));
      } finally {
        setProductToDelete(null);
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
    setShowInventorySession(true);
  };

  const sortedMovs = [...stockMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalMovPages = Math.ceil(sortedMovs.length / movItemsPerPage);
  const currentMovs = sortedMovs.slice((currentMovPage - 1) * movItemsPerPage, currentMovPage * movItemsPerPage);

  if (!hasPermission('Estoque', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o módulo de Estoque.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen" onClick={() => { setActiveMenuId(null); setShowCategoryMenu(false); }}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Gestão de Produtos</h1>
          <p className="text-brand-text-sec text-xs md:text-sm font-bold uppercase tracking-widest">Controle total do seu catálogo e inventário.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('Configurações', 'view') && (
            <button 
              onClick={() => setShowPricingSettings(true)}
              className="flex items-center justify-center w-10 h-10 bg-white border border-brand-border text-brand-text-sec rounded-lg hover:bg-slate-50 transition-all shadow-sm"
              title="Configurações de Precificação"
            >
              <Settings2 size={18} />
            </button>
          )}
          {hasPermission('Estoque', 'create') && (
            <button 
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 h-10 bg-brand-blue text-white rounded-lg text-sm font-bold uppercase italic tracking-widest hover:bg-brand-blue-hover transition-all shadow-sm"
            >
              <Plus size={18} />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-brand-border gap-4 md:gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'produtos', label: 'Produtos', icon: Package },
          { id: 'movimentacoes', label: 'Movimentações', icon: History },
          { id: 'ajustes', label: 'Ajustes', icon: ArrowLeftRight },
          { id: 'inventario', label: 'Inventário', icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-2 transition-all font-black uppercase italic text-[10px] md:text-xs tracking-widest whitespace-nowrap",
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <SummaryCard title="Total de Produtos" value={products.length.toString()} icon={Package} color="green" />
            <SummaryCard title="Estoque Baixo" value={lowStockCount.toString()} icon={AlertCircle} color="red" />
            <SummaryCard title="Quantidade Total" value={products.reduce((acc, p) => acc + p.stock, 0).toLocaleString()} icon={Package} color="blue" />
            <SummaryCard title="Estoque Valorizado" value={`R$ ${totalStockValue.toLocaleString()}`} icon={TrendingUp} color="orange" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white">
              <div className="flex items-center gap-4 w-full md:w-auto relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCategoryMenu(!showCategoryMenu);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors w-full md:w-auto justify-between md:justify-start",
                    selectedCategory ? "bg-brand-blue text-white border-brand-blue" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>{selectedCategory ? categorias.find(c => c.id === selectedCategory)?.nome : 'Categorias'}</span>
                  </div>
                  <ChevronDown size={14} />
                </button>

                {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-2 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setShowCategoryMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors",
                          !selectedCategory ? "bg-brand-blue/10 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        Todas as Categorias
                      </button>
                      {categorias.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setShowCategoryMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors",
                            selectedCategory === cat.id ? "bg-brand-blue/10 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {cat.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-sm font-medium text-slate-700 transition-all outline-none"
                    placeholder="Buscar por produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                  <Upload size={16} />
                  <span>Importar Excel</span>
                </button>
                <button onClick={exportProducts} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                  <Download size={16} />
                  <span>Exportar Excel</span>
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
                    <th className="hidden md:table-cell px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                    <th className="hidden lg:table-cell px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Custo</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Venda</th>
                    <th className="hidden sm:table-cell px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="w-12 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex w-8 h-8 rounded bg-slate-100 items-center justify-center text-slate-400">
                            <Package size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm md:text-base">{product.name}</span>
                            <div className="flex items-center gap-2">
                              {getCodigoMercadologico(product) && (
                                <span className="text-[10px] text-brand-blue font-black tracking-widest bg-brand-blue/5 px-1.5 py-0.5 rounded">
                                  {getCodigoMercadologico(product)}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-bold uppercase md:hidden">{getCategoryName(product)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-500">{getCategoryName(product)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{product.stock}</td>
                      <td className="hidden lg:table-cell px-6 py-4 text-sm font-bold text-slate-700">R$ {product.costPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {product.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="hidden sm:table-cell px-6 py-4">
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
                Mostrando {currentProducts.length} de {filteredProducts.length} produtos
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="text-slate-400 px-1">...</span>
                          )}
                          <button 
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                              page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
                  </button>
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
                  {currentMovs.length > 0 ? (
                    currentMovs.map((mov) => (
                      <tr key={mov.id} className="hover:bg-white transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                          {formatDateTimeBR(mov.date)}
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
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Mostrando {currentMovs.length} de {stockMovements.length} movimentações
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentMovPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentMovPage === 1}
                      className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalMovPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalMovPages || Math.abs(page - currentMovPage) <= 1)
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="text-slate-400 px-1">...</span>
                            )}
                            <button 
                              onClick={() => setCurrentMovPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                                page === currentMovPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                              )}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>
                    <button 
                      onClick={() => setCurrentMovPage(prev => Math.min(prev + 1, totalMovPages))}
                      disabled={currentMovPage === totalMovPages || totalMovPages === 0}
                      className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
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
        <div className="space-y-6">
          {/* Header & Filters */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                  <ClipboardList size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Inventário de Estoque</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestão e Reconciliação de Contagens Físicas</p>
                </div>
              </div>

              <button 
                onClick={handleStartInventory}
                className="bg-brand-blue hover:bg-brand-blue-hover text-white px-8 py-4 rounded-2xl font-black uppercase italic text-sm tracking-widest transition-all shadow-xl shadow-brand-blue/20 active:scale-95 flex items-center gap-3"
              >
                <Plus size={20} />
                Novo Inventário
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Data</label>
                <input 
                  type="date" 
                  value={inventoryFilter.date}
                  onChange={(e) => setInventoryFilter(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:border-brand-blue outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Categoria</label>
                <select 
                  value={inventoryFilter.category}
                  onChange={(e) => setInventoryFilter(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:border-brand-blue outline-none transition-all"
                >
                  <option value="">Todas as Categorias</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Status</label>
                <select 
                  value={inventoryFilter.status}
                  onChange={(e) => setInventoryFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:border-brand-blue outline-none transition-all"
                >
                  <option value="">Todos os Status</option>
                  <option value="Concluído">Finalizado</option>
                  <option value="Em Andamento">Em Andamento</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => setInventoryFilter({ date: '', category: '', status: '' })}
                  className="w-full py-3 text-slate-400 hover:text-brand-blue text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inventories.length > 0 ? (
                    inventories
                      .filter(inv => {
                        if (inventoryFilter.date && !inv.date.startsWith(inventoryFilter.date)) return false;
                        if (inventoryFilter.status && inv.status !== inventoryFilter.status) return false;
                        return true;
                      })
                      .map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-5">
                          <span className="text-xs font-black text-slate-400">#{inventories.length - idx}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700">{new Date(inv.date).toLocaleDateString('pt-BR')}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{inv.location}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-slate-600">{inv.responsible || 'Sistema'}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {inv.type || 'Geral'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            inv.status === 'Concluído' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {inv.status === 'Concluído' ? 'Finalizado' : 'Em Andamento'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 text-slate-400 hover:text-brand-blue transition-all">
                            <Settings2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                          <ClipboardList size={48} className="opacity-20" />
                          <p className="text-sm font-black uppercase tracking-widest">Nenhum inventário registrado</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPricingSettings && (
        <PricingSettingsModal onClose={() => setShowPricingSettings(false)} />
      )}

      {showInventorySession && (
        <InventorySessionModal 
          onClose={() => setShowInventorySession(false)} 
          onComplete={() => {
            setShowInventorySession(false);
          }}
        />
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

      {isImporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-slate-200">
            <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight mb-2">Importando Produtos</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Por favor, aguarde. Isso pode levar alguns minutos dependendo do tamanho da planilha.
            </p>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
              <div 
                className="bg-brand-blue h-full transition-all duration-300 ease-out rounded-full"
                style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-sm font-bold text-brand-blue">
              {importProgress.current} de {importProgress.total} produtos
            </p>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Importar Produtos</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 font-medium">1. Baixe o modelo de planilha em Excel.</p>
                <button onClick={exportTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue/10 text-brand-blue rounded-xl font-bold hover:bg-brand-blue/20 transition-colors">
                  <Download size={18} />
                  Baixar Modelo Excel
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 font-medium">2. Preencha os dados e faça o upload do arquivo.</p>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue-hover transition-colors cursor-pointer shadow-lg shadow-brand-blue/20">
                  <Upload size={18} />
                  Selecionar Arquivo e Importar
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => { importProducts(e); setShowImportModal(false); }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Produto</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProductToDelete(null)}
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

function LossModal({ product, onClose }: { product: Product, onClose: () => void }) {
  const { addLoss, lotes } = useERP();
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Vencimento');
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productLotes = lotes
    .filter(l => l.productId === product.id && l.saldoAtual > 0)
    .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addLoss({
        productId: product.id,
        loteId: selectedLoteId || undefined,
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
            {productLotes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1.5">Lote Específico (Opcional)</label>
                <select 
                  value={selectedLoteId}
                  onChange={(e) => {
                    const loteId = e.target.value;
                    setSelectedLoteId(loteId);
                    if (loteId) {
                      const lote = productLotes.find(l => l.id === loteId);
                      if (lote && quantity > lote.saldoAtual) {
                        setQuantity(lote.saldoAtual);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-brand-border rounded-lg text-brand-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                >
                  <option value="">Seguir PEPS (Automático)</option>
                  {productLotes.map(lote => (
                    <option key={lote.id} value={lote.id}>
                      Lote: {lote.numeroLote} - Saldo: {lote.saldoAtual} {lote.validade ? `(Venc: ${new Date(lote.validade).toLocaleDateString('pt-BR')})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-brand-text-sec mt-1 font-bold uppercase tracking-widest">
                  Se não selecionar, o sistema removerá dos lotes mais antigos primeiro.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-text-main mb-1.5">Quantidade</label>
              <input 
                type="number" 
                min="1"
                max={selectedLoteId ? productLotes.find(l => l.id === selectedLoteId)?.saldoAtual : product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-brand-border rounded-lg text-brand-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                required
              />
              <p className="text-xs text-brand-text-sec mt-1.5">
                Disponível: {selectedLoteId ? productLotes.find(l => l.id === selectedLoteId)?.saldoAtual : product.stock} UN
              </p>
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
    orange: "bg-brand-warning/10 text-brand-warning",
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
          color === 'orange' ? "text-brand-warning" : "text-slate-700"
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
