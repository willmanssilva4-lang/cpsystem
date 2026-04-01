'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useERP } from '@/lib/context';
import { 
  ArrowLeft, 
  Truck, 
  Calendar, 
  CreditCard, 
  Save,
  ChevronRight,
  Package,
  DollarSign,
  Trash2,
  FileText,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn, getLocalDateString, formatDateBR } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PurchaseItem {
  id: string; // temporary id for the list
  productId: string;
  productName: string;
  qty: number;
  cost: number;
  salePrice: number;
  expirationDate: string;
  total: number;
}

export default function NovaCompraPage() {
  const router = useRouter();
  const { user, addStockMovement, addExpense } = useERP();
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([
    { id: '1', name: 'Caixa' },
    { id: '2', name: 'Conta Bancária' },
    { id: '3', name: 'Conta PIX' }
  ]);
  const [paymentConditions, setPaymentConditions] = useState<any[]>([
    { id: '1', name: 'À Vista' },
    { id: '2', name: 'A Prazo' }
  ]);

  // Tab 1: Fornecedor Data
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(getLocalDateString());
  const [entryDate, setEntryDate] = useState(getLocalDateString());
  const [paymentCondition, setPaymentCondition] = useState('');
  const [financialAccount, setFinancialAccount] = useState('');
  const [observations, setObservations] = useState('');

  // Tab 3: Finalizar Data
  const [installments, setInstallments] = useState<{ dueDate: string, amount: number }[]>([]);
  const prevPaymentConditionRef = useRef<string>('');

  // Tab 2: Produtos Data
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number>(0);
  const [itemSalePrice, setItemSalePrice] = useState<number>(0);
  const [itemExpiration, setItemExpiration] = useState('');

  // Refs for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);
  const salePriceInputRef = useRef<HTMLInputElement>(null);
  const expirationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch suppliers
        const { data: realSuppliers } = await supabase.from('suppliers').select('id, name').eq('company_id', user?.companyId || null).order('name');
        setSuppliersList(realSuppliers || []);

        // Fetch products
        const { data: productsData } = await supabase.from('products').select('id, name, sku, stock, cost_price, sale_price').eq('company_id', user?.companyId || null).order('name');
        if (productsData) {
          setProductsList(productsData);
          
          // Check for replenishment items
          const savedItems = localStorage.getItem('replenishment_items');
          if (savedItems) {
            const parsedItems = JSON.parse(savedItems);
            const newItems: PurchaseItem[] = parsedItems.map((p: any) => {
              const product = productsData.find((prod: any) => prod.id === p.id);
              return {
                id: Math.random().toString(36).substr(2, 9),
                productId: p.id,
                productName: p.name,
                qty: Math.max(0, ((product as any)?.min_stock || 0) - ((product as any)?.stock || 0)),
                cost: Number((product as any)?.cost_price) || 0,
                salePrice: Number((product as any)?.sale_price) || 0,
                expirationDate: getLocalDateString(),
                total: Math.max(0, ((product as any)?.min_stock || 0) - ((product as any)?.stock || 0)) * (Number((product as any)?.cost_price) || 0)
              };
            });
            setItems(newItems);
            setActiveTab(2);
            localStorage.removeItem('replenishment_items');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user?.companyId]);

  // Initialize installments when moving to Tab 3 or when payment condition changes
  useEffect(() => {
    if (activeTab === 3 && items.length > 0) {
      const total = items.reduce((acc, item) => acc + item.total, 0);
      
      // If payment condition changed OR installments are empty, initialize
      if (prevPaymentConditionRef.current !== paymentCondition || installments.length === 0) {
        let intervals: number[] = [0]; // Default À Vista
        if (paymentCondition === '2') {
          intervals = [30]; // Default A Prazo
        }

        const newInstallments = intervals.map((days) => {
          const [y, m, d] = entryDate.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          date.setDate(date.getDate() + days);
          return {
            dueDate: getLocalDateString(date),
            amount: total / intervals.length
          };
        });
        setInstallments(newInstallments);
        prevPaymentConditionRef.current = paymentCondition;
      } else {
        // Just update amounts if total changed, keeping the current installment count
        setInstallments(prev => {
          const currentTotal = prev.reduce((acc, inst) => acc + inst.amount, 0);
          if (Math.abs(currentTotal - total) > 0.01) {
            return prev.map(inst => ({
              ...inst,
              amount: total / prev.length
            }));
          }
          return prev;
        });
      }
    }
  }, [activeTab, paymentCondition, items, installments.length, entryDate]);

  // Handle Product Search
  const handleInstallmentCountChange = (count: number) => {
    if (count < 1) return;
    const total = items.reduce((acc, item) => acc + item.total, 0);
    const newInstallments = Array.from({ length: count }, (_, i) => {
      // If we already have an installment at this index, keep its date
      if (installments[i]) {
        return {
          ...installments[i],
          amount: total / count
        };
      }
      // Otherwise calculate a new date (30 days after the last one or 30 days from now)
      let lastDate: Date;
      if (installments.length > 0) {
        const lastDateStr = installments[installments.length - 1].dueDate;
        const [y, m, d] = lastDateStr.split('-').map(Number);
        lastDate = new Date(y, m - 1, d);
      } else {
        const [y, m, d] = entryDate.split('-').map(Number);
        lastDate = new Date(y, m - 1, d);
      }
      
      const newDate = new Date(lastDate);
      newDate.setDate(newDate.getDate() + 30);
      
      return {
        dueDate: getLocalDateString(newDate),
        amount: total / count
      };
    });
    setInstallments(newInstallments);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length >= 2) {
      const filtered = productsList.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 10);
      setSearchResults(filtered);
      setSelectedIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectProduct(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setItemCost(Number(product.cost_price) || 0);
    setItemSalePrice(Number(product.sale_price) || 0);
    setSearchResults([]);
    setSelectedIndex(-1);
    
    // Focus next field after selection
    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 10);
  };

  const handleNextToProducts = () => {
    if (!supplierId) {
      alert('Por favor, selecione um fornecedor para continuar.');
      return;
    }
    setActiveTab(2);
  };

  const handleAddProduct = () => {
    if (!selectedProduct || itemQty <= 0 || itemCost < 0 || !itemExpiration) {
      alert('Preencha todos os campos do produto (Produto, Quantidade, Custo e Validade).');
      return;
    }

    const newItem: PurchaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      qty: itemQty,
      cost: itemCost,
      salePrice: itemSalePrice,
      expirationDate: itemExpiration,
      total: itemQty * itemCost
    };

    setItems([...items, newItem]);
    
    // Reset fields
    setSelectedProduct(null);
    setSearchTerm('');
    setItemQty(1);
    setItemCost(0);
    setItemSalePrice(0);
    setItemExpiration('');

    // Focus back to search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<PurchaseItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        // Recalculate total if qty or cost changed
        if ('qty' in updates || 'cost' in updates) {
          updatedItem.total = updatedItem.qty * updatedItem.cost;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleNextToFinish = () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um produto à compra.');
      return;
    }
    setActiveTab(3);
  };

  const handleConfirmPurchase = async () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um produto à compra.');
      return;
    }
    
    const totalCompra = items.reduce((acc, item) => acc + item.total, 0);
    if (totalCompra <= 0) {
      alert('O valor total da compra deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar Lotes (produto_lotes)
      // 2. Atualizar Estoque (products)
      // 3. Registrar Movimentação (stock_movements)
      // 4. Gerar Conta a Pagar (expenses)

      const totalCompra = items.reduce((acc, item) => acc + item.total, 0);
      const supplierName = suppliersList.find(s => s.id === supplierId)?.name || 'Fornecedor Desconhecido';

      // 0. Criar Pedido de Compra (purchase_orders)
      const { data: orderData, error: orderError } = await supabase.from('purchase_orders').insert({
        company_id: user?.companyId || null,
        supplier_id: supplierId,
        order_date: new Date().toISOString(),
        total_amount: totalCompra,
        status: 'Recebido'
      }).select('id').single();

      if (orderError) throw orderError;
      const orderId = orderData.id;

      // For each product
      for (const item of items) {
        // 1. Insert Item (purchase_order_items)
        await supabase.from('purchase_order_items').insert({
          company_id: user?.companyId || null,
          purchase_order_id: orderId,
          product_id: item.productId,
          quantity: item.qty,
          unit_price: item.cost,
          total_price: item.total
        });

        const numeroLote = `LT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        
        // 2. Create Lote
        const { data: loteData, error: loteError } = await supabase.from('produto_lotes').insert({
          company_id: user?.companyId || null,
          produto_id: item.productId,
          numero_lote: numeroLote,
          data_entrada: `${entryDate}T12:00:00Z`,
          validade: item.expirationDate,
          custo_unit: item.cost,
          quantidade_inicial: item.qty,
          saldo_atual: item.qty,
          fornecedor_id: supplierId
        }).select('id').single();

        let loteId = undefined;
        if (loteError) {
          console.error('Error creating lote:', loteError);
        } else if (loteData) {
          loteId = loteData.id;
        }

        // 3. Update Stock and Sale Price
        const product = productsList.find(p => p.id === item.productId);
        if (product) {
          // Fetch current stock first
          const { data: currentProduct } = await supabase.from('products').select('stock').eq('id', item.productId).eq('company_id', user?.companyId || null).single();
          const currentStock = currentProduct?.stock || 0;
          
          const updateData: any = { 
            stock: currentStock + item.qty,
            cost_price: item.cost,
            has_had_stock: true
          };

          // Update sale price if it was changed/provided in the purchase
          if (item.salePrice > 0) {
            updateData.sale_price = item.salePrice;
          }

          if (item.expirationDate) {
            updateData.validade = item.expirationDate;
          }
          
          const { error: updateError } = await supabase.from('products')
            .update(updateData)
            .eq('id', item.productId)
            .eq('company_id', user?.companyId || null);
            
          if (updateError && updateError.message.includes('validade')) {
            delete updateData.validade;
            await supabase.from('products')
              .update(updateData)
              .eq('id', item.productId)
              .eq('company_id', user?.companyId || null);
          }
        }

        // 4. Register Movement
        await addStockMovement({
          productId: item.productId,
          loteId: loteId,
          type: 'COMPRA',
          quantity: item.qty,
          cost: item.cost,
          origin: `Compra NF: ${invoiceNumber || 'S/N'} - Fornecedor: ${supplierName}`,
          date: new Date().toISOString(),
          userId: user?.email || 'system',
          userName: user?.name || 'Sistema',
          companyId: user?.companyId || ''
        });
      }

      // 5. Generate Conta a Pagar (Expense) - Installments
      if (paymentCondition === '1') {
        // À Vista: One single expense, paid immediately
        const total = items.reduce((acc, item) => acc + item.total, 0);
        await addExpense({
          description: `Compra NF: ${invoiceNumber || 'S/N'} - ${supplierName}`,
          category: 'Compra de Mercadoria',
          amount: total,
          supplier: supplierName,
          supplierId: supplierId,
          dueDate: new Date().toISOString(), // Paid today
          date: new Date().toISOString(),
          issueDate: new Date().toISOString(),
          status: 'Pago',
          paymentDate: new Date().toISOString(),
          paymentMethod: 'Dinheiro',
          companyId: user?.companyId || ''
        });
      } else {
        // A Prazo: Multiple installments
        for (let i = 0; i < installments.length; i++) {
          const inst = installments[i];
          await addExpense({
            description: `Compra NF: ${invoiceNumber || 'S/N'} - ${supplierName} (${i + 1}/${installments.length})`,
            category: 'Compra de Mercadoria',
            amount: inst.amount,
            supplier: supplierName,
            supplierId: supplierId,
            dueDate: `${inst.dueDate}T12:00:00Z`,
            date: `${inst.dueDate}T12:00:00Z`,
            issueDate: new Date().toISOString(),
            status: 'Pendente',
            companyId: user?.companyId || ''
          });
        }
      }

      alert('Compra finalizada com sucesso! Estoque e financeiro atualizados.');
      router.push('/compras');

    } catch (error) {
      console.error('Error confirming purchase:', error);
      alert('Erro ao finalizar compra. Verifique o console para mais detalhes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/compras"
            className="p-3 bg-white border border-brand-border rounded-2xl text-brand-text-sec hover:text-brand-blue transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Nova Compra</h2>
            <p className="text-xs md:text-sm text-brand-text-sec font-bold uppercase tracking-widest opacity-60">Entrada de Mercadoria</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-black uppercase italic tracking-tight transition-all shrink-0 ${activeTab === 1 ? 'bg-brand-blue text-white' : 'text-slate-400 bg-slate-50'}`}>
          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] ${activeTab === 1 ? 'bg-white text-brand-blue' : 'bg-slate-200 text-slate-500'}`}>1</div>
          <span className="text-xs md:text-sm">Fornecedor</span>
        </div>
        <ChevronRight className="text-slate-300 shrink-0" size={16} />
        <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-black uppercase italic tracking-tight transition-all shrink-0 ${activeTab === 2 ? 'bg-brand-blue text-white' : 'text-slate-400 bg-slate-50'}`}>
          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] ${activeTab === 2 ? 'bg-white text-brand-blue' : 'bg-slate-200 text-slate-500'}`}>2</div>
          <span className="text-xs md:text-sm">Produtos</span>
        </div>
        <ChevronRight className="text-slate-300 shrink-0" size={16} />
        <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-black uppercase italic tracking-tight transition-all shrink-0 ${activeTab === 3 ? 'bg-brand-blue text-white' : 'text-slate-400 bg-slate-50'}`}>
          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] ${activeTab === 3 ? 'bg-white text-brand-blue' : 'bg-slate-200 text-slate-500'}`}>3</div>
          <span className="text-xs md:text-sm">Finalizar</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          </div>
        ) : (
          <>
            {/* TAB 1: FORNECEDOR */}
            {activeTab === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 max-w-4xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Fornecedor *</label>
                    <div className="relative">
                      <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <select 
                        className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover appearance-none text-sm md:text-base"
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                      >
                        <option value="">Selecione um fornecedor...</option>
                        {suppliersList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Nº Nota Fiscal</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <input 
                        type="text" 
                        placeholder="Ex: 123456"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover text-sm md:text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Data de Emissão</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <input 
                        type="date" 
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Data de Entrada</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <input 
                        type="date" 
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Condição de Pagamento</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <select 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover appearance-none"
                        value={paymentCondition}
                        onChange={(e) => setPaymentCondition(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {paymentConditions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Conta Financeira</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                      <select 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover appearance-none"
                        value={financialAccount}
                        onChange={(e) => setFinancialAccount(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {financialAccounts.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Observações</label>
                    <textarea 
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover resize-none"
                      placeholder="Observações adicionais sobre a compra..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleNextToProducts}
                    className="flex items-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
                  >
                    Continuar para Produtos
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PRODUTOS */}
            {activeTab === 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Add Product Form */}
                <div className="bg-slate-50 p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-brand-border space-y-4">
                  <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Adicionar Produto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-2 lg:col-span-4 space-y-2 relative">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Produto (Nome ou SKU)</label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" size={18} />
                        <input 
                          ref={searchInputRef}
                          type="text"
                          placeholder="Buscar produto..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          onKeyDown={handleSearchKeyDown}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                        />
                      </div>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {searchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 left-0 right-0 mt-1 bg-white border border-brand-border rounded-xl shadow-xl max-h-60 overflow-y-auto"
                          >
                            {searchResults.map((product, index) => (
                              <button
                                key={product.id}
                                onClick={() => selectProduct(product)}
                                className={cn(
                                  "w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-brand-border last:border-0",
                                  selectedIndex === index ? "bg-brand-blue/5 border-l-4 border-l-brand-blue" : "hover:bg-slate-50"
                                )}
                              >
                                <div>
                                  <div className="font-bold text-brand-text-main text-sm">{product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.sku || 'Sem SKU'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-black text-brand-blue">R$ {Number(product.sale_price).toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-400 font-bold">Estoque: {product.stock || 0}</div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="col-span-1 lg:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Qtd</label>
                      <input 
                        ref={qtyInputRef}
                        type="number" 
                        min="1"
                        value={itemQty}
                        onChange={(e) => setItemQty(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            costInputRef.current?.focus();
                            costInputRef.current?.select();
                          }
                        }}
                        className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover text-center"
                      />
                    </div>
                    <div className="col-span-1 lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Custo Unitário</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                          ref={costInputRef}
                          type="number" 
                          min="0"
                          step="0.01"
                          value={itemCost}
                          onChange={(e) => setItemCost(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              salePriceInputRef.current?.focus();
                              salePriceInputRef.current?.select();
                            }
                          }}
                          className="w-full pl-9 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover text-right"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Preço Venda</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                          ref={salePriceInputRef}
                          type="number" 
                          min="0"
                          step="0.01"
                          value={itemSalePrice}
                          onChange={(e) => setItemSalePrice(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              expirationInputRef.current?.focus();
                            }
                          }}
                          className="w-full pl-9 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover text-right"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Validade</label>
                      <input 
                        ref={expirationInputRef}
                        type="date" 
                        value={itemExpiration}
                        onChange={(e) => setItemExpiration(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddProduct();
                          }
                        }}
                        className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                    <div className="col-span-1 lg:col-span-1">
                      <button 
                        onClick={handleAddProduct}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue text-white rounded-xl text-sm font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-brand-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Produto</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Quantidade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Custo Unitário</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Validade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Total</th>
                        <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                            Nenhum produto adicionado à compra ainda.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-brand-text-main">{item.productName}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(item.id, { qty: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-white border border-brand-border rounded-lg text-sm text-center font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue-hover"
                              />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-slate-400 font-bold">R$</span>
                                <input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.cost}
                                  onChange={(e) => handleUpdateItem(item.id, { cost: Number(e.target.value) })}
                                  className="w-24 px-2 py-1 bg-white border border-brand-border rounded-lg text-sm text-right font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue-hover"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="date"
                                value={item.expirationDate}
                                onChange={(e) => handleUpdateItem(item.id, { expirationDate: e.target.value })}
                                className="px-2 py-1 bg-white border border-brand-border rounded-lg text-xs font-medium text-slate-600 focus:ring-2 focus:ring-brand-blue-hover"
                              />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-black text-brand-blue">R$ {item.total.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary & Actions */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                  <div className="flex items-center gap-4 md:gap-8 min-w-0">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Itens</div>
                      <div className="text-lg md:text-xl font-black text-slate-700 truncate leading-tight">{totalItems}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Subtotal</div>
                      <div className="text-lg md:text-xl lg:text-2xl font-black text-brand-blue tracking-tight truncate leading-tight">R$ {subtotal.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setActiveTab(1)}
                      className="flex-1 md:flex-none px-6 py-4 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={handleNextToFinish}
                      className="flex-[2] md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
                    >
                      Continuar
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: FINALIZAR */}
            {activeTab === 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 max-w-5xl mx-auto"
              >
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Resumo da Compra</h2>
                  <p className="text-slate-500 font-medium">Revise os dados antes de confirmar a entrada no estoque.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-6">
                    {/* Supplier Summary */}
                    <div className="p-6 bg-slate-50 rounded-[32px] border border-brand-border space-y-4">
                      <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight border-b border-brand-border pb-2">Fornecedor</h3>
                      
                      <div>
                        <div className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Nome</div>
                        <div className="font-bold text-slate-700">{suppliersList.find(s => s.id === supplierId)?.name || '-'}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Nota Fiscal</div>
                          <div className="font-bold text-slate-700">{invoiceNumber || 'S/N'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Entrada</div>
                          <div className="font-bold text-slate-700">{formatDateBR(entryDate)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Installments Summary */}
                    {paymentCondition !== '1' && (
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-brand-border space-y-4">
                        <div className="flex items-center justify-between border-b border-brand-border pb-2">
                          <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Financeiro / Parcelas</h3>
                          {paymentCondition === '2' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-brand-text-main/40 uppercase italic">Parcelas:</span>
                              <input 
                                type="number"
                                min="1"
                                max="12"
                                value={installments.length}
                                onChange={(e) => handleInstallmentCountChange(Number(e.target.value))}
                                className="w-12 bg-white border border-brand-border rounded-lg text-xs font-black text-center py-1"
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {installments.map((inst, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-brand-border/50">
                              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Vencimento</div>
                                <input 
                                  type="date"
                                  value={inst.dueDate}
                                  onChange={(e) => {
                                    const newInst = [...installments];
                                    newInst[idx].dueDate = e.target.value;
                                    setInstallments(newInst);
                                  }}
                                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                                />
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Valor</div>
                                <div className="text-sm font-black text-brand-blue">R$ {inst.amount.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Products Summary */}
                  <div className="md:col-span-2 p-6 bg-slate-50 rounded-[32px] border border-brand-border space-y-4">
                    <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight border-b border-brand-border pb-2">Produtos ({items.length})</h3>
                    
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-brand-border/50">
                          <div>
                            <div className="font-bold text-brand-text-main text-sm">{item.productName}</div>
                            <div className="text-xs text-slate-500">{item.qty} un × R$ {item.cost.toFixed(2)}</div>
                          </div>
                          <div className="font-black text-brand-blue">
                            R$ {item.total.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Totals & Actions */}
                <div className="p-8 bg-brand-text-main text-white rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-12">
                    <div>
                      <div className="text-[10px] font-black text-white/60 uppercase italic tracking-widest">Total de Itens</div>
                      <div className="text-3xl font-black">{totalItems}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-white/60 uppercase italic tracking-widest">Total da Compra</div>
                      <div className="text-4xl font-black text-brand-blue-light tracking-tight">R$ {subtotal.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setActiveTab(2)}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase italic tracking-tight transition-all active:scale-95 disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={handleConfirmPurchase}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-xl shadow-brand-blue/20 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Save size={20} />
                          Confirmar Compra
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
