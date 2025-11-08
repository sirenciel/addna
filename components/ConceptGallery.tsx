
import React, { useState, useMemo } from 'react';
import { MindMapNode, AdConcept, CampaignBlueprint, TargetPersona } from '../types';
import { FilterControls, GalleryFilters } from './FilterControls';
import { CreativeCard } from './CreativeCard';
import { EditModal } from './EditModal';
import { DownloadIcon, RefreshCwIcon, SparklesIcon } from './icons';
import { exportConceptsToZip } from '../services/exportService';

interface ConceptGalleryProps {
    nodes: MindMapNode[];
    concepts: AdConcept[];
    editingConcept: AdConcept | null;
    campaignBlueprint: CampaignBlueprint | null;
    isLoading: boolean;
    onGenerateImage: (conceptId: string) => void;
    onGenerateFilteredImages: (conceptIds: string[]) => void;
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
    const { concepts, nodes, onReset, isLoading, onGenerateFilteredImages } = props;
    const [filters, setFilters] = useState<GalleryFilters>({
        angle: 'all',
        persona: 'all',
        format: 'all',
        trigger: 'all',
        campaignTag: 'all',
    });
    const [isExporting, setIsExporting] = useState<boolean>(false);

    const filteredConcepts = useMemo(() => {
        return concepts.filter(concept => {
            // Campaign Tag filter
            if (filters.campaignTag !== 'all' && concept.campaignTag !== filters.campaignTag) {
                return false;
            }
            // Persona filter
            if (filters.persona !== 'all' && concept.personaDescription !== filters.persona) {
                return false;
            }
            // Format filter
            if (filters.format !== 'all' && concept.format !== filters.format) {
                return false;
            }
            // Trigger filter
            if (filters.trigger !== 'all' && concept.trigger.name !== filters.trigger) {
                return false;
            }
            // Angle filter
            if (filters.angle !== 'all') {
                 const findParentAngleRecursively = (nodeId: string | undefined): boolean => {
                    if (!nodeId) return false;
                    const node = nodes.find(n => n.id === nodeId);
                    if (!node) return false;
                    if (node.type === 'angle' && node.id === filters.angle) return true;
                    return findParentAngleRecursively(node.parentId);
                };

                if (!findParentAngleRecursively(concept.strategicPathId)) {
                    return false;
                }
            }
            
            return true; // Pass all filters
        });
    }, [concepts, filters, nodes]);

    const conceptsNeedingImages = useMemo(() => {
        return filteredConcepts.filter(c => !c.isGenerating && (!c.imageUrls || c.imageUrls.length === 0));
    }, [filteredConcepts]);

    const handleBulkGenerateClick = () => {
        const idsToGenerate = conceptsNeedingImages.map(c => c.id);
        if (idsToGenerate.length > 0) {
            onGenerateFilteredImages(idsToGenerate);
        }
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportConceptsToZip(filteredConcepts);
        } catch (error) { console.error("Export failed:", error); alert("Failed to download assets."); }
        finally { setIsExporting(false); }
    };

    const creativeNodes = useMemo(() => nodes.filter(n => n.type === 'creative'), [nodes]);

    const filteredConceptGroups = useMemo(() => {
        // Group by Persona first, then by Hypothesis (strategic path)
        const personaGroups: Record<string, { persona: TargetPersona | null, hypothesisGroups: Record<string, AdConcept[]> }> = {};
        const nodesMap = new Map(nodes.map(n => [n.id, n]));

        const findParentPersonaNode = (startNodeId: string): MindMapNode | undefined => {
            let currentNode = nodesMap.get(startNodeId);
            while (currentNode) {
                if (currentNode.type === 'persona') return currentNode;
                currentNode = currentNode.parentId ? nodesMap.get(currentNode.parentId) : undefined;
            }
            return undefined;
        };

        filteredConcepts.forEach(concept => {
            const personaNode = findParentPersonaNode(concept.strategicPathId);
            const personaDesc = personaNode ? (personaNode.content as { persona: TargetPersona }).persona.description : "Uncategorized";
            
            if (!personaGroups[personaDesc]) {
                personaGroups[personaDesc] = { 
                    persona: personaNode ? (personaNode.content as { persona: TargetPersona }).persona : null,
                    hypothesisGroups: {}
                };
            }

            const pathId = concept.strategicPathId;
            if (!personaGroups[personaDesc].hypothesisGroups[pathId]) {
                personaGroups[personaDesc].hypothesisGroups[pathId] = [];
            }
            personaGroups[personaDesc].hypothesisGroups[pathId].push(concept);
        });

        // Sort concepts within each hypothesis group
        const entryPointOrder = ['Emotional', 'Logical', 'Social', 'Evolved', 'Pivoted', 'Remixed'];
        Object.values(personaGroups).forEach(pGroup => {
            Object.values(pGroup.hypothesisGroups).forEach(hGroup => {
                hGroup.sort((a, b) => {
                    const indexA = entryPointOrder.indexOf(a.entryPoint);
                    const indexB = entryPointOrder.indexOf(b.entryPoint);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    return a.id.localeCompare(b.id);
                });
            });
        });

        return Object.entries(personaGroups).map(([personaDesc, data]) => {
            const hypotheses = Object.entries(data.hypothesisGroups).map(([pathId, groupConcepts]) => {
                 const placementNode = nodes.find(n => n.id === pathId);
                 const formatNode = placementNode ? nodes.find(n => n.id === placementNode.parentId) : undefined;
                 const triggerNode = formatNode ? nodes.find(n => n.id === formatNode.parentId) : undefined;
            
                let title = "Creative Hypothesis";
                if (triggerNode && formatNode && placementNode) {
                    title = `${triggerNode.label} → ${formatNode.label} → ${placementNode.label}`;
                }
                return { pathId, concepts: groupConcepts, title };
            });

            return { personaDesc, persona: data.persona, hypotheses };
        });

    }, [filteredConcepts, nodes]);


    return (
        <div className="w-full h-screen flex flex-col bg-brand-background">
            <header className="flex-shrink-0 bg-brand-surface/80 backdrop-blur-md border-b border-gray-700 p-4 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Creative Concept Gallery</h1>
                        <p className="text-sm text-brand-text-secondary">{filteredConcepts.length} of {concepts.length} concepts shown in {filteredConceptGroups.length} persona groups</p>
                    </div>
                    <div className="flex items-center gap-4">
                         {conceptsNeedingImages.length > 0 && (
                            <button 
                                onClick={handleBulkGenerateClick}
                                disabled={isLoading}
                                className="px-3 py-2 bg-brand-secondary rounded-md shadow-lg text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Generate {conceptsNeedingImages.length} Images
                            </button>
                        )}
                        <button onClick={onReset} className="px-3 py-2 bg-gray-700 rounded-md shadow-lg text-sm font-semibold hover:bg-gray-600">Start Over</button>
                        <button onClick={handleExport} disabled={isExporting || filteredConcepts.length === 0} title="Download Filtered Concepts" className="bg-brand-primary p-2 rounded-md shadow-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isExporting ? <RefreshCwIcon className="w-5 h-5 animate-spin"/> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="flex-shrink-0 bg-brand-surface sticky top-0 z-10 py-3 border-b border-gray-800">
                <div className="max-w-7xl mx-auto">
                     <FilterControls 
                        nodes={nodes} 
                        concepts={concepts}
                        onFilterChange={(newFilters) => setFilters(f => ({...f, ...newFilters}))} 
                    />
                </div>
            </div>

            <main className="flex-grow overflow-y-auto p-4 md:p-6">
                {filteredConceptGroups.length > 0 ? (
                    <div className="max-w-7xl mx-auto space-y-12">
                        {filteredConceptGroups.map(({ personaDesc, persona, hypotheses }) => (
                             <div key={personaDesc} className="bg-brand-surface/50 rounded-lg p-4 border border-gray-800">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-brand-text-primary">{personaDesc}</h2>
                                    {persona && <p className="text-sm text-brand-text-secondary">{persona.age} | {persona.creatorType}</p>}
                                </div>
                                <div className="space-y-8">
                                    {hypotheses.map(({ pathId, concepts: groupConcepts, title }) => (
                                        <div key={pathId}>
                                            <h3 className="text-lg font-semibold text-brand-text-secondary mb-4">{title}</h3>
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