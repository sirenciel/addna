
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

const getImpact = (component: AdDnaComponent): { label: string; icon: string; color: string; description: string; } => {
    switch (component) {
        case 'persona':
        case 'format':
        case 'placement':
        case 'visualVehicle':
            return { label: 'DAMPAK TINGGI', icon: '🚀', color: 'text-green-400', description: 'Membuka audiens baru / Entity ID baru' };
        case 'angle':
        case 'trigger':
        case 'offer':
        case 'painDesire':
        case 'awareness':
        case 'objection':
             return { label: 'DAMPAK RENDAH', icon: '⚠️', color: 'text-yellow-400', description: 'Mengoptimalkan audiens yang sama' };
        default:
             return { label: 'OPTIMASI', icon: '⚙️', color: 'text-gray-400', description: 'Penyesuaian minor' };
    }
}

const DnaRow: React.FC<{
    label: string;
    value: string;
    component: AdDnaComponent;
    onRemix: (component: AdDnaComponent) => void;
    remixingComponent: AdDnaComponent | null;
    disabled?: boolean;
}> = ({ label, value, component, onRemix, remixingComponent, disabled = false }) => {
    const impact = getImpact(component);

    return (
        <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <div>
                <span className="text-xs text-brand-text-secondary">{label}</span>
                <p className="font-semibold">{value}</p>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${impact.color}`}>
                    <span>{impact.icon}</span>
                    <span>{impact.label}:</span>
                    <span className="font-normal text-gray-400">{impact.description}</span>
                </div>
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
};

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
                <h1 className="text-4xl md:text-5xl font-extrabold">Remix Cerdas</h1>
                <p className="text-brand-text-secondary mt-2 text-lg">Buat variasi dari konsep unggulan dengan mengubah satu elemen DNA.</p>
            </header>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kolom Kiri: DNA */}
                <div className="bg-brand-surface border border-gray-700 rounded-xl p-6 space-y-3">
                    <h2 className="text-xl font-bold mb-4">DNA Iklan Unggulan</h2>
                    <DnaRow label="Persona" value={remixDna.persona.description} component="persona" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Format" value={remixDna.format} component="format" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Visual Vehicle" value={remixTarget.visualVehicle} component="visualVehicle" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Sudut Pandang" value={remixDna.angle} component="angle" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Pemicu" value={remixDna.trigger.name} component="trigger" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Penawaran" value={remixDna.offer.name} component="offer" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Keberatan" value={remixDna.objection.name} component="objection" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                    <DnaRow label="Poin Masalah/Keinginan" value={remixDna.painDesire.name} component="painDesire" onRemix={onRequestSuggestions} remixingComponent={remixingComponent} />
                </div>

                {/* Kolom Kanan: Opsi Remix */}
                <div className="bg-brand-surface/50 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold mb-4">Opsi Remix</h2>
                    {remixingComponent && !suggestions ? (
                         <div className="flex items-center justify-center h-full text-brand-text-secondary">
                            <RefreshCwIcon className="w-6 h-6 animate-spin mr-3" />
                            <span>Membuat ide remix untuk <strong>{remixingComponent}</strong>...</span>
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
                            <div>
                                <p className="font-semibold text-lg">Pilih Komponen untuk Diremix</p>
                                <p className="mt-2 text-sm">Klik tombol [Remix] di sebelah kiri untuk membuat variasi strategis.</p>
                                <div className="mt-4 text-left p-3 bg-gray-900/50 rounded-lg text-xs space-y-2">
                                     <p><strong className="text-green-400">🚀 DAMPAK TINGGI:</strong> Mengubah Persona atau Format adalah cara tercepat untuk menemukan audiens yang sama sekali baru.</p>
                                     <p><strong className="text-yellow-400">⚠️ DAMPAK RENDAH:</strong> Mengubah Sudut Pandang atau Pemicu mengoptimalkan pesan untuk audiens yang sudah ada.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8">
                <button onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">
                    Kembali ke Galeri
                </button>
            </div>
        </div>
    );
};
