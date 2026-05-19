'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, ChevronRight, ChevronDown, FolderTree, Upload, Download } from 'lucide-react';
import { useERP } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { Categoria, Subcategoria } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function CategoriasPage() {
  const { 
    categorias, 
    subcategorias, 
    departamentos, 
    addCategoria, 
    updateCategoria, 
    deleteCategoria,
    addSubcategoria,
    updateSubcategoria,
    deleteSubcategoria,
    addDepartamento,
    updateDepartamento,
    deleteDepartamento,
    seedMercadologicalTree,
    seedExpenseCategories,
    user,
    fetchData
  } = useERP();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Departamento: 'MERCEARIA',
        Seção: 'ALIMENTOS',
        Segmento: 'MERCEARIA DOCE',
        Categoria: 'BISCOITOS',
        Subcategoria: 'BISCOITO RECHEADO'
      }
    ], { header: ['Departamento', 'Seção', 'Segmento', 'Categoria', 'Subcategoria'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_arvore_mercadologica.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        await processExcelData(data);
      } catch (error) {
        console.error("Error parsing excel:", error);
        alert("Erro ao importar a planilha. Verifique o formato.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // reset file input
  };

  const processExcelData = async (data: any[]) => {
    setIsSeeding(true);
    try {
      if (!data || data.length === 0) {
        alert("A planilha está vazia ou os cabeçalhos não batem com o modelo.");
        setIsSeeding(false);
        return;
      }
      
      let nextDeptCode = 0;
      if (departamentos && departamentos.length > 0) {
        const codes = departamentos.map(d => parseInt(d.codigo || '0', 10)).filter(n => !isNaN(n));
        nextDeptCode = codes.length > 0 ? Math.max(...codes) : 0;
      }
      
      const tree = new Map<string, { secoes: Set<string>, segmentos: Set<string>, categorias: Map<string, Set<string>> }>();
      
      for (const row of data) {
        const dKey = Object.keys(row).find(k => k.toLowerCase().includes('departamento'));
        const secKey = Object.keys(row).find(k => k.toLowerCase().includes('seção') || k.toLowerCase().includes('secao'));
        const segKey = Object.keys(row).find(k => k.toLowerCase().includes('segmento'));
        const catKey = Object.keys(row).find(k => k.toLowerCase().includes('categoria') && !k.toLowerCase().includes('sub'));
        const subKey = Object.keys(row).find(k => k.toLowerCase().includes('subcategoria'));

        const deptName = dKey && row[dKey] ? String(row[dKey]).trim().toUpperCase() : '';
        const secao = secKey && row[secKey] ? String(row[secKey]).trim().toUpperCase() : '';
        const segmento = segKey && row[segKey] ? String(row[segKey]).trim().toUpperCase() : '';
        const catName = catKey && row[catKey] ? String(row[catKey]).trim().toUpperCase() : '';
        const subcatName = subKey && row[subKey] ? String(row[subKey]).trim().toUpperCase() : '';
        
        if (!deptName) continue;
        
        if (!tree.has(deptName)) {
          tree.set(deptName, { secoes: new Set(), segmentos: new Set(), categorias: new Map() });
        }
        
        const deptNode = tree.get(deptName)!;
        if (secao && secao.toLowerCase() !== 'undefined') deptNode.secoes.add(secao);
        if (segmento && segmento.toLowerCase() !== 'undefined') deptNode.segmentos.add(segmento);
        
        if (catName && catName.toLowerCase() !== 'undefined') {
          if (!deptNode.categorias.has(catName)) {
             deptNode.categorias.set(catName, new Set());
          }
          if (subcatName && subcatName.toLowerCase() !== 'undefined') {
             deptNode.categorias.get(catName)!.add(subcatName);
          }
        }
      }

      console.log("Árvore extraída da planilha:", tree);

      let dCount = 0;
      let cCount = 0;
      let sCount = 0;
      
      for (const [deptName, deptData] of tree.entries()) {
         let deptId = null;
         let existingDept = departamentos.find(d => d.nome.toUpperCase() === deptName);
         
         const sSecoesArr = Array.from(deptData.secoes);
         const sSegsArr = Array.from(deptData.segmentos);
         
         if (existingDept) {
            deptId = existingDept.id;
            let needsUpdate = false;
            let currentSec = (existingDept.secao || '').split(',').map(s => s.trim()).filter(Boolean);
            let currentSeg = (existingDept.segmento || '').split(',').map(s => s.trim()).filter(Boolean);
            
            for (const s of sSecoesArr) { if (!currentSec.includes(s)) { currentSec.push(s); needsUpdate = true; } }
            for (const s of sSegsArr) { if (!currentSeg.includes(s)) { currentSeg.push(s); needsUpdate = true; } }
            
            if (needsUpdate) {
               await supabase.from('departamentos').update({
                  secao: currentSec.join(', '),
                  segmento: currentSeg.join(', ')
               }).eq('id', deptId);
               dCount++;
            }
         } else {
            nextDeptCode++;
            const { data: newDeptData, error } = await supabase.from('departamentos').insert([{
              company_id: user?.companyId || null,
              nome: deptName,
              codigo: String(nextDeptCode).padStart(2, '0'),
              ativo: true,
              secao: sSecoesArr.join(', '),
              segmento: sSegsArr.join(', ')
            }]).select();
            
            if (!error && newDeptData && newDeptData.length > 0) {
               deptId = newDeptData[0].id;
               dCount++;
               existingDept = newDeptData[0] as any;
            } else {
               console.error("Erro ao inserir departamento:", error);
               alert("Erro ao inserir departamento: " + (error?.message || JSON.stringify(error)));
               continue;
            }
         }
         
         if (!deptId) continue;
         
         let nextCatCodeNumber = 0;
         const existingCatsForDept = categorias.filter(c => c.departamento_id === deptId);
         if (existingCatsForDept.length > 0) {
            const codes = existingCatsForDept.map(c => parseInt((c.codigo || '').split('.').pop() || '0', 10)).filter(n => !isNaN(n));
            nextCatCodeNumber = codes.length > 0 ? Math.max(...codes) : 0;
         }
         
         for (const [catName, subCatsSet] of deptData.categorias.entries()) {
            let catId = null;
            const existingCat = categorias.find(c => c.departamento_id === deptId && c.nome.toUpperCase() === catName);
            if (existingCat) {
               catId = existingCat.id;
            } else {
               nextCatCodeNumber++;
               const baseDeptCode = existingDept?.codigo || '00';
               const finalCatCode = `${baseDeptCode}.${String(nextCatCodeNumber).padStart(2, '0')}`;
               const { data: newCatData, error } = await supabase.from('categorias').insert([{
                  company_id: user?.companyId || null,
                  nome: catName,
                  codigo: finalCatCode,
                  departamento_id: deptId
               }]).select();
               
               if (!error && newCatData && newCatData.length > 0) {
                  catId = newCatData[0].id;
                  cCount++;
               } else {
                  console.error("Erro ao inserir categoria:", error);
                  alert("Erro ao inserir categoria: " + (error?.message || JSON.stringify(error)));
                  continue;
               }
            }
            
            if (!catId) continue;
            
            let nextSubCodeNumber = 0;
            const existingSubsForCat = subcategorias.filter(s => s.categoria_id === catId);
            if (existingSubsForCat.length > 0) {
               const codes = existingSubsForCat.map(s => parseInt((s.codigo || '').split('.').pop() || '0', 10)).filter(n => !isNaN(n));
               nextSubCodeNumber = codes.length > 0 ? Math.max(...codes) : 0;
            }
            
            for (const subcatName of Array.from(subCatsSet)) {
               const existingSub = subcategorias.find(s => s.categoria_id === catId && s.nome.toUpperCase() === subcatName);
               if (!existingSub) {
                  nextSubCodeNumber++;
                  const baseCatCode = existingCat ? existingCat.codigo : (categorias.find(c => c.id === catId)?.codigo || `${existingDept?.codigo || '00'}.${String(nextCatCodeNumber).padStart(2, '0')}`);
                  const finalSubCode = `${baseCatCode}.${String(nextSubCodeNumber).padStart(2, '0')}`;
                  
                  const { error } = await supabase.from('subcategorias').insert([{
                     company_id: user?.companyId || null,
                     nome: subcatName,
                     codigo: finalSubCode,
                     categoria_id: catId
                  }]);
                  
                  if (!error) {
                     sCount++;
                  } else {
                     console.error("Erro ao inserir subcategoria:", error);
                     alert("Erro ao inserir subcategoria: " + (error?.message || JSON.stringify(error)));
                  }
               }
            }
         }
      }
      
      alert(`Planilha importada com sucesso! \nForam adicionados/atualizados:\n- ${dCount} Departamentos\n- ${cCount} Categorias\n- ${sCount} Subcategorias.`);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      alert("Houve um erro ao processar a importação: " + e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const uniqueSegmentos = useMemo(() => {
    const all = departamentos.flatMap(d => (d.segmento || '').split(',').map(s => s.trim()).filter(Boolean));
    return Array.from(new Set(all)).sort();
  }, [departamentos]);

  const uniqueSecoes = useMemo(() => {
    const all = departamentos.flatMap(d => (d.secao || '').split(',').map(s => s.trim()).filter(Boolean));
    return Array.from(new Set(all)).sort();
  }, [departamentos]);

  const sortedDepartamentos = useMemo(() => {
    return [...departamentos].sort((a, b) => 
      (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [departamentos]);

  const sortedCategorias = useMemo(() => {
    return [...categorias].sort((a, b) => 
      (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [categorias]);

  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isConfirmingDeleteDept, setIsConfirmingDeleteDept] = useState(false);
  const [isConfirmingDeleteCategory, setIsConfirmingDeleteCategory] = useState(false);
  const [isConfirmingDeleteSubcategory, setIsConfirmingDeleteSubcategory] = useState(false);
  const [isConfirmingSeed, setIsConfirmingSeed] = useState(false);
  const [isConfirmingFinanceSeed, setIsConfirmingFinanceSeed] = useState(false);
  
  const [categorySearch, setCategorySearch] = useState('');
  const [pendingSegment, setPendingSegment] = useState('');
  const [pendingSection, setPendingSection] = useState('');
  
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategoria | null>(null);
  
  const [deptForm, setDeptForm] = useState({ nome: '', codigo: '', ativo: true, segmento: '', secao: '' });
  const [categoryForm, setCategoryForm] = useState({ nome: '', departamento_id: '', codigo: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ nome: '', categoria_id: '', codigo: '' });

  const [isSeeding, setIsSeeding] = useState(false);

  // Dept Handlers
  const handleOpenDeptModal = (dept?: any) => {
    setIsConfirmingDeleteDept(false);
    setPendingSegment('');
    setPendingSection('');
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ nome: dept.nome, codigo: dept.codigo || '', ativo: dept.ativo, segmento: dept.segmento || '', secao: dept.secao || '' });
    } else {
      let nextCode = '01';
      if (departamentos && departamentos.length > 0) {
        const codes = departamentos
          .map(d => parseInt(d.codigo || '0', 10))
          .filter(n => !isNaN(n));
        const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
        nextCode = String(maxCode + 1).padStart(2, '0');
      }
      setEditingDept(null);
      setDeptForm({ nome: '', codigo: nextCode, ativo: true, segmento: '', secao: '' });
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async () => {
    if (!deptForm.nome.trim()) {
      alert('O nome do departamento é obrigatório.');
      return;
    }

    // Process pending values
    let finalSegmento = deptForm.segmento;
    if (pendingSegment.trim()) {
      const segments = (finalSegmento || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!segments.includes(pendingSegment.trim())) {
        finalSegmento = [...segments, pendingSegment.trim()].join(', ');
      }
    }

    let finalSecao = deptForm.secao;
    if (pendingSection.trim()) {
      const sections = (finalSecao || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!sections.includes(pendingSection.trim())) {
        finalSecao = [...sections, pendingSection.trim()].join(', ');
      }
    }

    const payload = { 
      ...deptForm, 
      segmento: finalSegmento, 
      secao: finalSecao 
    };

    try {
      if (editingDept) {
        await updateDepartamento({ ...editingDept, ...payload });
      } else {
        await addDepartamento(payload);
      }
      setIsDeptModalOpen(false);
      setPendingSegment('');
      setPendingSection('');
    } catch (error) {
      console.error('Error saving dept:', error);
    }
  };

  const handleDeleteDept = async (id: string) => {
    await deleteDepartamento(id);
    setIsDeptModalOpen(false);
  };

  // Category Handlers
  const generateCategoryCode = (deptId: string) => {
    const dept = departamentos.find(d => d.id === deptId);
    const deptCode = dept?.codigo || '00';
    
    const categorySubs = categorias.filter(c => c.departamento_id === deptId);
    const codes = categorySubs
      .map(c => {
        const parts = (c.codigo || '').split('.');
        const lastPart = parts[parts.length - 1];
        return lastPart ? parseInt(lastPart, 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    return `${deptCode}.${String(maxCode + 1).padStart(2, '0')}`;
  };

  const handleOpenCategoryModal = (category?: Categoria) => {
    setIsConfirmingDeleteCategory(false);
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ nome: category.nome, departamento_id: category.departamento_id || '', codigo: category.codigo || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nome: '', departamento_id: '', codigo: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nome.trim()) {
      alert('O nome da categoria é obrigatório.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoria({
          ...editingCategory,
          nome: categoryForm.nome,
          departamento_id: categoryForm.departamento_id,
          codigo: categoryForm.codigo
        });
      } else {
        // Re-generate code right before saving to ensure uniqueness
        const finalCode = generateCategoryCode(categoryForm.departamento_id);
        await addCategoria({
          nome: categoryForm.nome,
          departamento_id: categoryForm.departamento_id || 'PADRAO',
          codigo: finalCode
        });
      }
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategoria(id);
    setIsCategoryModalOpen(false);
  };

  const generateSubcategoryCode = (catId: string) => {
    const cat = categorias.find(c => c.id === catId);
    const catCode = cat?.codigo || '00.00';
    
    const subs = subcategorias.filter(s => s.categoria_id === catId);
    const codes = subs
      .map(s => {
        const parts = (s.codigo || '').split('.');
        const lastPart = parts[parts.length - 1];
        return lastPart ? parseInt(lastPart, 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    return `${catCode}.${String(maxCode + 1).padStart(2, '0')}`;
  };

  // Subcategory Handlers
  const handleOpenSubcategoryModal = (categoryId: string, subcategory?: Subcategoria) => {
    setIsConfirmingDeleteSubcategory(false);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubcategoryForm({ nome: subcategory.nome, categoria_id: categoryId, codigo: subcategory.codigo || '' });
    } else {
      setEditingSubcategory(null);
      setSubcategoryForm({ nome: '', categoria_id: categoryId, codigo: generateSubcategoryCode(categoryId) });
    }
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.nome.trim()) {
      alert('O nome da subcategoria é obrigatório.');
      return;
    }

    try {
      if (editingSubcategory) {
        await updateSubcategoria({
          ...editingSubcategory,
          nome: subcategoryForm.nome,
          categoria_id: subcategoryForm.categoria_id,
          codigo: subcategoryForm.codigo
        });
      } else {
        // Re-generate code right before saving to ensure uniqueness
        const finalCode = generateSubcategoryCode(subcategoryForm.categoria_id);
        await addSubcategoria({
          nome: subcategoryForm.nome,
          categoria_id: subcategoryForm.categoria_id,
          codigo: finalCode
        });
      }
      setIsSubcategoryModalOpen(false);
    } catch (error) {
      console.error('Error saving subcategory:', error);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    await deleteSubcategoria(id);
    setIsSubcategoryModalOpen(false);
  };

  const toggleExpandDept = (deptId: string) => {
    setExpandedDept(expandedDept === deptId ? null : deptId);
  };

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/cadastros" className="p-2 hover:bg-white rounded-xl transition-colors text-brand-blue shadow-sm border border-transparent hover:border-brand-border">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Árvore Mercadológica</h1>
            <p className="text-brand-blue/60 font-medium">Gerencie departamentos, categorias e subcategorias.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsConfirmingSeed(true)}
            disabled={isSeeding}
            className={cn(
              "flex items-center gap-2 px-4 py-3 bg-white text-brand-blue border border-brand-blue/20 rounded-xl font-bold uppercase text-xs tracking-tight transition-all active:scale-95",
              isSeeding ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-blue/5"
            )}
          >
            <FolderTree size={16} className={cn(isSeeding && "animate-pulse")} />
            {isSeeding ? 'Carregando...' : 'Carregar Árvore Profissional'}
          </button>
          <button
            onClick={() => setIsConfirmingFinanceSeed(true)}
            disabled={isSeeding}
            className={cn(
              "flex items-center gap-2 px-4 py-3 bg-white text-emerald-600 border border-emerald-600/20 rounded-xl font-bold uppercase text-xs tracking-tight transition-all active:scale-95",
              isSeeding ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-50"
            )}
          >
            <FolderTree size={16} className={cn(isSeeding && "animate-pulse")} />
            {isSeeding ? 'Carregando...' : 'Carregar Categorias Financeiras'}
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-3 bg-white text-brand-blue border border-brand-border rounded-xl font-bold uppercase text-xs tracking-tight hover:bg-brand-blue/5 transition-all shadow-sm active:scale-95"
          >
            <Download size={16} />
            Baixar Modelo
          </button>

          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSeeding}
            className={cn(
              "flex items-center gap-2 px-4 py-3 bg-brand-text-main text-white rounded-xl font-bold uppercase text-xs tracking-tight shadow-sm transition-all active:scale-95",
              isSeeding ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-700"
            )}
          >
            <Upload size={16} className={cn(isSeeding && "animate-pulse")} />
            {isSeeding ? 'Importando...' : 'Importar Planilha'}
          </button>

          <button
            onClick={() => handleOpenDeptModal()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
          >
            <Plus size={20} />
            Novo Departamento
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[32px] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-text-main/60">
            <FolderTree size={20} />
            <span className="font-bold uppercase tracking-wide text-xs">Departamentos Cadastrados</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-slate-400">
            <span className="bg-slate-100 px-2.5 py-1 rounded-full">{uniqueSegmentos.length} Segmentos</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full">{uniqueSecoes.length} Seções</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full">{departamentos.length} Departamentos</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full">{categorias.length} Categorias</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-full">{subcategorias.length} Subcategorias</span>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {sortedDepartamentos.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-medium">Nenhum departamento cadastrado.</p>
            </div>
          ) : (
            sortedDepartamentos.map((dept) => (
              <div key={dept.id} className="group flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue font-black text-xl italic">
                    {dept.codigo}
                  </div>
                  <div>
                    <h3 className="font-black text-brand-text-main text-xl italic uppercase tracking-tight">
                      {dept.nome}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {(dept.segmento || '').split(',').map(s => s.trim()).filter(Boolean).map((seg, idx) => (
                        <span key={idx} className="text-[10px] uppercase font-black tracking-widest text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                          Seg: {seg} ({departamentos.filter(d => (d.segmento || '').includes(seg)).length})
                        </span>
                      ))}
                      {(dept.secao || '').split(',').map(s => s.trim()).filter(Boolean).map((sec, idx) => (
                        <span key={idx} className="text-[10px] uppercase font-black tracking-widest text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                          Seç: {sec} ({departamentos.filter(d => (d.secao || '').includes(sec)).length})
                        </span>
                      ))}
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {categorias.filter(c => c.departamento_id === dept.id).length} Categorias
                      </span>
                      {!dept.ativo && (
                        <span className="text-[10px] uppercase font-black tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDeptModal(dept)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-brand-text-main rounded-xl font-bold uppercase text-xs tracking-tight hover:bg-brand-blue hover:text-white transition-all active:scale-95"
                  >
                    <Edit2 size={16} />
                    Gerenciar Árvore
                  </button>
                  <button
                    onClick={() => {
                      setEditingDept(dept);
                      setIsConfirmingDeleteDept(true);
                      setIsDeptModalOpen(true);
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dept Modal */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
                    <FolderTree size={24} />
                  </div>
                  <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">
                    {editingDept ? `Gerenciar: ${editingDept.nome}` : 'Novo Departamento'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-brand-text-main hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Basic Info & Classification */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Core Fields */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-[24px] border border-brand-border space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit2 size={16} className="text-brand-blue" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-brand-text-main/60">Informações Básicas</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-1">
                          <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Código</label>
                          <input
                            type="text"
                            value={deptForm.codigo}
                            onChange={(e) => setDeptForm({ ...deptForm, codigo: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all shadow-sm"
                            placeholder="Ex: 01"
                          />
                        </div>
                        <div className="space-y-2 col-span-3">
                          <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Nome do Departamento *</label>
                          <input
                            type="text"
                            value={deptForm.nome}
                            onChange={(e) => setDeptForm({ ...deptForm, nome: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-brand-text-main font-bold uppercase focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all shadow-sm"
                            placeholder="EX: MERCEARIA"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="ativo-modal"
                            checked={deptForm.ativo}
                            onChange={(e) => setDeptForm({ ...deptForm, ativo: e.target.checked })}
                            className="w-5 h-5 rounded-md border-brand-border text-brand-blue focus:ring-brand-blue-hover cursor-pointer"
                          />
                          <label htmlFor="ativo-modal" className="text-sm font-bold text-brand-text-main cursor-pointer select-none">
                            Departamento Ativo
                          </label>
                        </div>
                        <button
                          onClick={handleSaveDept}
                          className="px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-brand-blue/20"
                        >
                          <Save size={18} />
                          Salvar Alterações
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats or Tips could go here */}
                    {editingDept && (
                      <div className="bg-brand-blue/5 p-6 rounded-[24px] border border-brand-blue/10">
                        <div className="flex items-center gap-2 mb-4 text-brand-blue">
                          <FolderTree size={16} />
                          <span className="font-black text-[10px] uppercase tracking-widest">Resumo da Árvore</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-white p-3 rounded-2xl border border-brand-blue/10">
                            <div className="text-2xl font-black text-brand-blue italic">{categorias.filter(c => c.departamento_id === editingDept.id).length}</div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Categorias</div>
                          </div>
                          <div className="bg-white p-3 rounded-2xl border border-brand-blue/10">
                            <div className="text-2xl font-black text-brand-blue italic">
                              {subcategorias.filter(s => {
                                const cat = categorias.find(c => c.id === s.categoria_id);
                                return cat && cat.departamento_id === editingDept.id;
                              }).length}
                            </div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Subcategorias</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Classification (Segment/Section) */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-[24px] border border-brand-border space-y-6 h-full">
                      <div className="flex items-center gap-2">
                        <Plus size={16} className="text-brand-blue" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-brand-text-main/60">Classificação e Filtros</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1 leading-none">Segmento(s) Associado(s)</label>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-white rounded-xl border border-dashed border-slate-300">
                            {(deptForm.segmento || '').split(',').map(s => s.trim()).filter(Boolean).length === 0 && (
                              <span className="text-xs text-slate-400 italic p-1">Nenhum segmento...</span>
                            )}
                            {(deptForm.segmento || '').split(',').map(s => s.trim()).filter(Boolean).map((seg, idx) => (
                              <span key={idx} className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-tight text-white bg-brand-blue px-2.5 py-1.5 rounded-lg shadow-sm group">
                                {seg} ({departamentos.filter(d => (d.segmento || '').includes(seg)).length})
                                <button 
                                  onClick={() => {
                                    const segments = (deptForm.segmento || '').split(',').map(s => s.trim()).filter(Boolean);
                                    const newSegments = segments.filter((_, i) => i !== idx);
                                    setDeptForm({ ...deptForm, segmento: newSegments.join(', ') });
                                  }}
                                  className="hover:scale-125 transition-transform"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              list="segmentos-list-form"
                              value={pendingSegment}
                              onChange={(e) => setPendingSegment(e.target.value.toUpperCase())}
                              className="flex-1 px-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all shadow-sm"
                              placeholder="Adicione ou selecione um segmento..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = pendingSegment.trim();
                                  if (val) {
                                    const segments = (deptForm.segmento || '').split(',').map(s => s.trim()).filter(Boolean);
                                    if (!segments.includes(val)) {
                                      setDeptForm({ ...deptForm, segmento: [...segments, val].join(', ') });
                                    }
                                    setPendingSegment('');
                                  }
                                }
                              }}
                            />
                            <datalist id="segmentos-list-form">
                              {uniqueSegmentos.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1 leading-none">Seção(ões) Associada(s)</label>
                          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-white rounded-xl border border-dashed border-slate-300">
                             {(deptForm.secao || '').split(',').map(s => s.trim()).filter(Boolean).length === 0 && (
                              <span className="text-xs text-slate-400 italic p-1">Nenhuma seção...</span>
                            )}
                            {(deptForm.secao || '').split(',').map(s => s.trim()).filter(Boolean).map((sec, idx) => (
                              <span key={idx} className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-tight text-white bg-emerald-600 px-2.5 py-1.5 rounded-lg shadow-sm">
                                {sec} ({departamentos.filter(d => (d.secao || '').includes(sec)).length})
                                <button 
                                  onClick={() => {
                                    const sections = (deptForm.secao || '').split(',').map(s => s.trim()).filter(Boolean);
                                    const newSections = sections.filter((_, i) => i !== idx);
                                    setDeptForm({ ...deptForm, secao: newSections.join(', ') });
                                  }}
                                  className="hover:scale-125 transition-transform"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              list="secoes-list-form"
                              value={pendingSection}
                              onChange={(e) => setPendingSection(e.target.value.toUpperCase())}
                              className="flex-1 px-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all shadow-sm"
                              placeholder="Adicione ou selecione uma seção..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = pendingSection.trim();
                                  if (val) {
                                    const sections = (deptForm.secao || '').split(',').map(s => s.trim()).filter(Boolean);
                                    if (!sections.includes(val)) {
                                      setDeptForm({ ...deptForm, secao: [...sections, val].join(', ') });
                                    }
                                    setPendingSection('');
                                  }
                                }
                              }}
                            />
                            <datalist id="secoes-list-form">
                              {uniqueSecoes.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mercadological Tree Section */}
                {editingDept && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight flex items-center gap-2">
                        <FolderTree size={20} className="text-brand-blue" />
                        Estrutura de Categorias
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Buscar categorias..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-brand-border rounded-xl text-xs font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all w-48"
                          />
                          <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        <button
                          onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ nome: '', departamento_id: editingDept.id, codigo: generateCategoryCode(editingDept.id) });
                            setIsCategoryModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold uppercase text-[10px] tracking-tight hover:bg-brand-text-main transition-all active:scale-95 shadow-sm"
                        >
                          <Plus size={14} />
                          Nova Categoria
                        </button>
                      </div>
                    </div>

                    <div className="border border-brand-border rounded-[24px] overflow-hidden divide-y divide-slate-100 bg-white">
                      {sortedCategorias.filter(c => c.departamento_id === editingDept.id).length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50/30">
                          <p className="font-medium italic">Nenhuma categoria cadastrada para este departamento.</p>
                        </div>
                      ) : (
                        sortedCategorias
                          .filter(c => c.departamento_id === editingDept.id)
                          .filter(c => c.nome.toLowerCase().includes(categorySearch.toLowerCase()) || (c.codigo || '').includes(categorySearch))
                          .map(category => {
                            const categorySubs = subcategorias
                              .filter(sub => sub.categoria_id === category.id)
                              .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' }));
                            const isCatExpanded = expandedCategory === category.id;

                            return (
                              <div key={category.id} className="group/cat">
                                <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleExpandCategory(category.id)}>
                                    <div className={cn(
                                      "p-1.5 rounded-lg transition-colors",
                                      isCatExpanded ? "bg-brand-blue/10 text-brand-blue" : "text-slate-400 group-hover/cat:text-brand-blue"
                                    )}>
                                      {isCatExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-brand-text-main">
                                        <span className="text-brand-blue/60 mr-2">{category.codigo}</span>
                                        {category.nome}
                                      </h4>
                                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                                        {categorySubs.length} Subcategorias
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleOpenSubcategoryModal(category.id)}
                                      className="p-1.5 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                                      title="Adicionar Subcategoria"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleOpenCategoryModal(category)}
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Editar Categoria"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCategory(category.id)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Excluir Categoria"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {isCatExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden bg-slate-50/30 border-t border-slate-100"
                                    >
                                      <div className="p-4 pl-12 pr-6 space-y-2">
                                        {categorySubs.length === 0 ? (
                                          <div className="py-2 text-xs text-slate-400 italic">
                                            Nenhuma subcategoria cadastrada.
                                          </div>
                                        ) : (
                                          categorySubs.map(sub => (
                                            <div key={sub.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-brand-blue/30 transition-all group/sub shadow-sm">
                                              <span className="text-sm font-bold text-slate-700">
                                                <span className="text-brand-blue/40 mr-2">{sub.codigo}</span>
                                                {sub.nome}
                                              </span>
                                              <div className="flex items-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => handleOpenSubcategoryModal(category.id, sub)}
                                                  className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                                                >
                                                  <Edit2 size={14} />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteSubcategory(sub.id)}
                                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-brand-border bg-slate-50 shrink-0 flex justify-between items-center">
                {editingDept && isConfirmingDeleteDept ? (
                  <div className="flex items-center gap-3 bg-rose-50 p-2 px-4 rounded-2xl border border-rose-100">
                    <span className="text-sm text-rose-600 font-bold uppercase italic tracking-tight">Excluir permanentemente?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteDept(editingDept.id)}
                        className="px-4 py-1.5 bg-rose-500 text-white font-black text-[10px] uppercase rounded-lg hover:bg-rose-600 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setIsConfirmingDeleteDept(false)}
                        className="px-4 py-1.5 bg-slate-200 text-slate-600 font-black text-[10px] uppercase rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={deptForm.ativo}
                      onChange={(e) => setDeptForm({ ...deptForm, ativo: e.target.checked })}
                      className="w-5 h-5 rounded-md border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                    />
                    <label htmlFor="ativo" className="text-sm font-bold text-brand-text-main cursor-pointer select-none">
                      Departamento Ativo
                    </label>
                  </div>
                )}
                
                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-8 py-3 bg-slate-200 text-brand-text-main rounded-xl font-black uppercase italic tracking-tight hover:bg-slate-300 transition-all active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-brand-text-main hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Código</label>
                  <input
                    type="text"
                    value={categoryForm.codigo}
                    readOnly={!editingCategory}
                    onChange={(e) => setCategoryForm({ ...categoryForm, codigo: e.target.value })}
                    className={cn(
                      "w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all",
                      !editingCategory && "bg-slate-100 text-slate-500 cursor-not-allowed"
                    )}
                    placeholder="Ex: 01.01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Nome *</label>
                  <input
                    type="text"
                    value={categoryForm.nome}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold uppercase focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all"
                    placeholder="EX: CEREAIS"
                  />
                </div>
                {/* Hidden department ID field, implied by context */}
              </div>

              <div className="p-6 border-t border-brand-border bg-slate-50 flex justify-between gap-3">
                {editingCategory ? (
                  isConfirmingDeleteCategory ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-rose-500 font-bold">Tem certeza?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(editingCategory.id)}
                        className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl transition-colors hover:bg-rose-600"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteCategory(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors hover:bg-slate-300"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDeleteCategory(true)}
                      className="px-6 py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Excluir
                    </button>
                  )
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCategory}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all active:scale-95"
                  >
                    <Save size={18} />
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subcategory Modal */}
      <AnimatePresence>
        {isSubcategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">
                  {editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
                </h2>
                <button
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-brand-text-main hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Código</label>
                  <input
                    type="text"
                    value={subcategoryForm.codigo}
                    readOnly={!editingSubcategory}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, codigo: e.target.value })}
                    className={cn(
                      "w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all",
                      !editingSubcategory && "bg-slate-100 text-slate-500 cursor-not-allowed"
                    )}
                    placeholder="Ex: 01.01.01"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Nome *</label>
                  <input
                    type="text"
                    value={subcategoryForm.nome}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, nome: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-brand-border rounded-xl text-brand-text-main font-bold uppercase focus:ring-2 focus:ring-brand-blue-hover outline-none transition-all"
                    placeholder="EX: REFRIGERANTES"
                  />
                </div>
                {/* Hidden category ID field, implied by context */}
              </div>

              <div className="p-6 border-t border-brand-border bg-slate-50 flex justify-between gap-3">
                {editingSubcategory ? (
                  isConfirmingDeleteSubcategory ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-rose-500 font-bold">Tem certeza?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteSubcategoria(editingSubcategory.id);
                          setIsSubcategoryModalOpen(false);
                          setIsConfirmingDeleteSubcategory(false);
                        }}
                        className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl transition-colors hover:bg-rose-600"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteSubcategory(false)}
                        className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors hover:bg-slate-300"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDeleteSubcategory(true)}
                      className="px-6 py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Excluir
                    </button>
                  )
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSubcategoryModalOpen(false)}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSubcategory}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all active:scale-95"
                  >
                    <Save size={18} />
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Seed Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingSeed && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto">
                  <FolderTree size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Carregar Árvore Profissional?</h2>
                  <p className="text-brand-blue/60 font-medium">
                    Isso adicionará uma estrutura completa de departamentos, categorias e subcategorias padrão para supermercados.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsConfirmingSeed(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setIsConfirmingSeed(false);
                      setIsSeeding(true);
                      try {
                        await seedMercadologicalTree();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSeeding(false);
                      }
                    }}
                    className="flex-1 px-6 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Finance Seed Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingFinanceSeed && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <FolderTree size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Carregar Categorias Financeiras?</h2>
                  <p className="text-brand-blue/60 font-medium">
                    Isso adicionará as categorias padrão para o contas a pagar (Aluguel, Energia, Salários, etc).
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsConfirmingFinanceSeed(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setIsConfirmingFinanceSeed(false);
                      setIsSeeding(true);
                      try {
                        await seedExpenseCategories();
                        alert('Categorias financeiras carregadas com sucesso!');
                      } catch (err) {
                        console.error(err);
                        alert('Erro ao carregar categorias financeiras.');
                      } finally {
                        setIsSeeding(false);
                      }
                    }}
                    className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
