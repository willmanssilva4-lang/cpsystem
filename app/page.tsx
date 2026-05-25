"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Check, 
  RefreshCw, 
  Layers, 
  Calendar, 
  BarChart3, 
  Users, 
  Filter, 
  X,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
}

interface PurchaseItem {
  productId: string;
  qty: number;
  cost: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  status: 'Recebido' | 'Pendente';
}

interface SaleCartItem {
  productId: string;
  qty: number;
  price: number;
}

interface SaleRecord {
  id: string;
  date: string;
  items: SaleCartItem[];
  total: number;
  paymentMethod: 'Dinheiro' | 'PIX' | 'Cartão Deb' | 'Cartão Cred';
}

interface FinancialLog {
  id: string;
  date: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  amount: number;
}

// --- Default Mock Data ---
const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', code: '7891000101', name: 'Coca-Cola Zero Lata 350ml', category: 'Bebidas', costPrice: 2.20, salePrice: 4.50, stock: 45, minStock: 15, unit: 'UN' },
  { id: 'p2', code: '7891000102', name: 'Arroz Integral Tio João 1kg', category: 'Alimentos', costPrice: 4.80, salePrice: 8.90, stock: 22, minStock: 10, unit: 'UN' },
  { id: 'p3', code: '7891000103', name: 'Feijão Carioca Kicaldo 1kg', category: 'Alimentos', costPrice: 5.50, salePrice: 9.90, stock: 18, minStock: 8, unit: 'UN' },
  { id: 'p4', code: '7891000104', name: 'Sabão Líquido Omo Multiação 1L', category: 'Limpeza', costPrice: 11.20, salePrice: 19.90, stock: 7, minStock: 5, unit: 'UN' },
  { id: 'p5', code: '7891000105', name: 'Chocolate Lacta Ao Leite 90g', category: 'Doces', costPrice: 3.10, salePrice: 6.50, stock: 30, minStock: 10, unit: 'UN' }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Atacadão Alimentos S/A', cnpj: '45.122.987/0001-90', contact: 'comercial@atacadao.com' },
  { id: 's2', name: 'Ambev Distribuição Sul', cnpj: '02.441.536/0045-12', contact: 'contato@ambev.com.br' },
  { id: 's3', name: 'Nestlé Prime Logistics', cnpj: '60.442.221/0001-08', contact: 'vendas@nestle.com' }
];

const DEFAULT_FINANCIAL_LOGS: FinancialLog[] = [
  { id: 'f1', date: '2026-05-24T10:00:00Z', type: 'RECEITA', category: 'PDV', description: 'Venda Caixa Consumidor', amount: 450.00 },
  { id: 'f2', date: '2026-05-24T14:30:00Z', type: 'DESPESA', category: 'Infraestrutura', description: 'Conta de Energia Elétrica', amount: 180.00 },
  { id: 'f3', date: '2026-05-25T09:15:00Z', type: 'DESPESA', category: 'Fornecedor', description: 'Compra suprimentos Atacadão S/A', amount: 280.00 }
];

const DEFAULT_PURCHASES: PurchaseOrder[] = [
  { id: 'cmp-1', supplierId: 's1', date: '2026-05-23T11:00:00Z', items: [{ productId: 'p2', qty: 10, cost: 4.80 }], total: 48.00, status: 'Recebido' },
  { id: 'cmp-2', supplierId: 's2', date: '2026-05-25T13:00:00Z', items: [{ productId: 'p1', qty: 24, cost: 2.20 }], total: 52.80, status: 'Pendente' }
];

const DEFAULT_SALES: SaleRecord[] = [
  { id: 'vd-1', date: '2026-05-24T16:45:00Z', items: [{ productId: 'p1', qty: 4, price: 4.50 }, { productId: 'p5', qty: 2, price: 6.50 }], total: 31.00, paymentMethod: 'PIX' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pdv' | 'inventory' | 'purchases' | 'finance'>('dashboard');
  const [mounted, setMounted] = useState(false);

  // --- Core States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [financialLogs, setFinancialLogs] = useState<FinancialLog[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  // --- Interactivity / Modals / Forms ---
  // PDV States
  const [pdvCart, setPdvCart] = useState<{ product: Product; qty: number }[]>([]);
  const [pdvSearch, setPdvSearch] = useState('');
  const [pdvPayMethod, setPdvPayMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão Deb' | 'Cartão Cred'>('PIX');
  
  // Product Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    code: '', name: '', category: 'Alimentos', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, unit: 'UN'
  });

  // Supplier Form states
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [suppForm, setSuppForm] = useState({ name: '', cnpj: '', contact: '' });

  // Purchase Order Form states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseCart, setPurchaseCart] = useState<{ productId: string; qty: number; cost: number }[]>([]);
  const [addingPurchaseItem, setAddingPurchaseItem] = useState({ productId: '', qty: 10, cost: 0 });

  // Quick Finance state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: 0, category: 'Despesas Gerais', description: '' });

  // Initialize Data Safely
  useEffect(() => {
    setMounted(true);
    const storedProds = localStorage.getItem('erp_products');
    const storedSupps = localStorage.getItem('erp_suppliers');
    const storedFinance = localStorage.getItem('erp_finance');
    const storedPurchases = localStorage.getItem('erp_purchases');
    const storedSales = localStorage.getItem('erp_sales');

    if (storedProds) setProducts(JSON.parse(storedProds));
    else setProducts(DEFAULT_PRODUCTS);

    if (storedSupps) setSuppliers(JSON.parse(storedSupps));
    else setSuppliers(DEFAULT_SUPPLIERS);

    if (storedFinance) setFinancialLogs(JSON.parse(storedFinance));
    else setFinancialLogs(DEFAULT_FINANCIAL_LOGS);

    if (storedPurchases) setPurchaseOrders(JSON.parse(storedPurchases));
    else setPurchaseOrders(DEFAULT_PURCHASES);

    if (storedSales) setSales(JSON.parse(storedSales));
    else setSales(DEFAULT_SALES);
  }, []);

  // Save states to LocalStorage
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const updateAndSaveProducts = (newProds: Product[]) => {
    setProducts(newProds);
    saveState('erp_products', newProds);
  };

  const updateAndSaveSuppliers = (newSupps: Supplier[]) => {
    setSuppliers(newSupps);
    saveState('erp_suppliers', newSupps);
  };

  const updateAndSaveFinance = (newFinance: FinancialLog[]) => {
    setFinancialLogs(newFinance);
    saveState('erp_finance', newFinance);
  };

  const updateAndSavePurchases = (newPurchases: PurchaseOrder[]) => {
    setPurchaseOrders(newPurchases);
    saveState('erp_purchases', newPurchases);
  };

  const updateAndSaveSales = (newSales: SaleRecord[]) => {
    setSales(newSales);
    saveState('erp_sales', newSales);
  };

  // --- Reset All Data Button ---
  const handleResetToDefaults = () => {
    if (confirm('Deseja realmente redefinir o sistema com os dados modelo de demonstração? Seus novos registros serão apagados.')) {
      updateAndSaveProducts(DEFAULT_PRODUCTS);
      updateAndSaveSuppliers(DEFAULT_SUPPLIERS);
      updateAndSaveFinance(DEFAULT_FINANCIAL_LOGS);
      updateAndSavePurchases(DEFAULT_PURCHASES);
      updateAndSaveSales(DEFAULT_SALES);
      setPdvCart([]);
      setPurchaseCart([]);
    }
  };

  // --- Financial Computations ---
  const financeMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;
    financialLogs.forEach(log => {
      if (log.type === 'RECEITA') totalRevenue += log.amount;
      else totalExpense += log.amount;
    });
    return {
      revenue: totalRevenue,
      expenses: totalExpense,
      netProfit: totalRevenue - totalExpense,
      balanceColor: (totalRevenue - totalExpense) >= 0 ? 'text-emerald-600' : 'text-rose-600'
    };
  }, [financialLogs]);

  const stockMetrics = useMemo(() => {
    const lowStockItems = products.filter(p => p.stock <= p.minStock).length;
    const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
    const valuation = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
    return { lowStockItems, totalItems, valuation };
  }, [products]);

  // --- PDV Add/Remove/Complete ---
  const filteredPDVProducts = useMemo(() => {
    if (!pdvSearch) return products.slice(0, 4);
    return products.filter(p => 
      p.name.toLowerCase().includes(pdvSearch.toLowerCase()) || 
      p.code.includes(pdvSearch)
    );
  }, [products, pdvSearch]);

  const handleAddProductToPdv = (prod: Product) => {
    const existing = pdvCart.find(item => item.product.id === prod.id);
    if (existing) {
      if (existing.qty >= prod.stock) {
        alert('Quantidade máxima em estoque atingida.');
        return;
      }
      setPdvCart(pdvCart.map(item => 
        item.product.id === prod.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      if (prod.stock < 1) {
        alert('Este produto está com o estoque zerado.');
        return;
      }
      setPdvCart([...pdvCart, { product: prod, qty: 1 }]);
    }
  };

  const handleUpdatePdvQty = (prodId: string, newQty: number) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    if (newQty <= 0) {
      setPdvCart(pdvCart.filter(item => item.product.id !== prodId));
      return;
    }
    if (newQty > prod.stock) {
      alert(`Quantidade em estoque indisponível. Saldo Atual: ${prod.stock}`);
      return;
    }
    setPdvCart(pdvCart.map(item => 
      item.product.id === prodId ? { ...item, qty: newQty } : item
    ));
  };

  const handleCompleteSale = () => {
    if (pdvCart.length === 0) return;
    const saleTotal = pdvCart.reduce((acc, item) => acc + item.qty * item.product.salePrice, 0);
    
    // 1. Create Sale Record
    const saleId = `SL-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSaleItem: SaleRecord = {
      id: saleId,
      date: new Date().toISOString(),
      items: pdvCart.map(item => ({ productId: item.product.id, qty: item.qty, price: item.product.salePrice })),
      total: saleTotal,
      paymentMethod: pdvPayMethod
    };

    // 2. Decrement Stocks
    const updatedProducts = products.map(prod => {
      const cartMatch = pdvCart.find(item => item.product.id === prod.id);
      if (cartMatch) {
        return { ...prod, stock: Math.max(0, prod.stock - cartMatch.qty) };
      }
      return prod;
    });

    // 3. Log Revenue
    const newFinLog: FinancialLog = {
      id: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      type: 'RECEITA',
      category: 'Vendas PDV',
      description: `Venda ${saleId} (${pdvPayMethod})`,
      amount: saleTotal
    };

    updateAndSaveProducts(updatedProducts);
    updateAndSaveSales([...sales, newSaleItem]);
    updateAndSaveFinance([...financialLogs, newFinLog]);
    setPdvCart([]);
    setPdvSearch('');
    alert(`Venda finalizada com sucesso! Valor total: R$ ${saleTotal.toFixed(2)}`);
  };

  // --- Add/Edit Product ---
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    setProdForm({ code: '', name: '', category: 'Alimentos', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, unit: 'UN' });
    setShowProductModal(true);
  };

  const handleOpenProductEdit = (p: Product) => {
    setEditingProduct(p);
    setProdForm({ 
      code: p.code, name: p.name, category: p.category, 
      costPrice: p.costPrice, salePrice: p.salePrice, 
      stock: p.stock, minStock: p.minStock, unit: p.unit 
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.code) {
      alert('Preencha os campos obrigatórios (Código e Nome)');
      return;
    }

    if (editingProduct) {
      const updated = products.map(p => p.id === editingProduct.id ? {
        ...p,
        code: prodForm.code,
        name: prodForm.name,
        category: prodForm.category,
        costPrice: Number(prodForm.costPrice),
        salePrice: Number(prodForm.salePrice),
        stock: Number(prodForm.stock),
        minStock: Number(prodForm.minStock),
        unit: prodForm.unit
      } : p);
      updateAndSaveProducts(updated);
    } else {
      const newProd: Product = {
        id: `p-${Date.now()}`,
        code: prodForm.code,
        name: prodForm.name,
        category: prodForm.category,
        costPrice: Number(prodForm.costPrice),
        salePrice: Number(prodForm.salePrice),
        stock: Number(prodForm.stock),
        minStock: Number(prodForm.minStock),
        unit: prodForm.unit
      };
      updateAndSaveProducts([...products, newProd]);
    }
    setShowProductModal(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      const updated = products.filter(p => p.id !== id);
      updateAndSaveProducts(updated);
    }
  };

  // --- Add Supplier ---
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppForm.name) return;
    const newSupp: Supplier = {
      id: `s-${Date.now()}`,
      name: suppForm.name,
      cnpj: suppForm.cnpj || 'Sem CNPJ',
      contact: suppForm.contact || 'Nenhum'
    };
    updateAndSaveSuppliers([...suppliers, newSupp]);
    setSuppForm({ name: '', cnpj: '', contact: '' });
    setShowSupplierModal(false);
  };

  // --- Purchase Logic ---
  const handleAddPurchaseItem = () => {
    if (!addingPurchaseItem.productId) return;
    const currentProd = products.find(p => p.id === addingPurchaseItem.productId);
    if (!currentProd) return;

    // Default to product costPrice if 0
    const finalCost = addingPurchaseItem.cost || currentProd.costPrice;

    // Check if item is already added to cart
    const existingIndex = purchaseCart.findIndex(item => item.productId === addingPurchaseItem.productId);
    if (existingIndex > -1) {
      const updated = [...purchaseCart];
      updated[existingIndex].qty += Number(addingPurchaseItem.qty);
      updated[existingIndex].cost = Number(finalCost);
      setPurchaseCart(updated);
    } else {
      setPurchaseCart([...purchaseCart, {
        productId: addingPurchaseItem.productId,
        qty: Number(addingPurchaseItem.qty),
        cost: Number(finalCost)
      }]);
    }

    setAddingPurchaseItem({ productId: '', qty: 10, cost: 0 });
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseCart(purchaseCart.filter((_, i) => i !== index));
  };

  const handleCompletePurchase = (status: 'Recebido' | 'Pendente') => {
    if (!selectedSupplierId) {
      alert('Selecione um fornecedor.');
      return;
    }
    if (purchaseCart.length === 0) {
      alert('Adicione pelo menos um item à compra.');
      return;
    }

    const totalCost = purchaseCart.reduce((sum, item) => sum + item.qty * item.cost, 0);

    const newPurchaseOrder: PurchaseOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: selectedSupplierId,
      date: new Date().toISOString(),
      items: [...purchaseCart],
      total: totalCost,
      status: status
    };

    // If order is mark as Received immediately, update product stocks
    let updatedProducts = [...products];
    if (status === 'Recebido') {
      purchaseCart.forEach(pItem => {
        updatedProducts = updatedProducts.map(prod => {
          if (prod.id === pItem.productId) {
            return {
              ...prod,
              stock: prod.stock + pItem.qty,
              costPrice: pItem.cost // Update latest unit cost
            };
          }
          return prod;
        });
      });
    }

    // Log the accounts payable / expense
    const newLogs = [...financialLogs];
    if (status === 'Recebido') {
      const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name || 'Fornecedor';
      newLogs.push({
        id: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        type: 'DESPESA',
        category: 'Fornecedores',
        description: `NF Compra Entregue - ${supplierName}`,
        amount: totalCost
      });
    }

    updateAndSaveProducts(updatedProducts);
    updateAndSavePurchases([...purchaseOrders, newPurchaseOrder]);
    updateAndSaveFinance(newLogs);

    // Reset Form
    setSelectedSupplierId('');
    setPurchaseCart([]);
    setShowPurchaseModal(false);

    alert(
      status === 'Recebido'
        ? `Compra finalizada! R$ ${totalCost.toFixed(2)} lançados como despesa comercial e produtos adicionados ao estoque.`
        : `Pedido de compra gerado como "Pendente" com faturamento futuro em aberto de R$ ${totalCost.toFixed(2)}.`
    );
  };

  // Interactive toggle for pending purchases in purchases tab
  const handleReceivePendingPurchase = (orderId: string) => {
    if (confirm('Deseja confirmar o recebimento desta mercadoria? Isso atualizará o estoque e a escrituração financeira de contas a pagar.')) {
      const updatedOrders = purchaseOrders.map(order => {
        if (order.id === orderId) {
          // 1. Update stock and costs
          const updatedProds = products.map(prod => {
            const purchasedMatch = order.items.find(item => item.productId === prod.id);
            if (purchasedMatch) {
              return {
                ...prod,
                stock: prod.stock + purchasedMatch.qty,
                costPrice: purchasedMatch.cost
              };
            }
            return prod;
          });
          updateAndSaveProducts(updatedProds);

          // 2. Add as Financial Expense
          const supplierName = suppliers.find(s => s.id === order.supplierId)?.name || 'Fornecedor';
          const newFinLog: FinancialLog = {
            id: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
            type: 'DESPESA',
            category: 'Fornecedores',
            description: `Recebimento Pedido Transitório ${orderId} - Fornecedor ${supplierName}`,
            amount: order.total
          };
          updateAndSaveFinance([...financialLogs, newFinLog]);

          return { ...order, status: 'Recebido' as const };
        }
        return order;
      });

      updateAndSavePurchases(updatedOrders);
      alert('Mercadorias recebidas e integradas ao estoque e caixa!');
    }
  };

  // --- Manual Expense Save ---
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0 || !expenseForm.description) {
      alert('Preencha os valores corretamente.');
      return;
    }
    const newTrans: FinancialLog = {
      id: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      type: 'DESPESA',
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount)
    };
    updateAndSaveFinance([...financialLogs, newTrans]);
    setExpenseForm({ amount: 0, category: 'Despesas Gerais', description: '' });
    setShowExpenseModal(false);
    alert('Despesa lançada com sucesso.');
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-brand-bg transition-colors duration-200">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-white p-6 space-y-8 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl flex items-center justify-center">
            <Layers className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase">Atrium ERP</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestão Corporativa</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition text-xs font-black uppercase tracking-tight ${
              activeTab === 'dashboard' ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <BarChart3 size={16} />
            <span>Painel & Metas</span>
          </button>
          
          <button
            onClick={() => setActiveTab('pdv')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition text-xs font-black uppercase tracking-tight ${
              activeTab === 'pdv' ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <ShoppingCart size={16} />
            <span>Frente Caixa (PDV)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition text-xs font-black uppercase tracking-tight ${
              activeTab === 'inventory' ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Package size={16} />
            <span>Catalogo Produtos</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition text-xs font-black uppercase tracking-tight ${
              activeTab === 'purchases' ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <TrendingUp size={16} />
            <span>Ordens / Compras</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition text-xs font-black uppercase tracking-tight ${
              activeTab === 'finance' ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <DollarSign size={16} />
            <span>Fluxo de Caixa</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-800 text-center space-y-2">
          <button 
            onClick={handleResetToDefaults}
            className="w-full py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 font-black uppercase tracking-tighter text-[9px] rounded-lg transition"
          >
            Redefinir Banco Dados
          </button>
          <div className="text-[9px] text-slate-500 font-bold">V1.2.0 • Sandbox Local</div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 items-center justify-around text-slate-400 z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center flex-1 ${activeTab === 'dashboard' ? 'text-blue-500' : ''}`}>
          <BarChart3 size={18} />
          <span className="text-[8px] font-black uppercase mt-1">Metas</span>
        </button>
        <button onClick={() => setActiveTab('pdv')} className={`flex flex-col items-center flex-1 ${activeTab === 'pdv' ? 'text-blue-500' : ''}`}>
          <ShoppingCart size={18} />
          <span className="text-[8px] font-black uppercase mt-1">PDV</span>
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center flex-1 ${activeTab === 'inventory' ? 'text-blue-500' : ''}`}>
          <Package size={18} />
          <span className="text-[8px] font-black uppercase mt-1">Estoque</span>
        </button>
        <button onClick={() => setActiveTab('purchases')} className={`flex flex-col items-center flex-1 ${activeTab === 'purchases' ? 'text-blue-500' : ''}`}>
          <TrendingUp size={18} />
          <span className="text-[8px] font-black uppercase mt-1">Compras</span>
        </button>
        <button onClick={() => setActiveTab('finance')} className={`flex flex-col items-center flex-1 ${activeTab === 'finance' ? 'text-blue-500' : ''}`}>
          <DollarSign size={18} />
          <span className="text-[8px] font-black uppercase mt-1">Contas</span>
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        
        {/* TOP BAR / BRAND HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-tight text-brand-text-muted">
              <span>Sandbox Enterprise</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">
              {activeTab === 'dashboard' && 'Painel de Desempenho'}
              {activeTab === 'pdv' && 'Frente de Caixa Terminal'}
              {activeTab === 'inventory' && 'Cadastro & Balanço Estoque'}
              {activeTab === 'purchases' && 'Gestor de Contratações e Entradas'}
              {activeTab === 'finance' && 'Fluxo Caixa & Balanços'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] bg-slate-100 font-bold border border-brand-border px-3 py-1.5 rounded-full text-slate-600 uppercase tracking-wider">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <button 
              onClick={handleResetToDefaults}
              className="md:hidden p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"
              title="Redefinir Demonstração"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
            </button>
          </div>
        </header>

        {/* --- MODULE DISPATCH --- */}
        <AnimatePresence mode="wait">
          
          {/* 1. VISÃO GERAL / DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* KPIS GRIDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-text-muted font-black uppercase tracking-tight">Receita Consolidada</span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">R$ {financeMetrics.revenue.toFixed(2)}</h3>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-text-muted font-black uppercase tracking-tight">Saídas de Caixa</span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">R$ {financeMetrics.expenses.toFixed(2)}</h3>
                  </div>
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl">
                    <TrendingUp size={20} className="rotate-180" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-text-muted font-black uppercase tracking-tight">Ebtida Estimado</span>
                    <h3 className={`text-xl font-black tracking-tight ${financeMetrics.balanceColor}`}>R$ {financeMetrics.netProfit.toFixed(2)}</h3>
                  </div>
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-text-muted font-black uppercase tracking-tight">Produtos Subabastecidos</span>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                      {stockMetrics.lowStockItems}
                      {stockMetrics.lowStockItems > 0 && (
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </h3>
                  </div>
                  <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl">
                    <Package size={20} />
                  </div>
                </div>
              </div>

              {/* QUICK HIGHLIGHT ALERTS */}
              {stockMetrics.lowStockItems > 0 && (
                <div className="flex items-center justify-between p-4 bg-amber-50/55 border border-amber-200/50 rounded-2xl text-amber-900 text-xs text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-amber-600" size={16} />
                    <span className="font-bold">Atenção ao Abastecimento:</span>
                    <span>Há {stockMetrics.lowStockItems} produtos operando abaixo do ponto mínimo ideal.</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('inventory')}
                    className="font-bold border-b border-amber-950 uppercase tracking-tighter text-[9px] text-amber-950 hover:opacity-80 py-0.5"
                  >
                    Repor Estoques &rarr;
                  </button>
                </div>
              )}

              {/* GRAPHS AND LEDGER GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Visual DRE */}
                <div className="lg:col-span-3 bg-white p-6 border border-brand-border rounded-[32px] shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[9px] text-brand-text-muted font-black uppercase tracking-wider">Escrituração Comercial</span>
                    <h3 className="text-sm font-black text-brand-text-main italic uppercase tracking-tight">Demonstrativo DRE Trimestral</h3>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* Faturamento Bruto Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 font-bold uppercase">
                        <span>Receita de Venda Bruta</span>
                        <span>R$ {financeMetrics.revenue.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: financeMetrics.revenue > 0 ? '100%' : '0%' }}></div>
                      </div>
                    </div>

                    {/* Despesas Operacionais Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 font-bold uppercase">
                        <span>Despesas Comerciais / Custos Mercadoria</span>
                        <span>R$ {financeMetrics.expenses.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: financeMetrics.revenue > 0 ? `${(financeMetrics.expenses / financeMetrics.revenue) * 100}%` : '0%' }}></div>
                      </div>
                    </div>

                    {/* Lucro Operacional Liquido Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 font-bold uppercase">
                        <span>Margem de Lucro Bruto</span>
                        <span>R$ {financeMetrics.netProfit.toFixed(2)} ({(financeMetrics.revenue > 0 ? ((financeMetrics.netProfit / financeMetrics.revenue) * 100).toFixed(0) : '0')}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: financeMetrics.revenue > 0 ? `${Math.max(0, (financeMetrics.netProfit / financeMetrics.revenue) * 100)}%` : '0%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-[9px] font-black uppercase text-slate-400">
                    <span className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">Custos Totais: R$ {financeMetrics.expenses.toFixed(2)}</span>
                    <span className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">Ativos Imobilizados: R$ {stockMetrics.valuation.toFixed(2)}</span>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="lg:col-span-2 bg-white p-6 border border-brand-border rounded-[32px] shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-brand-text-muted font-black uppercase tracking-wider">Histórico de Movimento</span>
                    <h3 className="text-sm font-black text-brand-text-main italic uppercase tracking-tight">Postagens do Caixa</h3>
                  </div>

                  <div className="my-4 divide-y divide-slate-100 overflow-y-auto max-h-56 pr-1 space-y-3 flex-1">
                    {financialLogs.slice(-4).reverse().map((log, i) => (
                      <div key={log.id || i} className="flex items-center justify-between pt-2.5 text-xs">
                        <div className="space-y-1 text-left">
                          <h4 className="font-semibold text-slate-800">{log.description}</h4>
                          <span className="text-[9px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 uppercase tracking-tighter">{log.category}</span>
                        </div>
                        <span className={`font-black ${log.type === 'RECEITA' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {log.type === 'RECEITA' ? '+' : '-'} R$ {log.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setActiveTab('finance')}
                    className="w-full py-2.5 bg-slate-900 text-white font-black uppercase italic tracking-wider text-[10px] rounded-xl text-center active:scale-98 transition"
                  >
                    Ver Lançamentos &rarr;
                  </button>
                </div>
              </div>

              {/* DEMO METADATA EXPLANATION CARD */}
              <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-8 rounded-[38px] text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-left max-w-xl">
                  <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Atrium Suite de Demonstração</div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tight">O que este sistema faz?</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Este ambiente Sandbox é totalmente autossuficiente e offline por design. Todas as vendas feitas no módulo do **Frente Caixa (PDV)** decrementam o estoque instantaneamente e faturam financeiramente. Além disso, pedidos de compra do módulo de **Ordens** criam passivos, atualizando custos e lotes ao serem marcados como recebidos.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setActiveTab('pdv')}
                    className="px-6 py-3.5 bg-white text-slate-950 font-black uppercase text-xs rounded-2xl active:scale-95 transition tracking-tight flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={15} />
                    <span>Iniciar PDV</span>
                  </button>
                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs rounded-2xl active:scale-95 transition tracking-tight flex items-center justify-center gap-2"
                  >
                    <Plus size={15} />
                    <span>Lançar Saída</span>
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* 2. PDV (POINT OF SALE) */}
          {activeTab === 'pdv' && (
            <motion.div 
              key="pdv"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Product selector list */}
              <div className="lg:col-span-7 bg-white p-6 border border-brand-border rounded-[32px] shadow-sm flex flex-col space-y-6">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por código de barra ou nome do produto..."
                    value={pdvSearch}
                    onChange={(e) => setPdvSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-brand-border rounded-2xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {pdvSearch && (
                    <button onClick={() => setPdvSearch('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Main Product Selector Grid */}
                <div className="flex-1 space-y-3">
                  <span className="text-[9px] text-brand-text-muted font-black uppercase tracking-wider block text-left">Resultados Disponíveis ({filteredPDVProducts.length})</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredPDVProducts.map(prod => (
                      <button
                        key={prod.id}
                        onClick={() => handleAddProductToPdv(prod)}
                        disabled={prod.stock <= 0}
                        className={`p-4 rounded-3xl border text-left flex flex-col justify-between gap-3 transition-all ${
                          prod.stock <= 0 
                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                            : 'bg-white border-brand-border hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{prod.category}</span>
                          <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">{prod.name}</h4>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold block uppercase">Preço Venda</span>
                            <span className="text-sm font-black text-blue-600">R$ {prod.salePrice.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-slate-400 font-bold block uppercase">Estoque</span>
                            <span className={`text-[10px] font-bold ${prod.stock <= prod.minStock ? 'text-amber-500' : 'text-slate-600'}`}>
                              {prod.stock} {prod.unit}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredPDVProducts.length === 0 && (
                      <div className="col-span-2 text-center py-10 text-slate-400 text-xs font-bold uppercase space-y-1">
                        <div>Nenhum produto cadastrado coincide com a pesquisa</div>
                        <button onClick={() => setPdvSearch('')} className="text-blue-500 underline text-[10px]">Limpar Busca</button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* PDV Current Cart Panel */}
              <div className="lg:col-span-5 bg-white p-6 border border-brand-border rounded-[32px] shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[9px] text-brand-text-muted font-black uppercase tracking-wider text-left block">Checkout Atual</span>
                  <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight text-left">Itens da Compra</h3>
                </div>

                {/* Cart list content */}
                <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-56 pr-1 my-2">
                  {pdvCart.map((item, i) => (
                    <div key={item.product.id || i} className="flex items-center justify-between py-3 text-xs">
                      <div className="space-y-1 text-left max-w-[180px]">
                        <h4 className="font-bold text-slate-800 truncate">{item.product.name}</h4>
                        <div className="text-[10px] text-slate-400">
                          Preço Un: R$ {item.product.salePrice.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdatePdvQty(item.product.id, Number(e.target.value))}
                          className="w-12 bg-slate-50 border border-brand-border rounded-lg text-center font-bold text-xs p-1"
                        />
                        <button 
                          onClick={() => handleUpdatePdvQty(item.product.id, 0)}
                          className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="text-right font-black text-slate-900 w-16">
                        R$ {(item.product.salePrice * item.qty).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {pdvCart.length === 0 && (
                    <div className="text-center py-16 text-slate-400 uppercase text-[10px] font-bold space-y-2">
                      <ShoppingCart size={32} className="mx-auto text-slate-300" />
                      <div>Carrinho de Compras do Caixa Vazio</div>
                    </div>
                  )}
                </div>

                {/* Total Calc, Payment Method Selector and Dispatch CTA */}
                <div className="pt-4 border-t border-slate-100 space-y-4 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500 uppercase">Subtotal Geral:</span>
                    <span className="text-lg font-black text-slate-900">
                      R$ {pdvCart.reduce((sum, item) => sum + item.qty * item.product.salePrice, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-bold block uppercase">Modalidade Pagamento:</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['PIX', 'Dinheiro', 'Cartão Deb', 'Cartão Cred'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPdvPayMethod(method as any)}
                          className={`py-2 text-[9px] font-black uppercase rounded-lg border transition ${
                            pdvPayMethod === method 
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteSale}
                    disabled={pdvCart.length === 0}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 font-black uppercase italic tracking-wider text-xs text-white rounded-2xl active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <CheckCircle2 size={15} />
                    <span>Concluir Venda Registrada</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* 3. INVENTÁRIO (PRODUTOS) */}
          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Filter controls and modal open CTA */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-brand-border shadow-sm gap-4">
                <div className="text-xs font-black uppercase text-slate-800 text-left w-full sm:w-auto">
                  Ativos cadastrados: {products.length} itens catalogados
                </div>

                <div className="flex justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleOpenProductCreate}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-tight rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Plus size={14} />
                    <span>Cadastrar Ativo</span>
                  </button>
                </div>
              </div>

              {/* Products Table Display */}
              <div className="bg-white border border-brand-border rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        <th className="p-4 pl-6">Código de Barra</th>
                        <th className="p-4">Descrição Ativo</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Custo Un.</th>
                        <th className="p-4">Preço Venda</th>
                        <th className="p-4 text-center">Saldo Estoque</th>
                        <th className="p-4 pr-6 text-right">Controles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6 select-all font-mono font-bold text-slate-500">{p.code}</td>
                          <td className="p-4 font-black text-slate-900">{p.name}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase text-[9px]">{p.category}</span>
                          </td>
                          <td className="p-4 font-medium">R$ {p.costPrice.toFixed(2)}</td>
                          <td className="p-4 font-black text-blue-600">R$ {p.salePrice.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-black ${
                              p.stock <= p.minStock 
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-50 text-slate-800 border border-slate-200/50'
                            }`}>
                              {p.stock} / {p.minStock} {p.unit}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => handleOpenProductEdit(p)}
                                className="px-3 py-1.5 hover:bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase transition"
                              >
                                Alterar
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* 4. COMPRAS (ORDENS) */}
          {activeTab === 'purchases' && (
            <motion.div 
              key="purchases"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Compras actions and quick state summaries */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-brand-border shadow-sm gap-4">
                <div className="text-xs font-black uppercase text-slate-800 text-left w-full sm:w-auto">
                  Registros: {purchaseOrders.length} ordens monitoradas
                </div>

                <div className="flex justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowSupplierModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-tight rounded-xl border border-slate-200 transition"
                  >
                    <span>+ Fornecedor</span>
                  </button>

                  <button 
                    onClick={() => {
                      if (suppliers.length === 0) {
                        alert('Cadastre um fornecedor antes de emitir compras.');
                        return;
                      }
                      setShowPurchaseModal(true);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-tight rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Plus size={14} />
                    <span>Nova Ordem de Compra</span>
                  </button>
                </div>
              </div>

              {/* Purchase entries list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchaseOrders.map((order) => {
                  const sName = suppliers.find(s => s.id === order.supplierId)?.name || 'Fornecedor Desconhecido';
                  return (
                    <div key={order.id} className="bg-white p-6 border border-brand-border rounded-[32px] shadow-sm text-left flex flex-col justify-between gap-4">
                      
                      {/* Header block with supplier + status indicator */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono font-bold select-all block">CÓD: {order.id}</div>
                          <h4 className="text-sm font-black text-slate-900 leading-tight">{sName}</h4>
                          <span className="text-[9px] text-slate-400">{new Date(order.date).toLocaleDateString('pt-BR')}</span>
                        </div>

                        <div className={`p-1.5 px-3 rounded-full flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                          order.status === 'Recebido' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                        }`}>
                          {order.status === 'Recebido' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{order.status === 'Recebido' ? 'Recebido' : 'Pendente'}</span>
                        </div>
                      </div>

                      {/* Purchased products item summaries */}
                      <div className="bg-slate-50 p-3 rounded-2xl text-[10px] space-y-1.5">
                        {order.items.map((item, i) => {
                          const pName = products.find(p => p.id === item.productId)?.name || 'Produto Excluído';
                          return (
                            <div key={i} className="flex justify-between">
                              <span className="text-slate-500 font-semibold truncate max-w-[170px]">{pName}</span>
                              <span className="font-bold">Qty {item.qty} x R$ {item.cost.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total cost and action for pending */}
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold block uppercase">Carga Financeira</span>
                          <span className="font-black text-slate-950 text-sm">R$ {order.total.toFixed(2)}</span>
                        </div>

                        {order.status === 'Pendente' && (
                          <button
                            onClick={() => handleReceivePendingPurchase(order.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-black uppercase text-[9px] rounded-xl flex items-center gap-1 shadow-md shadow-emerald-50 transition active:scale-95"
                          >
                            <Check size={11} />
                            <span>Receber Mercadoria</span>
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </motion.div>
          )}

          {/* 5. FINANCEIRO (CONTAS E CAIXA) */}
          {activeTab === 'finance' && (
            <motion.div 
              key="finance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* Financial controls banner */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-brand-border shadow-sm gap-4">
                <div className="text-xs font-black uppercase text-slate-800 text-left w-full sm:w-auto">
                  Consolidado: {financialLogs.length} conciliações cadastradas
                </div>

                <div className="flex justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-tight rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Plus size={14} />
                    <span>Lançar Saída Caixa</span>
                  </button>
                </div>
              </div>

              {/* Transactions list */}
              <div className="bg-white border border-brand-border rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        <th className="p-4 pl-6">Data Escrituração</th>
                        <th className="p-4">Identificador Único</th>
                        <th className="p-4">Descrição Lançamento</th>
                        <th className="p-4">Centro Custo</th>
                        <th className="p-4">Modalidade</th>
                        <th className="p-4 pr-6 text-right">Valor Operação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {financialLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6 font-semibold text-slate-500">
                            {new Date(log.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-4 font-mono font-bold select-all">{log.id}</td>
                          <td className="p-4 font-black text-slate-900">{log.description}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">{log.category}</span>
                          </td>
                          <td className="p-4 font-semibold">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              log.type === 'RECEITA' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={`p-4 pr-6 text-right font-black ${
                            log.type === 'RECEITA' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {log.type === 'RECEITA' ? '+' : '-'} R$ {log.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* --- MODAL DECLARATIONS --- */}
        
        {/* Product Register / Edit Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-[38px] border border-slate-100 p-6 space-y-6 animate-scale-in text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-wider">
                  {editingProduct ? 'Alterar Cadastro de Ativo' : 'Cadastro Novo Ativo estoque'}
                </h3>
                <button onClick={() => setShowProductModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Código de Barra *</label>
                    <input 
                      type="text" 
                      required 
                      value={prodForm.code} 
                      onChange={(e) => setProdForm({ ...prodForm, code: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-mono"
                      placeholder="E.g. 7891000101"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Categoria Cadastro</label>
                    <select
                      value={prodForm.category}
                      onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                    >
                      <option value="Alimentos">Alimentos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Doces">Doces</option>
                      <option value="Higiene">Higiene</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Descrição Ativo (Nome Comercial) *</label>
                  <input 
                    type="text" 
                    required 
                    value={prodForm.name} 
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Custo Un (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={prodForm.costPrice} 
                      onChange={(e) => setProdForm({ ...prodForm, costPrice: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-semibold"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Preço Venda (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={prodForm.salePrice} 
                      onChange={(e) => setProdForm({ ...prodForm, salePrice: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-black text-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Unidade Comercial</label>
                    <input 
                      type="text" 
                      value={prodForm.unit} 
                      onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value.toUpperCase() })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-50">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Estoque Atual</label>
                    <input 
                      type="number" 
                      value={prodForm.stock} 
                      onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">Margem Mínima Ideal</label>
                    <input 
                      type="number" 
                      value={prodForm.minStock} 
                      onChange={(e) => setProdForm({ ...prodForm, minStock: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-tight rounded-2xl active:scale-95 transition"
                >
                  Salvar Cadastro Ativo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Supplier Modal */}
        {showSupplierModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-[38px] border border-slate-100 p-6 space-y-6 animate-scale-in text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-wider">Novo Fornecedor Parceiro</h3>
                <button onClick={() => setShowSupplierModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Nome Fantasia / Razão Social *</label>
                  <input 
                    type="text" 
                    required 
                    value={suppForm.name} 
                    onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">CNPJ Fornecedor</label>
                    <input 
                      type="text" 
                      value={suppForm.cnpj} 
                      onChange={(e) => setSuppForm({ ...suppForm, cnpj: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-mono"
                      placeholder="00.000.000/0001-00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400">E-mail Comercial</label>
                    <input 
                      type="email" 
                      value={suppForm.contact} 
                      onChange={(e) => setSuppForm({ ...suppForm, contact: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                      placeholder="parceiro@exemplo.com"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-tight rounded-2xl active:scale-95 transition"
                >
                  Registrar Credenciamento
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Purchase Order Issuer Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-xl rounded-[38px] border border-slate-100 p-6 space-y-6 animate-scale-in text-left md:max-h-[90vh] md:overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-wider">Nova Ordem de Fornecimento (Compra)</h3>
                <button onClick={() => setShowPurchaseModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                
                {/* Select Supplier */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Representante Fornecedor Fornecido</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                  >
                    <option value="">Selecione um fornecedor credenciado...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} • {s.cnpj}</option>)}
                  </select>
                </div>

                {/* Add dynamic purchase order entries list and inline cart */}
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 block pb-1 border-b border-slate-100">Adicionar Produtos do Fornecimento</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      value={addingPurchaseItem.productId}
                      onChange={(e) => {
                        const mComp = products.find(p => p.id === e.target.value);
                        setAddingPurchaseItem({ 
                          ...addingPurchaseItem, 
                          productId: e.target.value,
                          cost: mComp ? mComp.costPrice : 0
                        });
                      }}
                      className="col-span-1 md:col-span-1 text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="">Selecione o produto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <input 
                      type="number"
                      placeholder="Quantidade"
                      value={addingPurchaseItem.qty}
                      onChange={(e) => setAddingPurchaseItem({ ...addingPurchaseItem, qty: Number(e.target.value) })}
                      className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
                    />

                    <div className="flex gap-1.5 col-span-1">
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="Custo Real Acordado"
                        value={addingPurchaseItem.cost || ''}
                        onChange={(e) => setAddingPurchaseItem({ ...addingPurchaseItem, cost: Number(e.target.value) })}
                        className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1"
                      />
                      <button 
                        onClick={handleAddPurchaseItem}
                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold active:scale-95 shadow-sm"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline shopping cart with pricing calculations */}
                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {purchaseCart.map((item, i) => {
                    const matchedName = products.find(p => p.id === item.productId)?.name || 'Anônimo';
                    return (
                      <div key={i} className="flex justify-between items-center py-2 text-xs">
                        <div className="space-y-0.5 text-left truncate max-w-[280px]">
                          <span className="font-bold text-slate-800">{matchedName}</span>
                          <div className="text-[10px] text-slate-400">R$ {item.cost.toFixed(2)} por unidade</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-500">x {item.qty} un</span>
                          <span className="font-bold w-16 text-right">R$ {(item.cost * item.qty).toFixed(2)}</span>
                          <button onClick={() => handleRemovePurchaseItem(i)} className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {purchaseCart.length === 0 && (
                    <div className="text-center py-6 text-slate-400 uppercase text-[9px] font-black tracking-wider bg-slate-50/40 rounded-xl">Nenhum item adicionado ao fornecimento</div>
                  )}
                </div>

                {/* Cart pricing summations and selection status order */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-left">
                    <span className="text-[8px] text-slate-400 font-bold block uppercase">Carga Total Operação</span>
                    <span className="font-black text-lg text-slate-950">
                      R$ {purchaseCart.reduce((sum, item) => sum + item.qty * item.cost, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCompletePurchase('Pendente')}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] rounded-xl transition"
                    >
                      Pendente (Ordem Sem Entrega)
                    </button>
                    <button
                      onClick={() => handleCompletePurchase('Recebido')}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] rounded-xl transition shadow-lg shadow-emerald-50"
                    >
                      Confirmar Entrega (Recebido)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Launch Manual Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-sm rounded-[38px] border border-slate-100 p-6 space-y-6 animate-scale-in text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-wider">Escriturar Despesa Manual</h3>
                <button onClick={() => setShowExpenseModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Valor Lançamento (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={expenseForm.amount || ''} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl font-bold text-rose-600"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Centro de Custos / Categoria</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                  >
                    <option value="Despesas Gerais">Despesas Gerais</option>
                    <option value="Infraestrutura">Infraestrutura (Luz/Água/Aluguel)</option>
                    <option value="Logística">Logística / Fretes</option>
                    <option value="Impostos">Impostos / Tributos</option>
                    <option value="Pessoal">Pessoal / Salários</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Descrição Escrita (E.g. Nota de Serviços) *</label>
                  <input 
                    type="text" 
                    required 
                    value={expenseForm.description} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-brand-border rounded-xl"
                    placeholder="E.g. Compra de Sacolas Plásticas"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-tight rounded-2xl active:scale-95 transition"
                >
                  Registrar Saída de Caixa
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
