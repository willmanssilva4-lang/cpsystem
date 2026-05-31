'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
        .select('id, name')
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

  const handleReceiveOrder = async () => {
    if (!selectedOrder || !orderItems.length) return;
    
    setIsLoading(true);
    try {
      const supplierName = selectedOrder.suppliers?.name || 'Fornecedor Desconhecido';
      const targetCompanyId = user?.companyId || null;
      
      for (const item of orderItems) {
        const numeroLote = `LT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        
        // 1. Create Lote
        const { data: loteData, error: loteError } = await supabase.from('produto_lotes').insert({
          company_id: targetCompanyId,
          produto_id: item.product_id,
          numero_lote: numeroLote,
          data_entrada: new Date().toISOString(),
          custo_unit: Number(item.unit_price) || 0,
          quantidade_inicial: Number(item.quantity) || 0,
          saldo_atual: Number(item.quantity) || 0,
          fornecedor_id: selectedOrder.supplier_id
        }).select('id').single();

        let loteId = undefined;
        if (loteError) {
          console.error('Error creating lote:', loteError);
        } else if (loteData) {
          loteId = loteData.id;
        }

        // 2. Update Product (last cost and supplier)
        await supabase.from('products')
          .update({ 
            cost_price: Number(item.unit_price) || 0,
            supplier: supplierName,
            has_had_stock: true
          })
          .eq('id', item.product_id); // Removed company_id filter to be safer since ID is unique

        // 3. Register Movement
        await addStockMovement({
          productId: item.product_id,
          loteId: loteId,
          type: 'COMPRA',
          quantity: Number(item.quantity) || 0,
          cost: Number(item.unit_price) || 0,
          origin: `Recebimento Pedido: ${selectedOrder.id.slice(0, 8)} - Fornecedor: ${supplierName}`,
          date: new Date().toISOString(),
          userId: user?.email || 'system',
          userName: user?.name || 'Sistema',
          companyId: targetCompanyId
        }, true); // Use skipFetch: true
      }

      // 4. Update Order Status
      let updateQuery = supabase
        .from('purchase_orders')
        .update({ status: 'Recebido' })
        .eq('id', selectedOrder.id);
      
      if (targetCompanyId) {
        updateQuery = updateQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      } else {
        updateQuery = updateQuery.is('company_id', null);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) throw updateError;

      // 5. Generate Expense
      await addExpense({
        description: `Recebimento Pedido: ${selectedOrder.id.slice(0, 8)} - ${supplierName}`,
        category: 'Compra de Mercadoria',
        amount: Number(selectedOrder.total_amount) || 0,
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

      setCustomAlert?.({
        message: 'Pedido recebido com sucesso! Estoque atualizado.',
        type: 'success'
      });

      // Refresh list
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Recebido' } : o));
      setSelectedOrder(null);

    } catch (error: any) {
      console.error('Error receiving order:', error);
      setCustomAlert?.({
        message: `Erro ao receber pedido: ${error.message || 'Erro desconhecido'}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic">Detalhes do Pedido</h2>
              <button onClick={() => { setSelectedOrder(null); setOrderItems([]); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><strong>ID:</strong> {selectedOrder.id.slice(0, 8)}</p>
                <p><strong>Fornecedor:</strong> {selectedOrder.suppliers?.name || 'Desconhecido'}</p>
                <p><strong>Data:</strong> {formatDateBR(selectedOrder.order_date)}</p>
                <p><strong>Status:</strong> {selectedOrder.status}</p>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Produtos Comprados:</h3>
                {isItemsLoading ? (
                  <p className="text-sm text-slate-500">Carregando produtos...</p>
                ) : (
                  <div className="space-y-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Produto</th>
                          <th className="text-right py-2">Qtd</th>
                          <th className="text-right py-2">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2">{item.products?.name || 'Produto'}</td>
                            <td className="text-right py-2">{item.quantity}</td>
                            <td className="text-right py-2">R$ {Number(item.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {selectedOrder.status === 'Pendente' && (
                      <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        className="w-full mt-4 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Confirmar Recebimento
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-right font-black text-lg">
                Total: R$ {Number(selectedOrder.total_amount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md border border-brand-border shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Confirmar Recebimento</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Deseja confirmar o recebimento deste pedido? <br />
                <span className="text-brand-blue font-bold">O estoque será atualizado agora.</span>
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-8">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="py-4 bg-slate-100 text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight text-xs hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    handleReceiveOrder();
                  }}
                  className="py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight text-xs hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
