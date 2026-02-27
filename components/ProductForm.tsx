'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { Product } from '@/lib/types';

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: Product;
}

export function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
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
    composition: '',
    subgroup: initialData?.subgroup || 'PADRAO',
    size: 'PADRAO',
    category: initialData?.category || 'PADRAO',
    useScale: 'NÃO',
    showPDV: 'NÃO PDV MESAS/SIM COMANDAS',
    commission: 0,
    profit: initialData?.profit || 0,
    profitPercentage: initialData?.profitPercentage || 0,
    image: initialData?.image || 'https://mercadinhosupernice.com.br/logo.png'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSKU = () => {
    const randomCode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    setFormData(prev => ({ ...prev, sku: randomCode }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] w-full max-w-6xl rounded-lg shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#2a2a2a] px-6 py-3 flex justify-center items-center relative border-b border-slate-800">
          <h2 className="text-3xl font-black text-white tracking-widest uppercase">Cadastro de Produtos</h2>
          <button 
            onClick={onClose} 
            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-slate-300">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Form Fields */}
            <div className="flex-1 space-y-4">
              {/* Checkboxes */}
              <div className="flex gap-6 mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input type="checkbox" className="size-4 rounded border-slate-700 bg-slate-800 text-blue-600" />
                  Buscar Produtos na Internet
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input type="checkbox" className="size-4 rounded border-slate-700 bg-slate-800 text-blue-600" />
                  Buscar Foto na Internet
                </label>
              </div>

              {/* Row 1: Code and Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold mb-1 uppercase">Codigo:</label>
                  <div className="flex gap-1">
                    <input 
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none" 
                    />
                    <button 
                      type="button" 
                      onClick={generateSKU}
                      className="bg-[#0078d4] hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase transition-colors whitespace-nowrap"
                    >
                      Gerar - F1
                    </button>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <label className="block text-xs font-bold mb-1 uppercase">Descricao</label>
                  <input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none" 
                  />
                </div>
              </div>

              {/* Row 2: Supplier and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <label className="block text-xs font-bold mb-1 uppercase">Fornecedor</label>
                  <select 
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="">Selecione um fornecedor</option>
                    <option value="PADRAO">PADRAO</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold mb-1 uppercase">Unidade:</label>
                  <div className="flex gap-1 items-center">
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                    </select>
                    <HelpCircle size={20} className="text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Row 3: Prices */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Preco de Compra:</label>
                  <input 
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Preco de Venda:</label>
                  <input 
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Preco Aprazo:</label>
                  <input 
                    type="number"
                    name="termPrice"
                    value={formData.termPrice}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Preco Atacado</label>
                  <div className="flex gap-1">
                    <input 
                      type="number"
                      name="wholesalePrice"
                      value={formData.wholesalePrice}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                    />
                    <button type="button" className="bg-[#0078d4] text-white text-[10px] font-bold px-2 py-1 rounded transition-colors whitespace-nowrap">
                      Mais Preços
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Stock and Group */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Estoque Atual:</label>
                  <input 
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Est. Minimo:</label>
                  <input 
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Controlar Estoque</label>
                  <select 
                    name="controlStock"
                    value={formData.controlStock}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="SIM">SIM</option>
                    <option value="NÃO">NÃO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Grupo</label>
                  <div className="flex gap-1">
                    <select 
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                    <button type="button" className="bg-[#0078d4] text-white p-1.5 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 5: Brand and Composition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Marca:</label>
                  <div className="flex gap-1">
                    <select 
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                    <button type="button" className="bg-[#0078d4] text-white p-1.5 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Composição / Ingredientes:</label>
                  <div className="flex gap-1">
                    <select 
                      name="composition"
                      value={formData.composition}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Nenhum</option>
                    </select>
                    <button type="button" className="bg-[#0078d4] text-white p-1.5 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 6: Subgroup and Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Subgrupo</label>
                  <div className="flex gap-1">
                    <select 
                      name="subgroup"
                      value={formData.subgroup}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="PADRAO">PADRAO</option>
                    </select>
                    <button type="button" className="bg-[#0078d4] text-white p-1.5 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Tamanho:</label>
                  <input 
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
              </div>

              {/* Row 7: Category, Scale, PDV */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Categoria:</label>
                  <div className="flex gap-1">
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="flex-1 bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="PADRAO">PADRAO</option>
                      <option value="Eletrônicos">Eletrônicos</option>
                      <option value="Periféricos">Periféricos</option>
                    </select>
                    <button type="button" className="bg-[#0078d4] text-white p-1.5 rounded">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Usar Balança</label>
                  <select 
                    name="useScale"
                    value={formData.useScale}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Mostrar PDV Mesas / Comandas</label>
                  <select 
                    name="showPDV"
                    value={formData.showPDV}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="NÃO PDV MESAS/SIM COMANDAS">NÃO PDV MESAS/SIM COMANDAS</option>
                  </select>
                </div>
              </div>

              {/* Row 8: Commission, Profit */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Comissão (%):</label>
                  <input 
                    type="number"
                    name="commission"
                    value={formData.commission}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Lucro:</label>
                  <input 
                    type="number"
                    name="profit"
                    value={formData.profit}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">Lucro (%):</label>
                  <input 
                    type="number"
                    name="profitPercentage"
                    value={formData.profitPercentage}
                    onChange={handleChange}
                    className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-sm text-center focus:border-blue-500 outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Image Preview */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
              <div className="aspect-square bg-red-600 rounded-lg flex items-center justify-center overflow-hidden relative border-4 border-slate-800">
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://mercadinhosupernice.com.br/logo.png';
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold uppercase">URL da Imagem:</label>
                <input 
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="w-full bg-black border border-slate-800 px-3 py-1.5 rounded text-xs focus:border-blue-500 outline-none" 
                  placeholder="https://..."
                />
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded uppercase tracking-widest shadow-lg transition-all"
                >
                  Gravar Dados
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded uppercase text-xs transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
