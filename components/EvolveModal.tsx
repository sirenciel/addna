

import React, { useState, useMemo } from 'react';
import { AdConcept, MindMapNode, ALL_CREATIVE_FORMATS, ALL_PLACEMENT_FORMATS } from '../types';
import { LightbulbIcon, FireIcon, EditIcon, LayoutGridIcon, SparklesIcon } from './icons';

type EvolutionType = 'angle' | 'trigger' | 'format' | 'placement';

interface EvolveModalProps {
    concept: AdConcept;
    nodes: MindMapNode[];
    onClose: () => void;
    onEvolve: (baseConcept: AdConcept, evolutionType: EvolutionType, newValue: string) => void;
}

const ALL_BUYING_TRIGGERS = [
    'Social Proof', 'Authority', 'Scarcity', 'Urgency', 'Reciprocity',
    'Liking', 'Fear of Missing Out (FOMO)', 'Exclusivity', 'Instant Gratification'
];

export const EvolveModal: React.FC<EvolveModalProps> = ({ concept, nodes, onClose, onEvolve }) => {
    const [selectedAngle, setSelectedAngle] = useState('');
    const [selectedTrigger, setSelectedTrigger] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('');
    const [selectedPlacement, setSelectedPlacement] = useState('');

    const { angleOptions, triggerOptions, formatOptions, placementOptions } = useMemo(() => {
        const nodesMap: Map<string, MindMapNode> = new Map(nodes.map(node => [node.id, node]));

        const findParent = (startNodeId: string | undefined, targetType: 'angle' | 'trigger' | 'format' | 'placement' | 'awareness'): MindMapNode | undefined => {
            if (!startNodeId) return undefined;
            let currentNode = nodesMap.get(startNodeId);
            while (currentNode) {
                if (currentNode.type === targetType) return currentNode;
                currentNode = currentNode.parentId ? nodesMap.get(currentNode.parentId) : undefined;
            }
            return undefined;
        };

        const placementNode = nodesMap.get(concept.strategicPathId);
        const currentAngleNode = findParent(placementNode?.id, 'angle');
        const awarenessNode = findParent(currentAngleNode?.id, 'awareness');

        const angles = awarenessNode
            ? nodes.filter(n => n.parentId === awarenessNode.id && n.type === 'angle' && n.label !== concept.angle)
            : [];
        
        const formats = ALL_CREATIVE_FORMATS.filter(f => f !== concept.format);
        const placements = ALL_PLACEMENT_FORMATS.filter(p => p !== concept.placement);
        const triggers = ALL_BUYING_TRIGGERS.filter(t => t !== concept.trigger.name);

        return {
            angleOptions: angles,
            triggerOptions: triggers,
            formatOptions: formats,
            placementOptions: placements
        };
    }, [nodes, concept]);

    const handleEvolve = (type: EvolutionType, value: string) => {
        if (!value) {
            alert('Please select a new option.');
            return;
        }
        onEvolve(concept, type, value);
    };
    
    const EvolutionSection: React.FC<{
        title: string;
        type: EvolutionType;
        icon: React.ReactNode;
        options: { id?: string; label: string }[];
        selectedValue: string;
        onValueChange: (value: string) => void;
    }> = ({ title, type, icon, options, selectedValue, onValueChange }) => (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h4 className="flex items-center gap-2 font-semibold text-lg mb-3">
                {icon}
                Change {title}
            </h4>
            <div className="flex items-center gap-2">
                <select
                    value={selectedValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    className="flex-grow bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-brand-primary"
                >
                    <option value="">Choose a new {title}...</option>
                    {options.map(opt => <option key={opt.id || opt.label} value={opt.label}>{opt.label}</option>)}
                </select>
                <button
                    onClick={() => handleEvolve(type, selectedValue)}
                    disabled={!selectedValue}
                    className="px-4 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <SparklesIcon className="w-4 h-4" />
                    Evolve
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Strategic Evolution</h2>
                    <p className="text-sm text-brand-text-secondary">Adapt this concept by changing one key element.</p>
                </header>

                <main className="p-6 space-y-4 overflow-y-auto">
                    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm font-bold text-yellow-300">💡 Recommendation:</p>
                        <p className="text-xs mt-1 text-yellow-200">
                            {concept.performanceSignals?.scalingPotential === 'high' 
                                ? "This concept has high scaling potential. To reach NEW audiences, change the Visual (different setting/persona) by creating a 'Quick Pivot' while keeping the angle/trigger. To find a new winning message, change the Angle or Trigger here."
                                : "This concept's potential is undetermined. Consider evolving the Angle or Trigger first to test a different message strategy before scaling visuals."}
                        </p>
                    </div>

                   <EvolutionSection
                        title="Angle"
                        type="angle"
                        icon={<LightbulbIcon className="w-5 h-5 text-yellow-400" />}
                        options={angleOptions.map(n => ({ id: n.id, label: n.label }))}
                        selectedValue={selectedAngle}
                        onValueChange={setSelectedAngle}
                   />
                   <EvolutionSection
                        title="Buying Trigger"
                        type="trigger"
                        icon={<FireIcon className="w-5 h-5 text-orange-400" />}
                        options={triggerOptions.map(t => ({ label: t }))}
                        selectedValue={selectedTrigger}
                        onValueChange={setSelectedTrigger}
                   />
                   <EvolutionSection
                        title="Creative Format"
                        type="format"
                        icon={<EditIcon className="w-5 h-5 text-green-400" />}
                        options={formatOptions.map(f => ({ label: f }))}
                        selectedValue={selectedFormat}
                        onValueChange={setSelectedFormat}
                   />
                   <EvolutionSection
                        title="Placement"
                        type="placement"
                        icon={<LayoutGridIcon className="w-5 h-5 text-sky-400" />}
                        options={placementOptions.map(p => ({ label: p }))}
                        selectedValue={selectedPlacement}
                        onValueChange={setSelectedPlacement}
                   />
                </main>

                <footer className="p-4 border-t border-gray-700 bg-brand-surface rounded-b-xl text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};
