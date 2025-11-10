
import React, { useState } from 'react';
import { CampaignBlueprint, TargetPersona } from '../types';
import { InfoIcon, RemixIcon } from './icons';

interface BlueprintValidationStepProps {
  initialBlueprint: CampaignBlueprint;
  referenceImage: string;
  onWorkflowSelected: (validatedBlueprint: CampaignBlueprint, workflow: 'deep-dive' | 'quick-scale' | 'ugc-diversity-pack' | 'one-click-campaign' | 'hp-authority-pack') => void;
  onBack: () => void;
  allowVisualExploration: boolean;
  onAllowVisualExplorationChange: (checked: boolean) => void;
}

const EditableField: React.FC<{label: string, value: string, name: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({label, value, name, onChange}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-brand-text-secondary mb-1">{label}</label>
        <input type="text" id={name} name={name} value={value} onChange={onChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"/>
    </div>
);

const EditableTextarea: React.FC<{label: string, value: string, name: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, rows?: number}> = ({label, value, name, onChange, rows=2}) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-brand-text-secondary mb-1">{label}</label>
        <textarea id={name} name={name} rows={rows} value={value} onChange={onChange} className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-brand-primary"/>
    </div>
);

const WorkflowCard: React.FC<{
    icon: string;
    title: string;
    description: string;
    why: string;
    onClick: () => void;
    recommended?: boolean;
}> = ({ icon, title, description, why, onClick, recommended = false }) => (
    <div
        onClick={onClick}
        className={`relative p-5 border rounded-xl h-full flex flex-col justify-between transition-all duration-200 bg-brand-surface hover:border-brand-primary hover:scale-105 hover:shadow-2xl hover:shadow-brand-primary/20 cursor-pointer ${recommended ? 'border-brand-primary' : 'border-gray-700'}`}
    >
        {recommended && (
            <div className="absolute -top-3 right-4 bg-brand-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                DIREKOMENDASIKAN
            </div>
        )}
        <div>
            <div className="text-3xl mb-3">{icon}</div>
            <h3 className={`font-bold text-lg text-brand-text-primary`}>{title}</h3>
            <p className={`text-sm mt-2 text-brand-text-secondary`}>{description}</p>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-xs font-semibold text-brand-primary">MENGAPA INI EFEKTIF:</p>
            <p className="text-xs mt-1 text-gray-400">{why}</p>
        </div>
    </div>
);


export const DnaValidationStep: React.FC<BlueprintValidationStepProps> = ({ initialBlueprint, referenceImage, onWorkflowSelected, onBack, allowVisualExploration, onAllowVisualExplorationChange }) => {
  const [blueprint, setBlueprint] = useState<CampaignBlueprint>(initialBlueprint);
  
  const handlePersonaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof TargetPersona) => {
      const { value } = e.target;
      const isArray = field === 'painPoints' || field === 'desiredOutcomes';
      setBlueprint(prev => ({
          ...prev,
          targetPersona: {
              ...prev.targetPersona,
              [field]: isArray ? value.split(',').map(s => s.trim()) : value
          }
      }));
  }

  const handleDnaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof CampaignBlueprint['adDna']) => {
      const { value } = e.target;
      const isArray = field === 'specificLanguagePatterns';
      setBlueprint(prev => ({
          ...prev,
          adDna: {
              ...prev.adDna,
              [field]: isArray ? value.split(',').map(s => s.trim()) : value
          }
      }));
  }

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof CampaignBlueprint['productAnalysis']) => {
    const { value } = e.target;
    setBlueprint(prev => ({
        ...prev,
        productAnalysis: {
            ...prev.productAnalysis,
            [field]: value
        }
    }));
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center mb-6 flex-shrink-0">
            <h1 className="text-3xl md:text-4xl font-extrabold">1. Validasi DNA Iklan</h1>
            <p className="text-brand-text-secondary mt-2 text-lg">Tinjau dan sempurnakan analisis strategis AI dari iklan referensi Anda.</p>
        </div>

        <div className="w-full max-w-7xl bg-brand-surface rounded-xl shadow-2xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={`data:image/jpeg;base64,${referenceImage}`} alt="Iklan Referensi" className="max-h-full max-w-full object-contain rounded-md" />
              </div>
              <div>
                  <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Produk</h3>
                   <div className="space-y-3">
                      <EditableField label="Nama Produk/Layanan" name="name" value={blueprint.productAnalysis.name} onChange={e => handleProductChange(e, 'name')} />
                      <EditableField label="Manfaat Utama" name="keyBenefit" value={blueprint.productAnalysis.keyBenefit} onChange={e => handleProductChange(e, 'keyBenefit')} />
                   </div>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Persona Target</h3>
                </div>
                <EditableTextarea label="Deskripsi Persona" name="description" value={blueprint.targetPersona.description} onChange={e => handlePersonaChange(e, 'description')} />
                <EditableField label="Rentang Usia" name="age" value={blueprint.targetPersona.age} onChange={e => handlePersonaChange(e, 'age')} />
                <EditableField label="Tipe Kreator" name="creatorType" value={blueprint.targetPersona.creatorType} onChange={e => handlePersonaChange(e, 'creatorType')} />
                <EditableTextarea label="Poin Masalah (pisahkan dengan koma)" name="painPoints" value={blueprint.targetPersona.painPoints.join(', ')} onChange={e => handlePersonaChange(e, 'painPoints')} />
                <EditableTextarea label="Hasil yang Diinginkan (pisahkan dengan koma)" name="desiredOutcomes" value={blueprint.targetPersona.desiredOutcomes.join(', ')} onChange={e => handlePersonaChange(e, 'desiredOutcomes')} />
                
                <div className="md:col-span-2 mt-2">
                    <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Analisis Iklan (DNA Penjualan)</h3>
                </div>
                <EditableField label="Mekanisme Penjualan" name="salesMechanism" value={blueprint.adDna.salesMechanism} onChange={e => handleDnaChange(e, 'salesMechanism')} />
                <EditableField label="Formula Persuasi" name="persuasionFormula" value={blueprint.adDna.persuasionFormula} onChange={e => handleDnaChange(e, 'persuasionFormula')} />
                <EditableTextarea label="Pola Teks Iklan" name="copyPattern" value={blueprint.adDna.copyPattern} onChange={e => handleDnaChange(e, 'copyPattern')} />
                <EditableTextarea label="Pola Bahasa Spesifik (pisahkan dengan koma)" name="specificLanguagePatterns" value={blueprint.adDna.specificLanguagePatterns.join(', ')} onChange={e => handleDnaChange(e, 'specificLanguagePatterns')} />
                <EditableField label="Nada Suara" name="toneOfVoice" value={blueprint.adDna.toneOfVoice} onChange={e => handleDnaChange(e, 'toneOfVoice')} />
                <EditableField label="Elemen Bukti Sosial" name="socialProofElements" value={blueprint.adDna.socialProofElements} onChange={e => handleDnaChange(e, 'socialProofElements')} />
                <EditableTextarea label="Penanganan Keberatan" name="objectionHandling" value={blueprint.adDna.objectionHandling} onChange={e => handleDnaChange(e, 'objectionHandling')} />
                <EditableField label="Gaya Visual" name="visualStyle" value={blueprint.adDna.visualStyle} onChange={e => handleDnaChange(e, 'visualStyle')} />
                <EditableField label="Ringkasan Penawaran" name="offerSummary" value={blueprint.adDna.offerSummary} onChange={e => handleDnaChange(e, 'offerSummary')} />
                <EditableField label="Ajakan Bertindak (CTA)" name="cta" value={blueprint.adDna.cta} onChange={e => handleDnaChange(e, 'cta')} />
                <EditableField label="Negara Target" name="targetCountry" value={blueprint.adDna.targetCountry} onChange={e => handleDnaChange(e, 'targetCountry')} />
            </div>
        </div>

        <div className="text-center mb-6 mt-4">
            <h1 className="text-3xl md:text-4xl font-extrabold">2. Pilih Alur Kerja Anda</h1>
            <p className="text-brand-text-secondary mt-2 text-lg">Bagaimana Anda ingin menghasilkan konsep iklan baru?</p>
        </div>

        <div className="w-full max-w-7xl">
            {/* Recommended Workflow */}
            <div
              onClick={() => onWorkflowSelected(blueprint, 'one-click-campaign')}
              className="w-full p-6 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
                        <RemixIcon className="w-6 h-6" /> Kampanye Keragaman Sekali Klik
                    </h3>
                    <p className="text-sm text-purple-200">Hasilkan 9 konsep yang berbeda secara fundamental dalam ~2 menit untuk menemukan pemenang tersembunyi dengan cepat.</p>
                  </div>
                  <div className="bg-white text-purple-700 font-bold text-xs px-3 py-1 rounded-full flex-shrink-0">
                      DIREKOMENDASIKAN
                  </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-400/50">
                  <p className="text-xs font-semibold text-white">MENGAPA INI EFEKTIF:</p>
                  <p className="text-xs mt-1 text-purple-200">Strategi Meta modern memprioritaskan pemberian keragaman kreatif (visual & persona) kepada algoritma untuk menemukan kantong audiens yang menguntungkan. Alur kerja ini mengotomatiskan praktik terbaik tersebut.</p>
              </div>
            </div>

            {/* Other Workflows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <WorkflowCard
                    icon="🎓"
                    title="Penelusuran Mendalam Manual"
                    description="Jelajahi setiap langkah strategis dari persona hingga penempatan untuk kontrol kreatif penuh."
                    why="Gunakan ini untuk memahami psikologi audiens Anda secara mendalam atau ketika Anda memiliki hipotesis yang sangat spesifik untuk diuji. Peringatan: Pastikan untuk menciptakan keragaman visual secara manual."
                    onClick={() => onWorkflowSelected(blueprint, 'deep-dive')}
                />
                <WorkflowCard
                    icon="⚡"
                    title="Skala Cepat (Remix Cerdas)"
                    description="Hasilkan variasi cepat pada 3 persona yang berbeda untuk mengidentifikasi audiens baru dengan cepat."
                    why="Menguji motivator persona yang berbeda adalah cara tercepat untuk membuka audiens baru. Ini sangat ideal untuk menskalakan kampanye yang sudah berhasil."
                    onClick={() => onWorkflowSelected(blueprint, 'quick-scale')}
                />
                <WorkflowCard
                    icon="🤳"
                    title="Paket Keragaman UGC"
                    description="Buat 4 konsep UGC yang otentik, masing-masing dari sudut pandang kreator yang berbeda."
                    why="Data Meta menunjukkan kampanye UGC dengan 4-5 sudut pandang kreator yang beragam mengungguli kampanye kreator tunggal. Ini adalah cara tercepat untuk mendapatkan bukti sosial yang otentik."
                    onClick={() => onWorkflowSelected(blueprint, 'ugc-diversity-pack')}
                />
                <WorkflowCard
                    icon="👑"
                    title="Paket Otoritas HP"
                    description="Hasilkan 3 konsep yang dipimpin oleh ahli/founder untuk mengatasi keberatan umum dan membangun kepercayaan."
                    why="Iklan yang dipimpin oleh pakar (HP) sangat baik dalam mengatasi skeptisisme audiens. Alur kerja ini mengotomatiskan pembuatan aset kepercayaan tinggi yang mengatasi keberatan utama."
                    onClick={() => onWorkflowSelected(blueprint, 'hp-authority-pack')}
                />
            </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
             <button onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">Kembali</button>
        </div>
    </div>
  );
}
