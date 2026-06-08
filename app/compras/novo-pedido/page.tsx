'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const { 
    user, 
    isAuthReady, 
    addStockMovement, 
    addExpense, 
    hasPermission, 
    products, 
    suppliers, 
    isLoading: isLoadingContext, 
    setCustomAlert,
    paymentMethods,
    maquininhas
  } = useERP();
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    if (!isLoadingContext && !hasPermission('Compras', 'create')) {
      setCustomAlert({
        message: 'Você não tem permissão para realizar compras.',
        type: 'error'
      });
      router.push('/compras');
    }
  }, [isLoadingContext, hasPermission, router]);

  // Data lists as memos for better reactivity
  const suppliersList = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);
  const productsList = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.map(p => {
      const baseP = p.base_product_id ? products.find(b => b.id === p.base_product_id) : null;
      return {
        ...p,
        base_product_name: baseP ? baseP.name : null
      };
    });
  }, [products]);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([
    { id: '1', name: 'Caixa Geral' },
    { id: '2', name: 'Banco Principal' },
    { id: '3', name: 'PIX' }
  ]);
  const [paymentConditions, setPaymentConditions] = useState<any[]>([
    { id: '1', name: 'À Vista' },
    { id: '2', name: 'A Prazo / Parcelado' },
    { id: '3', name: 'Sem Pagamento (Bonificação / Brinde)' }
  ]);

  // Combine with dynamic data if available
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const pm = paymentMethods.map((p: any) => ({ id: p.id, name: p.name }));
      // We keep the defaults or merge
    }
  }, [paymentMethods]);

  // Tab 1: Fornecedor Data
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(getLocalDateString());
  const [entryDate, setEntryDate] = useState(getLocalDateString());
  const [paymentCondition, setPaymentCondition] = useState('');
  const [financialAccount, setFinancialAccount] = useState('');
  const [observations, setObservations] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'Recebido' | 'Pendente'>('Recebido');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm) return suppliersList;
    const term = supplierSearchTerm.toLowerCase();
    return suppliersList.filter(s => 
      s.name.toLowerCase().includes(term) || 
      (s.document && s.document.toLowerCase().includes(term)) ||
      (s.cnpj && s.cnpj.toLowerCase().includes(term))
    );
  }, [suppliersList, supplierSearchTerm]);

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
  
  // Pagination for items table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Refs for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);
  const salePriceInputRef = useRef<HTMLInputElement>(null);
  const expirationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only proceed if auth session is checked
    if (!isAuthReady) return;
    
    // Load draft PERSISTENCY once
    if (!hasLoadedDraft) {
      const savedDraft = localStorage.getItem('purchase_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.supplierId) {
            setSupplierId(draft.supplierId);
            const supp = suppliersList.find(s => s.id === draft.supplierId);
            if (supp) setSupplierSearchTerm(supp.name);
          }
          if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber);
          if (draft.issueDate) setIssueDate(draft.issueDate);
          if (draft.entryDate) setEntryDate(draft.entryDate);
          if (draft.paymentCondition) setPaymentCondition(draft.paymentCondition);
          if (draft.financialAccount) setFinancialAccount(draft.financialAccount);
          if (draft.observations) setObservations(draft.observations);
          if (draft.items && draft.items.length > 0) setItems(draft.items);
          if (draft.activeTab) setActiveTab(draft.activeTab);
          if (draft.orderStatus) setOrderStatus(draft.orderStatus);
        } catch (e) {
          console.error('Error loading purchase draft:', e);
        }
      }
      setHasLoadedDraft(true);
      setIsLoading(false);
    }

    // Check for replenishment items
    const savedItems = localStorage.getItem('replenishment_items');
    const savedReplenishmentSupplierId = localStorage.getItem('quotation_supplier_id');

    if (savedReplenishmentSupplierId) {
      setSupplierId(savedReplenishmentSupplierId);
      const supp = suppliersList.find(s => s.id === savedReplenishmentSupplierId);
      if (supp) setSupplierSearchTerm(supp.name);
      localStorage.removeItem('quotation_supplier_id');
    }

    if (savedItems && Array.isArray(products) && products.length > 0) {
      try {
        const parsedItems = JSON.parse(savedItems);
        const newItems: PurchaseItem[] = parsedItems.map((p: any) => {
          const product = products.find((prod: any) => prod.id === p.id);
          const pMinStock = Number(p.minStock ?? p.min_stock ?? 0);
          const prodMinStock = Number((product as any)?.minStock ?? (product as any)?.min_stock ?? 0);
          const pStock = Number(p.stock ?? (product as any)?.stock ?? 0);

          const qty = p.suggestedQty !== undefined ? p.suggestedQty : Math.max(0, prodMinStock - pStock);
          const cost = p.costValue !== undefined ? p.costValue : (Number((product as any)?.costPrice ?? (product as any)?.cost_price) || 0);
          
          return {
            id: Math.random().toString(36).substr(2, 9),
            productId: p.id,
            productName: p.name,
            qty: qty,
            cost: cost,
            salePrice: Number((product as any)?.salePrice ?? (product as any)?.sale_price) || 0,
            expirationDate: getLocalDateString(),
            total: qty * cost
          };
        });
        if (newItems.length > 0) {
          setItems(newItems);
          setActiveTab(2);
        }
        localStorage.removeItem('replenishment_items');
      } catch (e) {
        console.error('Error loading replenishment items:', e);
      }
    }
  }, [isAuthReady, products, hasLoadedDraft]);

  // Save draft to localStorage
  useEffect(() => {
    if (isLoading || !isAuthReady) return;
    
    const draft = {
      supplierId,
      invoiceNumber,
      issueDate,
      entryDate,
      paymentCondition,
      financialAccount,
      observations,
      orderStatus,
      items,
      activeTab
    };
    
    // Only save if there is actually something relevant to save
    if (supplierId || items.length > 0 || invoiceNumber || observations) {
      localStorage.setItem('purchase_draft', JSON.stringify(draft));
    }
  }, [supplierId, invoiceNumber, issueDate, entryDate, paymentCondition, financialAccount, observations, orderStatus, items, activeTab, isLoading, user?.companyId]);

  const handleClearDraft = () => {
    setShowClearConfirmModal(true);
  };

  const executeClearForm = () => {
    localStorage.removeItem('purchase_draft');
    setSupplierId('');
    setSupplierSearchTerm('');
    setInvoiceNumber('');
    setIssueDate(getLocalDateString());
    setEntryDate(getLocalDateString());
    setPaymentCondition('');
    setFinancialAccount('');
    setObservations('');
    setOrderStatus('Recebido');
    setItems([]);
    setActiveTab(1);
  };

  // Initialize installments when moving to Tab 3 or when payment condition changes
  useEffect(() => {
    if (activeTab === 3 && items.length > 0) {
      const total = items.reduce((acc, item) => acc + item.total, 0);
      
      // If payment condition changed OR installments are empty, initialize
      if (prevPaymentConditionRef.current !== paymentCondition || installments.length === 0) {
        let intervals: number[] = [0]; // Default À Vista
        if (paymentCondition === '2') {
          intervals = [30]; // Default A Prazo
        } else if (paymentCondition === '3') {
          intervals = []; // Sem pagamento / Bonificação
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

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length >= 2) {
      // 1. Local Search First
      const searchTerms = value.toLowerCase().split(' ').filter(term => term.length > 0);
      const localFiltered = productsList.filter(p => {
        const searchableText = `${p.name || ''} ${p.sku || ''} ${p.barcode || ''} ${p.codigo_mercadologico || ''}`.toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      }).slice(0, 50).map(p => ({
        ...p,
        costPrice: p.costPrice ?? (p as any).cost_price,
        salePrice: p.salePrice ?? (p as any).sale_price
      }));
      
      setSearchResults(localFiltered);
      setSelectedIndex(localFiltered.length > 0 ? 0 : -1);

      // 2. Debounced Remote Search for "Real Results"
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('[NovaCompra] Performing remote search for:', value);
          // Pre-filter by company if available
          let baseQuery = supabase.from('products').select('*');
          
          if (user?.companyId) {
            baseQuery = baseQuery.or(`company_id.eq.${user.companyId},company_id.is.null`);
          }

          // Then apply name/sku/barcode filter
          const { data, error } = await baseQuery
            .or(`name.ilike.%${value}%,sku.ilike.%${value}%,barcode.ilike.%${value}%,codigo_mercadologico.ilike.%${value}%`)
            .limit(50);
          
          if (!error && data) {
            // Merge results, avoiding duplicates
            setSearchResults(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newResults = data.filter(p => !existingIds.has(p.id)).map(p => ({
                ...p,
                costPrice: p.costPrice ?? p.cost_price,
                salePrice: p.salePrice ?? p.sale_price
              }));
              const combined = [...prev, ...newResults].slice(0, 50);
              if (combined.length > 0 && selectedIndex === -1) setSelectedIndex(0);
              return combined;
            });
          }
        } catch (err) {
          console.error('Remote search error:', err);
        }
      }, 500);
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
    setItemCost(Number(product.costPrice ?? product.cost_price) || 0);
    setItemSalePrice(Number(product.salePrice ?? product.sale_price) || 0);
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
      setCustomAlert({
        message: 'Por favor, selecione um fornecedor para continuar.',
        type: 'warning'
      });
      return;
    }
    setActiveTab(2);
  };

  const handleAddProduct = () => {
    if (!selectedProduct || itemQty <= 0 || itemCost < 0) {
      setCustomAlert({
        message: 'Preencha os campos obrigatórios: Produto, Quantidade e Custo.',
        type: 'warning'
      });
      return;
    }

    const newItem: PurchaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      qty: itemQty,
      cost: itemCost,
      salePrice: itemSalePrice,
      expirationDate: itemExpiration || '',
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
      setCustomAlert({
        message: 'Adicione pelo menos um produto à compra.',
        type: 'warning'
      });
      return;
    }
    setActiveTab(3);
  };

  const handleConfirmPurchase = async () => {
    if (items.length === 0) {
      setCustomAlert({
        message: 'Adicione pelo menos um produto à compra.',
        type: 'warning'
      });
      return;
    }
    
    const totalCompra = items.reduce((acc, item) => acc + item.total, 0);
    if (totalCompra <= 0) {
      setCustomAlert({
        message: 'O valor total da compra deve ser maior que zero.',
        type: 'warning'
      });
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
        status: orderStatus
      }).select('id').single();

      if (orderError) throw orderError;
      const orderId = orderData.id;

      // Only update stock and lots if it is marked as 'Recebido'
      if (orderStatus === 'Recebido') {
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
            validade: item.expirationDate || null,
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
          const product = Array.isArray(productsList) ? productsList.find(p => p.id === item.productId) : null;
          if (product) {
            const updateData: any = { 
              cost_price: item.cost,
              supplier: supplierName,
              has_had_stock: true
            };

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
      } else {
        // If 'Pendente', just insert order items
        for (const item of items) {
          await supabase.from('purchase_order_items').insert({
            company_id: user?.companyId || null,
            purchase_order_id: orderId,
            product_id: item.productId,
            quantity: item.qty,
            unit_price: item.cost,
            total_price: item.total
          });
        }
      }

      // 5. Generate Conta a Pagar (Expense) - Installments
      if (orderStatus === 'Recebido') {
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
            financialAccount: financialAccount || 'Caixa',
            companyId: user?.companyId || ''
          });
        } else if (paymentCondition === '2') {
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
              financialAccount: financialAccount || 'Caixa',
              companyId: user?.companyId || ''
            });
          }
        } else if (paymentCondition === '3') {
          // Bonificação: Sem despesas financeiras
          console.log('[NovaCompra] Entrada bonificada - ignora geração de Contas a Pagar');
        }
      }

      setCustomAlert({
        message: orderStatus === 'Recebido' ? 'Compra finalizada com sucesso!' : 'Pedido pendente registrado com sucesso!',
        type: 'success'
      });
      localStorage.removeItem('purchase_draft');
      router.push('/compras');

    } catch (error) {
      console.error('Error confirming purchase:', error);
      setCustomAlert({
        message: 'Erro ao finalizar compra. Verifique o console para mais detalhes.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-brand-bg/50 min-h-screen relative">
      {/* Visual background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-green/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/compras"
            className="w-14 h-14 rounded-3xl bg-brand-card border border-brand-border flex items-center justify-center text-brand-text-sec hover:text-brand-blue transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h2 className="text-3xl lg:text-4xl font-black text-brand-text-main uppercase italic tracking-tight">Nova Compra</h2>
            <p className="text-sm text-brand-text-sec font-bold uppercase tracking-widest opacity-70 mt-1">Entrada de Mercadoria e Lotes</p>
          </div>
        </div>

        {(supplierId || items.length > 0) && (
          <button 
            onClick={handleClearDraft}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase italic tracking-tight hover:bg-rose-100 transition-all shadow-sm active:scale-95"
          >
            <Trash2 size={16} />
            Limpar formulário
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 relative z-10">
        {[1, 2, 3].map((tab) => (
          <div 
            key={tab}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-3xl font-black uppercase italic tracking-tight transition-all shrink-0 border",
              activeTab === tab 
                ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' 
                : 'text-brand-text-sec bg-brand-card border-brand-border'
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-2xl flex items-center justify-center text-xs",
              activeTab === tab ? 'bg-white/20 text-white' : 'bg-brand-bg text-brand-text-sec'
            )}>{tab}</div>
            <span className="text-sm">
              {tab === 1 ? 'Fornecedor' : tab === 2 ? 'Produtos' : 'Finalizar'}
            </span>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[40px] shadow-sm border border-brand-border/50 p-6 md:p-8 relative z-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          </div>
        ) : (
          <>
            {/* TAB 1: FORNECEDOR */}
            {activeTab === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 border-b border-brand-border/50 pb-6">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                    <Truck size={24} />
                  </div>
                  <h3 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Dados do Fornecedor</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2 relative">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Fornecedor *</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-blue/40">
                        <Truck size={20} />
                      </div>
                      <input 
                        type="text" 
                        placeholder={isLoadingContext ? "Carregando fornecedores..." : "Buscar fornecedor por nome ou documento..."}
                        value={supplierSearchTerm}
                        onChange={(e) => {
                          setSupplierSearchTerm(e.target.value);
                          setShowSupplierResults(true);
                        }}
                        onFocus={() => setShowSupplierResults(true)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue text-sm md:text-base transition-all outline-none"
                      />
                      
                      <AnimatePresence>
                        {showSupplierResults && supplierSearchTerm.length >= 3 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-brand-border rounded-2xl shadow-2xl max-h-64 overflow-y-auto"
                          >
                            {filteredSuppliers.length === 0 ? (
                              <div className="p-4 text-center text-sm text-slate-400 italic">Nenhum fornecedor encontrado</div>
                            ) : (
                              filteredSuppliers.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setSupplierId(s.id);
                                    setSupplierSearchTerm(s.name);
                                    setShowSupplierResults(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-5 py-4 text-left transition-all border-b border-brand-border last:border-0 hover:bg-brand-blue/5",
                                    supplierId === s.id ? "bg-brand-blue/5 border-l-4 border-l-brand-blue" : ""
                                  )}
                                >
                                  <div>
                                    <div className="font-black text-brand-text-main text-sm uppercase italic tracking-tight">{s.name}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{s.document || s.cnpj || 'Sem Documento'}</div>
                                  </div>
                                  {supplierId === s.id && <CheckCircle2 className="text-brand-blue" size={20} />}
                                </button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Nº Nota Fiscal</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 123456"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue text-sm md:text-base transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Data de Emissão</label>
                    <input 
                      type="date" 
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Data de Entrada</label>
                    <input 
                      type="date" 
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Condição de Pagamento</label>
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue transition-all"
                      value={paymentCondition}
                      onChange={(e) => setPaymentCondition(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {paymentConditions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Conta Financeira</label>
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue transition-all"
                      value={financialAccount}
                      onChange={(e) => setFinancialAccount(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {financialAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Observações</label>
                    <textarea 
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Alguma observação importante sobre esta compra..."
                      className="w-full px-6 py-4 bg-slate-50 border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue transition-all min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-brand-border/50">
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 border-b border-brand-border/50 pb-6">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center text-brand-green">
                    <Package size={24} />
                  </div>
                  <h3 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Adicionar Produtos</h3>
                </div>

                {/* Add Product Form - Stylized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 bg-slate-50 p-6 rounded-3xl border border-brand-border items-end">
                  <div className="lg:col-span-4 space-y-2 relative">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Produto</label>
                    <div className="relative">
                      <input 
                        ref={searchInputRef} 
                        type="text" 
                        placeholder="Buscar produto..." 
                        value={searchTerm} 
                        onChange={handleSearchChange} 
                        onKeyDown={handleSearchKeyDown} 
                        className="w-full px-4 py-3 rounded-xl border border-brand-border font-bold text-sm focus:ring-2 focus:ring-brand-green/20 outline-none transition-all" 
                      />
                      
                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {searchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-brand-border rounded-2xl shadow-2xl max-h-80 overflow-y-auto"
                          >
                            {searchResults.map((product, index) => (
                              <button
                                key={product.id}
                                onClick={() => selectProduct(product)}
                                className={cn(
                                  "w-full flex items-center justify-between px-5 py-4 text-left transition-all border-b border-brand-border last:border-0",
                                  selectedIndex === index ? "bg-brand-blue/5 border-l-4 border-l-brand-blue shadow-inner" : "hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-blue shrink-0">
                                    <Package size={20} />
                                  </div>
                                  <div>
                                    <div className="font-black text-brand-text-main text-sm flex items-center uppercase italic tracking-tight">
                                      {product.name}
                                      {product.product_type === 'BASE' && (
                                        <span className="ml-2 text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold not-italic">Base</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                      {product.sku || 'Sem SKU'}
                                      {product.barcode && ` • ${product.barcode}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-brand-blue italic leading-none">R$ {Number(product.salePrice ?? product.sale_price ?? 0).toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Estoque: <span className={cn(product.stock <= 0 ? 'text-rose-500' : 'text-emerald-500')}>{product.stock || 0}</span></div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Qtd</label>
                    <input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-brand-border font-bold text-sm text-center" />
                  </div>
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Custo (R$)</label>
                    <input type="number" min="0" step="0.01" value={itemCost} onChange={(e) => setItemCost(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-brand-border font-bold text-sm text-right" />
                  </div>
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-brand-text-main/60 uppercase italic tracking-widest ml-1">Venda Sugerida (R$)</label>
                    <input type="number" min="0" step="0.01" value={itemSalePrice} onChange={(e) => setItemSalePrice(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-brand-border font-bold text-sm text-right" />
                  </div>
                  <div className="lg:col-span-2">
                    <button onClick={handleAddProduct} className="w-full px-4 py-3 bg-brand-green text-white rounded-xl font-black uppercase italic shadow-sm hover:bg-brand-green-hover transition-all active:scale-95">Adicionar</button>
                  </div>
                </div>

                {itemCost > 0 && itemSalePrice > 0 && (
                  <div className="text-right text-xs font-bold text-brand-green italic">
                    Margem estimada: {(((itemSalePrice - itemCost) / itemSalePrice) * 100).toFixed(1)}%
                  </div>
                )}

                {/* Products Table - Fixed */}
                <div className="bg-white rounded-3xl border border-brand-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-brand-text-main/40">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4 text-center">Qtd</th>
                        <th className="px-6 py-4 text-right">Custo</th>
                        <th className="px-6 py-4 text-right">Venda Sugerida</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                      {items.map(item => (
                        <tr key={item.id} className="text-sm font-bold text-brand-text-main">
                          <td className="px-6 py-4">{item.productName}</td>
                          <td className="px-6 py-4 text-center">{item.qty}</td>
                          <td className="px-6 py-4 text-right text-slate-600">R$ {item.cost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-extrabold italic">R$ {(item.salePrice || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-brand-blue">R$ {item.total.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:text-rose-700"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-6 border-t border-brand-border/50">
                  <button onClick={handleNextToFinish} className="flex items-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase shadow-lg shadow-brand-blue/20">
                    Finalizar
                    <ChevronRight size={20} />
                  </button>
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
                        <div className="font-bold text-brand-text-main">{suppliersList.find(s => s.id === supplierId)?.name || 'Fornecedor não encontrado'}</div>
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
                    {paymentCondition === '2' && (
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

                    {paymentCondition === '3' && (
                      <div className="p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-200/50 flex flex-col items-center text-center space-y-2">
                        <span className="text-emerald-600 font-extrabold uppercase italic tracking-wider text-xs">Entrada de Bonificação</span>
                        <p className="text-sm font-medium text-slate-600 max-w-sm leading-relaxed">
                          Esta compra está marcada como <strong className="font-extrabold italic uppercase text-brand-blue">Sem Pagamento (Bonificação / Brinde)</strong>. O estoque dos produtos será abastecido, mas nenhum lançamento de Conta a Pagar será gerado no financeiro.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Products Summary */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="p-6 bg-slate-50 rounded-[32px] border border-brand-border space-y-4">
                      <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight border-b border-brand-border pb-2">Status do Pedido</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setOrderStatus('Recebido')}
                          className={cn(
                            "py-3 rounded-xl border font-black uppercase italic text-xs transition-all",
                            orderStatus === 'Recebido' 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                              : "bg-white border-brand-border text-slate-400 opacity-60 hover:opacity-100"
                          )}
                        >
                          Recebido (Dar Entrada)
                        </button>
                        <button
                          onClick={() => setOrderStatus('Pendente')}
                          className={cn(
                            "py-3 rounded-xl border font-black uppercase italic text-xs transition-all",
                            orderStatus === 'Pendente' 
                              ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                              : "bg-white border-brand-border text-slate-400 opacity-60 hover:opacity-100"
                          )}
                        >
                          Pendente (Só Pedido)
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        {orderStatus === 'Recebido' 
                          ? "* Ao confirmar, o estoque será atualizado e o financeiro gerado imediatamente."
                          : "* Ao confirmar, apenas o registro do pedido será salvo. Sem alteração de estoque."}
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[32px] border border-brand-border space-y-4">
                      <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight border-b border-brand-border pb-2">Produtos ({items.length})</h3>
                      <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-brand-border/50">
                            <div>
                              <div className="font-bold text-brand-text-main text-sm">{item.productName}</div>
                              <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                <span>{item.qty} un × R$ {item.cost.toFixed(2)} (Custo)</span>
                                <span className="text-emerald-600 font-semibold uppercase tracking-tight text-[10px]">Venda: R$ {(item.salePrice || 0).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="font-black text-brand-blue">
                              R$ {item.total.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
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

      {showClearConfirmModal && (
        <div id="clear-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 size={32} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Confirmar Limpeza</h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Deseja limpar todo o formulário e começar do zero?
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                id="cancel-clear-btn"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase italic tracking-tight transition-all active:scale-95"
              >
                Não, cancelar
              </button>
              <button
                id="confirm-clear-btn"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  executeClearForm();
                }}
                className="flex-1 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-tight transition-all shadow-lg shadow-rose-600/15 active:scale-95"
              >
                Sim, limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
