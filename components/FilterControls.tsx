
import React, { useMemo } from 'react';
import { AdConcept, MindMapNode } from '../types';

export interface GalleryFilters {
  angle: string;
  persona: string;
  format: string;
  trigger: string;
  campaignTag: string;
}

interface FilterControlsProps {
  nodes: MindMapNode[];
  concepts: AdConcept[];
  onFilterChange: (filters: Partial<GalleryFilters>) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({ nodes, concepts, onFilterChange }) => {
    
    const { angleOptions, personaOptions, formatOptions, triggerOptions, tagOptions } = useMemo(() => {
        const angles = new Map<string, string>();
        nodes.forEach(node => {
            if (node.type === 'angle') {
                angles.set(node.id, node.label);
            }
        });

        const personas = [...new Set(concepts.map(c => c.personaDescription))];
        const formats = [...new Set(concepts.map(c => c.format))];
        const triggers = [...new Set(concepts.map(c => c.trigger.name))];
        const tags = [...new Set(concepts.map(c => c.campaignTag).filter(Boolean))] as string[];

        return {
            angleOptions: Array.from(angles.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label)),
            personaOptions: personas.sort(),
            formatOptions: formats.sort(),
            triggerOptions: triggers.sort(),
            tagOptions: tags.sort(),
        };
    }, [nodes, concepts]);

    const handleFilterChange = (filterName: keyof GalleryFilters, value: string) => {
        onFilterChange({ [filterName]: value });
    };

    return (
        <div className="px-4 md:px-0">
            <div className="flex flex-wrap items-center gap-4">
                {tagOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="tagFilter" className="text-sm font-medium text-brand-text-secondary">Batch:</label>
                        <select 
                            id="tagFilter"
                            onChange={e => handleFilterChange('campaignTag', e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-md py-1 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="all">All Batches</option>
                            {tagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                    </div>
                )}
                
                {personaOptions.length > 0 && (
                     <div className="flex items-center gap-2">
                        <label htmlFor="personaFilter" className="text-sm font-medium text-brand-text-secondary">Persona:</label>
                        <select 
                            id="personaFilter"
                            onChange={e => handleFilterChange('persona', e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-md py-1 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="all">All Personas</option>
                            {personaOptions.map(persona => <option key={persona} value={persona}>{persona}</option>)}
                        </select>
                    </div>
                )}
                
                {formatOptions.length > 0 && (
                     <div className="flex items-center gap-2">
                         <label htmlFor="formatFilter" className="text-sm font-medium text-brand-text-secondary">Format:</label>
                        <select 
                            id="formatFilter"
                            onChange={e => handleFilterChange('format', e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-md py-1 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="all">All Formats</option>
                            {formatOptions.map(format => <option key={format} value={format}>{format}</option>)}
                        </select>
                    </div>
                )}
                
                {triggerOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                         <label htmlFor="triggerFilter" className="text-sm font-medium text-brand-text-secondary">Trigger:</label>
                        <select 
                            id="triggerFilter"
                            onChange={e => handleFilterChange('trigger', e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-md py-1 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="all">All Triggers</option>
                            {triggerOptions.map(trigger => <option key={trigger} value={trigger}>{trigger}</option>)}
                        </select>
                    </div>
                )}
                
                {angleOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="angleFilter" className="text-sm font-medium text-brand-text-secondary">Angle:</label>
                        <select 
                            id="angleFilter"
                            onChange={e => handleFilterChange('angle', e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-md py-1 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="all">All Angles</option>
                            {angleOptions.map(angle => (
                                <option key={angle.id} value={angle.id}>{angle.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};
