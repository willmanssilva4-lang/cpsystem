'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Search, Package, AlertCircle, CheckCircle2, Save, Trash2, ClipboardList, ChevronRight, Tag, ListChecks, Plus, Camera, CameraOff, Check } from 'lucide-react';
import { Product } from '@/lib/types';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Html5Qrcode } from 'html5-qrcode';

interface InventorySessionModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type InventoryStep = 'setup' | 'counting' | 'summary';
type InventoryType = 'Geral' | 'Rotativo' | 'Departamento';

export function InventorySessionModal({ onClose, onComplete }: InventorySessionModalProps) {
  const { products, addInventory, addStockMovement, updateProduct, user, subcategorias, categorias, fetchData, hasPermission, departamentos } = useERP();
  const [step, setStep] = useState<InventoryStep>('setup');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, number | ''>>({});
  const [expirations, setExpirations] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const stepRef = useRef<InventoryStep>(step);
  const sessionProductsRef = useRef<Product[]>([]);

  const [sessionProducts, setSessionProducts] = useState<Product[]>([]);
  const [selectedRotativoProducts, setSelectedRotativoProducts] = useState<Product[]>([]);
  const [rotativoSearch, setRotativoSearch] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [isQuickMode, setIsQuickMode] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    location: 'Loja Principal',
    type: 'Geral' as InventoryType,
    departmentId: '',
    responsible: user?.name || 'Sistema'
  });

  useEffect(() => {
    stepRef.current = step;
    if (step === 'counting') {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select?.();
      }, 150);
    }
  }, [step]);

  const handleSearchSubmit = (queryText: string): boolean => {
    const query = queryText.trim().toLowerCase();
    if (!query) return false;

    // 1. Look in current session products
    let match = sessionProductsRef.current.find(p => 
      (p.barcode && p.barcode.toLowerCase() === query) ||
      (p.sku && p.sku.toLowerCase() === query) ||
      (p.name.toLowerCase() === query)
    );

    // 2. If not found in current session products, lookup globally to add dynamically (Rotative style!)
    if (!match) {
      const globalMatch = products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === query) ||
        (p.sku && p.sku.toLowerCase() === query) ||
        (p.name.toLowerCase() === query)
      );
      if (globalMatch) {
        match = globalMatch;
        // Dynamically add to session products
        setSessionProducts(prev => {
          if (!prev.some(p => p.id === globalMatch.id)) {
            const updated = [...prev, globalMatch];
            updated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
            return updated;
          }
          return prev;
        });
        // Set initial state
        setCounts(prev => {
          if (prev[globalMatch.id] === undefined) {
            return { ...prev, [globalMatch.id]: globalMatch.stock };
          }
          return prev;
        });
        setExpirations(prev => {
          if (prev[globalMatch.id] === undefined) {
            return { ...prev, [globalMatch.id]: globalMatch.validade || '' };
          }
          return prev;
        });
      }
    }

    if (match) {
      setSearch('');
      const targetId = match.id;
      setTimeout(() => {
        const input = document.getElementById('count-' + targetId) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select?.();
        }
      }, 100);
      return true;
    }

    // 3. Fallback: partial match in session products if only one fits
    const filtered = sessionProductsRef.current.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.sku.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );

    if (filtered.length === 1) {
      const singleMatch = filtered[0];
      setSearch('');
      setTimeout(() => {
        const input = document.getElementById('count-' + singleMatch.id) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select?.();
        }
      }, 50);
      return true;
    }

    // 4. Fallback: partial match in global products if only one fits
    const globalFiltered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.sku.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );

    if (globalFiltered.length === 1) {
      const singleMatch = globalFiltered[0];
      // Dynamically add to session products
      setSessionProducts(prev => {
        if (!prev.some(p => p.id === singleMatch.id)) {
          const updated = [...prev, singleMatch];
          updated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
          return updated;
        }
        return prev;
      });
      // Set initial state
      setCounts(prev => {
        if (prev[singleMatch.id] === undefined) {
          return { ...prev, [singleMatch.id]: singleMatch.stock };
        }
        return prev;
      });
      setExpirations(prev => {
        if (prev[singleMatch.id] === undefined) {
          return { ...prev, [singleMatch.id]: singleMatch.validade || '' };
        }
        return prev;
      });

      setSearch('');
      setTimeout(() => {
        const input = document.getElementById('count-' + singleMatch.id) as HTMLInputElement;
        if (input) {
          input.focus();
          input.select?.();
        }
      }, 100);
      return true;
    }

    return false;
  };

  useEffect(() => {
    sessionProductsRef.current = sessionProducts;
  }, [sessionProducts]);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const rotativoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scanning) {
      setScannerError(null);
      const qrCode = new Html5Qrcode("reader");
      html5QrCode.current = qrCode;

      // Try environment first without 'exact' to avoid OverconstrainedError on devices with only one camera
      qrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          console.log("DEBUG: Scanned:", decodedText, "Current Step:", stepRef.current, "Products count:", sessionProductsRef.current.length);
          setSearch(decodedText);
          if (stepRef.current === 'counting') {
             handleSearchSubmit(decodedText);
          }
        },
        (err) => {
          // Suppress frequent scanning errors
        }
      ).catch((err) => {
        console.error("Scanner start error:", err);
        
        // If it fails, try 'user' facing camera
        qrCode.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            console.log("DEBUG: Scanned (user):", decodedText, "Current Step:", stepRef.current, "Products count:", sessionProductsRef.current.length);
            setSearch(decodedText);
            if (stepRef.current === 'counting') {
               handleSearchSubmit(decodedText);
            }
          },
          (err) => {
            console.warn(err);
          }
        ).catch((err2) => {
            console.error("Scanner fallback error:", err2);
            setScanning(false); // Stop trying if both fail
            if (err2.name === 'NotAllowedError' || (err2.toString().includes('NotAllowedError'))) {
                setScannerError('Permissão da câmera negada. Clique no ícone de cadeado ou câmera na barra de endereços do navegador para permitir o acesso.');
            } else {
                setScannerError('Erro ao acessar a câmera. Tente novamente.');
            }
        });
      });
    } else if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().then(() => {
            html5QrCode.current = null;
        }).catch(console.error);
    }
    
    return () => {
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(console.error);
        html5QrCode.current = null;
      }
    };
  }, [scanning]);

  const handleCloseRequest = () => {
    if (step === 'counting' || step === 'summary' || (step === 'setup' && selectedRotativoProducts.length > 0)) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (config.type === 'Rotativo') {
      setTimeout(() => {
        rotativoInputRef.current?.focus();
      }, 150);
    }
  }, [config.type]);

  const handleStartSession = () => {
    let filtered = [...products];
    if (config.type === 'Departamento' && config.departmentId) {
      const catsInDept = categorias.filter(c => c.departamento_id === config.departmentId);
      const catIds = catsInDept.map(c => c.id);
      const subIds = subcategorias.filter(s => catIds.includes(s.categoria_id)).map(s => s.id);
      filtered = filtered.filter(p => p.subcategoria_id && subIds.includes(p.subcategoria_id));
    } else if (config.type === 'Rotativo') {
      filtered = [...selectedRotativoProducts];
    }

    // Ordenar os produtos em ordem alfabética (A-Z) para as contagens e relatórios
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

    setSessionProducts(filtered);
    
    const initialCounts: Record<string, number | ''> = {};
    const initialExpirations: Record<string, string> = {};
    filtered.forEach(p => {
      initialCounts[p.id] = p.stock;
      initialExpirations[p.id] = p.validade || '';
    });
    setCounts(initialCounts);
    setExpirations(initialExpirations);
    setStep('counting');
  };

  const [showOnlyDivergences, setShowOnlyDivergences] = useState(false);

  const filteredProducts = sessionProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (showOnlyDivergences) {
      const physical = (counts[p.id] === undefined || counts[p.id] === '') ? p.stock : Number(counts[p.id]);
      return physical !== p.stock;
    }
    
    return true;
  });

  const handleCountChange = (productId: string, value: string) => {
    if (!hasPermission('Gestão de Produtos', 'edit')) {
      alert('Você não tem permissão para editar inventário.');
      return;
    }
    if (value === '') {
      setCounts(prev => ({ ...prev, [productId]: '' }));
      return;
    }
    const numValue = parseInt(value);
    setCounts(prev => ({ ...prev, [productId]: isNaN(numValue) ? '' : numValue }));
  };

  const handleExpirationChange = (productId: string, value: string) => {
    if (!hasPermission('Gestão de Produtos', 'edit')) {
      alert('Você não tem permissão para editar inventário.');
      return;
    }
    setExpirations(prev => ({ ...prev, [productId]: value }));
  };

  const calculateTotals = () => {
    let totalDivergenceValue = 0;
    let itemsCounted = 0;
    let itemsWithDivergence = 0;

    sessionProducts.forEach(p => {
      const physical = (counts[p.id] === undefined || counts[p.id] === '') ? p.stock : Number(counts[p.id]);
      if (physical !== p.stock) {
        const diff = physical - p.stock;
        const cost = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : 0;
        totalDivergenceValue += diff * cost;
        itemsWithDivergence++;
      }
      itemsCounted++;
    });

    return { 
      totalDivergenceValue: isNaN(totalDivergenceValue) ? 0 : totalDivergenceValue, 
      itemsCounted, 
      itemsWithDivergence 
    };
  };

  const handleFinalize = async () => {
    if (!hasPermission('Gestão de Produtos', 'create')) {
      alert('Você não tem permissão para realizar inventário.');
      return;
    }
    setIsSaving(true);
    try {
      const { totalDivergenceValue, itemsCounted } = calculateTotals();

      // 1. Create Inventory Record
      await addInventory({
        date: new Date().toISOString(),
        location: config.location,
        itemsCounted,
        divergenceValue: totalDivergenceValue,
        status: 'Concluído',
        type: config.type,
        responsible: config.responsible,
        notes: `Inventário ${config.type} finalizado.`
      }, true); // skipFetch = true

      // 2. Create Stock Movements for divergences and update validades
      for (const p of sessionProducts) {
        const physical = (counts[p.id] === undefined || counts[p.id] === '') ? p.stock : Number(counts[p.id]);
        const currentValidade = expirations[p.id] || '';
        
        const stockChanged = physical !== p.stock;
        const validadeChanged = currentValidade !== (p.validade || '');

        if (stockChanged || validadeChanged) {
          if (validadeChanged) {
            await updateProduct({
              ...p,
              validade: currentValidade || undefined
            });
          }

          if (stockChanged) {
            const diff = physical - p.stock;
            await addStockMovement({
              companyId: user?.companyId || '',
              productId: p.id,
              type: 'AJUSTE',
              quantity: diff,
              origin: `Ajuste de Inventário ${config.type}`,
              date: new Date().toISOString(),
              userId: user?.email || 'system',
              userName: user?.name || 'Sistema'
            }, true); // skipFetch = true
          }
        }
      }

      await fetchData();
      onComplete();
    } catch (error) {
      console.error('Error finalizing inventory:', error);
      alert('Erro ao finalizar inventário. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const { totalDivergenceValue, itemsCounted, itemsWithDivergence } = calculateTotals();

  const handleKeyDownMove = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement) {
        if (isQuickMode && step === 'counting') {
          if (activeEl.id.startsWith('count-') || activeEl.id.startsWith('exp-')) {
            e.preventDefault();
            setSearch('');
            setTimeout(() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.select?.();
            }, 50);
            return;
          }
        }

        const container = e.currentTarget;
        const inputs = Array.from(
          container.querySelectorAll('input:not([type="hidden"]):not([disabled])')
        ) as HTMLInputElement[];
        
        const currentIndex = inputs.indexOf(activeEl);
        if (currentIndex !== -1) {
          e.preventDefault();
          const nextInput = inputs[currentIndex + 1];
          if (nextInput) {
            nextInput.focus();
            nextInput.select?.();
          } else {
            activeEl.blur();
          }
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        onKeyDown={handleKeyDownMove}
        className="bg-white w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-slate-200"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">
                {step === 'setup' ? 'Configurar Inventário' : 'Sessão de Inventário'}
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                {step === 'setup' ? 'Defina os parâmetros da contagem' : config.type}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCloseRequest}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'setup' && (
          <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center bg-slate-50/30">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Tag size={12} /> Tipo de Inventário
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Geral', 'Rotativo', 'Departamento'] as InventoryType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setConfig(prev => ({ ...prev, type: t }))}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          config.type === t 
                            ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                            : "bg-white border-slate-200 text-slate-400 hover:border-brand-blue hover:text-brand-blue"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {config.type === 'Departamento' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Departamento</label>
                    <select 
                      value={config.departmentId}
                      onChange={(e) => setConfig(prev => ({ ...prev, departmentId: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                    >
                      <option value="">Todos os Departamentos</option>
                      {departamentos.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {config.type === 'Rotativo' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        <span className="text-brand-blue font-black">Inventário Rotativo:</span> Você pode clicar diretamente em <strong>Iniciar Contagem</strong> e adicionar os produtos um a um à medida que bipar/pesquisar por eles.
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        (Opcional): Se preferir, pesquise ou bipe abaixo para montar uma lista prévia antes de iniciar.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        Adicionar Produtos Prévios (Opcional)
                        <span className="text-[9px] lowercase font-semibold text-brand-blue">(bipar código ou pesquisar)</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          ref={rotativoInputRef}
                          type="text"
                          placeholder="Bipe o código ou busque por nome/SKU..."
                          value={rotativoSearch}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRotativoSearch(val);
                            const query = val.trim().toLowerCase();
                            if (query.length >= 6) {
                              const match = products.find(p => 
                                (p.barcode && p.barcode.toLowerCase() === query) ||
                                (p.sku && p.sku.toLowerCase() === query)
                              );
                              if (match) {
                                setSelectedRotativoProducts(prev => {
                                  if (!prev.some(sp => sp.id === match.id)) {
                                    return [...prev, match];
                                  }
                                  return prev;
                                });
                                setRotativoSearch('');
                                setTimeout(() => {
                                  rotativoInputRef.current?.focus();
                                }, 30);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const query = rotativoSearch.trim().toLowerCase();
                              if (!query) return;

                              // 1. Try exact barcode or SKU match
                              const exactMatch = products.find(p => 
                                (p.barcode && p.barcode.toLowerCase() === query) ||
                                (p.sku && p.sku.toLowerCase() === query)
                              );
                              if (exactMatch) {
                                setSelectedRotativoProducts(prev => {
                                  if (!prev.some(sp => sp.id === exactMatch.id)) {
                                    return [...prev, exactMatch];
                                  }
                                  return prev;
                                });
                                setRotativoSearch('');
                                setTimeout(() => {
                                  rotativoInputRef.current?.focus();
                                }, 30);
                                return;
                              }

                              // 2. Try exact name match
                              const nameMatch = products.find(p => p.name.toLowerCase() === query);
                              if (nameMatch) {
                                setSelectedRotativoProducts(prev => {
                                  if (!prev.some(sp => sp.id === nameMatch.id)) {
                                    return [...prev, nameMatch];
                                  }
                                  return prev;
                                });
                                setRotativoSearch('');
                                setTimeout(() => {
                                  rotativoInputRef.current?.focus();
                                }, 30);
                                return;
                              }

                              // 3. Match the first filtered item
                              const filtered = products
                                .filter(p => !selectedRotativoProducts.find(sp => sp.id === p.id))
                                .filter(p => 
                                  p.name.toLowerCase().includes(query) || 
                                  p.sku.toLowerCase().includes(query) ||
                                  (p.barcode && p.barcode.toLowerCase().includes(query))
                                );
                              if (filtered.length > 0) {
                                setSelectedRotativoProducts(prev => {
                                  if (!prev.some(sp => sp.id === filtered[0].id)) {
                                    return [...prev, filtered[0]];
                                  }
                                  return prev;
                                });
                                setRotativoSearch('');
                                setTimeout(() => {
                                  rotativoInputRef.current?.focus();
                                }, 30);
                              }
                            }
                          }}
                          className="w-full pl-12 pr-16 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScannerError(null);
                            setScanning(!scanning);
                          }}
                          className={cn(
                            "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl border transition-all",
                            scanning ? "bg-rose-50 text-rose-500 border-rose-200" : "bg-slate-50 text-slate-400 border-slate-200 hover:text-brand-blue"
                          )}
                        >
                          {scanning ? <CameraOff size={18} /> : <Camera size={18} />}
                        </button>
                        {rotativoSearch && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 max-h-48 overflow-y-auto">
                            {products
                              .filter(p => !selectedRotativoProducts.find(sp => sp.id === p.id))
                              .filter(p => 
                                p.name.toLowerCase().includes(rotativoSearch.toLowerCase()) || 
                                p.sku.toLowerCase().includes(rotativoSearch.toLowerCase()) ||
                                (p.barcode && p.barcode.toLowerCase().includes(rotativoSearch.toLowerCase()))
                              )
                              .slice(0, 10)
                              .map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRotativoProducts(prev => [...prev, p]);
                                    setRotativoSearch('');
                                    setTimeout(() => {
                                      rotativoInputRef.current?.focus();
                                    }, 30);
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                                >
                                  <div>
                                    <div className="text-sm font-bold text-slate-700">{p.name}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex gap-2">
                                      <span>SKU: {p.sku}</span>
                                      {p.barcode && <span>• EAN: {p.barcode}</span>}
                                    </div>
                                  </div>
                                  <div className="text-brand-blue">
                                    <Plus size={16} />
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      <div id="reader" className={cn("w-full max-w-sm mx-auto my-4", scanning ? "block" : "hidden")}></div>
                      {scannerError && (
                        <div className="w-full max-w-sm mx-auto my-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-bold text-center">
                          {scannerError}
                        </div>
                      )}
                    </div>
                    
                    {selectedRotativoProducts.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-2 max-h-40 overflow-y-auto space-y-1">
                        {selectedRotativoProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                            <div className="truncate pr-4">
                              <div className="text-xs font-bold text-slate-700 truncate">{p.name}</div>
                              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex gap-2">
                                <span>SKU: {p.sku}</span>
                                {p.barcode && <span>• EAN: {p.barcode}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedRotativoProducts(prev => prev.filter(sp => sp.id !== p.id))}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                  <input 
                    type="text"
                    value={config.responsible}
                    onChange={(e) => setConfig(prev => ({ ...prev, responsible: e.target.value }))}
                    className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                    placeholder="Nome do responsável..."
                  />
                </div>
              </div>

              <button 
                onClick={() => handleStartSession()}
                className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white py-5 rounded-[24px] font-black uppercase italic tracking-widest shadow-xl shadow-brand-blue/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Iniciar Contagem
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 'counting' && (
          <>
            {/* Search and Stats */}
            <div className="p-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-6">
              <div className="flex-1 max-w-[700px] flex items-center gap-2 sm:gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    ref={searchInputRef}
                    id="inventory-search-input"
                    type="text"
                    placeholder={isQuickMode ? "Bipe o código ou busque para focar..." : "Buscar produto por nome ou SKU..."}
                    value={search}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearch(val);
                      if (isQuickMode && val.trim().length >= 4) {
                        handleSearchSubmit(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (isQuickMode) {
                          handleSearchSubmit(search);
                        }
                      }
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScannerError(null);
                    setScanning(!scanning);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer",
                    scanning ? "bg-rose-50 text-rose-500 border-rose-200" : "bg-white text-slate-400 border-slate-200 hover:text-brand-blue"
                  )}
                >
                  {scanning ? <CameraOff size={20} /> : <Camera size={20} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyDivergences(!showOnlyDivergences)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border cursor-pointer",
                    showOnlyDivergences 
                      ? "bg-rose-50 text-rose-600 border-rose-200" 
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {showOnlyDivergences ? 'Mostrar Todos' : 'Só Divergências'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickMode(!isQuickMode);
                    setTimeout(() => {
                      searchInputRef.current?.focus();
                      searchInputRef.current?.select?.();
                    }, 50);
                  }}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 cursor-pointer",
                    isQuickMode 
                      ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20" 
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", isQuickMode ? "bg-brand-blue animate-pulse" : "bg-slate-300")} />
                  Modo Rápido: {isQuickMode ? 'ON' : 'OFF'}
                </button>
              </div>

              <div id="reader" className={cn("w-full max-w-sm mx-auto", scanning ? "block" : "hidden")}></div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Divergência Total</p>
                  <p className={cn(
                    "text-lg font-black leading-none",
                    totalDivergenceValue < 0 ? "text-rose-500" : "text-emerald-500"
                  )}>
                    R$ {totalDivergenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button 
                  onClick={() => setStep('summary')}
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white px-8 py-3 rounded-2xl font-black uppercase italic text-sm tracking-widest transition-all shadow-lg shadow-brand-blue/20 active:scale-95 flex items-center gap-2"
                >
                  Revisar e Finalizar
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="grid grid-cols-1 gap-4">
                {filteredProducts.map(product => {
                  const physical = (counts[product.id] === undefined || counts[product.id] === '') ? product.stock : Number(counts[product.id]);
                  const diff = physical - product.stock;
                  
                  return (
                    <div key={product.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-4 md:gap-6">
                      <div className="w-full flex items-center gap-4 md:w-auto">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 relative">
                        <Image 
                          src={product.image || 'https://picsum.photos/seed/placeholder/100'} 
                          alt={product.name} 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-700 uppercase italic truncate">{product.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKU: {product.sku}</p>
                      </div>
                      </div>

                      <div className="w-full grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center md:gap-12 gap-4">
                        <div className="text-center bg-slate-50/50 p-2 rounded-2xl md:bg-transparent md:p-0 col-span-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sistema</p>
                          <p className="text-sm font-black text-slate-600">{product.stock} {product.unit || 'un'}</p>
                        </div>

                        <div className="col-span-1 bg-slate-50/50 p-2 rounded-2xl md:bg-transparent md:p-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Validade</p>
                          <input 
                            type="date"
                            id={`exp-${product.id}`}
                            value={expirations[product.id] || ''}
                            onChange={(e) => handleExpirationChange(product.id, e.target.value)}
                            className="w-full bg-white md:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center text-xs font-bold text-slate-700 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/5 outline-none transition-all"
                          />
                        </div>

                        <div className="col-span-1 bg-slate-50/50 p-2 rounded-2xl md:bg-transparent md:p-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Contagem</p>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              inputMode="numeric"
                              id={`count-${product.id}`}
                              value={counts[product.id] ?? ''}
                              placeholder={String(product.stock)}
                              onChange={(e) => handleCountChange(product.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setSearch('');
                                  setTimeout(() => {
                                    searchInputRef.current?.focus();
                                    searchInputRef.current?.select?.();
                                  }, 50);
                                }
                              }}
                              className="flex-1 w-full bg-white md:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center font-black text-slate-900 placeholder-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/5 outline-none transition-all text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {isQuickMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch('');
                                  setTimeout(() => {
                                    searchInputRef.current?.focus();
                                    searchInputRef.current?.select?.();
                                  }, 50);
                                }}
                                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
                                title="Confirmar e voltar para a busca"
                              >
                                <Check size={18} className="stroke-[3]" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="col-span-1 text-center bg-slate-50/50 p-2 rounded-2xl md:bg-transparent md:p-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diferença</p>
                          <p className={cn(
                            "text-sm font-black",
                            diff === 0 ? "text-slate-400" : diff < 0 ? "text-rose-500" : "text-emerald-500"
                          )}>
                            {diff > 0 ? '+' : ''}{diff}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <Package size={48} className="opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {step === 'summary' && (
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-8">
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <ListChecks size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Resumo do Inventário</h3>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Confira os dados antes de finalizar</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Itens Contados</p>
                    <p className="text-xl font-black text-slate-700 leading-none">{itemsCounted}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Com Divergência</p>
                    <p className="text-xl font-black text-rose-500 leading-none">{itemsWithDivergence}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Divergência Financeira Total</p>
                    <p className={cn(
                      "text-2xl font-black leading-none",
                      totalDivergenceValue < 0 ? "text-rose-500" : "text-emerald-500"
                    )}>
                      R$ {totalDivergenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                      Ao finalizar, o sistema gerará automaticamente os ajustes de estoque para igualar o saldo do sistema à contagem física.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('counting')}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black uppercase italic tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Voltar à Contagem
                  </button>
                  {itemsWithDivergence > 0 && (
                    <button 
                      onClick={() => {
                        setShowOnlyDivergences(true);
                        setStep('counting');
                      }}
                      className="flex-1 py-4 rounded-2xl border border-rose-200 text-rose-500 font-black uppercase italic tracking-widest hover:bg-rose-50 transition-all"
                    >
                      Recontar Divergências
                    </button>
                  )}
                  <button 
                    onClick={handleFinalize}
                    disabled={isSaving}
                    className="flex-[2] bg-brand-green hover:bg-brand-green-hover text-white py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-brand-green/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Finalizando...' : (
                      <>
                        <CheckCircle2 size={20} />
                        Finalizar e Ajustar Estoque
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCloseConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-rose-600 uppercase italic tracking-tight">Sair do Inventário?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                As contagens informadas e o progresso atual do inventário serão perdidos. Tem certeza de que deseja sair?
              </p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowCloseConfirmation(false);
                  onClose();
                }}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl font-black uppercase italic text-sm transition-all active:scale-95"
              >
                Sim, Cancelar e Sair
              </button>
              <button 
                onClick={() => setShowCloseConfirmation(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 py-3.5 rounded-2xl font-black uppercase italic text-sm transition-all active:scale-95"
              >
                Voltar à Contagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
