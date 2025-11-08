

import React, { useState, useMemo } from 'react';
import { MindMapNode, AdConcept, CampaignBlueprint } from '../types';
import { FilterControls } from './FilterControls';
import { CreativeCard } from './CreativeCard';
import { EditModal } from './EditModal';
import { DownloadIcon, RefreshCwIcon } from './icons';
import { exportConceptsToZip } from '../services/exportService';

interface ConceptGalleryProps {
    nodes: MindMapNode[];
    concepts: AdConcept[];
    editingConcept: AdConcept | null;
    campaignBlueprint: CampaignBlueprint | null;
    onGenerateImage: (conceptId: string) => void;
    onEditConcept: (conceptId: string) => void;
    onInitiateEvolution: (conceptId: string) => void;
    onInitiateQuickPivot: (conceptId: string) => void;
    onInitiateRemix: (conceptId: string) => void;
    onSaveConcept: (conceptId: string, updatedContent: AdConcept) => void;
    onCloseModal: () => void;
    onReset: () => void;
    onSwitchView: () => void;
    onOpenLightbox: (concept: AdConcept, startIndex: number) => void;
}

export const ConceptGallery: React.FC<ConceptGalleryProps> = (props) => {
    const { concepts, nodes, onReset } = props;
    const [filters, setFilters] = useState<{ angle: string }>({ angle: 'all' });
    const [isExporting, setIsExporting] = useState<boolean>(false);

    const filteredConcepts = useMemo(() => {
        if (filters.angle === 'all') {
            return concepts;
        }

        const findParentAngleRecursively = (nodeId: string | undefined, targetAngleId: string): boolean => {
            if (!nodeId) return false;
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return false;
            if (node.type === 'angle' && node.id === targetAngleId) return true;
            return findParentAngleRecursively(node.parentId, targetAngleId);
        };
        
        return concepts.filter(concept => {
            const placementNode = nodes.find(n => n.id === concept.strategicPathId);
            return findParentAngleRecursively(placementNode?.parentId, filters.angle);
        });

    }, [concepts, filters, nodes]);
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportConceptsToZip(filteredConcepts);
        } catch (error) { console.error("Export failed:", error); alert("Failed to download assets."); }
        finally { setIsExporting(false); }
    };

    const creativeNodes = useMemo(() => nodes.filter(n => n.type === 'creative'), [nodes]);

    const filteredConceptGroups = useMemo(() => {
        const groups: Record<string, AdConcept[]> = {};
        filteredConcepts.forEach(concept => {
            const pathId = concept.strategicPathId;
            if (!groups[pathId]) {
                groups[pathId] = [];
            }
            groups[pathId].push(concept);
        });

        const entryPointOrder = ['Emotional', 'Logical', 'Social', 'Evolved', 'Pivoted'];
        Object.values(groups).forEach(group => {
            group.sort((a, b) => {
                const indexA = entryPointOrder.indexOf(a.entryPoint);
                const indexB = entryPointOrder.indexOf(b.entryPoint);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.id.localeCompare(b.id);
            });
        });
        
        return Object.entries(groups).map(([pathId, groupConcepts]) => {
            const placementNode = nodes.find(n => n.id === pathId);
            const formatNode = placementNode ? nodes.find(n => n.id === placementNode.parentId) : undefined;
            const triggerNode = formatNode ? nodes.find(n => n.id === formatNode.parentId) : undefined;
            
            let title = "Creative Hypothesis";
            if (triggerNode && formatNode && placementNode) {
                title = `${triggerNode.label} → ${formatNode.label} → ${placementNode.label}`;
            }
            
            return { pathId, concepts: groupConcepts, title };
        });
    }, [filteredConcepts, nodes]);


    return (
        <div className="w-full h-screen flex flex-col bg-brand-background">
            <header className="flex-shrink-0 bg-brand-surface/80 backdrop-blur-md border-b border-gray-700 p-4 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Creative Concept Gallery</h1>
                        <p className="text-sm text-brand-text-secondary">{filteredConcepts.length} of {concepts.length} concepts shown in {filteredConceptGroups.length} hypothesis groups</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onReset} className="px-3 py-2 bg-gray-700 rounded-md shadow-lg text-sm font-semibold hover:bg-gray-600">Start Over</button>
                        <button onClick={handleExport} disabled={isExporting || filteredConcepts.length === 0} title="Download Filtered Concepts" className="bg-brand-primary p-2 rounded-md shadow-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isExporting ? <RefreshCwIcon className="w-5 h-5 animate-spin"/> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="flex-shrink-0 bg-brand-surface sticky top-0 z-10 py-3 border-b border-gray-800">
                <div className="max-w-7xl mx-auto">
                     <FilterControls nodes={nodes} onFilterChange={(newFilters) => setFilters(f => ({...f, ...newFilters}))} />
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {filteredConceptGroups.length > 0 ? (
                    <div className="max-w-7xl mx-auto space-y-10">
                        {filteredConceptGroups.map(({ pathId, concepts: groupConcepts, title }) => (
                            <div key={pathId} className="bg-brand-surface/50 rounded-lg p-4 border border-gray-800">
                                <h2 className="text-lg font-bold text-brand-text-primary mb-4">{title}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {groupConcepts.map(concept => {
                                        const node = creativeNodes.find(n => n.id === concept.id);
                                        if (!node) return null;
                                        return (
                                            <CreativeCard 
                                                key={node.id} 
                                                node={node}
                                                onGenerateImage={props.onGenerateImage}
                                                onEditConcept={props.onEditConcept}
                                                onInitiateEvolution={props.onInitiateEvolution}
                                                onInitiateQuickPivot={props.onInitiateQuickPivot}
                                                onInitiateRemix={props.onInitiateRemix}
                                                onOpenLightbox={props.onOpenLightbox}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-text-secondary">
                        <p className="text-lg">No creative concepts found.</p>
                        <p>Try selecting different filters or go back to the Mind Map to generate new ideas.</p>
                    </div>
                )}
            </main>
        </div>
    );
};