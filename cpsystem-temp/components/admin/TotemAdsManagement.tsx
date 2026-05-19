import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { Advertisement } from '@/lib/types';
import { Plus, Edit2, Trash2, Image as ImageIcon, Check, X } from 'lucide-react';

export default function TotemAdsManagement() {
  const { advertisements, addAdvertisement, updateAdvertisement, deleteAdvertisement, setCustomAlert } = useERP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    imagem_url: '',
    ativo: true
  });

  const handleOpenModal = (ad?: Advertisement) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        titulo: ad.titulo,
        descricao: ad.descricao,
        imagem_url: ad.imagem_url,
        ativo: ad.ativo
      });
    } else {
      setEditingAd(null);
      setFormData({
        titulo: '',
        descricao: '',
        imagem_url: '',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imagem_url) {
      setCustomAlert({ message: 'Por favor, faça o upload de uma imagem ou insira um link direto.', type: 'warning' });
      return;
    }
    try {
      if (editingAd) {
        await updateAdvertisement({
          ...editingAd,
          ...formData
        });
        setCustomAlert({ message: 'Propaganda atualizada com sucesso!', type: 'success' });
      } else {
        await addAdvertisement(formData);
        setCustomAlert({ message: 'Propaganda adicionada com sucesso!', type: 'success' });
      }
      setIsModalOpen(false);
    } catch (error) {
      setCustomAlert({ message: 'Erro ao salvar propaganda.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta propaganda?')) {
      try {
        await deleteAdvertisement(id);
        setCustomAlert({ message: 'Propaganda excluída com sucesso!', type: 'success' });
      } catch (error) {
        setCustomAlert({ message: 'Erro ao excluir propaganda.', type: 'error' });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setCustomAlert({ message: 'A imagem deve ter no máximo 5MB.', type: 'warning' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({...formData, imagem_url: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão do Totem</h2>
          <p className="text-slate-500">Gerencie as propagandas exibidas no terminal de consulta de preços.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Propaganda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {advertisements.map((ad) => (
          <div key={ad.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="aspect-video bg-slate-100 relative group">
              {ad.imagem_url ? (
                <img src={ad.imagem_url} alt={ad.titulo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${ad.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {ad.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-slate-800 text-lg mb-1">{ad.titulo}</h3>
              <p className="text-slate-500 text-sm flex-1">{ad.descricao}</p>
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenModal(ad)}
                  className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {advertisements.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Nenhuma propaganda cadastrada</h3>
            <p className="text-slate-500">Clique em "Nova Propaganda" para adicionar banners ao totem.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                {editingAd ? 'Editar Propaganda' : 'Nova Propaganda'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Título</label>
                <input
                  required
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ex: Ofertas da Semana"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Descrição</label>
                <input
                  required
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Ex: Preços imbatíveis em todo o setor!"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Imagem da Oferta</label>
                <div className="flex flex-col gap-3">
                  {/* Upload via File */}
                  <div className="flex items-center gap-3">
                    <label className="flex-1 max-w-[200px] cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed text-slate-700 py-2 px-4 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-colors">
                      <ImageIcon size={18} />
                      Fazer Upload
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ou cole o link</span>
                  </div>
                  
                  {/* Upload via URL */}
                  <input
                    type="url"
                    value={formData.imagem_url.startsWith('data:image') ? '' : formData.imagem_url}
                    onChange={(e) => setFormData({...formData, imagem_url: e.target.value})}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm"
                  />
                  
                  {/* Preview da Imagem */}
                  {formData.imagem_url && (
                    <div className="mt-2 h-32 rounded-xl overflow-hidden border border-slate-200 relative group bg-black/5">
                      <img src={formData.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, imagem_url: ''})} 
                        className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  No Canva, clique em Compartilhar &gt; Baixar &gt; JPG ou PNG e faça o upload aqui. (Recomendado: 1920x1080px). Os links de visualização direta do Canva ("canva.link") não funcionam aqui.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, ativo: !formData.ativo})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.ativo ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-bold text-slate-700">
                  {formData.ativo ? 'Propaganda Ativa no Totem' : 'Propaganda Inativa'}
                </span>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
