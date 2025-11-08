

import React, { useState } from 'react';
import { AdConcept, CampaignBlueprint, PivotConfig, PivotType, AwarenessStage, ALL_AWARENESS_STAGES } from '../types';
import { ZapIcon } from './icons';

interface QuickPivotModalProps {
  baseConcept: AdConcept;
  blueprint: CampaignBlueprint;
  onGenerate: (pivotType: PivotType, config: PivotConfig) => void;
  onClose: () => void;
}

const PIVOT_LABELS: Record<PivotType, string> = {
    'age-shift': 'Age Group Shift',
    'gender-flip': 'Gender Flip',
    'lifestyle-swap': 'Lifestyle/Creator Type Swap',
    'market-expand': 'Market Expansion',
    'awareness-shift': 'Awareness Stage Shift',
    'channel-adapt': 'Platform Adaptation'
};

const inferGender = (description: string): 'Male' | 'Female' | 'Unknown' => {
    const maleKeywords = ['pria', 'laki-laki', 'ayah', 'suami', 'male', 'man', 'father', 'husband'];
    const femaleKeywords = ['wanita', 'perempuan', 'ibu', 'istri', 'female', 'woman', 'mother', 'wife'];
    const lowerDesc = description.toLowerCase();
    if (maleKeywords.some(kw => lowerDesc.includes(kw))) return 'Male';
    if (femaleKeywords.some(kw => lowerDesc.includes(kw))) return 'Female';
    return 'Unknown';
}

// --- Sub-Components for Modal ---

const PivotCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  examples: string[];
}> = ({ icon, title, description, isSelected, onClick, examples }) => (
  <div
    onClick={onClick}
    className={`
      p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
      ${isSelected 
        ? 'border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20' 
        : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
      }
    `}
  >
    <div className="flex items-start gap-3">
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <h4 className="font-bold text-base">{title}</h4>
        <p className="text-xs text-brand-text-secondary mt-1">{description}</p>
        <div className="mt-2 space-y-1">
          {examples.map((ex, i) => (
            <p key={i} className="text-xs text-gray-400 italic">• {ex}</p>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AgeShiftConfig: React.FC<{
  currentAge: string;
  onChange: (newAge: string) => void;
}> = ({ currentAge, onChange }) => {
  const ageGroups = [
    { label: '13-17 (Gen Alpha)', value: '13-17', psychographic: 'TikTok-native, meme culture, authentic UGC' },
    { label: '18-24 (Gen Z)', value: '18-24', psychographic: 'Social justice conscious, mental health focus, irony & humor' },
    { label: '25-34 (Millennials)', value: '25-34', psychographic: 'Career-focused, wellness, work-life balance' },
    { label: '35-44 (Older Millennials)', value: '35-44', psychographic: 'Family-oriented, financial security, quality over quantity' },
    { label: '45-54 (Gen X)', value: '45-54', psychographic: 'Practical, skeptical of hype, values proven results' },
    { label: '55+ (Boomers+)', value: '55+', psychographic: 'Trust-driven, prefers clarity, responsive to authority' }
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <strong>Currently:</strong> <span className="text-brand-primary">{currentAge}</span>
      </p>
      <div className="grid grid-cols-1 gap-2">
        {ageGroups
          .filter(ag => ag.value !== currentAge)
          .map(ag => (
            <label 
              key={ag.value}
              className="flex items-start gap-3 p-3 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 border border-gray-700 hover:border-brand-primary transition-all"
            >
              <input 
                type="radio" 
                name="targetAge"
                value={ag.value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm">{ag.label}</p>
                <p className="text-xs text-gray-400 mt-1">{ag.psychographic}</p>
              </div>
            </label>
          ))
        }
      </div>
    </div>
  );
};

const GenderFlipConfig: React.FC<{
  currentGender: 'Male' | 'Female' | 'Unknown';
  onChange: (newGender: 'Male' | 'Female') => void;
}> = ({ currentGender, onChange }) => (
    <div>
        <p className="text-sm mb-2"><strong>Currently:</strong> <span className="text-brand-primary">{currentGender}</span></p>
        <div className="flex gap-4">
            {['Male', 'Female'].filter(g => g !== currentGender).map(gender => (
                 <label key={gender} className="flex items-center gap-2 p-3 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 border border-gray-700 hover:border-brand-primary transition-all flex-1">
                    <input type="radio" name="targetGender" value={gender} onChange={(e) => onChange(e.target.value as 'Male' | 'Female')} />
                    <span>Target {gender}</span>
                 </label>
            ))}
        </div>
    </div>
);

const LifestyleSwapConfig: React.FC<{
  currentType: string;
  onChange: (newType: string) => void;
}> = ({ currentType, onChange }) => {
    const options = ['Influencer', 'Regular User', 'Expert'].filter(t => t !== currentType);
    return (
        <div>
            <p className="text-sm mb-2"><strong>Currently:</strong> <span className="text-brand-primary">{currentType}</span></p>
             <select onChange={(e) => onChange(e.target.value)} defaultValue="" className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-brand-primary">
                <option value="" disabled>Choose a New Type...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
};

const MarketExpandConfig: React.FC<{
  currentCountry: string;
  onChange: (newCountry: string) => void;
}> = ({ currentCountry, onChange }) => {
  const markets = [
    { code: 'ID', name: 'Indonesia', culturalNotes: 'Colloquial slang, family values, halal-consciousness, installment payment culture' },
    { code: 'MY', name: 'Malaysia', culturalNotes: 'Malay/English mix, strong Islamic influence, brand loyalty, "kiasu" mentality' },
    { code: 'SG', name: 'Singapore', culturalNotes: 'Singlish, efficiency focus, high income, sustainability-conscious' },
    { code: 'PH', name: 'Philippines', culturalNotes: 'Taglish, highly social media active, family-centric, aspiration-driven' },
    { code: 'TH', name: 'Thailand', culturalNotes: 'Thai script important, K-beauty influence, "sanuk" (fun) culture, influencer-driven' },
    { code: 'VN', name: 'Vietnam', culturalNotes: 'Growing middle class, price-sensitive, mobile-first, local payment methods' }
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm"><strong>Current Market:</strong> <span className="text-brand-primary">{currentCountry}</span></p>
      <div className="grid grid-cols-1 gap-2">
        {markets.filter(m => m.name !== currentCountry).map(market => (
            <label key={market.code} className="flex items-start gap-3 p-3 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 border border-gray-700 hover:border-brand-primary transition-all">
              <input type="radio" name="targetMarket" value={market.name} onChange={(e) => onChange(e.target.value)} className="mt-1"/>
              <div className="flex-1">
                <p className="font-semibold text-sm">{market.name}</p>
                <p className="text-xs text-gray-400 mt-1"><strong>Cultural Keys:</strong> {market.culturalNotes}</p>
              </div>
            </label>
          ))
        }
      </div>
      <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
        <p className="text-xs text-yellow-300">⚠️ <strong>Auto-Adjustments:</strong> Language, payment references, visual styles, social proof sources, and units of measurement will be automatically adapted.</p>
      </div>
    </div>
  );
};


const AwarenessShiftConfig: React.FC<{
  currentStage: AwarenessStage;
  onChange: (newStage: AwarenessStage) => void;
}> = ({ currentStage, onChange }) => {
    const options = ALL_AWARENESS_STAGES.filter(s => s !== currentStage);
    return (
        <div>
            <p className="text-sm mb-2"><strong>Currently:</strong> <span className="text-brand-primary">{currentStage}</span></p>
             <select onChange={(e) => onChange(e.target.value as AwarenessStage)} defaultValue="" className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-brand-primary">
                <option value="" disabled>Choose a New Stage...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
};

const ChannelAdaptConfig: React.FC<{
  currentPlatform: string;
  onChange: (newPlatform: 'TikTok' | 'Facebook' | 'YouTube') => void;
}> = ({ onChange }) => {
    const options: ('TikTok' | 'Facebook' | 'YouTube')[] = ['TikTok', 'Facebook', 'YouTube'];
    return (
        <div>
            <p className="text-sm mb-2"><strong>Currently:</strong> <span className="text-brand-primary">Instagram</span></p>
             <select onChange={(e) => onChange(e.target.value as 'TikTok' | 'Facebook' | 'YouTube')} defaultValue="" className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-brand-primary">
                <option value="" disabled>Choose a New Platform...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
};


// --- Main Modal Component ---

export const QuickPivotModal: React.FC<QuickPivotModalProps> = ({ baseConcept, blueprint, onGenerate, onClose }) => {
  const [selectedPivot, setSelectedPivot] = useState<PivotType | null>(null);
  const [config, setConfig] = useState<PivotConfig>({});

  const handleGenerateClick = () => {
      if (selectedPivot) {
          onGenerate(selectedPivot, config);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold flex items-center gap-2"><ZapIcon className="w-6 h-6 text-yellow-400" />Quick Pivot from a Winning Concept</h2>
          <p className="text-sm text-brand-text-secondary mt-2">Base: <span className="text-brand-primary font-semibold">{baseConcept.headline}</span></p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-1 bg-purple-600 rounded-full">{baseConcept.personaDescription}</span>
            <span className="text-xs px-2 py-1 bg-orange-600 rounded-full">{baseConcept.trigger.name}</span>
          </div>
        </header>

        <main className="p-6 space-y-4 overflow-y-auto">
          <h3 className="text-lg font-semibold">Choose a Pivot Type:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PivotCard icon="👥" title="Age Group Shift" description="Adapt for a different age demographic" isSelected={selectedPivot === 'age-shift'} onClick={() => setSelectedPivot('age-shift')} examples={["25-35 → 18-24 (Gen Z TikTok)", "25-35 → 40-55 (Mature Market)"]}/>
            <PivotCard icon="⚧️" title="Gender Flip" description="Change the target gender, adjusting pain points" isSelected={selectedPivot === 'gender-flip'} onClick={() => setSelectedPivot('gender-flip')} examples={["Targeting Men → Women", "Targeting Women → Men"]}/>
            <PivotCard icon="🎨" title="Lifestyle/Creator Type Swap" description="Change the persona's aesthetic & values" isSelected={selectedPivot === 'lifestyle-swap'} onClick={() => setSelectedPivot('lifestyle-swap')} examples={["Influencer → Regular User", "Corporate → Freelancer"]}/>
            <PivotCard icon="🌍" title="Market Expansion" description="Localize for another country/culture" isSelected={selectedPivot === 'market-expand'} onClick={() => setSelectedPivot('market-expand')} examples={["USA → UK", "USA → Australia"]}/>
            <PivotCard icon="🧠" title="Awareness Stage Shift" description="Retarget for a different stage of awareness" isSelected={selectedPivot === 'awareness-shift'} onClick={() => setSelectedPivot('awareness-shift')} examples={["Product Aware → Unaware (cold)", "Problem Aware → Solution Aware"]}/>
            <PivotCard icon="📱" title="Platform Adaptation" description="Optimize for a different platform" isSelected={selectedPivot === 'channel-adapt'} onClick={() => setSelectedPivot('channel-adapt')} examples={["Instagram → TikTok", "Instagram → Facebook (older demo)"]}/>
          </div>

          {selectedPivot && (
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <h4 className="font-semibold mb-3 text-brand-primary">Configure {PIVOT_LABELS[selectedPivot]}:</h4>
              {selectedPivot === 'age-shift' && <AgeShiftConfig currentAge={baseConcept.personaAge} onChange={(newAge) => setConfig({ targetAge: newAge })} />}
              {selectedPivot === 'gender-flip' && <GenderFlipConfig currentGender={inferGender(baseConcept.personaDescription)} onChange={(newGender) => setConfig({ targetGender: newGender })} />}
              {selectedPivot === 'lifestyle-swap' && <LifestyleSwapConfig currentType={baseConcept.personaCreatorType} onChange={(newType) => setConfig({ targetLifestyle: newType })} />}
              {selectedPivot === 'market-expand' && <MarketExpandConfig currentCountry={blueprint.adDna.targetCountry} onChange={(newCountry) => setConfig({ targetCountry: newCountry })} />}
              {selectedPivot === 'awareness-shift' && <AwarenessShiftConfig currentStage={baseConcept.awarenessStage} onChange={(newStage) => setConfig({ targetAwareness: newStage })} />}
              {selectedPivot === 'channel-adapt' && <ChannelAdaptConfig currentPlatform="Instagram" onChange={(newPlatform) => setConfig({ targetPlatform: newPlatform })} />}

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-md">
                <p className="text-xs font-semibold text-blue-300 mb-2">🔄 What Will Change:</p>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>✓ Persona description & pain points adjusted</li>
                  <li>✓ Headline & hook rewritten for the new audience</li>
                  <li>✓ Visual prompt adapted (style, setting, model)</li>
                  <li>✓ Tone & language patterns adjusted</li>
                </ul>
                <p className="text-xs text-brand-text-secondary mt-2">✅ What Stays: Angle ("{baseConcept.angle}"), Trigger ("{baseConcept.trigger.name}"), Format ("{baseConcept.format}")</p>
              </div>
            </div>
          )}
        </main>

        <footer className="p-6 border-t border-gray-700 flex justify-between items-center">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">Cancel</button>
          <button onClick={handleGenerateClick} disabled={!selectedPivot} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <ZapIcon className="w-5 h-5" />
            Generate Pivoted Concept
          </button>
        </footer>
      </div>
    </div>
  );
};