
import React from 'react';
import { AdConcept, AdDna, AdDnaComponent, RemixSuggestion } from '../types';
import { RefreshCwIcon } from './icons';

interface RemixDashboardProps {
    remixTarget: AdConcept;
    remixDna: AdDna;
    suggestions: RemixSuggestion[] | null;
    remixingComponent: AdDnaComponent | null;
    onRequestSuggestions: (component: AdDnaComponent) => void;
    onExecuteRemix: (suggestion: RemixSuggestion) => void;
    onBack: () => void;
}

const DnaRow: React.FC<{
    label: string;
    value: string;
    component: AdDnaComponent;
    onRemix: (component: AdDnaComponent) => void;
    remixingComponent: AdDnaComponent | null;
    disabled?: boolean;
}> = ({ label, value, component, onRemix, remixingComponent, disabled = false }) => (
    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
        <div>
            <span className="text-xs text-brand-text-secondary">{label}</span>
            <p className="font-semibold">{value}</p>
        </div>
        <button 
            onClick={() => onRemix(component)}
            disabled={disabled || remixingComponent === component}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-wait"
        >
            <RefreshCwIcon className={`w-4 h-4 ${remixingComponent === component ? 'animate-spin' : ''}`} />
            Remix
        </button>
    </div>
);

export const RemixDashboard: React.FC<RemixDashboardProps> = ({
    remixTarget,
    remixDna,
    suggestions,
    remixingComponent,
    onRequestSuggestions,
    onExecuteRemix,
    onBack,
}) => {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-brand-background overflow-y-auto">
             <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-purple-600/10 via-brand-background to-brand-background -z-10"></div>
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold">Smart Remix</h1>
                <p className="text-brand-text-secondary mt-2 text-lg">Buat variasi dari konsep unggulan dengan mengubah satu elemen DNA.</p>
            </header>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kolom Kiri: DNA */}
                <div className="bg-brand-surface border border-gray-700 rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-bold mb-4">DNA Iklan Unggulan</h2>
                    <DnaRow label="👤 Persona" value={remixDna.persona.description} component="persona" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="😰 Pain / Desire" value={remixDna.painDesire.name} component="painDesire" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} disabled={true} />
                    <DnaRow label="🎯 Trigger" value={remixDna.trigger.name} component="trigger" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} disabled={true} />
                    <DnaRow label="🎨 Format" value={remixDna.format} component="format" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} disabled={true} />
                    <DnaRow label="📱 Placement" value={remixDna.placement} component="placement" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} disabled={true} />
                    <DnaRow label="🔥 Awareness" value={remixDna.awareness} component="awareness" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} disabled={true} />
                </div>

                {/* Kolom Kanan: Opsi Remix */}
                <div className="bg-brand-surface/50 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold mb-4">Opsi Remix</h2>
                    {remixingComponent && !suggestions ? (
                         <div className="flex items-center justify-center h-full text-brand-text-secondary">
                            <RefreshCwIcon className="w-6 h-6 animate-spin mr-3" />
                            <span>Menghasilkan ide remix untuk <strong>{remixingComponent}</strong>...</span>
                         </div>
                    ) : suggestions ? (
                        <div className="space-y-4">
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                                    <h3 className="font-bold text-brand-primary">{suggestion.title}</h3>
                                    <p className="text-sm text-brand-text-secondary mt-1">{suggestion.description}</p>
                                    <button
                                        onClick={() => onExecuteRemix(suggestion)}
                                        className="mt-3 w-full px-4 py-2 bg-brand-secondary text-white font-bold rounded-lg hover:bg-green-500"
                                    >
                                        Pilih & Hasilkan Konsep
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-brand-text-secondary">
                            <p>Klik tombol [Remix] di sebelah kiri untuk memulai.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8">
                <button onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">
                    Kembali ke Mind Map
                </button>
            </div>
        </div>
    );
};
