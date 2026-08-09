'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Barcode,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  Calendar,
  List,
  Sparkles,
  Check,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateBR } from '@/lib/utils';
import { useERP } from '@/lib/context';

export default function TodosPedidosPage() {
  const { user, addStockMovement, addExpense, setCustomAlert } = useERP();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Módulo de Conferência Física do Conferente (Sistemas de Grande Porte)
  const [isCheckingMode, setIsCheckingMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<any[]>([]);
  const [scannerInput, setScannerInput] = useState('');
  const [checkerLog, setCheckerLog] = useState<string[]>([]);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      const targetCompanyId = user?.companyId || null;
      let query = supabase
        .from('purchase_orders')
        .select('id, order_date, total_amount, status, supplier_id, suppliers(name)')
        .order('order_date', { ascending: false });
      
      if (targetCompanyId) {
        query = query.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders:', error);
      } else if (data) {
        setOrders(data);
      }
      setIsLoading(false);
    }
    fetchOrders();
  }, [user?.companyId]);

  const handleOrderClick = async (order: any) => {
    setSelectedOrder(order);
    setIsItemsLoading(true);
    console.log('Fetching items for order:', order.id);
    
    // 1. Fetch items
    const targetCompanyId = user?.companyId || null;
    let itemsQuery = supabase
      .from('purchase_order_items')
      .select('quantity, unit_price, product_id')
      .eq('purchase_order_id', order.id);

    if (targetCompanyId) {
      itemsQuery = itemsQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
    } else {
      itemsQuery = itemsQuery.is('company_id', null);
    }
    
    const { data: items, error: itemsError } = await itemsQuery;
    
    if (itemsError) {
      console.error('Error fetching items for order', order.id, ':', JSON.stringify(itemsError, null, 2));
      setIsItemsLoading(false);
      return;
    }

    if (items) {
      // 2. Fetch products for these items
      const productIds = [...new Set(items.map(item => item.product_id))];
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, image')
        .eq('company_id', user?.companyId || null)
        .in('id', productIds);
        
      if (productsError) {
        console.error('Error fetching products:', JSON.stringify(productsError, null, 2));
        setOrderItems(items); // Show items even if product names fail
      } else {
        // 3. Combine items with product names
        const itemsWithProducts = items.map(item => ({
          ...item,
          products: products?.find(p => p.id === item.product_id)
        }));
        setOrderItems(itemsWithProducts);
      }
    }
    
    setIsItemsLoading(false);
  };

  const initChecking = () => {
    if (!orderItems.length) return;
    const today = new Date();
    const initialChecked = orderItems.map((item, index) => {
      return {
        ...item,
        qtyExpected: Number(item.quantity) || 0,
        qtyReceived: 0,
        loteNumber: `LT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${index + 100}`,
        expirationDate: '',
        product: item.products
      };
    });
    setCheckedItems(initialChecked);
    setIsCheckingMode(true);
    setCheckerLog(['Iniciando conferência de carga física...', 'Pronto para bipar ou coletar mercadorias.']);
  };

  const handlePrefillChecking = () => {
    const updated = checkedItems.map(item => ({
      ...item,
      qtyReceived: item.qtyExpected
    }));
    setCheckedItems(updated);
    setCheckerLog(prev => [
      '⚡ AUTO-PREENCHIMENTO: Quantidades esperadas copiadas para recebidas.',
      ...prev.slice(0, 4)
    ]);
    if (setCustomAlert) {
      setCustomAlert({
        message: 'Todas as quantidades foram preenchidas com sucesso!',
        type: 'success'
      });
    }
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scannerInput.trim();
    if (!code) return;

    const foundIndex = checkedItems.findIndex(item => {
      const prod = item.product || {};
      return (
        (prod.barcode && prod.barcode.toLowerCase() === code.toLowerCase()) ||
        (prod.sku && prod.sku.toLowerCase() === code.toLowerCase()) ||
        (prod.name && prod.name.toLowerCase().includes(code.toLowerCase()))
      );
    });

    if (foundIndex !== -1) {
      const updated = [...checkedItems];
      const item = updated[foundIndex];
      item.qtyReceived = (item.qtyReceived || 0) + 1;
      setCheckedItems(updated);

      setCheckerLog(prev => [
        `BIP! 📥 ${item.product?.name || 'Produto'} recebido (Total: ${item.qtyReceived} / ${item.qtyExpected})`,
        ...prev.slice(0, 4)
      ]);

      if (setCustomAlert) {
        setCustomAlert({
          message: `Bipado: ${item.product?.name || 'Produto'} (+1 un)`,
          type: 'success'
        });
      }
    } else {
      setCheckerLog(prev => [
        `⚠️ CÓDIGO NÃO ENCONTRADO NO PEDIDO: "${code}"`,
        ...prev.slice(0, 4)
      ]);
      if (setCustomAlert) {
        setCustomAlert({
          message: `O produto "${code}" não pertence a este pedido de compra!`,
          type: 'warning'
        });
      }
    }

    setScannerInput('');
  };

  const handleIncrementQty = (index: number) => {
    const updated = [...checkedItems];
    updated[index].qtyReceived = (updated[index].qtyReceived || 0) + 1;
    setCheckedItems(updated);
  };

  const handleDecrementQty = (index: number) => {
    const updated = [...checkedItems];
    if ((updated[index].qtyReceived || 0) > 0) {
      updated[index].qtyReceived = (updated[index].qtyReceived || 0) - 1;
      setCheckedItems(updated);
    }
  };

  const handleUpdateItemField = (index: number, field: string, value: any) => {
    const updated = [...checkedItems];
    updated[index][field] = value;
    setCheckedItems(updated);
  };

  const handleFinishChecking = async () => {
    if (!selectedOrder || !checkedItems.length) return;
    
    setIsLoading(true);
    try {
      const supplierName = selectedOrder.suppliers?.name || 'Fornecedor Desconhecido';
      const targetCompanyId = user?.companyId || null;
      
      let hasDiscrepancy = false;
      const discrepanciesList: string[] = [];

      for (const item of checkedItems) {
        const expected = Number(item.qtyExpected) || 0;
        const received = Number(item.qtyReceived) || 0;
        const finalCost = Number(item.unit_price) || 0;
        
        if (expected !== received) {
          hasDiscrepancy = true;
          discrepanciesList.push(`${item.product?.name || 'Produto'}: Esperado ${expected}, Recebido ${received}`);
        }

        // Only create Lote and update stock if they received at least 1 unit!
        if (received > 0) {
          // 1. Create Lote with actual checked quantity and expiration
          const { data: loteData, error: loteError } = await supabase.from('produto_lotes').insert({
            company_id: targetCompanyId,
            produto_id: item.product_id,
            numero_lote: item.loteNumber || `LT-${Date.now().toString().slice(-6)}`,
            data_entrada: new Date().toISOString(),
            custo_unit: finalCost,
            quantidade_inicial: received,
            saldo_atual: received,
            validade: item.expirationDate || null,
            fornecedor_id: selectedOrder.supplier_id
          }).select('id').single();

          let loteId = undefined;
          if (loteError) {
            console.error('Error creating lote:', loteError);
          } else if (loteData) {
            loteId = loteData.id;
          }

          // 2. Update Product (last cost, supplier, and precise cost metadata)
          const currentProd = item.product;
          const rawImage = currentProd?.image ?? 'https://i.imgur.com/jGU5BUa.png';
          const cleanImage = String(rawImage).split('#cost:')[0];

          await supabase.from('products')
            .update({ 
              cost_price: finalCost,
              supplier: supplierName,
              has_had_stock: true,
              validade: item.expirationDate || currentProd?.validade || null,
              image: `${cleanImage}#cost:${finalCost}`
            })
            .eq('id', item.product_id);

          // 3. Register Movement using actual checked received quantity
          await addStockMovement({
            productId: item.product_id,
            loteId: loteId,
            type: 'COMPRA',
            quantity: received,
            cost: finalCost,
            origin: `Conferência Carga Pedido: ${selectedOrder.id.slice(0, 8)} - Fornecedor: ${supplierName}`,
            date: new Date().toISOString(),
            userId: user?.email || 'system',
            userName: user?.name || 'Sistema',
            companyId: targetCompanyId
          }, true);
        }
      }

      // 4. Update Order Status
      const finalStatus = hasDiscrepancy ? 'Recebido com Divergência' : 'Recebido';
      
      let updateQuery = supabase
        .from('purchase_orders')
        .update({ 
          status: finalStatus,
          received_date: new Date().toISOString(),
          checker_notes: discrepanciesList.join('; ')
        })
        .eq('id', selectedOrder.id);
      
      if (targetCompanyId) {
        updateQuery = updateQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      } else {
        updateQuery = updateQuery.is('company_id', null);
      }

      const { error: updateError } = await updateQuery;
      if (updateError) throw updateError;

      // 5. Generate Expense
      const actualTotalAmount = checkedItems.reduce((acc, item) => acc + (Number(item.qtyReceived) * Number(item.unit_price)), 0);

      await addExpense({
        description: `Conferência Pedido: ${selectedOrder.id.slice(0, 8)} (${finalStatus}) - ${supplierName}`,
        category: 'Compra de Mercadoria',
        amount: actualTotalAmount || Number(selectedOrder.total_amount) || 0,
        supplier: supplierName,
        supplierId: selectedOrder.supplier_id,
        dueDate: new Date().toISOString(),
        date: new Date().toISOString(),
        issueDate: new Date().toISOString(),
        status: 'Pago',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Dinheiro',
        financialAccount: 'Caixa',
        companyId: targetCompanyId
      });

      // Refresh list
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: finalStatus } : o));
      setSelectedOrder(null);
      setIsCheckingMode(false);
      setCheckedItems([]);

      setCustomAlert?.({
        message: `Carga conferida com sucesso! Status: ${finalStatus}`,
        type: 'success'
      });

    } catch (error: any) {
      console.error('Error completing check:', error);
      setCustomAlert?.({
        message: `Erro ao finalizar conferência: ${error.message || 'Erro desconhecido'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setIsCanceling(true);
    try {
      const targetCompanyId = user?.companyId || null;
      const supplierName = selectedOrder.suppliers?.name || 'Fornecedor';

      // 1. Update purchase_orders table status to 'Cancelado'
      let updateQuery = supabase
        .from('purchase_orders')
        .update({ status: 'Cancelado' })
        .eq('id', selectedOrder.id);

      if (targetCompanyId) {
        updateQuery = updateQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      } else {
        updateQuery = updateQuery.is('company_id', null);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      // 2. If order was received, reverse stock for each item
      if (selectedOrder.status === 'Recebido' || selectedOrder.status === 'Recebido com Divergência') {
        for (const item of orderItems) {
          const qtyToReverse = Number(item.quantity) || 0;
          if (qtyToReverse > 0 && item.product_id) {
            await addStockMovement({
              productId: item.product_id,
              type: 'AJUSTE_SAIDA',
              quantity: qtyToReverse,
              cost: Number(item.unit_price) || 0,
              origin: `Estorno/Cancelamento Pedido Compra: ${selectedOrder.id.slice(0, 8)} - Fornecedor: ${supplierName}`,
              date: new Date().toISOString(),
              userId: user?.email || 'system',
              userName: user?.name || 'Sistema',
              companyId: targetCompanyId
            }, true);
          }
        }
      }

      // 3. Update local state
      setOrders((prev: any[]) => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Cancelado' } : o));
      setSelectedOrder((prev: any) => prev ? { ...prev, status: 'Cancelado' } : null);
      setIsCancelModalOpen(false);

      if (setCustomAlert) {
        setCustomAlert({
          message: 'Pedido de compra cancelado e estoque estornado com sucesso!',
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Erro ao cancelar pedido:', err);
      if (setCustomAlert) {
        setCustomAlert({
          message: `Erro ao cancelar pedido: ${err.message || 'Erro desconhecido'}`,
          type: 'error'
        });
      }
    } finally {
      setIsCanceling(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    (order.suppliers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen">
      <div className="flex items-center gap-4">
        <Link href="/compras" className="p-3 bg-white border border-brand-border rounded-2xl text-brand-text-sec hover:text-brand-blue transition-all">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Todos os Pedidos</h1>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-brand-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por fornecedor ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue-hover"
          />
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-brand-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">Carregando...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-right">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => handleOrderClick(order)}>
                    <td className="px-6 py-4 font-bold text-sm text-brand-text-main">{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-sm text-brand-text-main">{order.suppliers?.name || 'Desconhecido'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateBR(order.order_date)}</td>
                    <td className="px-6 py-4 text-right font-black text-brand-blue">R$ {Number(order.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                        order.status === 'Recebido' ? "bg-emerald-50 text-emerald-600" :
                        order.status === 'Pendente' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {order.status === 'Recebido' && <CheckCircle2 size={10} />}
                        {order.status === 'Pendente' && <Clock size={10} />}
                        {order.status === 'Cancelado' && <XCircle size={10} />}
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-black uppercase italic text-slate-800">Detalhes do Pedido</h2>
              <button onClick={() => { setSelectedOrder(null); setOrderItems([]); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-5 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p><strong>ID:</strong> #{selectedOrder.id.slice(0, 8)}</p>
                <p><strong>Fornecedor:</strong> {selectedOrder.suppliers?.name || 'Desconhecido'}</p>
                <p><strong>Data:</strong> {formatDateBR(selectedOrder.order_date)}</p>
                <p><strong>Status:</strong> {selectedOrder.status}</p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2 text-slate-700">Produtos Comprados ({orderItems.length}):</h3>
                {isItemsLoading ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Carregando produtos...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-[280px] overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                          <tr className="border-b border-slate-200 text-slate-600 font-bold text-xs uppercase">
                            <th className="text-left p-2.5">Produto</th>
                            <th className="text-right p-2.5">Qtd</th>
                            <th className="text-right p-2.5">Custo Unit.</th>
                            <th className="text-right p-2.5">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orderItems.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 font-medium text-slate-800">{item.products?.name || 'Produto'}</td>
                              <td className="text-right p-2.5 font-bold text-slate-700">{item.quantity}</td>
                              <td className="text-right p-2.5 text-slate-600">R$ {Number(item.unit_price).toFixed(2)}</td>
                              <td className="text-right p-2.5 font-semibold text-slate-800">R$ {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedOrder.status === 'Pendente' && (
                      <button
                        onClick={() => {
                          initChecking();
                        }}
                        className="w-full py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Barcode size={18} />
                        Iniciar Conferência Física (Conferente)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 shrink-0">
              <div>
                {selectedOrder.status !== 'Cancelado' ? (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-black uppercase italic tracking-wider text-xs transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Cancelar / Estornar Pedido
                  </button>
                ) : (
                  <span className="text-xs font-black uppercase italic text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                    Pedido Cancelado / Estornado
                  </span>
                )}
              </div>
              <div className="text-right font-black text-lg text-brand-blue">
                Total: R$ {Number(selectedOrder.total_amount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento do Pedido de Compra */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={28} />
              <div>
                <h3 className="text-lg font-black uppercase italic">Cancelar Pedido de Compra?</h3>
                <p className="text-xs text-slate-500 font-semibold">ID: #{selectedOrder.id.slice(0, 8)}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Ao confirmar o cancelamento, o status do pedido de compra será alterado para <strong className="text-rose-600 font-bold">CANCELADO</strong>.
              {(selectedOrder.status === 'Recebido' || selectedOrder.status === 'Recebido com Divergência') && (
                <span className="block mt-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 font-medium">
                  ⚠️ Como esta mercadoria já havia sido recebida, as quantidades dos produtos serão estornadas (subtraídas) do estoque automaticamente.
                </span>
              )}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCanceling}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCanceling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase italic tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Módulo do Conferente: Interface de Conferência Física de Carga */}
      {isCheckingMode && selectedOrder && (
        <div className="fixed inset-0 bg-slate-100 z-[70] overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
                Módulo Conferente • Recepção de Carga Física
              </span>
              <h1 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">
                Conferência de Estoque: Pedido #{selectedOrder.id.slice(0, 8)}
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Fornecedor: <span className="text-slate-600 font-black">{selectedOrder.suppliers?.name || 'Desconhecido'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrefillChecking}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-brand-text-main font-black text-xs uppercase italic tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                title="Copia quantidades esperadas para recebidas"
              >
                <Sparkles size={14} className="text-amber-500" />
                Autopreencher Quantidades
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCheckingMode(false);
                  setCheckedItems([]);
                }}
                className="px-4 py-3 bg-white border border-brand-border hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all"
              >
                Cancelar Conferência
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: scanner inputs and scanner logs */}
            <div className="lg:col-span-1 space-y-6">
              {/* Barcode scanner console */}
              <div className="bg-brand-text-main text-white rounded-3xl p-6 border border-brand-text-main shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-brand-blue">
                  <Barcode size={24} />
                  <h3 className="text-sm font-black uppercase tracking-wider italic">Scanner / Leitor de Código</h3>
                </div>
                
                <form onSubmit={handleScanBarcode} className="space-y-2">
                  <p className="text-[11px] text-slate-300 font-medium">
                    Bipe o código de barras ou digite o nome/SKU do produto e pressione Enter para registrar +1 unidade:
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      placeholder="Foque aqui para bipar..."
                      className="w-full bg-slate-800 border-2 border-slate-700 focus:border-brand-blue text-white font-black px-4 py-3.5 rounded-xl outline-none transition-all placeholder-slate-500 uppercase text-sm"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-2 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-[10px] font-black uppercase italic tracking-wider hover:bg-brand-blue-hover transition-all"
                    >
                      Bipar
                    </button>
                  </div>
                </form>
              </div>

              {/* Logs */}
              <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-md space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 italic tracking-wider flex items-center gap-1.5">
                  <List size={14} />
                  Logs de Bipagem Recentes
                </h4>
                <div className="bg-slate-50 border border-brand-border rounded-2xl p-4 font-mono text-[11px] text-slate-600 min-h-[160px] max-h-[220px] overflow-y-auto space-y-1.5">
                  {checkerLog.map((log, index) => (
                    <div key={index} className={cn(
                      "pb-1 border-b border-slate-100 last:border-0",
                      log.startsWith('⚠️') ? 'text-rose-600 font-bold' :
                      log.startsWith('⚡') ? 'text-amber-600 font-bold' :
                      log.startsWith('BIP!') ? 'text-emerald-600 font-bold' : 'text-slate-500'
                    )}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Items grid/table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-brand-border shadow-md overflow-hidden">
                <div className="p-6 border-b border-brand-border bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-black text-brand-text-main uppercase italic tracking-tight text-sm">
                    Lista de Conferência de Itens
                  </h3>
                  <span className="text-[10px] font-black text-brand-blue uppercase bg-brand-blue/10 px-2.5 py-1 rounded-full">
                    {checkedItems.length} itens a conferir
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border/60 bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4 text-center">Esperado</th>
                        <th className="px-6 py-4 text-center">Recebido (Contagem)</th>
                        <th className="px-6 py-4">Código Lote</th>
                        <th className="px-6 py-4">Data Validade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm">
                      {checkedItems.map((item, index) => {
                        const expected = Number(item.qtyExpected) || 0;
                        const received = Number(item.qtyReceived) || 0;
                        const hasDiverg = expected !== received;

                        return (
                          <tr key={index} className={cn(
                            "hover:bg-slate-50/30 transition-colors",
                            hasDiverg && received > 0 ? "bg-amber-50/10" : ""
                          )}>
                            <td className="px-6 py-4">
                              <div className="font-bold text-brand-text-main">{item.product?.name || 'Produto'}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                SKU: {item.product?.sku || 'N/A'} {item.product?.barcode && `| EAN: ${item.product?.barcode}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-slate-500">
                              {expected}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementQty(index)}
                                  className="w-8 h-8 rounded-lg border border-brand-border hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all active:scale-95"
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.qtyReceived}
                                  onChange={(e) => handleUpdateItemField(index, 'qtyReceived', Math.max(0, parseInt(e.target.value) || 0))}
                                  className={cn(
                                    "w-16 px-2 py-1.5 border-2 rounded-lg text-center font-black text-sm outline-none",
                                    hasDiverg && received > 0 ? "border-amber-400 focus:border-amber-500 bg-amber-50/20 text-amber-700" :
                                    received === expected ? "border-emerald-300 focus:border-emerald-500 bg-emerald-50/10 text-emerald-700" :
                                    "border-brand-border focus:border-brand-blue text-slate-700"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleIncrementQty(index)}
                                  className="w-8 h-8 rounded-lg border border-brand-border hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all active:scale-95"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={item.loteNumber}
                                onChange={(e) => handleUpdateItemField(index, 'loteNumber', e.target.value)}
                                className="w-full min-w-[110px] px-3 py-1.5 bg-slate-50 border border-brand-border rounded-lg text-xs font-mono font-bold text-slate-600 outline-none focus:bg-white focus:border-brand-blue"
                                placeholder="Num Lote"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="date"
                                value={item.expirationDate}
                                onChange={(e) => handleUpdateItemField(index, 'expirationDate', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-brand-border rounded-lg text-xs font-semibold text-slate-600 outline-none focus:bg-white focus:border-brand-blue"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-brand-border bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className="text-xs text-slate-500 font-medium">
                      Valores divergentes de recebimento serão registrados como <strong className="text-amber-600 font-bold">"Recebido com Divergência"</strong> para fins de auditoria e estoque.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFinishChecking}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-4 bg-brand-blue hover:bg-brand-blue-hover disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-blue/20"
                  >
                    <CheckCircle2 size={16} />
                    {isLoading ? 'Salvando...' : 'Finalizar Conferência Física'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
