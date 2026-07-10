'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Search,
  ChevronRight,
  Database,
  Truck,
  Calendar,
  DollarSign,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';

export default function ImportXmlPage() {
  const { suppliers, products, setCustomAlert, addProduct, addStockMovement, addExpense, fetchData, user } = useERP();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [mockInvoice, setMockInvoice] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const [hasUploaded, setHasUploaded] = useState(false);
  const [linkingItem, setLinkingItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [entranceMode, setEntranceMode] = useState<'express' | 'checker'>('checker');
  const [showPayablePrompt, setShowPayablePrompt] = useState(false);
  const [payableDueDate, setPayableDueDate] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);

  useEffect(() => {
    if (hasUploaded) return;
    const timer = setTimeout(() => {
      if (suppliers.length > 0 && products.length > 0) {
        const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        const randomProducts = products.slice(0, 3).map(p => {
          const qty = Math.floor(Math.random() * 10) + 1;
          const total = p.costPrice * qty;
          return {
            id: p.sku || p.id.slice(0, 4),
            name: p.name,
            qty: qty,
            un: 'UN',
            unitPrice: p.costPrice,
            unit: `R$ ${p.costPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            total: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            linked: true
          };
        });

        const totalSum = randomProducts.reduce((acc, p) => acc + (p.unitPrice * p.qty), 0);
        setMockInvoice({
          number: '000.' + Math.floor(Math.random() * 900000 + 100000),
          supplier: randomSupplier.name,
          date: new Date().toLocaleDateString('pt-BR'),
          total: 'R$ ' + totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          rawTotal: totalSum,
          items: randomProducts
        });
      } else {
        setMockInvoice({
          number: '000.000.000',
          supplier: 'Nenhum Fornecedor Encontrado',
          date: new Date().toLocaleDateString('pt-BR'),
          total: 'R$ 0,00',
          items: []
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [suppliers, products]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.xml')) {
        processFile(file);
      } else {
        if (setCustomAlert) {
          setCustomAlert({ message: 'Por favor, selecione apenas arquivos XML.', type: 'warning' });
        }
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.xml')) {
        processFile(file);
      } else {
        if (setCustomAlert) {
          setCustomAlert({ message: 'Por favor, selecione apenas arquivos XML.', type: 'warning' });
        }
      }
    }
  };

  const processFile = (file: File) => {
    setIsUploading(true);
    if (setCustomAlert) {
      setCustomAlert({ message: `Arquivo "${file.name}" carregado com sucesso. Processando...`, type: 'success' });
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
          throw new Error('Erro de formatação XML');
        }

        // Get NF-e Number
        const nNFNode = xmlDoc.getElementsByTagName('nNF')[0];
        const number = nNFNode?.textContent ? nNFNode.textContent : '000.000.000';

        // Get Supplier
        const emitNode = xmlDoc.getElementsByTagName('emit')[0];
        const supplierNameNode = emitNode ? emitNode.getElementsByTagName('xNome')[0] : null;
        const supplier = supplierNameNode?.textContent ? supplierNameNode.textContent.trim() : 'Fornecedor Desconhecido';

        // Get Date
        const dhEmiNode = xmlDoc.getElementsByTagName('dhEmi')[0] || xmlDoc.getElementsByTagName('dEmi')[0];
        let dateStr = new Date().toLocaleDateString('pt-BR');
        if (dhEmiNode?.textContent) {
          try {
            const d = new Date(dhEmiNode.textContent);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('pt-BR');
            }
          } catch (e) {
            console.error(e);
          }
        }

        // Get Total
        const vNFNode = xmlDoc.getElementsByTagName('vNF')[0];
        const totalVal = vNFNode?.textContent ? parseFloat(vNFNode.textContent) : 0;
        const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal);

        // Get Items
        const detNodes = xmlDoc.getElementsByTagName('det');
        const itemsList: any[] = [];

        for (let i = 0; i < detNodes.length; i++) {
          const det = detNodes[i];
          const prodNode = det.getElementsByTagName('prod')[0];
          if (prodNode) {
            const cProd = prodNode.getElementsByTagName('cProd')[0]?.textContent || `item_${i + 1}`;
            const xProd = prodNode.getElementsByTagName('xProd')[0]?.textContent || 'Produto sem nome';
            const qCom = parseFloat(prodNode.getElementsByTagName('qCom')[0]?.textContent || '0');
            const uCom = prodNode.getElementsByTagName('uCom')[0]?.textContent || 'UN';
            const vUnCom = parseFloat(prodNode.getElementsByTagName('vUnCom')[0]?.textContent || '0');
            const vProd = parseFloat(prodNode.getElementsByTagName('vProd')[0]?.textContent || '0');

            // Find matching product in ERP system (same barcode/SKU or name)
            const matchedProduct = products.find(p => 
              p.name.toLowerCase() === xProd.toLowerCase() || 
              (p.sku && p.sku === cProd)
            );

            itemsList.push({
              id: cProd,
              name: xProd,
              qty: qCom,
              un: uCom,
              unitPrice: vUnCom,
              unit: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vUnCom),
              total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vProd),
              linked: !!matchedProduct,
              originalProduct: matchedProduct
            });
          }
        }

        // Get Duplicatas (Installments) from XML
        const dupNodes = xmlDoc.getElementsByTagName('dup');
        let extractedDueDate = '';
        let extractedInstallmentsCount = 1;
        if (dupNodes && dupNodes.length > 0) {
          extractedInstallmentsCount = dupNodes.length;
          const firstDup = dupNodes[0];
          const dVencNode = firstDup.getElementsByTagName('dVenc')[0];
          if (dVencNode?.textContent) {
            extractedDueDate = dVencNode.textContent.trim(); // YYYY-MM-DD
          }
        }

        setMockInvoice({
          number,
          supplier,
          date: dateStr,
          total: totalFormatted,
          rawTotal: totalVal,
          items: itemsList,
          extractedDueDate,
          extractedInstallmentsCount
        });

        setHasUploaded(true);
        setIsUploading(false);
        setStep(2);
      } catch (error) {
        console.error('Erro ao analisar o XML:', error);
        if (setCustomAlert) {
          setCustomAlert({ message: 'Erro ao processar o arquivo XML. Certifique-se de que é uma NF-e válida.', type: 'error' });
        }
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      if (setCustomAlert) {
        setCustomAlert({ message: 'Erro ao ler o arquivo XML.', type: 'error' });
      }
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const handleLinkProduct = (selectedProduct: any) => {
    if (!linkingItem || !mockInvoice) return;

    const updatedItems = mockInvoice.items.map((item: any) => {
      if (item.id === linkingItem.id) {
        return {
          ...item,
          linked: true,
          originalProduct: selectedProduct
        };
      }
      return item;
    });

    setMockInvoice({
      ...mockInvoice,
      items: updatedItems
    });

    if (setCustomAlert) {
      setCustomAlert({
        message: `Vínculo criado com sucesso para o produto: ${selectedProduct.name}`,
        type: 'success'
      });
    }

    setLinkingItem(null);
  };

  const handleRegisterAsNew = () => {
    if (!linkingItem || !mockInvoice) return;

    const unitPrice = parseFloat(linkingItem.unit.replace(/[^\d,]/g, '').replace(',', '.'));
    const newProduct = {
      id: `new_${Date.now()}`,
      name: linkingItem.name,
      sku: linkingItem.id,
      barcode: '',
      costPrice: unitPrice,
      salePrice: unitPrice * 1.4,
      wholesalePrice: unitPrice * 1.25,
      stock: linkingItem.qty,
      minStock: 2,
      category: 'Geral',
      ativo: true
    };

    const updatedItems = mockInvoice.items.map((item: any) => {
      if (item.id === linkingItem.id) {
        return {
          ...item,
          linked: true,
          originalProduct: newProduct
        };
      }
      return item;
    });

    setMockInvoice({
      ...mockInvoice,
      items: updatedItems
    });

    if (setCustomAlert) {
      setCustomAlert({
        message: `Novo produto "${linkingItem.name}" cadastrado e vinculado com sucesso!`,
        type: 'success'
      });
    }

    setLinkingItem(null);
  };

  const handleUpdateItem = (itemId: string, field: 'qty' | 'unitPrice', val: string | number) => {
    if (!mockInvoice) return;

    const oldItem = mockInvoice.items.find((item: any) => item.id === itemId);
    if (!oldItem) return;

    const oldQty = typeof oldItem.qty === 'number' ? oldItem.qty : parseFloat(String(oldItem.qty).replace(',', '.')) || 0;
    const oldUnitPrice = oldItem.unitPrice !== undefined 
      ? (typeof oldItem.unitPrice === 'number' ? oldItem.unitPrice : parseFloat(String(oldItem.unitPrice).replace(',', '.')) || 0)
      : (parseFloat((oldItem.unit || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0);
    const oldItemTotal = oldQty * oldUnitPrice;

    const updatedItems = mockInvoice.items.map((item: any) => {
      if (item.id === itemId) {
        const currentQty = field === 'qty' ? val : (item.qty !== undefined ? item.qty : 0);
        const currentUnitPrice = field === 'unitPrice' ? val : (item.unitPrice !== undefined ? item.unitPrice : parseFloat((item.unit || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0);
        
        const numQty = typeof currentQty === 'number' ? currentQty : parseFloat(String(currentQty).replace(',', '.')) || 0;
        const numUnitPrice = typeof currentUnitPrice === 'number' ? currentUnitPrice : parseFloat(String(currentUnitPrice).replace(',', '.')) || 0;
        const totalNum = numQty * numUnitPrice;

        return {
          ...item,
          qty: currentQty,
          unitPrice: currentUnitPrice,
          unit: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numUnitPrice),
          total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNum)
        };
      }
      return item;
    });

    const updatedItem = updatedItems.find((item: any) => item.id === itemId);
    const newQty = typeof updatedItem.qty === 'number' ? updatedItem.qty : parseFloat(String(updatedItem.qty).replace(',', '.')) || 0;
    const newUnitPrice = typeof updatedItem.unitPrice === 'number' ? updatedItem.unitPrice : parseFloat(String(updatedItem.unitPrice).replace(',', '.')) || 0;
    const newItemTotal = newQty * newUnitPrice;

    const difference = newItemTotal - oldItemTotal;
    const newRawTotal = (mockInvoice.rawTotal || 0) + difference;

    setMockInvoice({
      ...mockInvoice,
      items: updatedItems,
      rawTotal: newRawTotal,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newRawTotal)
    });
  };

  const handleTriggerConfirmEntrance = () => {
    if (!mockInvoice) return;
    
    if (mockInvoice.extractedDueDate) {
      setPayableDueDate(mockInvoice.extractedDueDate);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setPayableDueDate(defaultDate.toISOString().split('T')[0]);
    }
    
    setInstallmentsCount(mockInvoice.extractedInstallmentsCount || 1);
    setShowPayablePrompt(true);
  };

  const handleResolvePayable = async (shouldCreatePayable: boolean) => {
    setShowPayablePrompt(false);
    await handleConfirmEntrance(shouldCreatePayable);
  };

  const handleConfirmEntrance = async (shouldCreatePayable: boolean = false) => {
    if (!mockInvoice || isProcessing) return;
    setIsProcessing(true);

    try {
      // Opcionalmente cadastra como Contas a Pagar
      if (shouldCreatePayable) {
        const invoiceVal = mockInvoice.rawTotal || parseFloat(mockInvoice.total.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        
        if (installmentsCount > 1) {
          const installmentAmount = Number((invoiceVal / installmentsCount).toFixed(2));
          
          let year: number, month: number, day: number;
          if (payableDueDate) {
            const parts = payableDueDate.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else {
            const d = new Date();
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
          }
          
          for (let i = 1; i <= installmentsCount; i++) {
            const currentDueDate = new Date(year, month, day, 12, 0, 0);
            if (i > 1) {
              currentDueDate.setMonth(currentDueDate.getMonth() + (i - 1));
            }
            
            const yStr = currentDueDate.getFullYear();
            const mStr = String(currentDueDate.getMonth() + 1).padStart(2, '0');
            const dStr = String(currentDueDate.getDate()).padStart(2, '0');
            const dueDateIso = `${yStr}-${mStr}-${dStr}T12:00:00Z`;
            
            await addExpense({
              description: `Importação XML NF-e: ${mockInvoice.number} - ${mockInvoice.supplier} (Parcela ${i}/${installmentsCount})`,
              category: 'Compra de Mercadoria',
              amount: installmentAmount,
              supplier: mockInvoice.supplier,
              dueDate: dueDateIso,
              date: new Date().toISOString(),
              issueDate: new Date().toISOString(),
              status: 'Pendente',
              companyId: user?.companyId || ''
            });
          }
        } else {
          let dueDateIso = new Date().toISOString();
          if (payableDueDate) {
            const parts = payableDueDate.split('-');
            dueDateIso = `${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`;
          }
          
          await addExpense({
            description: `Importação XML NF-e: ${mockInvoice.number} - ${mockInvoice.supplier}`,
            category: 'Compra de Mercadoria',
            amount: invoiceVal,
            supplier: mockInvoice.supplier,
            dueDate: dueDateIso,
            date: new Date().toISOString(),
            issueDate: new Date().toISOString(),
            status: 'Pendente',
            companyId: user?.companyId || ''
          });
        }
      }

      // If 'checker' mode, we register a pending purchase order
      if (entranceMode === 'checker') {
        let finalSupplierId = null;
        if (suppliers && suppliers.length > 0) {
          const matched = suppliers.find(s => s.name.toLowerCase() === mockInvoice.supplier.toLowerCase());
          if (matched) {
            finalSupplierId = matched.id;
          } else {
            const { data: newS, error: newSErr } = await supabase.from('suppliers').insert({
              name: mockInvoice.supplier,
              cnpj: mockInvoice.cnpj || '',
              status: 'Ativo',
              company_id: user?.companyId || null
            }).select('id').single();
            if (!newSErr && newS) {
              finalSupplierId = newS.id;
            } else {
              finalSupplierId = suppliers[0]?.id || null;
            }
          }
        }

        if (!finalSupplierId && suppliers && suppliers.length > 0) {
          finalSupplierId = suppliers[0].id;
        }

        const totalAmount = mockInvoice.rawTotal || parseFloat(mockInvoice.total.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        const { data: orderData, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            company_id: user?.companyId || null,
            supplier_id: finalSupplierId,
            order_date: new Date().toISOString(),
            total_amount: totalAmount,
            status: 'Pendente'
          })
          .select('id')
          .single();

        if (orderError) throw orderError;
        const orderId = orderData.id;

        for (const item of mockInvoice.items) {
          let targetProduct = item.originalProduct;

          // If targetProduct has a temporary id (starts with 'new_'), we register it first!
          if (targetProduct && targetProduct.id && targetProduct.id.startsWith('new_')) {
            const realUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
            const cleanProductData: Partial<Product> = {
              id: realUuid,
              name: targetProduct.name,
              sku: targetProduct.sku || '',
              barcode: targetProduct.barcode || undefined,
              costPrice: targetProduct.costPrice,
              salePrice: targetProduct.salePrice,
              wholesalePrice: targetProduct.wholesalePrice,
              stock: 0,
              minStock: targetProduct.minStock,
              category: targetProduct.category,
              status: 'Ativo',
              active: true,
              company_id: user?.companyId || undefined
            };

            const addResult = await addProduct(cleanProductData);
            if (addResult === true) {
              targetProduct = { ...cleanProductData, id: realUuid };
            }
          }

          if (targetProduct && targetProduct.id) {
            const quantity = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty).replace(',', '.')) || 0;
            const costPrice = item.unitPrice !== undefined 
              ? (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice).replace(',', '.')) || 0)
              : (parseFloat(item.unit.replace(/[^\d,]/g, '').replace(',', '.')) || 0);

            await supabase.from('purchase_order_items').insert({
              company_id: user?.companyId || null,
              purchase_order_id: orderId,
              product_id: targetProduct.id,
              quantity: quantity,
              unit_price: costPrice,
              total_price: quantity * costPrice
            });
          }
        }
      } else {
        // Loop through all items in mockInvoice.items
        for (const item of mockInvoice.items) {
          let targetProduct = item.originalProduct;

          // If not linked, or no originalProduct, we can't update stock
          if (!item.linked || !targetProduct) {
            continue;
          }

          // If targetProduct has a temporary id (starts with 'new_'), we must register it first!
          if (targetProduct.id && targetProduct.id.startsWith('new_')) {
            // Generate a real UUID to persist
            const realUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
            const cleanProductData: Partial<Product> = {
              id: realUuid,
              name: targetProduct.name,
              sku: targetProduct.sku || '',
              barcode: targetProduct.barcode || undefined,
              costPrice: targetProduct.costPrice,
              salePrice: targetProduct.salePrice,
              wholesalePrice: targetProduct.wholesalePrice,
              stock: 0, // start with 0 stock, and let stock movement add to it
              minStock: targetProduct.minStock,
              category: targetProduct.category,
              status: 'Ativo',
              active: true,
              company_id: user?.companyId || undefined
            };

            const addResult = await addProduct(cleanProductData);
            if (addResult !== true) {
              console.error('Erro ao adicionar produto:', addResult);
            }
            
            // Update the targetProduct to use the newly created product details
            targetProduct = { ...cleanProductData, id: realUuid };
          }

          // Parse quantity and cost
          const quantity = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty).replace(',', '.')) || 0;
          const costPrice = item.unitPrice !== undefined 
            ? (typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice).replace(',', '.')) || 0)
            : (parseFloat(item.unit.replace(/[^\d,]/g, '').replace(',', '.')) || 0);

          // Add Stock Movement
          await addStockMovement({
            companyId: user?.companyId || '',
            productId: targetProduct.id,
            type: 'ENTRADA',
            quantity: quantity,
            origin: `Importação XML NF-e: ${mockInvoice.number} - Fornecedor: ${mockInvoice.supplier}`,
            cost: isNaN(costPrice) ? null : costPrice,
            userId: user?.id,
            userName: user?.name
          }, true); // skipFetch = true to handle batch efficiently
        }
      }

      // Sync local storage / PDV payload pending products
      if (fetchData) {
        await fetchData();
      }

      // Also set the pending products local storage flag to update PDV
      localStorage.setItem('erp_pdv_carga_pending_flag', 'true');

      if (setCustomAlert) {
        setCustomAlert({
          message: entranceMode === 'checker'
            ? 'Nota Fiscal lançada como Pendente para conferência física do conferente!'
            : (shouldCreatePayable 
              ? 'Entrada de estoque e conta a pagar registradas com sucesso!' 
              : 'Entrada de mercadorias via XML realizada com sucesso!'),
          type: 'success'
        });
      }

      setStep(3);
    } catch (err: any) {
      console.error('Erro ao confirmar entrada:', err);
      if (setCustomAlert) {
        setCustomAlert({
          message: 'Ocorreu um erro ao processar a entrada de estoque.',
          type: 'error'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSearchProducts = searchQuery.trim() === ''
    ? products.slice(0, 5)
    : products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
          <ArrowLeft size={14} />
          Voltar para Compras
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Importação de XML (NF-e)</h1>
        <p className="text-brand-blue/60 font-medium">Automatize a entrada de mercadorias e atualização de custos.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 max-w-2xl">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Conferência' },
          { num: 3, label: 'Finalização' }
        ].map((s) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-sm transition-all ${
                step >= s.num ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-brand-text-main/30'
              }`}>
                {s.num}
              </div>
              <span className={`text-xs font-black uppercase italic tracking-tight ${
                step >= s.num ? 'text-brand-text-main' : 'text-brand-text-main/30'
              }`}>{s.label}</span>
            </div>
            {s.num < 3 && <div className="flex-1 h-px bg-brand-border" />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl"
          >
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={handleButtonClick}
              className={`p-12 border-4 border-dashed rounded-[48px] bg-slate-50/30 flex flex-col items-center justify-center text-center space-y-6 transition-all cursor-pointer ${
                isDragActive ? 'border-brand-blue bg-blue-50/30' : 'border-brand-border hover:border-brand-blue'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xml" 
                className="hidden" 
              />
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center text-brand-blue">
                {isUploading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Upload size={48} />
                  </motion.div>
                ) : (
                  <Upload size={48} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Arraste seu arquivo XML</h3>
                <p className="text-brand-text-main/40 font-medium">Ou clique para selecionar no seu computador</p>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleButtonClick();
                }}
                disabled={isUploading}
                className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-brand-blue/20 hover:bg-brand-text-main transition-all active:scale-95 disabled:opacity-50"
              >
                {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
              </button>
              <div className="flex items-center gap-4 text-[10px] font-black text-brand-text-main/30 uppercase italic tracking-widest">
                <span>Formatos aceitos: .XML</span>
                <span>•</span>
                <span>Tamanho máx: 10MB</span>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Invoice Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: FileText, label: 'Número NF-e', value: mockInvoice?.number || '...' },
                { icon: Truck, label: 'Fornecedor', value: mockInvoice?.supplier || '...' },
                { icon: Calendar, label: 'Emissão', value: mockInvoice?.date || '...' },
                { icon: DollarSign, label: 'Valor Total', value: mockInvoice?.total || '...' },
              ].map((info) => (
                <div key={info.label} className="p-6 rounded-3xl bg-slate-50 border border-brand-border">
                  <div className="text-brand-blue mb-2"><info.icon size={20} /></div>
                  <div className="text-xs font-black text-brand-text-main/40 uppercase italic tracking-tight">{info.label}</div>
                  <div className="text-lg font-black text-brand-text-main italic">{info.value}</div>
                </div>
              ))}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50/30">
                <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Produtos na Nota</h3>
                <span className="text-xs font-black text-brand-blue uppercase italic bg-brand-border px-3 py-1 rounded-full">12 Itens Identificados</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Cód. Fornecedor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Qtd.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Un.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Vlr. Unit</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Vlr. Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Vínculo Sistema</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(mockInvoice?.items || []).map((prod: any) => (
                    <tr key={prod.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-brand-text-main">{prod.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-brand-text-main">{prod.name}</td>
                      <td className="px-6 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={prod.qty ?? ''}
                          onChange={(e) => handleUpdateItem(prod.id, 'qty', e.target.value)}
                          className="w-20 px-2 py-1.5 bg-slate-50 border border-brand-border rounded-xl font-bold text-sm text-brand-text-main outline-none focus:border-brand-blue focus:bg-white transition-all text-center"
                        />
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-brand-text-main/40">{prod.un}</td>
                      <td className="px-6 py-2">
                        <div className="flex items-center gap-1 bg-slate-50 border border-brand-border rounded-xl px-2 py-1.5 focus-within:border-brand-blue focus-within:bg-white transition-all w-28">
                          <span className="text-xs font-bold text-brand-text-main/40">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prod.unitPrice ?? ''}
                            onChange={(e) => handleUpdateItem(prod.id, 'unitPrice', e.target.value)}
                            className="w-full bg-transparent outline-none font-bold text-sm text-brand-text-main"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-brand-text-main italic">{prod.total}</td>
                      <td className="px-6 py-4">
                        {prod.linked ? (
                          <div className="flex items-center gap-2 text-brand-blue">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase italic">Vinculado</span>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => {
                              setLinkingItem(prod);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors"
                          >
                            <AlertCircle size={16} />
                            <span className="text-[10px] font-black uppercase italic underline">Vincular Agora</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-8 bg-brand-text-main rounded-[32px] text-white">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] font-black text-brand-text-sec uppercase italic tracking-widest">Total da Nota</div>
                  <div className="text-2xl font-black italic tracking-tight">{mockInvoice?.total || 'R$ 0,00'}</div>
                </div>
                <div className="w-px h-10 bg-brand-text-main" />
                <div>
                  <div className="text-[10px] font-black text-brand-text-sec uppercase italic tracking-widest">Itens Identificados</div>
                  <div className="text-2xl font-black italic tracking-tight">{mockInvoice?.items?.length || 0}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="px-8 py-4 bg-brand-text-main text-brand-border rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleTriggerConfirmEntrance}
                  disabled={isProcessing}
                  className="px-8 py-4 bg-brand-blue-hover text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-brand-blue-hover/20 hover:bg-brand-text-sec transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-8"
          >
            <div className="w-32 h-32 bg-brand-border text-brand-blue rounded-full flex items-center justify-center shadow-2xl shadow-brand-blue/20">
              <CheckCircle2 size={64} />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-brand-text-main uppercase italic tracking-tight">Entrada Concluída!</h2>
              <p className="text-brand-text-main/40 font-medium max-w-md mx-auto">
                A nota fiscal foi processada com sucesso. O estoque foi atualizado e o financeiro gerado.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
              <Link 
                href="/compras"
                className="px-8 py-4 bg-slate-50 text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-border transition-all"
              >
                Voltar para Compras
              </Link>
              <Link 
                href="/produtos"
                className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20"
              >
                Ver Estoque
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vínculo de Produto Modal */}
      <AnimatePresence>
        {linkingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[32px] w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-brand-border"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Vincular Produto ao Sistema</h3>
                  <p className="text-xs font-bold text-brand-text-main/40 mt-1 uppercase">
                    Código XML: <span className="text-brand-blue">{linkingItem.id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkingItem(null)}
                  className="p-2 text-brand-text-main/40 hover:text-brand-text-main hover:bg-brand-border rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* XML Item Details Card */}
                <div className="p-4 bg-brand-border/30 rounded-2xl border border-brand-border space-y-1">
                  <span className="text-[10px] font-black uppercase text-brand-blue italic tracking-widest">Produto no XML</span>
                  <h4 className="font-black text-brand-text-main text-sm">{linkingItem.name}</h4>
                  <div className="flex gap-4 text-xs font-bold text-brand-text-main/50 pt-1">
                    <span>Qtd: {linkingItem.qty} {linkingItem.un}</span>
                    <span>•</span>
                    <span>Valor Unit: {linkingItem.unit}</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-main/50 uppercase italic tracking-widest">Buscar no Sistema</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nome, SKU ou código de barras..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-brand-border rounded-2xl focus:border-brand-blue focus:bg-white outline-none font-bold text-brand-text-main text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-brand-text-main/50 uppercase italic tracking-widest">Resultados</span>
                    {searchQuery && (
                      <span className="text-[10px] font-black text-brand-blue uppercase bg-brand-border px-2 py-0.5 rounded-full">
                        {filteredSearchProducts.length} encontrados
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {filteredSearchProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleLinkProduct(p)}
                        className="p-4 bg-white hover:bg-slate-50 border-2 border-brand-border hover:border-brand-blue rounded-2xl cursor-pointer flex items-center justify-between transition-all group"
                      >
                        <div className="space-y-0.5">
                          <h5 className="font-black text-brand-text-main text-sm group-hover:text-brand-blue transition-colors">
                            {p.name}
                          </h5>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-brand-text-main/40 uppercase">
                            {p.sku && <span>SKU: {p.sku}</span>}
                            <span>•</span>
                            <span>Estoque: {p.stock}</span>
                            <span>•</span>
                            <span className="text-brand-blue">R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-4 py-2 bg-slate-100 group-hover:bg-brand-blue group-hover:text-white rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all"
                        >
                          Vincular
                        </button>
                      </div>
                    ))}

                    {filteredSearchProducts.length === 0 && (
                      <div className="p-8 text-center text-brand-text-main/40 font-medium text-sm">
                        Nenhum produto correspondente encontrado no sistema.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer / Fast Action */}
              <div className="p-6 border-t border-brand-border bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <button
                  type="button"
                  onClick={handleRegisterAsNew}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-text-main text-white hover:bg-slate-800 rounded-2xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus size={16} />
                  Cadastrar Novo Produto
                </button>
                <button
                  type="button"
                  onClick={() => setLinkingItem(null)}
                  className="w-full sm:w-auto px-6 py-3 border border-brand-border hover:bg-brand-border text-brand-text-main/60 hover:text-brand-text-main rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Contas a Pagar Modal */}
      <AnimatePresence>
        {showPayablePrompt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-brand-border"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Lançamento Financeiro</h3>
                  <p className="text-xs font-bold text-brand-text-main/40 mt-1 uppercase">
                    NF-e número: <span className="text-brand-blue">{mockInvoice?.number}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayablePrompt(false)}
                  className="p-2 text-brand-text-main/40 hover:text-brand-text-main hover:bg-brand-border rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-brand-border text-brand-blue rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <DollarSign size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-text-main/70">
                      Deseja que o valor de <span className="font-black text-brand-blue text-base">{mockInvoice?.total}</span> seja cadastrado como uma conta a pagar?
                    </p>
                    <p className="text-xs text-brand-text-main/40 uppercase font-black italic">
                      Fornecedor: {mockInvoice?.supplier}
                    </p>
                  </div>
                </div>

                {/* Workflow Selector */}
                <div className="space-y-3 bg-slate-50 p-4 border border-brand-border rounded-2xl">
                  <label className="text-xs font-black text-brand-text-main/50 uppercase italic tracking-widest block text-left">
                    Modo de Recebimento de Mercadoria
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEntranceMode('checker')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                        entranceMode === 'checker'
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-sm'
                          : 'border-brand-border bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Database size={18} />
                      <div className="text-[11px] font-black uppercase italic leading-tight">Módulo Conferente</div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-normal">Conferência física com bipe/validades</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntranceMode('express')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                        entranceMode === 'express'
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-sm'
                          : 'border-brand-border bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      <div className="text-[11px] font-black uppercase italic leading-tight">Entrada Expressa</div>
                      <span className="text-[8px] text-slate-400 font-bold block leading-normal">Estoque imediato e lotes automáticos</span>
                    </button>
                  </div>
                </div>

                {/* Installments & Due Date Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-50 border border-brand-border rounded-2xl">
                    <label className="text-xs font-black text-brand-text-main/50 uppercase italic tracking-widest flex items-center gap-1.5">
                      Parcelas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-white border-2 border-brand-border rounded-xl focus:border-brand-blue outline-none font-bold text-brand-text-main text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2 p-4 bg-slate-50 border border-brand-border rounded-2xl">
                    <label className="text-xs font-black text-brand-text-main/50 uppercase italic tracking-widest flex items-center gap-1.5">
                      <Calendar size={14} />
                      Vencimento (1ª)
                    </label>
                    <input
                      type="date"
                      value={payableDueDate}
                      onChange={(e) => setPayableDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-brand-border rounded-xl focus:border-brand-blue outline-none font-bold text-brand-text-main text-sm transition-all"
                    />
                  </div>
                </div>

                {installmentsCount > 1 && mockInvoice && (
                  <div className="text-xs font-black text-brand-text-main/50 uppercase text-center bg-slate-50 border border-brand-border/60 p-3 rounded-2xl">
                    Serão geradas <span className="text-brand-blue">{installmentsCount} parcelas</span> de <span className="text-brand-blue">
                      R$ {((mockInvoice.rawTotal || parseFloat(mockInvoice.total.replace(/[^\d,]/g, '').replace(',', '.')) || 0) / installmentsCount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-brand-border bg-slate-50/50 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleResolvePayable(true)}
                  className="w-full px-6 py-4 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-2xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <DollarSign size={16} />
                  Sim, Cadastrar Conta a Pagar
                </button>
                <button
                  type="button"
                  onClick={() => handleResolvePayable(false)}
                  className="w-full px-6 py-3 border border-brand-border hover:bg-brand-border text-brand-text-main/70 hover:text-brand-text-main rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all"
                >
                  Não, Apenas Dar Entrada no Estoque
                </button>
                <button
                  type="button"
                  onClick={() => setShowPayablePrompt(false)}
                  className="w-full text-center text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 hover:text-brand-text-main/60 transition-colors pt-2"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
