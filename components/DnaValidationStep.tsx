import React, { useState } from 'react';
import { CampaignBlueprint, TargetPersona } from '../types';

interface BlueprintValidationStepProps {
  initialBlueprint: CampaignBlueprint;
  referenceImage: string;
  onContinue: (validatedBlueprint: CampaignBlueprint) => void;
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

export const DnaValidationStep: React.FC<BlueprintValidationStepProps> = ({ initialBlueprint, referenceImage, onContinue, onBack, allowVisualExploration, onAllowVisualExplorationChange }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(blueprint);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="text-center mb-8 flex-shrink-0">
            <h1 className="text-3xl md:text-4xl font-extrabold">Validasi Campaign Blueprint</h1>
            <p className="text-brand-text-secondary mt-2 text-lg">AI telah menganalisis referensi Anda. Periksa dan sesuaikan fondasi strategis ini.</p>
        </div>

        <div className="w-full max-w-6xl bg-brand-surface rounded-xl shadow-2xl p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <div className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={`data:image/jpeg;base64,${referenceImage}`} alt="Reference Ad" className="max-h-full max-w-full object-contain rounded-md" />
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
                        <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Target Persona</h3>
                    </div>
                    <EditableTextarea label="Deskripsi Persona" name="description" value={blueprint.targetPersona.description} onChange={e => handlePersonaChange(e, 'description')} />
                    <EditableField label="Rentang Usia" name="age" value={blueprint.targetPersona.age} onChange={e => handlePersonaChange(e, 'age')} />
                    <EditableField label="Tipe Kreator" name="creatorType" value={blueprint.targetPersona.creatorType} onChange={e => handlePersonaChange(e, 'creatorType')} />
                    <EditableTextarea label="Pain Points (pisahkan koma)" name="painPoints" value={blueprint.targetPersona.painPoints.join(', ')} onChange={e => handlePersonaChange(e, 'painPoints')} />
                    <EditableTextarea label="Desired Outcomes (pisahkan koma)" name="desiredOutcomes" value={blueprint.targetPersona.desiredOutcomes.join(', ')} onChange={e => handlePersonaChange(e, 'desiredOutcomes')} />
                    
                    <div className="md:col-span-2 mt-2">
                        <h3 className="text-lg font-semibold text-brand-primary border-b border-brand-primary/30 pb-1 mb-2">Analisis Iklan (Sales DNA)</h3>
                    </div>
                    <EditableField label="Sales Mechanism" name="salesMechanism" value={blueprint.adDna.salesMechanism} onChange={e => handleDnaChange(e, 'salesMechanism')} />
                    <EditableField label="Formula Persuasi" name="persuasionFormula" value={blueprint.adDna.persuasionFormula} onChange={e => handleDnaChange(e, 'persuasionFormula')} />
                    <EditableTextarea label="Pola Copy" name="copyPattern" value={blueprint.adDna.copyPattern} onChange={e => handleDnaChange(e, 'copyPattern')} />
                    <EditableTextarea label="Pola Bahasa Spesifik (pisahkan koma)" name="specificLanguagePatterns" value={blueprint.adDna.specificLanguagePatterns.join(', ')} onChange={e => handleDnaChange(e, 'specificLanguagePatterns')} />
                    <EditableField label="Tone of Voice" name="toneOfVoice" value={blueprint.adDna.toneOfVoice} onChange={e => handleDnaChange(e, 'toneOfVoice')} />
                    <EditableField label="Elemen Social Proof" name="socialProofElements" value={blueprint.adDna.socialProofElements} onChange={e => handleDnaChange(e, 'socialProofElements')} />
                    <EditableTextarea label="Penanganan Keberatan (Objection Handling)" name="objectionHandling" value={blueprint.adDna.objectionHandling} onChange={e => handleDnaChange(e, 'objectionHandling')} />
                    <EditableField label="Gaya Visual" name="visualStyle" value={blueprint.adDna.visualStyle} onChange={e => handleDnaChange(e, 'visualStyle')} />
                    <EditableField label="Ringkasan Penawaran" name="offerSummary" value={blueprint.adDna.offerSummary} onChange={e => handleDnaChange(e, 'offerSummary')} />
                    <EditableField label="Call to Action (CTA)" name="cta" value={blueprint.adDna.cta} onChange={e => handleDnaChange(e, 'cta')} />
                    <EditableField label="Target Negara" name="targetCountry" value={blueprint.adDna.targetCountry} onChange={e => handleDnaChange(e, 'targetCountry')} />
                    
                    <div className="md:col-span-2 flex items-center space-x-2 mt-2 p-3 bg-gray-900/50 rounded-lg">
                        <input
                            type="checkbox"
                            id="allowVisualExploration"
                            checked={allowVisualExploration}
                            onChange={(e) => onAllowVisualExplorationChange(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="allowVisualExploration" className="text-sm font-medium text-brand-text-secondary">
                            Izinkan AI bereksplorasi dengan gaya visual baru (berbeda dari referensi).
                        </label>
                    </div>

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