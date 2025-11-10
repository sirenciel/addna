import React, { useState, useMemo } from 'react';
import { MindMapNode, AdConcept, CampaignBlueprint, TargetPersona } from '../types';
import { FilterControls, GalleryFilters } from './FilterControls';
import { CreativeCard } from './CreativeCard';
import { EditModal } from './EditModal';
import { DownloadIcon, RefreshCwIcon, SparklesIcon, TagIcon } from './icons';
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
    onBatchTagConcepts: (conceptIds: string[], statusTag: AdConcept['statusTag']) => void;
    onCloseModal: () => void;
    onReset: () => void;
    onSwitchView: () => void;
    onOpenLightbox: (concept: AdConcept, startIndex: number) => void;
}

const CONCEPT_TAGS: AdConcept['statusTag'][] = ['Pengujian', 'Unggulan', 'Penskalaan', 'Jenuh', 'Diarsipkan'];

export const ConceptGallery: React.FC<ConceptGalleryProps> = (props) => {
    const { concepts, nodes, onReset, isLoading, onGenerateFilteredImages, onBatchTagConcepts } = props;
    const [filters, setFilters] = useState<GalleryFilters>({
        angle: 'all',
        persona: 'all',
        format: 'all',
        trigger: 'all',
        campaignTag: 'all',
        statusTag: 'all',
    });
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());

    const filteredConcepts = useMemo(() => {
        return concepts.filter(concept => {
            if (filters.campaignTag !== 'all' && concept.campaignTag !== filters.campaignTag) return false;
            if (filters.persona !== 'all' && concept.personaDescription !== filters.persona) return false;
            if (filters.format !== 'all' && concept.format !== filters.format) return false;
            if (filters.trigger !== 'all' && concept.trigger.name !== filters.trigger) return false;
            if (filters.statusTag !== 'all' && concept.statusTag !== filters.statusTag) return false;

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
            
            return true;
        });
    }, [concepts, filters, nodes]);
    
    const conceptsNeedingImages = useMemo(() => {
        return filteredConcepts.filter(c => !c.isGenerating && (!c.imageUrls || c.imageUrls.length === 0));
    }, [filteredConcepts]);

    const entryPointStats = useMemo(() => {
        const stats: Record<string, { total: number, winners: number }> = {};
        const entryPoints: AdConcept['entryPoint'][] = ['Emotional', 'Logical', 'Social', 'Evolved', 'Pivoted', 'Remixed'];
        entryPoints.forEach(ep => stats[ep] = { total: 0, winners: 0 });

        concepts.forEach(c => {
            if (c.entryPoint && stats[c.entryPoint]) {
                stats[c.entryPoint].total++;
                if (c.statusTag === 'Unggulan' || c.statusTag === 'Penskalaan') {
                    stats[c.entryPoint].winners++;
                }
            }
        });
        return stats;
    }, [concepts]);

    const handleBulkGenerateClick = () => {
        const idsToGenerate = conceptsNeedingImages.map(c => c.id);
        if (idsToGenerate.length > 0) {
            onGenerateFilteredImages(idsToGenerate);
        }
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        const conceptsToExport = concepts.filter(c => selectedConcepts.has(c.id));
        try {
            await exportConceptsToZip(conceptsToExport.length > 0 ? conceptsToExport : filteredConcepts);
        } catch (error) { console.error("Ekspor gagal:", error); alert("Gagal mengunduh aset."); }
        finally { setIsExporting(false); }
    };

    const handleSelectConcept = (conceptId: string) => {
        setSelectedConcepts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(conceptId)) {
                newSet.delete(conceptId);
            } else {
                newSet.add(conceptId);
            }
            return newSet;
        });
    };
    
    const handleSelectAllFiltered = () => {
        if (selectedConcepts.size === filteredConcepts.length) {
            setSelectedConcepts(new Set());
        } else {
            setSelectedConcepts(new Set(filteredConcepts.map(c => c.id)));
        }
    };
    
    const handleBatchTag = (statusTag: AdConcept['statusTag']) => {
        if (selectedConcepts.size === 0) return;
        onBatchTagConcepts(Array.from(selectedConcepts), statusTag);
        setSelectedConcepts(new Set());
    };

    const creativeNodes = useMemo(() => nodes.filter(n => n.type === 'creative'), [nodes]);

    const filteredConceptGroups = useMemo(() => {
        const personaGroups: Record<string, { persona: TargetPersona | null, hypothesisGroups: Record<string, AdConcept[]> }> = {};
        const nodesMap = new Map(nodes.map(n => [n.id, n]));

        const findParentPersonaNode = (startNodeId: string): MindMapNode | undefined => {
            // FIX: Explicitly type currentNode to avoid TS inference issues.
            let currentNode: MindMapNode | undefined = nodesMap.get(startNodeId);
            while (currentNode) {
                if (currentNode.type === 'persona') return currentNode;
                currentNode = currentNode.parentId ? nodesMap.get(currentNode.parentId) : undefined;
            }
            return undefined;
        };

        filteredConcepts.forEach(concept => {
            const personaNode = findParentPersonaNode(concept.strategicPathId);
            const personaDesc = personaNode ? (personaNode.content as { persona: TargetPersona }).persona.description : "Tidak Terkategori";
            
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
            
                let title = "Hipotesis Kreatif";
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
                        <h1 className="text-xl font-bold">Galeri Konsep Kreatif</h1>
                        <p className="text-sm text-brand-text-secondary">{filteredConcepts.length} dari {concepts.length} konsep ditampilkan</p>
                    </div>
                    <div className="flex items-center gap-4">
                         {conceptsNeedingImages.length > 0 && (
                            <button 
                                onClick={handleBulkGenerateClick}
                                disabled={isLoading}
                                className="px-3 py-2 bg-brand-secondary rounded-md shadow-lg text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Hasilkan {conceptsNeedingImages.length} Gambar
                            </button>
                        )}
                        <button onClick={onReset} className="px-3 py-2 bg-gray-700 rounded-md shadow-lg text-sm font-semibold hover:bg-gray-600">Mulai Ulang</button>
                        <button onClick={handleExport} disabled={isExporting || filteredConcepts.length === 0} title="Unduh konsep terpilih/terfilter" className="bg-brand-primary p-2 rounded-md shadow-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                            {isExporting ? <RefreshCwIcon className="w-5 h-5 animate-spin"/> : <DownloadIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                 <div className="max-w-7xl mx-auto text-xs text-brand-text-secondary mt-2">
                    <strong>📈 Tingkat Keberhasilan Titik Masuk:</strong> 
                    {Object.entries(entryPointStats).filter(([, s]) => (s as { total: number }).total > 0).map(([key, value]) => {
                        // FIX: Explicitly cast value to resolve TS inference issue.
                        const statsValue = value as { total: number, winners: number };
                        return (
                        <span key={key} className="ml-3">
                            {key}: <strong className="text-brand-text-primary">{statsValue.winners}/{statsValue.total}</strong> ({statsValue.total > 0 ? Math.round(statsValue.winners/statsValue.total*100) : 0}%)
                        </span>
                    )})}
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
                {concepts.length > 0 && (
                <div className="max-w-7xl mx-auto mb-4 p-3 bg-gray-900/50 rounded-lg flex items-center gap-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="selectAll"
                            className="h-4 w-4 rounded"
                            checked={filteredConcepts.length > 0 && selectedConcepts.size === filteredConcepts.length}
                            onChange={handleSelectAllFiltered}
                        />
                         <label htmlFor="selectAll" className="ml-2 text-sm font-medium">Pilih {selectedConcepts.size} / {filteredConcepts.length}</label>
                    </div>
                    {selectedConcepts.size > 0 && (
                        <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-400">| Tindakan Massal:</span>
                             {CONCEPT_TAGS.map(tag => (
                                 <button
                                     key={tag}
                                     onClick={() => handleBatchTag(tag)}
                                     className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center gap-1"
                                 >
                                    <TagIcon className="w-3 h-3"/> Tandai sebagai {tag}
                                 </button>
                             ))}
                        </div>
                    )}
                </div>
                )}
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
                                                            isSelected={selectedConcepts.has(node.id)}
                                                            onSelect={handleSelectConcept}
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
                        <p className="text-lg">Tidak ada konsep kreatif yang ditemukan.</p>
                        <p>Coba pilih filter yang berbeda atau kembali ke Peta Pikiran untuk menghasilkan ide-ide baru.</p>
                    </div>
                )}
            </main>
        </div>
    );
};