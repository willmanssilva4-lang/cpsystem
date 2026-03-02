'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Plus, Image as ImageIcon, HelpCircle, Upload, Trash2, Search } from 'lucide-react';
import { Product, CompositionItem } from '@/lib/types';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: Product;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=200&h=200&auto=format&fit=crop';

export function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
  const { products } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCompositionModal, setShowCompositionModal] = useState(false);
  const [kitTab, setKitTab] = useState<'info' | 'products' | 'financial'>('info');
  const [pricingMethod, setPricingMethod] = useState<'margin' | 'markup'>('markup');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    sku: initialData?.sku || '',
    name: initialData?.name || '',
    supplier: initialData?.supplier || '',
    unit: initialData?.unit || 'UN',
    costPrice: initialData?.costPrice || 0,
    salePrice: initialData?.salePrice || 0,
    termPrice: initialData?.salePrice || 0,
    wholesalePrice: initialData?.salePrice || 0,
    stock: initialData?.stock || 0,
    minStock: initialData?.minStock || 1,
    controlStock: 'SIM',
    group: initialData?.group || 'PADRAO',
    brand: initialData?.brand || 'PADRAO',
    composition: initialData?.composition || [] as CompositionItem[],
    subgroup: initialData?.subgroup || 'PADRAO',
    size: 'PADRAO',
    category: initialData?.category || 'PADRAO',
    profit: initialData?.profit || 0,
    profitPercentage: initialData?.profitPercentage || 0,
    image: initialData?.image || DEFAULT_IMAGE,
    barcode: '',
    status: 'Ativo',
    store: 'Loja Principal'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSKU = () => {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const barcode = `789${randomSuffix}`;
    setFormData(prev => ({ ...prev, sku: barcode }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        generateSKU();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('A imagem deve ter no máximo 500KB. Por favor, escolha uma imagem menor.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl border border-emerald-100 overflow-hidden flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-emerald-600 px-8 py-6 flex justify-center items-center relative">
          <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">Cadastro de Produtos</h2>
          <button 
            onClick={onClose} 
            className="absolute right-6 bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 text-emerald-950">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left Side - Form Fields */}
            <div className="flex-1 space-y-6">
              {/* Row 1: Code and Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Codigo:</label>
                  <div className="flex gap-2">
                    <input 
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                    />
                    <button 
                      type="button" 
                      onClick={generateSKU}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase italic transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      Gerar - F1
                    </button>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Descricao</label>
                  <input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Row 2: Supplier and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Fornecedor</label>
                  <select 
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none transition-all"
                  >
                    <option value="">Selecione um fornecedor</option>
                    <option value="PADRAO">PADRAO</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Unidade:</label>
                  <div className="flex gap-2 items-center">
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                    </select>
                    <HelpCircle size={24} className="text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Row 3: Prices */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Preco de Compra:</label>
                  <input 
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Preco de Venda:</label>
                  <input 
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Preco Aprazo:</label>
                  <input 
                    type="number"
                    name="termPrice"
                    value={formData.termPrice}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Preco Atacado</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      name="wholesalePrice"
                      value={formData.wholesalePrice}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                    />
                    <button type="button" className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-lg uppercase italic transition-all hover:bg-emerald-200">
                      Mais Preços
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Stock and Group */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Estoque Atual:</label>
                  <input 
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Est. Minimo:</label>
                  <input 
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Controlar Estoque</label>
                  <select 
                    name="controlStock"
                    value={formData.controlStock}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  >
                    <option value="SIM">SIM</option>
                    <option value="NÃO">NÃO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Grupo</label>
                  <div className="flex gap-2">
                    <select 
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 5: Brand and Composition */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Marca:</label>
                  <div className="flex gap-2">
                    <select 
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Composição / Ingredientes:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      readOnly
                      value={formData.composition.length > 0 ? `${formData.composition.length} Itens no Kit` : 'Nenhum'}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 outline-none transition-all cursor-default"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCompositionModal(true)}
                      className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 6: Subgroup and Size */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Subgrupo</label>
                  <div className="flex gap-2">
                    <select 
                      name="subgroup"
                      value={formData.subgroup}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Tamanho:</label>
                  <input 
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Row 7: Category */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Categoria:</label>
                  <div className="flex gap-2">
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    >
                      <option value="PADRAO">PADRAO</option>
                      <option value="Eletrônicos">Eletrônicos</option>
                      <option value="Periféricos">Periféricos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 8: Profit */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Lucro:</label>
                  <input 
                    type="number"
                    name="profit"
                    value={formData.profit}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Lucro (%):</label>
                  <input 
                    type="number"
                    name="profitPercentage"
                    value={formData.profitPercentage}
                    onChange={handleChange}
                    className="w-full bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-black text-center text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Image Preview */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
              <div 
                onClick={triggerFileUpload}
                className="aspect-square bg-emerald-50 rounded-[32px] flex items-center justify-center overflow-hidden relative border-4 border-emerald-100 shadow-inner cursor-pointer group"
              >
                <Image 
                  src={formData.image} 
                  alt="Preview" 
                  fill
                  className="object-contain p-4 group-hover:scale-110 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="text-white" size={48} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-[10px] font-black uppercase italic text-emerald-900/80 tracking-widest">Imagem do Produto:</label>
                <div className="flex gap-2">
                  <input 
                    name="image"
                    value={formData.image.startsWith('data:') ? 'Imagem Carregada' : formData.image}
                    onChange={handleChange}
                    readOnly={formData.image.startsWith('data:')}
                    className="flex-1 bg-emerald-50 border border-emerald-300 px-4 py-2 rounded-xl text-[10px] font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" 
                    placeholder="https://..."
                  />
                  <button 
                    type="button"
                    onClick={triggerFileUpload}
                    className="bg-emerald-100 text-emerald-600 p-2 rounded-xl hover:bg-emerald-200 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                {formData.image.startsWith('data:') && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: DEFAULT_IMAGE }))}
                    className="text-[8px] font-black uppercase italic text-rose-500 text-right"
                  >
                    Remover Upload
                  </button>
                )}
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Gravar Dados
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-100 font-black py-3 rounded-2xl uppercase italic text-[10px] tracking-widest transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Composition Modal (Cadastro de Kit) */}
        {showCompositionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[90vh]">
              {/* Header */}
              <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Cadastro de Kit</h3>
                <button 
                  type="button"
                  onClick={() => setShowCompositionModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-emerald-100 px-6 pt-4 gap-4">
                <button
                  type="button"
                  onClick={() => setKitTab('info')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'info' ? "border-emerald-500 text-emerald-600" : "border-transparent text-emerald-900/40 hover:text-emerald-900/60"
                  )}
                >
                  Informações
                </button>
                <button
                  type="button"
                  onClick={() => setKitTab('products')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'products' ? "border-emerald-500 text-emerald-600" : "border-transparent text-emerald-900/40 hover:text-emerald-900/60"
                  )}
                >
                  Produtos
                </button>
                <button
                  type="button"
                  onClick={() => setKitTab('financial')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'financial' ? "border-emerald-500 text-emerald-600" : "border-transparent text-emerald-900/40 hover:text-emerald-900/60"
                  )}
                >
                  Resumo Financeiro
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 bg-emerald-50/30">
                {kitTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Nome do Kit *</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                        placeholder="Ex: Kit Churrasco Premium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Código Interno</label>
                      <input 
                        type="text" 
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        className="w-full bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 outline-none"
                        placeholder="Gerado automaticamente ou digite"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Código de Barras</label>
                      <input 
                        type="text" 
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Categoria</label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none"
                      >
                        <option value="PADRAO">Padrão</option>
                        <option value="KITS">Kits</option>
                        <option value="COMBOS">Combos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Subcategoria</label>
                      <select 
                        name="subgroup"
                        value={formData.subgroup}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none"
                      >
                        <option value="PADRAO">Padrão</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Status</label>
                      <select 
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Loja</label>
                      <select 
                        name="store"
                        value={formData.store}
                        onChange={handleChange}
                        className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-sm font-bold text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none"
                      >
                        <option value="Loja Principal">Loja Principal</option>
                      </select>
                    </div>
                  </div>
                )}

                {kitTab === 'products' && (
                  <div className="flex flex-col gap-6 h-full">
                    {/* Search Products */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Buscar produto para adicionar ao kit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-emerald-200 pl-12 pr-4 py-3 rounded-2xl text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                      
                      {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-emerald-100 rounded-2xl shadow-xl z-10 max-h-64 overflow-y-auto">
                          {products
                            .filter(p => p.id !== initialData?.id)
                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
                            .map(product => {
                              const isLowStock = product.stock <= product.minStock;
                              return (
                                <div key={product.id} className="p-3 border-b border-emerald-50 last:border-0 hover:bg-emerald-50 flex justify-between items-center transition-colors">
                                  <div>
                                    <div className="font-bold text-emerald-950">{product.name}</div>
                                    <div className="flex gap-3 text-[10px] font-black uppercase italic mt-1">
                                      <span className={isLowStock ? "text-rose-500" : "text-emerald-500"}>
                                        Estoque: {product.stock} {isLowStock && '(Baixo)'}
                                      </span>
                                      <span className="text-emerald-600/60">Custo: R$ {product.costPrice.toFixed(2)}</span>
                                      <span className="text-emerald-600/60">Venda: R$ {product.salePrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const exists = formData.composition.find(item => item.productId === product.id);
                                      if (!exists) {
                                        setFormData(prev => ({
                                          ...prev,
                                          composition: [...prev.composition, { 
                                            productId: product.id, 
                                            quantity: 1,
                                            name: product.name,
                                            price: product.costPrice // Using cost price for kit composition cost
                                          }]
                                        }));
                                      }
                                      setSearchTerm('');
                                    }}
                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 bg-white rounded-2xl border border-emerald-100 overflow-hidden flex flex-col">
                      <div className="bg-emerald-50 px-4 py-3 grid grid-cols-12 gap-4 border-b border-emerald-100 text-[10px] font-black uppercase italic text-emerald-900/60 tracking-widest">
                        <div className="col-span-5">Produto</div>
                        <div className="col-span-2 text-center">Qtd</div>
                        <div className="col-span-2 text-right">Custo Unit.</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                        <div className="col-span-1 text-center">Ação</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {formData.composition.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-emerald-900/30 gap-2 py-8">
                            <ImageIcon size={48} />
                            <p className="font-black uppercase italic text-xs">Nenhum produto no kit</p>
                          </div>
                        ) : (
                          formData.composition.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            const isLowStock = product ? product.stock <= product.minStock : false;
                            
                            return (
                              <div key={item.productId} className="px-2 py-3 grid grid-cols-12 gap-4 items-center bg-white border border-emerald-50 rounded-xl hover:border-emerald-200 transition-colors">
                                <div className="col-span-5">
                                  <div className="font-bold text-emerald-950 text-sm truncate">{item.name}</div>
                                  {isLowStock && <div className="text-[9px] text-rose-500 font-black uppercase italic">⚠️ Estoque Baixo</div>}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <input 
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      const newComp = [...formData.composition];
                                      newComp[index] = { ...item, quantity: newQty };
                                      setFormData(prev => ({ ...prev, composition: newComp }));
                                    }}
                                    className="w-16 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-center font-black text-emerald-950 outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div className="col-span-2 text-right font-bold text-emerald-600/80 text-sm">
                                  R$ {item.price?.toFixed(2)}
                                </div>
                                <div className="col-span-2 text-right font-black text-emerald-700 text-sm">
                                  R$ {((item.price || 0) * item.quantity).toFixed(2)}
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        composition: prev.composition.filter((_, i) => i !== index)
                                      }));
                                    }}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="bg-emerald-900 text-white px-6 py-4 flex justify-between items-center">
                        <div className="text-[10px] font-black uppercase italic opacity-80 tracking-widest">Custo Total do Kit</div>
                        <div className="text-xl font-black">
                          R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {kitTab === 'financial' && (
                  <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                      <h4 className="text-sm font-black text-emerald-950 uppercase italic tracking-widest mb-6 border-b border-emerald-50 pb-4">Formação de Preço</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Custo Total (Soma dos Produtos)</label>
                            <div className="w-full bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl text-lg font-black text-emerald-900">
                              R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-black uppercase italic text-emerald-900/80 tracking-widest">
                                Margem de Lucro Desejada (%)
                              </label>
                              <div className="flex bg-emerald-50 p-1 rounded-lg">
                                  <button
                                  type="button"
                                  onClick={() => {
                                    setPricingMethod('markup');
                                    const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                    const salePrice = costPrice * (1 + (formData.profitPercentage / 100));
                                    const profit = salePrice - costPrice;
                                    setFormData(prev => ({ ...prev, salePrice, profit, costPrice }));
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase italic rounded-md transition-all",
                                    pricingMethod === 'markup' ? "bg-white text-emerald-600 shadow-sm" : "text-emerald-900/40 hover:text-emerald-900/60"
                                  )}
                                >
                                  Markup
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPricingMethod('margin');
                                    const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                    const margin = formData.profitPercentage >= 100 ? 99.99 : formData.profitPercentage;
                                    const salePrice = costPrice / (1 - (margin / 100));
                                    const profit = salePrice - costPrice;
                                    setFormData(prev => ({ ...prev, salePrice, profit, costPrice }));
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase italic rounded-md transition-all",
                                    pricingMethod === 'margin' ? "bg-white text-emerald-600 shadow-sm" : "text-emerald-900/40 hover:text-emerald-900/60"
                                  )}
                                >
                                  Margem
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <input 
                                type="number" 
                                name="profitPercentage"
                                value={formData.profitPercentage}
                                onChange={(e) => {
                                  const profitPercentage = Number(e.target.value);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  let salePrice = 0;
                                  if (pricingMethod === 'markup') {
                                    salePrice = costPrice * (1 + (profitPercentage / 100));
                                  } else {
                                    const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                                    salePrice = costPrice / (1 - (margin / 100));
                                  }
                                  const profit = salePrice - costPrice;
                                  setFormData(prev => ({ ...prev, profitPercentage, salePrice, profit, costPrice }));
                                }}
                                className="w-full bg-white border border-emerald-200 px-4 py-3 rounded-2xl text-lg font-black text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-900/40 font-black">%</span>
                            </div>
                            <p className="text-[10px] text-emerald-600/60 mt-2 font-medium italic">
                              {pricingMethod === 'markup' 
                                ? "Cálculo: Custo + (Custo × Percentual)" 
                                : "Cálculo: Custo ÷ (1 - Percentual)"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black mb-1 uppercase italic text-emerald-900/80 tracking-widest">Preço de Venda Final</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-900/40 font-black">R$</span>
                              <input 
                                type="number" 
                                name="salePrice"
                                value={formData.salePrice}
                                onChange={(e) => {
                                  const salePrice = Number(e.target.value);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  const profit = salePrice - costPrice;
                                  let profitPercentage = 0;
                                  if (pricingMethod === 'markup') {
                                    profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                  } else {
                                    profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                  }
                                  setFormData(prev => ({ ...prev, salePrice, profit, profitPercentage, costPrice }));
                                }}
                                className="w-full bg-emerald-50 border border-emerald-300 pl-12 pr-4 py-3 rounded-2xl text-xl font-black text-emerald-950 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="bg-emerald-900 p-5 rounded-2xl text-white">
                            <div className="text-[10px] font-black uppercase italic opacity-80 tracking-widest mb-1">Lucro Estimado</div>
                            <div className="flex items-end gap-3">
                              <div className="text-3xl font-black">R$ {formData.profit?.toFixed(2) || '0.00'}</div>
                              <div className="text-emerald-400 font-bold mb-1">({formData.profitPercentage?.toFixed(2) || '0.00'}%)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="bg-white border-t border-emerald-100 p-6 flex justify-between items-center">
                <button 
                  type="button"
                  onClick={() => setShowCompositionModal(false)}
                  className="px-6 py-3 text-emerald-900/60 hover:text-emerald-900 font-black uppercase italic text-xs tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      if (formData.composition.length === 0) {
                        alert('O kit precisa ter pelo menos um produto na composição.');
                        return;
                      }
                      if (!formData.name) {
                        alert('O nome do kit é obrigatório.');
                        setKitTab('info');
                        return;
                      }
                      // Recalculate cost just to be sure
                      const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                      setFormData(prev => ({ ...prev, costPrice }));
                      setShowCompositionModal(false);
                    }}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest transition-all active:scale-95"
                  >
                    Salvar e Continuar Editando
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (formData.composition.length === 0) {
                        alert('O kit precisa ter pelo menos um produto na composição.');
                        return;
                      }
                      if (!formData.name) {
                        alert('O nome do kit é obrigatório.');
                        setKitTab('info');
                        return;
                      }
                      const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                      onSave({ ...formData, costPrice });
                      setShowCompositionModal(false);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    Salvar Kit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
