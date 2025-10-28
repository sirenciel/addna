import React, { useState } from 'react';
import { CampaignBlueprint, TargetPersona } from '../types';

interface BlueprintValidationStepProps {
  initialBlueprint: CampaignBlueprint;
  referenceImage: string;
  onContinue: (validatedBlueprint: CampaignBlueprint) => void;
  onBack: () => void;
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

export const DnaValidationStep: React.FC<BlueprintValidationStepProps> = ({ initialBlueprint, referenceImage, onContinue, onBack }) => {
  const [blueprint, setBlueprint] = useState<CampaignBlueprint>(initialBlueprint);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, section: keyof CampaignBlueprint, field: string) => {
    const { value } = e.target;
    setBlueprint(prev => ({
        ...prev,
        [section]: {
            // @ts-ignore
            ...prev[section],
            [field]: value
        }
    }));
  };
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(blueprint);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold">Validasi Campaign Blueprint</h1>
            <p className="text-brand-text-secondary mt-2 text-lg">AI telah menganalisis referensi Anda. Periksa dan sesuaikan fondasi strategis ini.</p>
        </div>

        <div className="w-full max-w-6xl bg-brand-surface rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 w-full aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={`data:image/jpeg;base64,${referenceImage}`} alt="Reference Ad" className="max-h-full max-w-full object-contain rounded-md" />
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Target Persona</h3>
                    </div>
                    <EditableTextarea label="Deskripsi Persona" name="description" value={blueprint.targetPersona.description} onChange={e => handlePersonaChange(e, 'description')} />
                    <div>
                        <EditableField label="Rentang Usia" name="age" value={blueprint.targetPersona.age} onChange={e => handlePersonaChange(e, 'age')} />
                    </div>
                     <div>
                        <EditableField label="Tipe Kreator" name="creatorType" value={blueprint.targetPersona.creatorType} onChange={e => handlePersonaChange(e, 'creatorType')} />
                    </div>
                    <EditableTextarea label="Pain Points (pisahkan dengan koma)" name="painPoints" value={blueprint.targetPersona.painPoints.join(', ')} onChange={e => handlePersonaChange(e, 'painPoints')} />
                    <EditableTextarea label="Desired Outcomes (pisahkan dengan koma)" name="desiredOutcomes" value={blueprint.targetPersona.desiredOutcomes.join(', ')} onChange={e => handlePersonaChange(e, 'desiredOutcomes')} />
                    
                    <div className="md:col-span-2 mt-2">
                        <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Produk & Penawaran</h3>
                    </div>
                    <EditableField label="Nama Produk/Layanan" name="name" value={blueprint.productAnalysis.name} onChange={e => handleInputChange(e, 'productAnalysis', 'name')} />
                    <EditableField label="Manfaat Utama" name="keyBenefit" value={blueprint.productAnalysis.keyBenefit} onChange={e => handleInputChange(e, 'productAnalysis', 'keyBenefit')} />
                    <EditableField label="Ringkasan Penawaran" name="summary" value={blueprint.offerAnalysis.summary} onChange={e => handleInputChange(e, 'offerAnalysis', 'summary')} />
                    <EditableField label="Call to Action (CTA)" name="cta" value={blueprint.offerAnalysis.cta} onChange={e => handleInputChange(e, 'offerAnalysis', 'cta')} />

                    <div className="md:col-span-2 mt-2">
                        <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Analisis Iklan (DNA)</h3>
                    </div>
                    <EditableField label="Fokus Visual" name="visualFocus" value={blueprint.adDna.visualFocus} onChange={e => handleInputChange(e, 'adDna', 'visualFocus')} />
                    <EditableField label="Emosi/Nilai" name="emotionValue" value={blueprint.adDna.emotionValue} onChange={e => handleInputChange(e, 'adDna', 'emotionValue')} />
                    <EditableField label="Text Hook" name="textHook" value={blueprint.adDna.textHook} onChange={e => handleInputChange(e, 'adDna', 'textHook')} />
                     <EditableField label="Gaya Visual" name="visualStyle" value={blueprint.adDna.visualStyle} onChange={e => handleInputChange(e, 'adDna', 'visualStyle')} />
                     <EditableField label="Target Negara" name="targetCountry" value={blueprint.adDna.targetCountry} onChange={e => handleInputChange(e, 'adDna', 'targetCountry')} />
                </div>
                
                <div className="lg:col-span-3 flex justify-between items-center pt-4 border-t border-gray-700 mt-2">
                    <button type="button" onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">
                        Kembali
                    </button>
                    <button type="submit" className="px-8 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-indigo-500 transition-transform transform hover:scale-105">
                        Lanjutkan & Buat Angle
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};