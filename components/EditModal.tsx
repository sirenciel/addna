
import React, { useState, useEffect } from 'react';
import { AdConcept, CarouselSlide, ALL_AWARENESS_STAGES, ALL_CREATIVE_FORMATS, CampaignBlueprint } from '../types';
import { refineVisualPrompt } from '../services/geminiService';
import { RefreshCwIcon, SparklesIcon } from './icons';

interface EditModalProps {
  concept: AdConcept;
  campaignBlueprint: CampaignBlueprint | null;
  onSave: (conceptId: string, updatedContent: AdConcept) => void;
  onClose: () => void;
  onGenerateImage: (conceptId: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ concept, campaignBlueprint, onSave, onClose, onGenerateImage }) => {
  const [formData, setFormData] = useState<AdConcept>(concept);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    setFormData(concept);
  }, [concept]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTriggerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setFormData(prev => ({
          ...prev,
          trigger: { ...prev.trigger, name: value }
      }));
  };
  
  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number, field: keyof Omit<CarouselSlide, 'slideNumber'>) => {
      const { value } = e.target;
      const updatedSlides = formData.carouselSlides ? [...formData.carouselSlides] : [];
      if (updatedSlides[index]) {
          // @ts-ignore
          updatedSlides[index][field] = value;
          setFormData(prev => ({ ...prev, carouselSlides: updatedSlides }));
      }
  };


  const handleSave = () => {
    onSave(concept.id, formData);
  };

  const handleGenerate = () => {
      // First save any changes, then trigger regeneration
      onSave(concept.id, formData);
      onGenerateImage(concept.id);
  }

  const handleRefinePrompt = async () => {
    if (!campaignBlueprint) {
        alert("Campaign blueprint is not available. Cannot refine prompt.");
        return;
    }
    setIsRefining(true);
    try {
        const newPrompt = await refineVisualPrompt(formData, campaignBlueprint);
        setFormData(prev => ({ ...prev, visualPrompt: newPrompt }));
    } catch (error) {
        console.error("Failed to refine visual prompt:", error);
        alert("Gagal menyempurnakan visual prompt. Silakan coba lagi.");
    } finally {
        setIsRefining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Edit Creative Concept</h2>
          <p className="text-sm text-brand-text-secondary">Ad Set: {formData.adSetName}</p>
        </header>
        
        <main className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-brand-text-secondary mb-1">Headline</label>
            <input type="text" name="headline" id="headline" value={formData.headline} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" />
          </div>

          <div>
            <label htmlFor="hook" className="block text-sm font-medium text-brand-text-secondary mb-1">Hook (Caption)</label>
            <textarea name="hook" id="hook" rows={2} value={formData.hook} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="personaDescription" className="block text-sm font-medium text-brand-text-secondary mb-1">Persona</label>
              <input type="text" name="personaDescription" id="personaDescription" value={formData.personaDescription} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" />
            </div>
             <div>
                <label htmlFor="trigger" className="block text-sm font-medium text-brand-text-secondary mb-1">🔥 Buying Trigger</label>
                <input type="text" name="trigger" id="trigger" value={formData.trigger.name} onChange={handleTriggerChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" />
            </div>
             <div>
              <label htmlFor="awarenessStage" className="block text-sm font-medium text-brand-text-secondary mb-1">Awareness Stage</label>
              <select name="awarenessStage" id="awarenessStage" value={formData.awarenessStage} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary">
                {ALL_AWARENESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-brand-text-secondary mb-1">Creative Format</label>
              <select name="format" id="format" value={formData.format} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary">
                {ALL_CREATIVE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="visualVehicle" className="block text-sm font-medium text-brand-text-secondary mb-1">Visual Vehicle (Arahan Visual)</label>
            <input
              type="text"
              name="visualVehicle"
              id="visualVehicle"
              value={formData.visualVehicle}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g., 'Foto 'problem' yang sangat relatable', 'Ekspresi 'aha!' saat menemukan solusi', 'Hasil 'after' yang dramatis dan memuaskan'"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="visualPrompt" className="block text-sm font-medium text-brand-text-secondary">Visual Prompt Utama</label>
                <button
                    onClick={handleRefinePrompt}
                    disabled={isRefining || !campaignBlueprint}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Buat visual prompt baru berdasarkan Visual Vehicle di atas"
                >
                    {isRefining ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                    Sempurnakan Prompt
                </button>
            </div>
            <textarea name="visualPrompt" id="visualPrompt" rows={4} value={formData.visualPrompt} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"></textarea>
          </div>

          {formData.placement === 'Carousel' && formData.carouselSlides && formData.carouselSlides.length > 0 && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-brand-text-primary">Carousel Slides</h3>
              {formData.carouselSlides.map((slide, index) => (
                <div key={slide.slideNumber} className="p-3 border border-gray-600 rounded-md space-y-2">
                  <p className="text-sm font-bold">Slide {slide.slideNumber}</p>
                   <div>
                      <label className="text-xs font-medium text-brand-text-secondary">Headline</label>
                      <input type="text" value={slide.headline} onChange={e => handleSlideChange(e, index, 'headline')} className="w-full text-sm bg-gray-800 border border-gray-700 rounded-md p-1.5 focus:ring-1 focus:ring-brand-primary" />
                  </div>
                  <div>
                      <label className="text-xs font-medium text-brand-text-secondary">Deskripsi</label>
                      <textarea rows={2} value={slide.description} onChange={e => handleSlideChange(e, index, 'description')} className="w-full text-sm bg-gray-800 border border-gray-700 rounded-md p-1.5 focus:ring-1 focus:ring-brand-primary"></textarea>
                  </div>
                  <div>
                      <label className="text-xs font-medium text-brand-text-secondary">Visual Prompt</label>
                      <textarea rows={2} value={slide.visualPrompt} onChange={e => handleSlideChange(e, index, 'visualPrompt')} className="w-full text-sm bg-gray-800 border border-gray-700 rounded-md p-1.5 focus:ring-1 focus:ring-brand-primary"></textarea>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        
        <footer className="p-4 flex justify-between items-center border-t border-gray-700 bg-brand-surface rounded-b-xl">
            <button onClick={handleGenerate} className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-lg hover:bg-green-500 transition-colors">
                Simpan & Buat Ulang Gambar
            </button>
            <div>
              <button onClick={onClose} className="px-4 py-2 mr-2 text-brand-text-secondary hover:bg-gray-700 rounded-lg">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-indigo-500">Simpan Perubahan</button>
            </div>
        </footer>
      </div>
    </div>
  );
};