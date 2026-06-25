'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useERP } from '@/lib/context';
import { supabase } from '@/lib/supabase';
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
  Copy,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Coins,
  History,
  ArrowLeftRight,
  ClipboardList,
  Info,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn, formatDateTimeBR, toLocalDateString } from '@/lib/utils';
import { ProductForm } from '@/components/ProductForm';
import { ProductDetails } from '@/components/ProductDetails';
import PricingSettingsModal from '@/components/PricingSettingsModal';
import { InventorySessionModal } from '@/components/InventorySessionModal';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] text-brand-text-sec">
        <RefreshCw className="animate-spin text-brand-blue mr-2 text-2xl" />
        <span>Carregando produtos...</span>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const productIdParam = searchParams ? searchParams.get('id') : null;
  const { products, addProduct, updateProduct, deleteProduct, stockMovements, inventories, addStockMovement, addInventory, deleteInventory, user, hasPermission, subcategorias, categorias, departamentos, pricingSettings, setCustomAlert, fetchData } = useERP();
  const [showModal, setShowModal] = useState(false);
  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [duplicateBaseProduct, setDuplicateBaseProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showLossModal, setShowLossModal] = useState(false);
  const [selectedLossProduct, setSelectedLossProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('produtos');
  const [showInventorySession, setShowInventorySession] = useState(false);
  const [selectedDetailInventory, setSelectedDetailInventory] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDepartamento, setSelectedDepartamento] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Ativo' | 'Inativo' | 'Todos'>('Ativo');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDepartamentoMenu, setShowDepartamentoMenu] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedProductsForBulk, setSelectedProductsForBulk] = useState<Record<string, boolean>>({});
  const [bulkDeactivateLoading, setBulkDeactivateLoading] = useState(false);
  const [showBulkDeactivateConfirm, setShowBulkDeactivateConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [currentMovPage, setCurrentMovPage] = useState(1);
  const movItemsPerPage = 10;

  // Bulk pricing states
  const [bulkPriceTarget, setBulkPriceTarget] = useState<'salePrice' | 'costPrice' | 'wholesalePrice'>('salePrice');
  const [bulkPriceOp, setBulkPriceOp] = useState<'pct_inc' | 'pct_dec' | 'val_inc' | 'val_dec' | 'fixed'>('pct_inc');
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);
  const [bulkPriceRound, setBulkPriceRound] = useState<'none' | '0.05' | '0.10' | '0.50' | '0.90' | '0.99'>('none');
  const [bulkSelectedProducts, setBulkSelectedProducts] = useState<Record<string, boolean>>({});
  const [bulkCustomPrices, setBulkCustomPrices] = useState<Record<string, number>>({});
  const [bulkCustomCostPrices, setBulkCustomCostPrices] = useState<Record<string, number>>({});
  const [bulkCustomWholesalePrices, setBulkCustomWholesalePrices] = useState<Record<string, number>>({});
  const [bulkIsSubmitting, setBulkIsSubmitting] = useState(false);
  const [bulkPriceSearch, setBulkPriceSearch] = useState('');
  const [bulkPriceCat, setBulkPriceCat] = useState<string | null>(null);
  const [bulkPriceDep, setBulkPriceDep] = useState<string | null>(null);
  const [bulkPriceSubcat, setBulkPriceSubcat] = useState<string | null>(null);

  useEffect(() => {
    if (productIdParam) {
      console.log('[ProductsPage] Automatically opening product details for:', productIdParam);
      setSelectedProductForDetails(productIdParam);
      setStatusFilter('Todos');
    }
  }, [productIdParam]);

  const calculateAdjustedPrice = (
    currentPrice: number,
    operation: 'pct_inc' | 'pct_dec' | 'val_inc' | 'val_dec' | 'fixed',
    val: number,
    rounding: 'none' | '0.05' | '0.10' | '0.50' | '0.90' | '0.99'
  ): number => {
    let newPrice = currentPrice;
    if (operation === 'pct_inc') {
      newPrice = currentPrice * (1 + val / 100);
    } else if (operation === 'pct_dec') {
      newPrice = currentPrice * (1 - val / 100);
    } else if (operation === 'val_inc') {
      newPrice = currentPrice + val;
    } else if (operation === 'val_dec') {
      newPrice = currentPrice - val;
    } else if (operation === 'fixed') {
      newPrice = val;
    }

    newPrice = Math.max(0, newPrice);

    if (rounding === '0.05') {
      newPrice = Math.round(newPrice * 20) / 20;
    } else if (rounding === '0.10') {
      newPrice = Math.round(newPrice * 10) / 10;
    } else if (rounding === '0.50') {
      newPrice = Math.round(newPrice * 2) / 2;
    } else if (rounding === '0.90') {
      const integerPart = Math.floor(newPrice);
      newPrice = integerPart + 0.90;
    } else if (rounding === '0.99') {
      const integerPart = Math.floor(newPrice);
      newPrice = integerPart + 0.99;
    } else {
      newPrice = Math.round(newPrice * 100) / 100;
    }

    return newPrice;
  };

  const handleApplyBulkPriceUpdate = async () => {
    const productsToUpdate = filteredBulkProducts.filter(p => bulkSelectedProducts[p.id]);
    
    if (productsToUpdate.length === 0) {
      setCustomAlert({ message: 'Nenhum produto selecionado para reajuste.', type: 'warning' });
      return;
    }

    const hasCustomOverrides = productsToUpdate.some(p => 
      bulkCustomPrices[p.id] !== undefined || 
      bulkCustomCostPrices[p.id] !== undefined || 
      bulkCustomWholesalePrices[p.id] !== undefined
    );

    if (bulkPriceValue === 0 && bulkPriceOp !== 'fixed' && !hasCustomOverrides) {
      setCustomAlert({ message: 'Por favor, insira um valor diferente de zero para reajustar ou altere diretamente nos inputs de cada produto.', type: 'warning' });
      return;
    }

    setBulkIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const product of productsToUpdate) {
        const initCost = product.costPrice || 0;
        const initSale = product.salePrice || 0;
        const initWholesale = product.wholesalePrice || 0;

        const isCostTarget = bulkPriceTarget === 'costPrice';
        const isSaleTarget = bulkPriceTarget === 'salePrice';
        const isWholesaleTarget = bulkPriceTarget === 'wholesalePrice';

        const formulaCost = isCostTarget ? calculateAdjustedPrice(initCost, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initCost;
        const formulaSale = isSaleTarget ? calculateAdjustedPrice(initSale, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initSale;
        const formulaWholesale = isWholesaleTarget ? calculateAdjustedPrice(initWholesale, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initWholesale;

        const newCost = bulkCustomCostPrices[product.id] !== undefined ? bulkCustomCostPrices[product.id] : formulaCost;
        const newSale = bulkCustomPrices[product.id] !== undefined ? bulkCustomPrices[product.id] : formulaSale;
        const newWholesale = bulkCustomWholesalePrices[product.id] !== undefined ? bulkCustomWholesalePrices[product.id] : formulaWholesale;

        const updateData: any = {};
        let changed = false;

        if (newCost !== initCost) {
          updateData.cost_price = newCost;
          changed = true;
        }
        if (newSale !== initSale) {
          updateData.sale_price = newSale;
          changed = true;
        }
        if (newWholesale !== initWholesale) {
          updateData.wholesale_price = newWholesale;
          changed = true;
        }

        if (changed) {
          const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', product.id);

          if (error) {
            console.error(`Error updating prices for ${product.name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      }

      await fetchData();
      
      if (errorCount === 0) {
        setCustomAlert({ 
          message: `Sucesso! Preços de ${successCount} produtos foram reajustados.`, 
          type: 'success' 
        });
        setBulkPriceValue(0);
        setBulkSelectedProducts({});
        setBulkCustomPrices({});
        setBulkCustomCostPrices({});
        setBulkCustomWholesalePrices({});
      } else {
        setCustomAlert({ 
          message: `Reajuste concluído com avisos: ${successCount} atualizados, ${errorCount} falhas.`, 
          type: 'warning' 
        });
      }
    } catch (err: any) {
      console.error('Error in bulk price reajuste:', err);
      setCustomAlert({ message: 'Ocorreu um erro ao aplicar o reajuste.', type: 'error' });
    } finally {
      setBulkIsSubmitting(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = currentProducts.length > 0 && currentProducts.every(p => selectedProductsForBulk[p.id]);
    const newSelection = { ...selectedProductsForBulk };
    currentProducts.forEach(p => {
      newSelection[p.id] = !allSelected;
    });
    setSelectedProductsForBulk(newSelection);
  };

  const handleBulkDeactivate = async () => {
    const selectedIds = Object.keys(selectedProductsForBulk).filter(id => selectedProductsForBulk[id]);
    if (selectedIds.length === 0) return;
    setShowBulkDeactivateConfirm(true);
  };

  const confirmBulkDeactivate = async () => {
    const selectedIds = Object.keys(selectedProductsForBulk).filter(id => selectedProductsForBulk[id]);
    if (selectedIds.length === 0) {
      setShowBulkDeactivateConfirm(false);
      return;
    }
    
    setBulkDeactivateLoading(true);
    setShowBulkDeactivateConfirm(false);
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'Inativo' })
        .in('id', selectedIds);
        
      if (error) {
        console.error('[BulkDeactivate] error deactivating products:', error);
        setCustomAlert({ message: `Erro ao inativar produtos: ${error.message}`, type: 'error' });
      } else {
        await fetchData();
        setSelectedProductsForBulk({});
        setCustomAlert({ message: `Sucesso! ${selectedIds.length} produtos foram inativados em lote.`, type: 'success' });
      }
    } catch (err: any) {
      console.error('[BulkDeactivate] exception:', err);
      setCustomAlert({ message: 'Ocorreu um erro ao inativar em lote.', type: 'error' });
    } finally {
      setBulkDeactivateLoading(false);
    }
  };

  const filteredBulkProducts = products.filter(product => {
    const matchesSearch = !bulkPriceSearch || 
      product.name.toLowerCase().includes(bulkPriceSearch.toLowerCase()) ||
      product.sku?.toLowerCase().includes(bulkPriceSearch.toLowerCase()) ||
      (product.codigo_mercadologico || '').toLowerCase().includes(bulkPriceSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (bulkPriceSubcat) {
      if (product.subcategoria_id !== bulkPriceSubcat) return false;
    } else if (bulkPriceCat) {
      const allowedSubcatIds = subcategorias
        .filter(s => s.categoria_id === bulkPriceCat)
        .map(s => s.id);
      if (!product.subcategoria_id || !allowedSubcatIds.includes(product.subcategoria_id)) return false;
    } else if (bulkPriceDep) {
      const allowedCatIds = categorias
        .filter(c => c.departamento_id === bulkPriceDep)
        .map(c => c.id);
      const allowedSubcatIds = subcategorias
        .filter(s => allowedCatIds.includes(s.categoria_id))
        .map(s => s.id);
      if (!product.subcategoria_id || !allowedSubcatIds.includes(product.subcategoria_id)) return false;
    }

    return product.status === 'Ativo';
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedDepartamento, statusFilter]);

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
    
    // Try subcategoria first
    if (product.subcategoria_id) {
        const sub = subcategorias.find(s => String(s.id) === String(product.subcategoria_id));
        if (sub) {
            const cat = categorias.find(c => String(c.id) === String(sub.categoria_id));
            const dep = cat ? departamentos.find(d => String(d.id) === String(cat.departamento_id)) : undefined;
            
            const parts = [dep?.codigo, cat?.codigo, sub?.codigo].filter(p => p !== undefined && p !== null && p !== '');
            if (parts.length > 0) return parts.join('.');
        }
    }
    
    // Fallback to category_id
    if (product.category_id) {
        const cat = categorias.find(c => String(c.id) === String(product.category_id));
        const dep = cat ? departamentos.find(d => String(d.id) === String(cat.departamento_id)) : undefined;
        
        const parts = [dep?.codigo, cat?.codigo].filter(p => p !== undefined && p !== null && p !== '');
        if (parts.length > 0) return parts.join('.');
    }
    
    return null;
  };

  const exportProducts = () => {
    if (products.length === 0) {
      setCustomAlert({ message: 'Não há produtos para exportar.', type: 'warning' });
      return;
    }

    setCustomAlert({ message: 'Exportando lista de produtos...', type: 'info' });

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
      Status: p.status,
      Marca: p.brand || '',
      Gramatura: p.gramatura || '',
      'Tipo de Embalagem': p.tipo_embalagem || '',
      Segmento: p.segmento || '',
      'Seção': p.section || ''
    })));

    // Set column widths
    worksheet['!cols'] = [
      { wch: 35 }, // Nome
      { wch: 15 }, // SKU
      { wch: 20 }, // Cód. Mercadológico
      { wch: 20 }, // Departamento
      { wch: 20 }, // Categoria
      { wch: 20 }, // Subcategoria
      { wch: 15 }, // Unidade
      { wch: 15 }, // Preço Custo
      { wch: 15 }, // Preço Venda
      { wch: 10 }, // Estoque
      { wch: 10 }, // Mínimo
      { wch: 10 }, // Status
      { wch: 15 }, // Marca
      { wch: 15 }, // Gramatura
      { wch: 20 }, // Embalagem
      { wch: 20 }, // Segmento
      { wch: 20 }  // Seção
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'produtos.xlsx', { bookType: 'xlsx' });

    setCustomAlert({ message: 'Lista de produtos exportada com sucesso!', type: 'success' });
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
      Status: 'Ativo',
      Marca: 'Marca Exemplo',
      Gramatura: '500g',
      'Tipo de Embalagem': 'Pacote',
      Segmento: 'Alimentos',
      'Seção': 'Bebidas',
      Fornecedor: 'Fornecedor Exemplo'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 35 }, // Nome
      { wch: 15 }, // SKU
      { wch: 20 }, // Departamento
      { wch: 20 }, // Categoria
      { wch: 20 }, // Subcategoria
      { wch: 15 }, // Unidade
      { wch: 15 }, // Preço Custo
      { wch: 15 }, // Preço Venda
      { wch: 10 }, // Estoque
      { wch: 10 }, // Mínimo
      { wch: 10 }, // Status
      { wch: 15 }, // Marca
      { wch: 15 }, // Gramatura
      { wch: 20 }, // Embalagem
      { wch: 20 }, // Segmento
      { wch: 20 }, // Seção
      { wch: 25 }  // Fornecedor
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    XLSX.writeFile(workbook, 'modelo_importacao_produtos.xlsx', { bookType: 'xlsx' });
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
          const itemSub = item.Subcategoria || item['Subcategoria:'] || item.subcategoria;
          const itemCat = item.Categoria || item['Categoria:'] || item.categoria;
          const itemDep = item.Departamento || item['Departamento:'] || item.departamento;

          if (itemSub) {
            const subName = String(itemSub).trim().toLowerCase();
            const matchingSubs = subcategorias.filter(s => s.nome.trim().toLowerCase() === subName);
            
            if (matchingSubs.length === 1) {
              subcategoria_id = matchingSubs[0].id;
            } else if (matchingSubs.length > 1 && itemCat) {
              // Try to disambiguate using category
              const catName = String(itemCat).trim().toLowerCase();
              const found = matchingSubs.find(s => {
                const cat = categorias.find(c => c.id === s.categoria_id);
                return cat && cat.nome.trim().toLowerCase() === catName;
              });
              if (found) subcategoria_id = found.id;
              else subcategoria_id = matchingSubs[0].id; // Fallback
            } else if (matchingSubs.length > 1) {
              subcategoria_id = matchingSubs[0].id;
            }
          }

          const parseNumber = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            const str = String(val).replace(',', '.');
            const num = Number(str);
            return isNaN(num) ? 0 : num;
          };

          const costPrice = parseNumber(item['Preço de Custo'] || item['Preço de Custo:'] || item.preco_custo);
          const salePrice = parseNumber(item['Preço de Venda'] || item['Preço de Venda:'] || item.preco_venda);
          const profit = Math.round((salePrice - costPrice) * 100) / 100;
          let profitPercentage = 0;
          
          if (pricingSettings?.defaultMethod === 'markup') {
            profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
          } else {
            profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
          }

          const success = await addProduct({
            name: item.Nome || item['Nome:'] || item.nome,
            sku: (item.SKU || item['SKU:'] || item.sku) ? String(item.SKU || item['SKU:'] || item.sku) : '',
            unit: item['Unidade de Medida'] || item['Unidade de Medida:'] || item.unidade || 'UN',
            subcategoria_id: subcategoria_id,
            costPrice: costPrice,
            salePrice: salePrice,
            profit: profit,
            profitPercentage: Math.round(profitPercentage * 100) / 100,
            stock: parseNumber(item.Estoque || item['Estoque:'] || item.estoque),
            minStock: parseNumber(item['Estoque Mínimo'] || item['Estoque Mínimo:'] || item.estoque_minimo),
            status: (item.Status && String(item.Status).trim().toLowerCase() === 'inativo') ? 'Inativo' : 'Ativo',
            active: (item.Status && String(item.Status).trim().toLowerCase() === 'inativo') ? false : true,
            brand: (item.Marca || item['Marca:'] || item['Marca'] || item.marca || item.brand || item.Brand) ? String(item.Marca || item['Marca:'] || item['Marca'] || item.marca || item.brand || item.Brand).trim() : 'PADRAO',
            gramatura: (item.Gramatura || item['Gramatura:'] || item.gramatura) ? String(item.Gramatura || item['Gramatura:'] || item.gramatura) : '',
            tipo_embalagem: (item['Tipo de Embalagem'] || item['Tipo de Embalagem:'] || item.tipo_embalagem) ? String(item['Tipo de Embalagem'] || item['Tipo de Embalagem:'] || item.tipo_embalagem) : '',
            segmento: (item.Segmento || item['Segmento:'] || item.segmento) ? String(item.Segmento || item['Segmento:'] || item.segmento) : '',
            category: (item.Categoria || item['Categoria:'] || item.categoria) ? String(item.Categoria || item['Categoria:'] || item.categoria) : (item.Departamento || item['Departamento:'] || item.departamento || 'PADRAO'),
            subgroup: 'PADRAO',
            section: (item['Seção'] || item['Seção:'] || item.Secao || item.section || item.Departamento || item['Departamento:'] || item.departamento) ? String(item['Seção'] || item['Seção:'] || item.Secao || item.section || item.Departamento || item['Departamento:'] || item.departamento) : '',
            supplier: (item.Fornecedor || item['Fornecedor:'] || item['Fornecedor'] || item.fornecedor || item.supplier || item.Supplier) ? String(item.Fornecedor || item['Fornecedor:'] || item['Fornecedor'] || item.fornecedor || item.supplier || item.Supplier).trim() : '',
            image: 'https://i.imgur.com/jGU5BUa.png'
          } as any); 

          if (success === true) {
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
  const [adjustmentSearchTerm, setAdjustmentSearchTerm] = useState('');
  const [isAdjustmentDropdownOpen, setIsAdjustmentDropdownOpen] = useState(false);
  const adjustmentDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedAdjustmentProducts, setSelectedAdjustmentProducts] = useState<{ id: string; name: string; stock: number; unit?: string; quantity: number }[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adjustmentDropdownRef.current && !adjustmentDropdownRef.current.contains(event.target as Node)) {
        setIsAdjustmentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

    // Se estiver filtrando por estoque baixo, ignoramos o filtro de status 'Ativo' 
    // mas ainda respeitamos se o usuário selecionou explicitamente 'Inativo' ou 'Todos' no dropdown.
    if (showLowStockOnly) {
      if ((p.stock || 0) > (p.minStock || 0)) return false;
    }

    // Filtro de Status
    if (statusFilter !== 'Todos') {
      if (p.status !== statusFilter) return false;
    }

    if (selectedCategory || selectedDepartamento) {
      if (!p.subcategoria_id) return false;
      const sub = subcategorias.find(s => s.id === p.subcategoria_id);
      if (!sub) return false;
      
      if (selectedCategory && sub.categoria_id !== selectedCategory) return false;
      
      if (selectedDepartamento) {
        const cat = categorias.find(c => c.id === sub.categoria_id);
        if (!cat || cat.departamento_id !== selectedDepartamento) return false;
      }
    }

    return true;
  });

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalPages = Math.ceil(sortedFilteredProducts.length / itemsPerPage);
  const currentProducts = sortedFilteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStockValue = products.reduce((acc, p) => {
    // Excluir produtos tipo KIT, produtos com base_product_id e Inativos
    const isVirtual = p.product_type === 'KIT' || (p.composition && p.composition.length > 0) || !!p.base_product_id;
    const isActive = p.status !== 'Inativo';
    if (isVirtual || !isActive) return acc;

    const stock = Number(p.stock || 0);
    const cost = Number(p.costPrice || 0);
    
    if (stock > 0 && cost > 0) {
      return acc + (stock * cost);
    }
    return acc;
  }, 0);

  const lowStockCount = React.useMemo(() => {
    return products.filter(p => {
      const isVirtual = p.product_type === 'KIT' || (p.composition && p.composition.length > 0) || !!p.base_product_id;
      const isActive = p.status !== 'Inativo';
      return !isVirtual && isActive && (p.stock || 0) <= (p.minStock || 0);
    }).length;
  }, [products]);

  const handleSaveProduct = async (formData: any) => {
    let success: boolean | string = false;
    
    // Preparar os dados numéricos
    const numericData = {
      costPrice: Number(formData.costPrice || 0),
      salePrice: Number(formData.salePrice || 0),
      wholesalePrice: Number(formData.wholesalePrice || 0),
      clubPrice: Number(formData.clubPrice || 0),
      stock: Number(formData.stock || 0),
      minStock: Number(formData.minStock || 0),
      profit: Number(formData.profit || 0),
      profitPercentage: Number(formData.profitPercentage || 0),
      conversion_factor: Number(formData.conversion_factor || 1)
    };

    if (editingProduct) {
      const payloadToUpdate = {
        ...editingProduct,
        ...formData,
        ...numericData
      };
      success = await updateProduct(payloadToUpdate);
    } else {
      success = await addProduct({
        ...formData,
        ...numericData,
        companyId: user?.companyId || '',
        image: formData.image || 'https://i.imgur.com/jGU5BUa.png'
      } as any);
    }

    if (success === true) {
      setShowModal(false);
      setEditingProduct(null);

      if (formData.status === 'Inativo') {
        setCustomAlert({
          type: 'success',
          message: 'Produto colocado como INATIVO / SUSPENSO e salvo com sucesso! Para visualizá-lo na lista, altere o filtro de status para "Inativos" ou "Todos".'
        });
      } else {
        setCustomAlert({
          type: 'success',
          message: editingProduct 
            ? 'Alterações do produto salvas com sucesso!' 
            : 'Produto cadastrado com sucesso!'
        });
      }
    } else {
      let errorMessage = 'Verifique se o Código SKU ou de Barras já está cadastrado em outro produto.';
      if (typeof success === 'string') {
        if (success.includes('null value in column "sku"') || success.includes('null_value_column_sku') || success.toLowerCase().includes('violates not-null constraint')) {
          errorMessage = 'Produto não pode ser salvo: preencha o código de barra!';
        } else {
          errorMessage = success;
        }
      }
      setCustomAlert({
        type: 'error',
        message: 'Aviso do Sistema: ' + errorMessage
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDuplicate = (product: Product) => {
    setActiveMenuId(null);
    setDuplicateBaseProduct({
      ...product,
      id: '', // Clear ID for new product flow
      name: `${product.name} (Cópia)`,
      sku: '',      // Clear to avoid duplicate code violations
      barcode: '',  // Clear to avoid duplicate barcode violations
      stock: 0,     // Clear stock for new duplicated product
      has_had_stock: false,
    });
    setEditingProduct(null); // Ensure we are in create mode
    setShowModal(true);
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
      } catch (error: any) {
        console.error('Delete product error:', error);
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
    if (!hasPermission('Gestão de Produtos', 'edit')) {
      setCustomAlert({
        message: 'Você não tem permissão para realizar ajustes de estoque.',
        type: 'warning'
      });
      return;
    }

    const itemsToAdjust = selectedAdjustmentProducts.length > 0 
      ? selectedAdjustmentProducts 
      : adjustmentProductId 
        ? [{ id: adjustmentProductId, name: adjustmentSearchTerm, stock: 0, quantity: adjustmentQty }] 
        : [];

    if (itemsToAdjust.length === 0) {
      setCustomAlert({
        message: 'Selecione pelo menos um produto e insira uma quantidade válida.',
        type: 'warning'
      });
      return;
    }

    const hasInvalidQty = itemsToAdjust.some(item => item.quantity <= 0);
    if (hasInvalidQty) {
      setCustomAlert({
        message: 'A quantidade de ajuste deve ser maior do que zero para todos os produtos.',
        type: 'warning'
      });
      return;
    }

    setIsAdjusting(true);
    try {
      for (const item of itemsToAdjust) {
        await addStockMovement({
          productId: item.id,
          type: 'AJUSTE',
          quantity: adjustmentType === 'ENTRADA' ? item.quantity : -item.quantity,
          origin: `Ajuste: ${adjustmentReason}`,
          date: new Date().toISOString(),
          userId: user?.email || 'system',
          userName: user?.name || 'Sistema',
          companyId: user?.companyId || ''
        });
      }
      
      setCustomAlert({
        message: itemsToAdjust.length > 1 
          ? `Ajuste de ${itemsToAdjust.length} produtos realizado com sucesso!` 
          : 'Ajuste realizado com sucesso!',
        type: 'success'
      });
      setAdjustmentQty(0);
      setAdjustmentProductId('');
      setAdjustmentSearchTerm('');
      setSelectedAdjustmentProducts([]);
      setIsAdjustmentDropdownOpen(false);
    } catch (error) {
      console.error('Adjustment error:', error);
      setCustomAlert({
        message: 'Ocorreu um erro ao realizar o ajuste de estoque.',
        type: 'error'
      });
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
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen overflow-x-hidden" onClick={() => { setActiveMenuId(null); setShowCategoryMenu(false); setShowDepartamentoMenu(false); }}>
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
      <div className="grid grid-cols-2 gap-3 max-w-3xl">
        {[
          { id: 'produtos', label: 'Produtos', icon: Package, span: false },
          { id: 'movimentacoes', label: 'Movimentações', icon: History, span: false },
          { id: 'ajustes', label: 'Ajustes', icon: ArrowLeftRight, span: false },
          { id: 'inventario', label: 'Inventário', icon: ClipboardList, span: false },
          { id: 'alterar-precos', label: 'Reajuste de Preços', icon: Coins, span: true },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2.5 py-4 px-4 rounded-2xl border transition-all font-black uppercase italic text-xs tracking-widest cursor-pointer select-none",
              tab.span ? "col-span-2" : "col-span-1",
              activeTab === tab.id 
                ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/15 scale-[1.01]" 
                : "bg-white border-brand-border text-brand-text-sec hover:bg-slate-50 hover:text-brand-text-main shadow-sm"
            )}
          >
            <tab.icon size={18} className={cn(activeTab === tab.id ? "text-white" : "text-brand-text-sec")} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'produtos' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <SummaryCard 
              title="Total de Produtos" 
              value={products.filter(p => p.status !== 'Inativo').length.toLocaleString('pt-BR')} 
              icon={Package} 
              color="green" 
            />
            <div
              className={cn(
                "text-left transition-all"
              )}
            >
              <SummaryCard 
                title="Estoque Baixo" 
                value={lowStockCount.toLocaleString('pt-BR')} 
                icon={AlertCircle} 
                color="red" 
              />
            </div>
            <SummaryCard 
              title="Quantidade Total" 
              value={products
                .reduce((acc, p) => {
                  const isVirtual = p.product_type === 'KIT' || (p.composition && p.composition.length > 0) || !!p.base_product_id;
                  const isActive = p.status !== 'Inativo';
                  if (isVirtual || !isActive) return acc;
                  return acc + (p.stock || 0);
                }, 0)
                .toLocaleString('pt-BR', { maximumFractionDigits: 2 })} 
              icon={Package} 
              color="blue" 
            />
            <SummaryCard title="Estoque Valorizado" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalStockValue)} icon={TrendingUp} color="orange" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-white">
              {/* Top row: Search and Actions */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" size={17} />
                  <input 
                    className="w-full pl-10 pr-4 h-10 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue text-sm font-medium text-slate-700 transition-all outline-none shadow-inner"
                    placeholder="Buscar por produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  {Object.values(selectedProductsForBulk).filter(Boolean).length > 0 && (
                    <button 
                      onClick={handleBulkDeactivate} 
                      disabled={bulkDeactivateLoading}
                      className="flex items-center gap-2 px-4 h-10 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-100 hover:border-rose-300 hover:shadow transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      {bulkDeactivateLoading ? (
                        <RefreshCw size={14} className="animate-spin stroke-[2.5]" />
                      ) : (
                        <AlertTriangle size={14} className="stroke-[2.5]" />
                      )}
                      <span>Inativar Selecionados ({Object.values(selectedProductsForBulk).filter(Boolean).length})</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowImportModal(true)} 
                    className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 hover:shadow transition-all duration-200 active:scale-95 whitespace-nowrap"
                  >
                    <Upload size={14} className="stroke-[2.5]" />
                    <span>Importar</span>
                  </button>
                  <button 
                    onClick={exportProducts} 
                    className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 hover:shadow transition-all duration-200 active:scale-95 whitespace-nowrap"
                  >
                    <Download size={14} className="stroke-[2.5]" />
                    <span>Exportar</span>
                  </button>
                </div>
              </div>

              {/* Bottom row: Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Departamento Filter */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDepartamentoMenu(!showDepartamentoMenu);
                      setShowCategoryMenu(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 border rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all duration-200 w-full md:w-auto justify-between md:justify-start active:scale-95",
                      selectedDepartamento 
                        ? "bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/10" 
                        : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="stroke-[2.5]" />
                      <span>{selectedDepartamento ? departamentos.find(d => d.id === selectedDepartamento)?.nome : 'Departamentos'}</span>
                    </div>
                    <ChevronDown size={14} />
                  </button>

                  {showDepartamentoMenu && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                      <div className="p-2 max-h-64 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedDepartamento(null);
                            setShowDepartamentoMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors",
                            !selectedDepartamento ? "bg-brand-blue/10 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          Todos os Departamentos
                        </button>
                        {departamentos.map(dep => (
                          <button
                            key={dep.id}
                            onClick={() => {
                              setSelectedDepartamento(dep.id);
                              setShowDepartamentoMenu(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors",
                              selectedDepartamento === dep.id ? "bg-brand-blue/10 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {dep.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Categoria Filter */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCategoryMenu(!showCategoryMenu);
                      setShowDepartamentoMenu(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 h-10 border rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors w-full md:w-auto justify-between md:justify-start",
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
                        {categorias
                          .filter(cat => !selectedDepartamento || cat.departamento_id === selectedDepartamento)
                          .map(cat => (
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

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="flex items-center gap-2 px-3 h-10 border rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors w-full md:w-auto bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 outline-none appearance-none pr-8"
                  >
                    <option value="Ativo">Ativos</option>
                    <option value="Inativo">Inativos</option>
                    <option value="Todos">Todos</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={currentProducts.length > 0 && currentProducts.every(p => selectedProductsForBulk[p.id])}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                    <th className="hidden md:table-cell px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estoque</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Custo / Venda</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentProducts.map((product) => {
                    const isVirtual = product.product_type === 'KIT' || (product.composition && product.composition.length > 0) || !!product.base_product_id;
                    
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={!!selectedProductsForBulk[product.id]}
                          onChange={(e) => {
                            setSelectedProductsForBulk(prev => ({
                              ...prev,
                              [product.id]: e.target.checked
                            }));
                          }}
                          className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center text-slate-400 shadow-sm group-hover:border-brand-blue/25 group-hover:bg-slate-100/40 transition-colors">
                            <Package size={18} className="text-slate-400 group-hover:text-brand-blue/70 transition-colors" />
                          </div>
                          <div className="flex flex-col max-w-[180px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[500px]">
                            <span className="font-bold text-slate-800 text-xs md:text-sm truncate group-hover:text-brand-blue transition-colors" title={product.name}>{product.name}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {getCodigoMercadologico(product) && (
                                <span className="text-[9px] text-brand-blue font-black tracking-widest bg-brand-blue/5 px-1.5 py-0.5 rounded border border-brand-blue/10">
                                  {getCodigoMercadologico(product)}
                                </span>
                              )}
                              {product.brand && product.brand !== 'PADRAO' && product.brand !== 'PADRÃO' && (
                                <span className="text-[9px] text-slate-500 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {product.brand}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 font-bold uppercase md:hidden">{getCategoryName(product)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600 block">{getCategoryName(product)}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{getDepartamentoName(product)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-sm font-black",
                              product.status !== 'Inativo' && product.stock <= product.minStock ? "text-amber-600 font-extrabold" : "text-slate-700"
                            )}>
                              {Number.isInteger(product.stock) ? product.stock : product.stock.toFixed(3)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{product.unit || 'UN'}</span>
                          </div>
                          
                          {/* Stock Health Bar */}
                          {product.status !== 'Inativo' && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    product.stock <= 0 ? "bg-rose-500" :
                                    product.stock <= product.minStock ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                                  )}
                                  style={{ width: `${product.stock <= 0 ? 0 : Math.max(8, Math.min((product.stock / Math.max(1, product.minStock * 1.5)) * 100, 100))}%` }}
                                />
                              </div>
                              {product.stock <= product.minStock && (
                                <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest block whitespace-nowrap animate-pulse">Min: {product.minStock}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-slate-700">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider w-8">Custo:</span>
                            <span className="text-xs text-slate-500 font-bold">R$ {(product.costPrice ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider w-8">Venda:</span>
                            <span className="text-xs text-brand-blue font-black bg-brand-blue/5 px-2 py-0.5 rounded">R$ {(product.salePrice ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          
                          {/* Margem / Profit Percentage badge */}
                          {product.profitPercentage > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 uppercase tracking-widest leading-none">
                                +{product.profitPercentage.toFixed(0)}% margem
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <StatusBadge status={product.status === 'Inativo' ? 'Inativo' : (!isVirtual && product.stock <= 0 ? 'Sem Estoque' : !isVirtual && product.stock <= (product.minStock || 0) ? 'Estoque Baixo' : 'Ativo')} />
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === product.id ? null : product.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        >
                          <Settings2 size={18} />
                        </button>
                        {activeMenuId === product.id && (
                          <>
                            {/* Backdrop */}
                            <div className="fixed inset-0 z-[60] bg-black/20 sm:hidden" onClick={() => setActiveMenuId(null)} />
                            {/* Menu */}
                            <div className="fixed sm:absolute z-[70] right-4 sm:right-full top-20 sm:top-0 sm:mr-2 sm:mt-0 w-64 sm:w-48 bg-white rounded-xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                              <div className="p-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForDetails(product.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <Info size={16} />
                                  Ver Detalhes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(product);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors mt-1"
                                >
                                  <Edit size={16} />
                                  Editar Produto
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(product);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors mt-1"
                                >
                                  <Copy size={16} />
                                  Duplicar Produto
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegisterLoss(product);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors mt-1"
                                >
                                  <AlertTriangle size={16} className="text-orange-500" />
                                  Registrar Perda
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(product.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-1"
                                >
                                  <Trash2 size={16} />
                                  Excluir Produto
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                  {currentProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Package size={48} className="mb-4 text-slate-300" />
                          <p className="text-base font-medium text-slate-600">Nenhum produto encontrado</p>
                          <p className="text-sm mt-1">Tente ajustar os filtros ou adicione um novo produto.</p>
                        </div>
                      </td>
                    </tr>
                  )}
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
                            ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((mov.type || '').toUpperCase()) ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {mov.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{mov.origin}</td>
                        <td className="px-6 py-4 text-xs font-black text-center">
                          {(() => {
                            const isExit = ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((mov.type || '').toUpperCase()) || mov.quantity < 0;
                            const absQty = Math.abs(mov.quantity);
                            return (
                              <span className={!isExit ? "text-emerald-500" : "text-rose-500"}>
                                {!isExit ? `+${absQty}` : `-${absQty}`}
                              </span>
                            );
                          })()}
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-8 space-y-8">
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Settings2 size={16} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Ajuste de Estoque em Massa</h3>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selecione vários produtos no catálogo para ajustar seus saldos físicos rapidamente de uma só vez</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Col */}
              <div className="lg:col-span-2 space-y-6">
                {/* Selecionar Produto */}
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3" ref={adjustmentDropdownRef}>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Selecionar Produto(s) para Ajuste:</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 z-10" size={16} />
                    <input 
                      type="text"
                      value={adjustmentSearchTerm}
                      onChange={(e) => {
                        setAdjustmentSearchTerm(e.target.value);
                        setIsAdjustmentDropdownOpen(true);
                      }}
                      onFocus={() => setIsAdjustmentDropdownOpen(true)}
                      placeholder="Busque por nome, SKU ou Código para adicionar à lista..."
                      className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue text-xs font-bold text-slate-700 transition-all outline-none"
                    />
                    {adjustmentSearchTerm ? (
                      <button 
                        type="button"
                        onClick={() => {
                          setAdjustmentSearchTerm('');
                          setIsAdjustmentDropdownOpen(false);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X size={14} className="stroke-[2.5]" />
                      </button>
                    ) : (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={14} className="stroke-[2.5]" />
                      </div>
                    )}

                    {isAdjustmentDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100 scrollbar-thin">
                        {(() => {
                          const s = adjustmentSearchTerm.toLowerCase().trim();
                          const filtered = products.filter(p => {
                            if (!s) return true;
                            return (
                              (p.name && p.name.toLowerCase().includes(s)) ||
                              (p.sku && p.sku.toLowerCase().includes(s)) ||
                              (p.codigo_mercadologico && p.codigo_mercadologico.toLowerCase().includes(s))
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Nenhum produto localizado
                              </div>
                            );
                          }

                          return filtered.slice(0, 50).map(p => {
                            const isSelected = selectedAdjustmentProducts.some(item => item.id === p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAdjustmentProducts(prev => prev.filter(item => item.id !== p.id));
                                  } else {
                                    setSelectedAdjustmentProducts(prev => [
                                      ...prev,
                                      {
                                        id: p.id,
                                        name: p.name,
                                        stock: p.stock || 0,
                                        unit: p.unit || 'UN',
                                        quantity: adjustmentQty || 1
                                      }
                                    ]);
                                  }
                                  setAdjustmentSearchTerm('');
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-slate-50 flex flex-col gap-1 cursor-pointer",
                                  isSelected ? "bg-brand-blue/5 text-brand-blue" : "text-slate-700"
                                )}
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 truncate">
                                    {isSelected && <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0 animate-pulse"></span>}
                                    <span className={cn("truncate font-black", isSelected ? "text-brand-blue" : "text-slate-800")}>{p.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0 font-mono font-normal">ESTOQUE: {p.stock} {p.unit || 'UN'}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-normal">
                                  <div className="flex items-center gap-3">
                                    {p.sku && <span>SKU: {p.sku}</span>}
                                    {p.codigo_mercadologico && <span>CÓD: {p.codigo_mercadologico}</span>}
                                  </div>
                                  {isSelected && <span className="text-brand-blue font-black uppercase text-[9px]">Selecionado (Clique para remover)</span>}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Produtos Selecionados */}
                {selectedAdjustmentProducts.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Produtos Selecionados ({selectedAdjustmentProducts.length})</h4>
                      <button 
                        type="button" 
                        onClick={() => setSelectedAdjustmentProducts([])}
                        className="text-[10px] uppercase font-black text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Limpar Lista
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="pb-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">Produto</th>
                            <th className="pb-2 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Sld. Atual</th>
                            <th className="pb-2 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Qtd. Ajustar</th>
                            <th className="pb-2 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Novo Saldo</th>
                            <th className="pb-2 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-10 font-mono">Remover</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedAdjustmentProducts.map((item, index) => {
                            const projected = item.stock + (adjustmentType === 'ENTRADA' ? item.quantity : -item.quantity);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 pr-4">
                                  <div className="font-bold text-slate-800 text-xs truncate max-w-[200px] md:max-w-xs">{item.name}</div>
                                </td>
                                <td className="py-3 text-center font-bold text-slate-600 font-mono text-xs whitespace-nowrap">
                                  {item.stock} {item.unit || 'UN'}
                                </td>
                                <td className="py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5 max-w-[120px] mx-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAdjustmentProducts(prev => prev.map((p, i) => i === index ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p));
                                      }}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-bold hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.quantity || ''}
                                      onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value));
                                        setSelectedAdjustmentProducts(prev => prev.map((p, i) => i === index ? { ...p, quantity: val } : p));
                                      }}
                                      className="w-14 bg-slate-50/50 border border-slate-200 h-7 rounded-lg text-center text-xs font-black text-slate-800 focus:bg-white focus:border-brand-blue outline-none transition-all"
                                      placeholder="0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAdjustmentProducts(prev => prev.map((p, i) => i === index ? { ...p, quantity: p.quantity + 1 } : p));
                                      }}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-bold hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className={cn(
                                  "py-3 text-center font-mono text-xs font-black whitespace-nowrap",
                                  projected < 0 ? "text-rose-600 animate-pulse" : "text-brand-blue"
                                )}>
                                  {projected} {item.unit || 'UN'}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAdjustmentProducts(prev => prev.filter((_, i) => i !== index))}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer mx-auto block"
                                  >
                                    <Trash2 size={14} className="stroke-[2.5]" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tipo de Ajuste */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Tipo de Ajuste:</label>
                    <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button 
                        type="button"
                        onClick={() => setAdjustmentType('ENTRADA')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black uppercase italic text-xs transition-all duration-200 cursor-pointer",
                          adjustmentType === 'ENTRADA' 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15" 
                            : "text-slate-450 hover:text-slate-705"
                        )}
                      >
                        <TrendingUp size={14} className="stroke-[2.5]" />
                        Entrada
                      </button>
                      <button 
                        type="button"
                        onClick={() => setAdjustmentType('SAÍDA')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black uppercase italic text-xs transition-all duration-200 cursor-pointer",
                          adjustmentType === 'SAÍDA' 
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/15" 
                            : "text-slate-455 hover:text-rose-600"
                        )}
                      >
                        <TrendingDown size={14} className="stroke-[2.5]" />
                        Saída
                      </button>
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none text-left">Quantidade Padrão:</label>
                      {selectedAdjustmentProducts.length > 0 && adjustmentQty > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedAdjustmentProducts(prev => prev.map(p => ({ ...p, quantity: adjustmentQty })))}
                          className="text-[9px] uppercase font-black text-brand-blue hover:text-brand-blue-hover transition-colors cursor-pointer"
                        >
                          Aplicar a todos
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentQty(prev => Math.max(0, prev - 1))}
                        className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-extrabold hover:text-slate-800 transition-colors cursor-pointer active:scale-90"
                      >
                        <Minus size={16} className="stroke-[2.5]" />
                      </button>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        value={adjustmentQty || ''}
                        onChange={(e) => setAdjustmentQty(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-50/50 border border-slate-200 h-11 rounded-xl text-center text-lg font-black text-slate-800 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setAdjustmentQty(prev => prev + 1)}
                        className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-extrabold hover:text-slate-800 transition-colors cursor-pointer active:scale-90"
                      >
                        <Plus size={16} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Motivo do Ajuste */}
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Motivo do Ajuste:</label>
                  <div className="relative">
                    <select 
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full bg-slate-50/60 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="Correção de Saldo">Correção de Saldo</option>
                      <option value="Avaria / Quebra">Avaria / Quebra</option>
                      <option value="Vencimento">Vencimento</option>
                      <option value="Consumo Interno">Consumo Interno</option>
                      <option value="Bonificação">Bonificação</option>
                      <option value="Doação">Doação</option>
                      <option value="Outros">Outros</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={14} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Botão de Confirmação */}
                <button 
                  type="button"
                  onClick={handleStockAdjustment}
                  disabled={isAdjusting || (selectedAdjustmentProducts.length === 0 && !adjustmentProductId)}
                  className={cn(
                    "w-full text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer",
                    adjustmentType === 'ENTRADA' 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" 
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/10"
                  )}
                >
                  {isAdjusting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Processando...
                    </>
                  ) : (
                    <>
                      Confirmar Ajuste {selectedAdjustmentProducts.length > 0 ? `de ${selectedAdjustmentProducts.length} Produtos` : 'Manual'}
                    </>
                  )}
                </button>
              </div>

              {/* Sidebar Card Col */}
              <div className="space-y-6">
                {/* Card Resumo do Estoque */}
                {(() => {
                  if (selectedAdjustmentProducts.length === 0) {
                    return (
                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200 border-dashed text-center space-y-3 flex flex-col items-center justify-center min-h-[220px]">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package size={18} className="stroke-[2.2]" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Simulador de Saldo</h4>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed px-4">
                          Selecione um ou mais produtos para visualizar a projeção do saldo resultante e alertas de cobertura.
                        </p>
                      </div>
                    );
                  }

                  const lowStockCount = selectedAdjustmentProducts.filter(item => {
                    const projected = item.stock + (adjustmentType === 'ENTRADA' ? item.quantity : -item.quantity);
                    const pSource = products.find(p => p.id === item.id);
                    const minStock = pSource?.minStock ?? 0;
                    return projected <= minStock && projected >= 0;
                  }).length;

                  const negativeStockCount = selectedAdjustmentProducts.filter(item => {
                    const projected = item.stock + (adjustmentType === 'ENTRADA' ? item.quantity : -item.quantity);
                    return projected < 0;
                  }).length;

                  return (
                    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-350">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                          <History size={14} className="stroke-[2.5]" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Previsão Demonstrada</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Produtos selecionados:</span>
                          <span className="text-xs font-black text-slate-705">{selectedAdjustmentProducts.length} itens</span>
                        </div>

                        {negativeStockCount > 0 && (
                          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-2.5 items-start">
                            <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-rose-700 block tracking-wider leading-none">Saldo Negativo Detectado</span>
                              <p className="text-[9px] text-rose-550 leading-tight font-bold uppercase tracking-wide">
                                {negativeStockCount} produto(s) resultará(ão) em estoque negativo físico!
                              </p>
                            </div>
                          </div>
                        )}

                        {lowStockCount > 0 && (
                          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2.5 items-start">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-amber-700 block tracking-wider leading-none">Estoque Crítico / Baixo</span>
                              <p className="text-[9px] text-amber-550 leading-tight font-bold uppercase tracking-wide">
                                {lowStockCount} produto(s) ficará(ão) abaixo do estoque mínimo.
                              </p>
                            </div>
                          </div>
                        )}

                        {negativeStockCount === 0 && lowStockCount === 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex gap-2.5 items-start">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-emerald-700 block tracking-wider leading-none">Estoque Saudável</span>
                              <p className="text-[9px] text-emerald-600 leading-tight font-bold uppercase tracking-wide">
                                Todos os produtos permanecerão em níveis saudáveis de estoque.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lista resumida com scroll das projeções */}
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 scrollbar-thin">
                        {selectedAdjustmentProducts.map(item => {
                          const projected = item.stock + (adjustmentType === 'ENTRADA' ? item.quantity : -item.quantity);
                          return (
                            <div key={item.id} className="pt-2 flex justify-between items-center text-[10px] gap-2">
                              <span className="font-extrabold text-slate-705 truncate max-w-[125px]">{item.name}</span>
                              <div className="flex items-center gap-1.5 font-mono font-bold shrink-0">
                                <span className="text-slate-400">{item.stock}</span>
                                <span className={cn(
                                  "text-[10px]",
                                  adjustmentType === 'ENTRADA' ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {adjustmentType === 'ENTRADA' ? `+${item.quantity}` : `-${item.quantity}`}
                                </span>
                                <ArrowRight size={10} className="text-slate-350 shrink-0" />
                                <span className={cn(
                                  "font-black text-xs",
                                  projected < 0 ? "text-rose-600" : "text-brand-blue"
                                )}>{projected}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Informativo Extra */}
                <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-150 space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">Normativa de Auditoria</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                    Todo ajuste manual em massa gera uma movimentação correspondente no registro histórico que poderá ser consultado na aba Movimentações com registro automático de operador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventario' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header & Filters */}
          <div className="bg-white p-8 rounded-[24px] border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                  <ClipboardList size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Inventário de Estoque</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Gestão, reconciliação e auditoria de contagens físicas de estoque</p>
                </div>
              </div>

              <button 
                onClick={handleStartInventory}
                className="bg-brand-blue hover:bg-brand-blue-hover text-white px-6 py-3.5 rounded-xl font-black uppercase italic text-xs tracking-widest transition-all shadow-lg shadow-brand-blue/15 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={16} className="stroke-[2.5]" />
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
                  className="w-full bg-slate-50 border border-slate-200 px-4 h-11 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Categoria</label>
                <div className="relative">
                  <select 
                    value={inventoryFilter.category}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 pl-4 pr-10 h-11 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Todas as Categorias</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Status</label>
                <div className="relative">
                  <select 
                    value={inventoryFilter.status}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 pl-4 pr-10 h-11 rounded-xl text-xs font-bold text-slate-600 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Todos os Status</option>
                    <option value="Concluído">Finalizado</option>
                    <option value="Em Andamento">Em Andamento</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => setInventoryFilter({ date: '', category: '', status: '' })}
                  className="w-full h-11 border border-slate-200 hover:border-brand-blue/30 text-slate-400 hover:text-brand-blue text-[10px] font-black uppercase tracking-widest transition-all rounded-xl cursor-pointer bg-slate-50/30 hover:bg-white animate-transition"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-150">
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nº</th>
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Data / Localização</th>
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Responsável</th>
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tipo de Escopo</th>
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status de Auditoria</th>
                    <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-right">Controles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventories.length > 0 ? (
                    inventories
                      .filter(inv => {
                        if (inventoryFilter.date && toLocalDateString(inv.date) !== inventoryFilter.date) return false;
                        if (inventoryFilter.status && inv.status !== inventoryFilter.status) return false;
                        return true;
                      })
                      .map((inv, idx) => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedDetailInventory(inv)}
                        className="hover:bg-slate-50/45 transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-4">
                          <span className="text-xs font-black text-slate-450 font-mono">#{inventories.length - idx}</span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-black text-slate-700">{new Date(inv.date).toLocaleDateString('pt-BR')}</span>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{inv.location || 'Sem Localização'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-slate-650">{inv.responsible || 'Sistema'}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-650 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            {inv.type || 'Geral'}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                            inv.status === 'Concluído' 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/55" 
                              : "bg-amber-50 text-amber-600 border border-amber-200/55"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", inv.status === 'Concluído' ? "bg-emerald-500" : "bg-amber-500")} />
                            {inv.status === 'Concluído' ? 'Finalizado' : 'Em Andamento'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === inv.id ? null : inv.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-blue border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Settings2 size={16} />
                          </button>
                          
                          {activeMenuId === inv.id && (
                            <div className="absolute right-8 top-11 w-48 bg-white rounded-xl shadow-xl border border-slate-150 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                              <div className="p-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Tem certeza que deseja excluir este registro de inventário? A exclusão é permanente.')) {
                                      deleteInventory(inv.id);
                                    }
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-extrabold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} className="stroke-[2]" />
                                  Excluir Inventário
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-350">
                          <ClipboardList size={40} className="stroke-[1.5] opacity-40" />
                          <p className="text-[10px] font-black uppercase tracking-widest font-mono">Nenhum inventário registrado no histórico</p>
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

      {selectedDetailInventory && (
        <InventoryDetailModal 
          inventory={selectedDetailInventory} 
          onClose={() => setSelectedDetailInventory(null)} 
        />
      )}

      {showModal && (
        <ProductForm 
          initialData={duplicateBaseProduct || editingProduct || undefined}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
            setDuplicateBaseProduct(null);
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

      {showBulkDeactivateConfirm && (
        <div id="bulk-deactivate-confirm-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={20} className="stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-rose-600 uppercase italic tracking-tight font-sans">Inativar em Lote</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">
              Tem certeza que deseja inativar em lote os{" "}
              <strong className="text-slate-900 font-extrabold">{Object.values(selectedProductsForBulk).filter(Boolean).length}</strong>{" "}
              produtos selecionados? Esta ação é totalmente reversível ativando os produtos individualmente ou mudando o filtro de status para "Inativos".
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeactivateConfirm(false)}
                className="px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200 rounded-xl transition-all duration-150 font-bold text-xs uppercase tracking-widest active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmBulkDeactivate}
                className="px-4 py-2.5 bg-rose-650 hover:bg-rose-600 text-rose-600 hover:text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-all duration-150 font-bold text-xs uppercase tracking-widest active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alterar-precos' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-blue">
                  <Coins size={16} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Alteração de Preço em Massa</h3>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Filtre os produtos desejados e aplique alterações de preço rápidas e arredondamentos inteligentes de centavos.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar - Filtros & Parâmetros */}
              <div className="space-y-6">
                {/* 1. SELEÇÃO DE PRODUTOS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">
                    1. Filtros de Seleção
                  </h4>
                  
                  {/* Busca textual */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Buscar por Texto</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text"
                        value={bulkPriceSearch}
                        onChange={(e) => setBulkPriceSearch(e.target.value)}
                        placeholder="Nome, SKU ou Cód. Mercadológico..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Departamento */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Departamento</label>
                    <select
                      value={bulkPriceDep || ''}
                      onChange={(e) => {
                        setBulkPriceDep(e.target.value || null);
                        setBulkPriceCat(null);
                        setBulkPriceSubcat(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all"
                    >
                      <option value="">Todos Departamentos</option>
                      {departamentos.map(d => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Categoria</label>
                    <select
                      value={bulkPriceCat || ''}
                      onChange={(e) => {
                        setBulkPriceCat(e.target.value || null);
                        setBulkPriceSubcat(null);
                      }}
                      disabled={!bulkPriceDep}
                      className="w-full px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">Todas Categorias</option>
                      {categorias.filter(c => c.departamento_id === bulkPriceDep).map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategoria */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Subcategoria</label>
                    <select
                      value={bulkPriceSubcat || ''}
                      onChange={(e) => setBulkPriceSubcat(e.target.value || null)}
                      disabled={!bulkPriceCat}
                      className="w-full px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">Todas Subcategorias</option>
                      {subcategorias.filter(s => s.categoria_id === bulkPriceCat).map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Limpar Filtros */}
                  {(bulkPriceSearch || bulkPriceDep || bulkPriceCat || bulkPriceSubcat) && (
                    <button
                      onClick={() => {
                        setBulkPriceSearch('');
                        setBulkPriceDep(null);
                        setBulkPriceCat(null);
                        setBulkPriceSubcat(null);
                      }}
                      className="w-full text-center text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors pt-1"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>

                {/* 2. REGRA DE REAJUSTE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">
                    2. Parâmetros do Reajuste
                  </h4>

                  {/* Qual Preço Ajustar */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Tipo de Preço</label>
                    <select
                      value={bulkPriceTarget}
                      onChange={(e) => setBulkPriceTarget(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 outline-none"
                    >
                      <option value="salePrice">Preço de Venda</option>
                      <option value="costPrice">Preço de Custo</option>
                      <option value="wholesalePrice">Preço de Atacado</option>
                    </select>
                  </div>

                  {/* Operação */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Operação</label>
                    <select
                      value={bulkPriceOp}
                      onChange={(e) => setBulkPriceOp(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 outline-none"
                    >
                      <option value="pct_inc">Acréscimo Percentual (%)</option>
                      <option value="pct_dec">Desconto Percentual (%)</option>
                      <option value="val_inc">Acréscimo Fixo (R$)</option>
                      <option value="val_dec">Desconto Fixo (R$)</option>
                      <option value="fixed">Definir Preço Estático (R$)</option>
                    </select>
                  </div>

                  {/* Valor */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Valor do Reajuste</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        {['pct_inc', 'pct_dec'].includes(bulkPriceOp) ? '%' : 'R$'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkPriceValue || ''}
                        onChange={(e) => setBulkPriceValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="Determine o valor..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-bold text-slate-700 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Arredondamento */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Arredondamento Inteligente</label>
                    <select
                      value={bulkPriceRound}
                      onChange={(e) => setBulkPriceRound(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs focus:ring-2 focus:ring-brand-blue/10 outline-none"
                    >
                      <option value="none">Sem arredondamento</option>
                      <option value="0.05">Múltiplos de R$ 0,05</option>
                      <option value="0.10">Múltiplos de R$ 0,10</option>
                      <option value="0.50">Múltiplos de R$ 0,50</option>
                      <option value="0.90">Terminar em .90 (Apelo de centavos)</option>
                      <option value="0.99">Terminar em .99 (Apelo de centavos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Main Area - Tabela de Simulação */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">
                        Preview dos Valores Reajustados
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                        {filteredBulkProducts.length} produtos encontrados com os filtros atuais.
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const selection: Record<string, boolean> = {};
                          filteredBulkProducts.forEach(p => {
                            selection[p.id] = true;
                          });
                          setBulkSelectedProducts(selection);
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        Selecionar Todos
                      </button>
                      <button
                        onClick={() => {
                          setBulkSelectedProducts({});
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all"
                      >
                        Limpar Seleção
                      </button>
                    </div>
                  </div>

                  {/* Simulated Products List */}
                  <div className="overflow-y-auto max-h-[480px] divide-y divide-slate-100 divide-dashed">
                    {filteredBulkProducts.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <AlertCircle className="mx-auto text-slate-300" size={32} />
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum produto correspondente</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide">Ajuste os filtros de seleção ao lado.</p>
                      </div>
                    ) : (
                      filteredBulkProducts.map((p) => {
                        const isSelected = !!bulkSelectedProducts[p.id];

                        const initCost = p.costPrice || 0;
                        const initSale = p.salePrice || 0;
                        const initWholesale = p.wholesalePrice || 0;

                        const isCostTarget = bulkPriceTarget === 'costPrice';
                        const isSaleTarget = bulkPriceTarget === 'salePrice';
                        const isWholesaleTarget = bulkPriceTarget === 'wholesalePrice';

                        const formulaCost = isCostTarget ? calculateAdjustedPrice(initCost, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initCost;
                        const formulaSale = isSaleTarget ? calculateAdjustedPrice(initSale, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initSale;
                        const formulaWholesale = isWholesaleTarget ? calculateAdjustedPrice(initWholesale, bulkPriceOp, bulkPriceValue, bulkPriceRound) : initWholesale;

                        const newCost = bulkCustomCostPrices[p.id] !== undefined ? bulkCustomCostPrices[p.id] : formulaCost;
                        const newSale = bulkCustomPrices[p.id] !== undefined ? bulkCustomPrices[p.id] : formulaSale;
                        const newWholesale = bulkCustomWholesalePrices[p.id] !== undefined ? bulkCustomWholesalePrices[p.id] : formulaWholesale;

                        const isCostCustom = bulkCustomCostPrices[p.id] !== undefined;
                        const isSaleCustom = bulkCustomPrices[p.id] !== undefined;
                        const isWholesaleCustom = bulkCustomWholesalePrices[p.id] !== undefined;

                        // Margem de Lucro (%): (Venda - Custo) / Venda
                        const currentMargin = initSale > 0 ? ((initSale - initCost) / initSale) * 100 : 0;
                        const newMargin = newSale > 0 ? ((newSale - newCost) / newSale) * 100 : 0;

                        return (
                          <div 
                            key={p.id}
                            className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-slate-50/50 ${isSelected ? 'bg-blue-50/10' : ''}`}
                            onClick={() => {
                              setBulkSelectedProducts(prev => ({
                                ...prev,
                                [p.id]: !prev[p.id]
                              }));
                            }}
                          >
                            {/* Product Info Block */}
                            <div className="flex items-center gap-3.5 min-w-0 lg:w-1/4">
                              <div 
                                className="shrink-0"
                                onClick={(e) => e.stopPropagation()} // Prevent double trigger
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setBulkSelectedProducts(prev => ({
                                      ...prev,
                                      [p.id]: !prev[p.id]
                                    }));
                                  }}
                                  className="w-4.5 h-4.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/10 cursor-pointer"
                                />
                              </div>

                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-slate-700 truncate leading-tight uppercase italic">{p.name}</h5>
                                <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                  <span className="text-[9px] font-bold text-slate-400 font-mono">SKU: {p.sku || 'Sem SKU'}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span className="text-[9px] font-bold text-slate-400">{getCategoryName(p)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Editing Prices Columns */}
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 lg:w-3/4 justify-between lg:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                              
                              {/* COST PRICE COLUMN */}
                              <div className="flex items-center gap-2 bg-slate-50/60 p-2 rounded-xl border border-slate-100 min-w-[155px]">
                                <div className="text-left select-none">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Custo Atual</span>
                                  <span className="text-[10px] font-bold text-slate-500 block font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initCost)}
                                  </span>
                                </div>
                                <ArrowRight size={10} className="text-slate-300 shrink-0" />
                                <div className="relative">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">
                                    {isCostCustom ? 'Custo Pers. R$' : 'Novo Custo R$'}
                                  </span>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={isCostCustom ? (bulkCustomCostPrices[p.id] !== undefined ? bulkCustomCostPrices[p.id] : '') : newCost.toFixed(2)}
                                      onChange={(e) => {
                                        const valStr = e.target.value;
                                        if (valStr === '') {
                                          setBulkCustomCostPrices(prev => {
                                            const next = { ...prev };
                                            delete next[p.id];
                                            return next;
                                          });
                                        } else {
                                          const val = parseFloat(valStr);
                                          setBulkCustomCostPrices(prev => ({
                                            ...prev,
                                            [p.id]: isNaN(val) ? 0 : val
                                          }));
                                          setBulkSelectedProducts(prev => ({
                                            ...prev,
                                            [p.id]: true
                                          }));
                                        }
                                      }}
                                      className={`w-20 px-1.5 py-0.5 border rounded text-xs font-bold text-slate-800 text-right outline-none transition-all shadow-sm ${
                                        isCostCustom 
                                          ? 'border-indigo-500 bg-indigo-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-200' 
                                          : isCostTarget 
                                            ? 'border-blue-400 bg-blue-50/20 focus:bg-white focus:ring-2 focus:ring-blue-150'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-brand-blue/15'
                                      }`}
                                    />
                                    {isCostCustom && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBulkCustomCostPrices(prev => {
                                            const next = { ...prev };
                                            delete next[p.id];
                                            return next;
                                          });
                                        }}
                                        className="absolute -right-4 p-0.5 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Limpar custo customizado"
                                      >
                                        <X size={8} className="stroke-[3]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* SALE PRICE COLUMN */}
                              <div className="flex items-center gap-2 bg-slate-50/60 p-2 rounded-xl border border-slate-100 min-w-[155px]">
                                <div className="text-left select-none">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Venda Atual</span>
                                  <span className="text-[10px] font-bold text-slate-500 block font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initSale)}
                                  </span>
                                </div>
                                <ArrowRight size={10} className="text-slate-300 shrink-0" />
                                <div className="relative">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">
                                    {isSaleCustom ? 'Venda Pers. R$' : 'Nova Venda R$'}
                                  </span>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={isSaleCustom ? (bulkCustomPrices[p.id] !== undefined ? bulkCustomPrices[p.id] : '') : newSale.toFixed(2)}
                                      onChange={(e) => {
                                        const valStr = e.target.value;
                                        if (valStr === '') {
                                          setBulkCustomPrices(prev => {
                                            const next = { ...prev };
                                            delete next[p.id];
                                            return next;
                                          });
                                        } else {
                                          const val = parseFloat(valStr);
                                          setBulkCustomPrices(prev => ({
                                            ...prev,
                                            [p.id]: isNaN(val) ? 0 : val
                                          }));
                                          setBulkSelectedProducts(prev => ({
                                            ...prev,
                                            [p.id]: true
                                          }));
                                        }
                                      }}
                                      className={`w-20 px-1.5 py-0.5 border rounded text-xs font-bold text-slate-800 text-right outline-none transition-all shadow-sm ${
                                        isSaleCustom 
                                          ? 'border-blue-500 bg-blue-50/30 focus:bg-white focus:ring-2 focus:ring-blue-200' 
                                          : isSaleTarget
                                            ? 'border-blue-400 bg-blue-50/20 focus:bg-white focus:ring-2 focus:ring-blue-150'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-brand-blue/15'
                                      }`}
                                    />
                                    {isSaleCustom && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBulkCustomPrices(prev => {
                                            const next = { ...prev };
                                            delete next[p.id];
                                            return next;
                                          });
                                        }}
                                        className="absolute -right-4 p-0.5 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Limpar venda customizada"
                                      >
                                        <X size={8} className="stroke-[3]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* WHOLESALE PRICE COLUMN (OPTIONAL, rendered if bulkPriceTarget is wholesale or if there is a custom override) */}
                              {(isWholesaleTarget || isWholesaleCustom) && (
                                <div className="flex items-center gap-2 bg-slate-50/60 p-2 rounded-xl border border-slate-100 min-w-[155px]">
                                  <div className="text-left select-none">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Atacado Atual</span>
                                    <span className="text-[10px] font-bold text-slate-500 block font-mono">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initWholesale)}
                                    </span>
                                  </div>
                                  <ArrowRight size={10} className="text-slate-300 shrink-0" />
                                  <div className="relative">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">
                                      {isWholesaleCustom ? 'Atacado Pers. R$' : 'Novo Atacado R$'}
                                    </span>
                                    <div className="relative flex items-center">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={isWholesaleCustom ? (bulkCustomWholesalePrices[p.id] !== undefined ? bulkCustomWholesalePrices[p.id] : '') : newWholesale.toFixed(2)}
                                        onChange={(e) => {
                                          const valStr = e.target.value;
                                          if (valStr === '') {
                                            setBulkCustomWholesalePrices(prev => {
                                              const next = { ...prev };
                                              delete next[p.id];
                                              return next;
                                            });
                                          } else {
                                            const val = parseFloat(valStr);
                                            setBulkCustomWholesalePrices(prev => ({
                                              ...prev,
                                              [p.id]: isNaN(val) ? 0 : val
                                            }));
                                            setBulkSelectedProducts(prev => ({
                                              ...prev,
                                              [p.id]: true
                                            }));
                                          }
                                        }}
                                        className={`w-20 px-1.5 py-0.5 border rounded text-xs font-bold text-slate-800 text-right outline-none transition-all shadow-sm ${
                                          isWholesaleCustom 
                                            ? 'border-emerald-500 bg-emerald-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-200' 
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-brand-blue/15'
                                        }`}
                                      />
                                      {isWholesaleCustom && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBulkCustomWholesalePrices(prev => {
                                              const next = { ...prev };
                                              delete next[p.id];
                                              return next;
                                            });
                                          }}
                                          className="absolute -right-4 p-0.5 text-slate-400 hover:text-rose-500 transition-colors"
                                          title="Limpar atacado customizado"
                                        >
                                          <X size={8} className="stroke-[3]" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* REAL-TIME MARGIN AND IMPACT */}
                              <div className="text-right w-20 select-none">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Margem</span>
                                <div className="text-[10px] font-mono font-black space-y-0.5 leading-tight">
                                  <span className="text-slate-400 block decoration-2 line-through text-[9px]">
                                    {currentMargin.toFixed(1)}%
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-lg text-[9px] inline-block ${
                                    newMargin > currentMargin 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : newMargin < currentMargin 
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {newMargin.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary / Apply Bar */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        Total Selecionado
                      </p>
                      <p className="text-xs font-black text-slate-700">
                        {Object.values(bulkSelectedProducts).filter(Boolean).length} de {filteredBulkProducts.length} produtos
                      </p>
                    </div>

                    <button
                      onClick={handleApplyBulkPriceUpdate}
                      disabled={bulkIsSubmitting || Object.values(bulkSelectedProducts).filter(Boolean).length === 0}
                      className="w-full sm:w-auto px-6 py-3 bg-brand-blue hover:bg-brand-blue-hover disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase italic tracking-wider shadow-md shadow-brand-blue/15 transition-all flex items-center justify-center gap-2"
                    >
                      {bulkIsSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Gravando Preços...</span>
                        </>
                      ) : (
                        <>
                          <Coins size={14} className="stroke-[2.5]" />
                          <span>Gravar Reajuste</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProductForDetails && (
        <ProductDetails 
          productId={selectedProductForDetails} 
          onClose={() => setSelectedProductForDetails(null)} 
        />
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
    .sort((a, b) => new Date(a.dataEntrada || '').getTime() - new Date(b.dataEntrada || '').getTime());

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
              <p className="text-xs text-brand-text-sec">{product.name}</p>
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
                <option value="Consumo Interno">Consumo Interno</option>
                <option value="Roubo/Furto">Roubo/Furto</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="p-3 bg-brand-warning/5 rounded-xl border border-brand-warning/10">
              <p className="text-[10px] font-black text-brand-warning uppercase tracking-widest leading-none mb-1">Impacto Financeiro</p>
              <p className="text-base font-black text-brand-warning leading-none">
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
    green: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      vText: "text-emerald-700",
      accent: "from-emerald-400 to-teal-500"
    },
    red: {
      bg: "bg-rose-50 text-rose-600 border-rose-100",
      vText: "text-rose-700",
      accent: "from-rose-400 to-red-500"
    },
    blue: {
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      vText: "text-blue-700",
      accent: "from-blue-400 to-indigo-500"
    },
    orange: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      vText: "text-amber-700",
      accent: "from-amber-400 to-orange-500"
    },
  };

  const scheme = colors[color] || colors.blue;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-w-0 hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      {/* Decorative gradient corner bottom bar */}
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${scheme.accent} opacity-40 group-hover:opacity-100 transition-opacity`} />
      
      <div className={`p-3 rounded-xl shrink-0 border ${scheme.bg}`}>
        <Icon size={20} className="stroke-[2.2]" />
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 mb-1 truncate uppercase tracking-widest leading-none" title={title}>{title}</p>
        <p className={`text-base md:text-lg font-black truncate leading-tight ${scheme.vText}`} title={value}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'Disponivel': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Estoque Baixo': 'bg-amber-50 text-amber-700 border-amber-200',
    'Sem Estoque': 'bg-rose-50 text-rose-700 border-rose-200',
    'Pago': 'bg-blue-50 text-blue-700 border-blue-200',
    'Indisponivel': 'bg-rose-50 text-rose-700 border-rose-200',
    'Ativo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Inativo': 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap",
      styles[status] || 'bg-slate-50 text-slate-600 border-slate-200'
    )}>
      {status}
    </span>
  );
}

function InventoryDetailModal({ inventory, onClose }: { inventory: any, onClose: () => void }) {
  const { stockMovements, products } = useERP();

  // Filtra movimentos de estoque do tipo AJUSTE vinculados a este inventário por proximidade temporal (2 min)
  const relatedMovements = stockMovements.filter(m => {
    if (m.type !== 'AJUSTE') return false;
    if (!m.origin || !m.origin.includes('Ajuste de Inventário')) return false;
    
    const moveTime = new Date(m.date).getTime();
    const invTime = new Date(inventory.date).getTime();
    return Math.abs(moveTime - invTime) < 120000;
  });

  // Calcula valores somados das divergências com base nos movimentos relacionados
  const movementsWithProducts = relatedMovements.map(m => {
    const product = products.find(p => p.id === m.productId);
    const cost = product?.costPrice || 0;
    return {
      movement: m,
      product,
      cost,
      totalCost: m.quantity * cost
    };
  });

  const totalDivergencesCost = movementsWithProducts.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[700] p-4 overflow-y-auto print:bg-white print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-inventory-report, #printable-inventory-report * {
            visibility: visible;
          }
          #printable-inventory-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            color: black !important;
            padding: 10px 0;
            margin: 0;
            overflow: visible;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}} />

      <div 
        id="printable-inventory-report"
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white max-w-2xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-dashed border-slate-200 dark:border-slate-800 print:border-black">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue text-[9px] font-black uppercase tracking-wider rounded">
                Inventário {inventory.type || 'Geral'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Ref: #{inventory.id.substring(0, 8)}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-wider text-slate-900 dark:text-white print:text-black">
              Relatório de Ajustes de Estoque
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-0.5">
              Histórico consolidado com divergências aferidas
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-650 rounded-xl transition-all cursor-pointer print:hidden"
          >
            <span className="text-xs font-black uppercase tracking-widest">Fechar</span>
          </button>
        </div>

        {/* Audit Details Mini Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono py-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 print:bg-slate-100 print:text-black print:border-black">
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Data Abertura:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
              {new Date(inventory.date).toLocaleDateString('pt-BR')} {new Date(inventory.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Responsável:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black uppercase">
              {inventory.responsible || 'Sistema'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Localização:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black truncate uppercase block">
              {inventory.location || 'Loja Principal'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Status:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">
              {inventory.status === 'Concluído' ? 'Finalizado' : inventory.status}
            </span>
          </div>
        </div>

        {/* Dynamic Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 print:bg-slate-100 print:border-black">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Itens Auditados</span>
            <div className="text-xl font-black text-slate-800 dark:text-white print:text-black mt-1 font-mono">
              {inventory.itemsCounted || 0}
            </div>
          </div>
          <div className={cn(
            "p-4 rounded-2xl border print:bg-slate-100 print:border-black",
            totalDivergencesCost === 0 
              ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/60" 
              : totalDivergencesCost > 0 
                ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-950" 
                : "bg-rose-500/5 dark:bg-rose-500/10 border-rose-100 dark:border-rose-950"
          )}>
            <span className="text-[10px] uppercase font-bold text-slate-400">Divergência Financeira</span>
            <div className={cn(
              "text-xl font-black mt-1 font-mono",
              totalDivergencesCost === 0 
                ? "text-slate-800 dark:text-white print:text-black" 
                : totalDivergencesCost > 0 
                  ? "text-emerald-600 dark:text-emerald-400 print:text-black" 
                  : "text-rose-600 dark:text-rose-400 print:text-black"
            )}>
              R$ {totalDivergencesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Detailed Correction Items */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Divergências e Correções de Estoque
          </h4>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:text-black print:border-black">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-[10px]">Produto / Código</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-[10px] text-center">Ajuste Qtd</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-[10px] text-right">Preço Custo</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-[10px] text-right font-mono">Divergência R$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-black">
                {movementsWithProducts.length > 0 ? (
                  movementsWithProducts.map(({ movement, product, cost, totalCost }, index) => (
                    <tr key={`${movement.id}-${index}`} className="hover:bg-slate-50/50 print:text-black select-none">
                      <td className="p-3.5 font-medium">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 print:text-black leading-tight truncate max-w-[200px] md:max-w-xs">{product?.name || 'Produto Não Encontrado'}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {movement.productId.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-lg text-xs font-black font-mono",
                          movement.quantity > 0 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 print:bg-transparent print:text-black" 
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 print:bg-transparent print:text-black"
                        )}>
                          {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-slate-500 dark:text-slate-400 print:text-black">
                        R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={cn(
                        "p-3.5 text-right font-black font-mono",
                        totalCost > 0 
                          ? "text-emerald-600 dark:text-emerald-400 print:text-black" 
                          : "text-rose-600 dark:text-rose-400 print:text-black"
                      )}>
                        R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 uppercase tracking-wider text-[10px] font-mono leading-none">
                      Nenhuma divergência de estoque física foi registrada neste inventário. todos os saldos coincidiram!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Audit Block on Print */}
        <div className="hidden print:block pt-16 space-y-12">
          <div className="flex justify-between gap-12 text-center text-xs font-mono">
            <div className="flex-1 border-t border-slate-900 pt-2 text-black shrink-0">
              <p className="font-bold uppercase leading-none">{inventory.responsible || 'Operador'}</p>
              <p className="text-[10px] text-slate-500 pt-1">Assinatura do Auditor</p>
            </div>
            <div className="flex-1 border-t border-slate-900 pt-2 text-black shrink-0">
              <p className="font-bold uppercase leading-none">Visto de Gerência / Supervisor</p>
              <p className="text-[10px] text-slate-500 pt-1">Assinatura Responsável</p>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden justify-end">
          <button 
            onClick={() => window.print()}
            className="py-3 px-5 bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95 cursor-pointer"
          >
            <Printer size={16} />
            Imprimir Relatório
          </button>
          <button 
            onClick={onClose}
            className="py-3 px-6 bg-brand-blue hover:opacity-90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 active:scale-95 cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
}
