
import React, { useState, useEffect, useMemo } from 'react';
import { AdConcept, CarouselSlide, ALL_AWARENESS_STAGES, ALL_CREATIVE_FORMATS, CreativeFormat, CampaignBlueprint } from '../types';
import { refineVisualPrompt } from '../services/geminiService';
import { RefreshCwIcon, SparklesIcon, InfoIcon } from './icons';

interface EditModalProps {
  concept: AdConcept;
  campaignBlueprint: CampaignBlueprint | null;
  onSave: (conceptId: string, updatedContent: AdConcept) => void;
  onClose: () => void;
  onGenerateImage: (conceptId: string) => void;
}

const CAROUSEL_ARC_VALIDATION_RULES: Record<string, Record<string, string>> = {
    'PAS': {
      slide1: 'Problem',
      slide2: 'Agitate',
      slide3: 'Solution',
      slide4: 'Proof',
      slide5: 'CTA'
    },
    'Transformation': {
        slide1: 'After',
        slide2: 'Before',
        slide3: 'Struggle',
        slide4: 'Discovery',
        slide5: 'CTA'
    },
    'Educational': {
        slide1: 'Hook',
        slide2: 'Myth',
        slide3: 'Myth',
        slide4: 'Truth',
        slide5: 'CTA'
    },
    'Testimonial Story': {
        slide1: 'Quote',
        slide2: 'Customer',
        slide3: 'Result',
        slide4: 'Product',
        slide5: 'CTA'
    }
};

const validateCarouselArc = (slides: CarouselSlide[], arc: string) => {
    const rules = CAROUSEL_ARC_VALIDATION_RULES[arc];
    if (!rules) return [];

    return slides.map((slide, i) => {
        const slideKey = `slide${i + 1}`;
        const expectedKeyword = rules[slideKey];
        if (!expectedKeyword) return { slideNumber: i + 1, expected: 'Unknown', isValid: true, actual: slide.headline };

        // Simple check if headline contains the keyword (case-insensitive)
        const isValid = slide.headline.toLowerCase().includes(expectedKeyword.toLowerCase());
        return {
            slideNumber: i + 1,
            expected: expectedKeyword,
            actual: slide.headline,
            isValid
        };
    });
};

const FORMAT_TIPS: Partial<Record<CreativeFormat, string>> = {
    'Penawaran Langsung': "Iklan statis berkinerja lebih baik dengan headline numerik (misal: '3 Alasan...') dan penawaran yang sangat jelas.",
    'UGC': "Pastikan visual dan teks terasa otentik dan tidak terlalu dipoles, seolah-olah dibuat oleh pengguna sungguhan.",
    'Sebelum & Sesudah': "Pastikan transformasi terlihat jelas dan dramatis. Perbedaan antara 'sebelum' dan 'sesudah' harus mencolok.",
    'Iklan Artikel': "Gaya visual dan headline harus meniru konten editorial yang kredibel, bukan iklan yang terang-terangan.",
};


export const EditModal: React.FC<EditModalProps> = ({ concept, campaignBlueprint, onSave, onClose, onGenerateImage }) => {
  const [formData, setFormData] = useState<AdConcept>(concept);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    setFormData(concept);
  }, [concept]);

  const carouselValidation = useMemo(() => {
    if (formData.placement === 'Carousel' && formData.carouselSlides && formData.carouselArc) {
        return validateCarouselArc(formData.carouselSlides, formData.carouselArc);
    }
    return [];
  }, [formData.carouselSlides, formData.carouselArc, formData.placement]);

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
        alert("Blueprint kampanye tidak tersedia. Tidak dapat menyempurnakan prompt.");
        return;
    }
    setIsRefining(true);
    try {
        const newPrompt = await refineVisualPrompt(formData, campaignBlueprint);
        setFormData(prev => ({ ...prev, visualPrompt: newPrompt }));
    } catch (error) {
        console.error("Gagal menyempurnakan prompt visual:", error);
        alert("Gagal menyempurnakan prompt visual. Silakan coba lagi.");
    } finally {
        setIsRefining(false);
    }
  };

  const tip = FORMAT_TIPS[formData.format];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Edit Konsep Kreatif</h2>
          <p className="text-sm text-brand-text-secondary">Ad Set: {formData.adSetName}</p>
        </header>
        
        <main className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-brand-text-secondary mb-1">Headline</label>
            <input type="text" name="headline" id="headline" value={formData.headline} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" />
            {tip && (
                <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500/40 rounded-md text-xs flex items-start gap-2 text-blue-200">
                    <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Pro Tip:</strong> {tip}</span>
                </div>
            )}
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
                <label htmlFor="trigger" className="block text-sm font-medium text-brand-text-secondary mb-1">🔥 Pemicu Pembelian</label>
                <input type="text" name="trigger" id="trigger" value={formData.trigger.name} onChange={handleTriggerChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary" />
            </div>
             <div>
              <label htmlFor="awarenessStage" className="block text-sm font-medium text-brand-text-secondary mb-1">Tahap Kesadaran</label>
              <select name="awarenessStage" id="awarenessStage" value={formData.awarenessStage} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary">
                {ALL_AWARENESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-brand-text-secondary mb-1">Format Kreatif</label>
              <select name="format" id="format" value={formData.format} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary">
                {ALL_CREATIVE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="visualVehicle" className="block text-sm font-medium text-brand-text-secondary mb-1">Arahan Visual (Visual Vehicle)</label>
            <input
              type="text"
              name="visualVehicle"
              id="visualVehicle"
              value={formData.visualVehicle}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"
              placeholder="Contoh: 'Foto 'masalah' yang sangat relatable', 'Ekspresi 'aha!' saat menemukan solusi', 'Hasil 'setelah' yang dramatis dan memuaskan'"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="visualPrompt" className="block text-sm font-medium text-brand-text-secondary">Prompt Visual Utama</label>
                <button
                    onClick={handleRefinePrompt}
                    disabled={isRefining || !campaignBlueprint}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Hasilkan prompt visual baru berdasarkan Arahan Visual di atas"
                >
                    {isRefining ? <RefreshCwIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                    Sempurnakan Prompt
                </button>
            </div>
            <textarea name="visualPrompt" id="visualPrompt" rows={4} value={formData.visualPrompt} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"></textarea>
          </div>

          {formData.placement === 'Carousel' && formData.carouselSlides && formData.carouselSlides.length > 0 && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold text-brand-text-primary">Slide Carousel</h3>
                 {formData.carouselArc && (
                    <span className="text-sm font-bold text-brand-primary bg-brand-primary/20 px-2 py-1 rounded-md">
                        Alur: {formData.carouselArc}
                    </span>
                 )}
              </div>
               {carouselValidation.length > 0 && (
                <div className="p-2 bg-gray-900/50 rounded-md text-xs space-y-1">
                    {carouselValidation.map(v => (
                        <div key={v.slideNumber} className={`flex items-center gap-2 ${v.isValid ? 'text-green-400' : 'text-red-400'}`}>
                           <span>Slide {v.slideNumber}: Diharapkan "{v.expected}"</span>
                           {!v.isValid && <span className="font-bold">⚠️ Tidak Cocok</span>}
                        </div>
                    ))}
                </div>
               )}
              {formData.carouselSlides.map((slide, index) => (
                <div key={slide.slideNumber} className="p-3 border border-gray-600 rounded-md space-y-2">
                  <p className="text-sm font-bold">Slide {slide.slideNumber}</p>
                  <div>
                    <label className="text-xs text-brand-text-secondary mb-1 block">Headline Slide</label>
                    <input type="text" value={slide.headline} onChange={e => handleSlideChange(e, index, 'headline')} className="w-full bg-gray-800 border-gray-700 rounded p-1.5 text-sm"/>
                  </div>
                   <div>
                    <label className="text-xs text-brand-text-secondary mb-1 block">Deskripsi Slide</label>
                    <textarea rows={2} value={slide.description} onChange={e => handleSlideChange(e, index, 'description')} className="w-full bg-gray-800 border-gray-700 rounded p-1.5 text-sm"></textarea>
                  </div>
                  <div>
                    <label className="text-xs text-brand-text-secondary mb-1 block">Prompt Visual Slide</label>
                    <textarea rows={2} value={slide.visualPrompt} onChange={e => handleSlideChange(e, index, 'visualPrompt')} className="w-full bg-gray-800 border-gray-700 rounded p-1.5 text-sm"></textarea>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-gray-700 bg-brand-surface rounded-b-xl flex justify-between items-center">
            <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-lg hover:bg-green-500 flex items-center gap-2"
            >
                <SparklesIcon className="w-4 h-4" />
                Simpan & Hasilkan Ulang Gambar
            </button>
            <div>
              <button onClick={onClose} className="px-4 py-2 text-brand-text-secondary hover:bg-gray-700 rounded-lg mr-2">Batal</button>
              <button onClick={handleSave} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-indigo-500">Simpan Perubahan</button>
            </div>
        </footer>
      </div>
    </div>
  );
};
