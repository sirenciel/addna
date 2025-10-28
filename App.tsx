
import React, { useState, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { DnaValidationStep } from './components/DnaValidationStep';
import { MindMapView } from './components/MindMapView';
import { ConceptGallery } from './components/ConceptGallery';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Lightbox } from './components/Lightbox';
import { AdConcept, CampaignBlueprint, MindMapNode, ViewMode, AppStep, CreativeFormat, ALL_CREATIVE_FORMATS, PlacementFormat, ALL_PLACEMENT_FORMATS, AwarenessStage, ALL_AWARENESS_STAGES, TargetPersona, BuyingTriggerObject } from './types';
import { analyzeCampaignBlueprint, generatePersonaVariations, generateHighLevelAngles, generateBuyingTriggers, generateCreativeIdeas, generateAdImage, evolveConcept } from './services/geminiService';
import { LayoutGridIcon, NetworkIcon } from './components/icons';
import { EditModal } from './components/EditModal';
import { EvolveModal } from './components/EvolveModal';

// Simple UUID generator
function simpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const FORMAT_PLACEMENT_MAP: Record<CreativeFormat, PlacementFormat[]> = {
    'UGC': ['Instagram Story', 'Instagram Feed', 'Carousel'],
    'Before & After': ['Instagram Feed', 'Carousel'],
    'Comparison': ['Carousel', 'Instagram Feed'],
    'Demo': ['Instagram Story', 'Carousel', 'Instagram Feed'],
    'Testimonial': ['Instagram Feed', 'Carousel'],
    'Problem/Solution': ['Carousel', 'Instagram Feed'],
    'Educational/Tip': ['Carousel', 'Instagram Story'],
    'Storytelling': ['Carousel', 'Instagram Feed'],
};

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [campaignBlueprint, setCampaignBlueprint] = useState<CampaignBlueprint | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [evolutionTarget, setEvolutionTarget] = useState<AdConcept | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('input');
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const [lightboxData, setLightboxData] = useState<{ concept: AdConcept, startIndex: number } | null>(null);
  const [allowVisualExploration, setAllowVisualExploration] = useState<boolean>(false);


  const handleGenerate = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string) => {
    setIsLoading(true);
    setError(null);
    setCampaignBlueprint(null);
    setNodes([]);
    setLoadingMessage('Menganalisis Campaign Blueprint...');

    try {
      const blueprint = await analyzeCampaignBlueprint(imageBase64, caption, productInfo, offerInfo);
      setCampaignBlueprint(blueprint);
      setReferenceImage(imageBase64);
      setCurrentStep('validateBlueprint');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal menganalisis blueprint kampanye.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleBlueprintValidated = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    (window as any).appState = { referenceImage };

    const dnaNode: MindMapNode = {
        id: 'dna-root', type: 'dna', label: 'Campaign Blueprint', content: validatedBlueprint,
        position: { x: 0, y: 0 }, width: 300, height: 420
    };
    
    const initialPersonaNode: MindMapNode = {
        id: simpleUUID(),
        parentId: dnaNode.id,
        type: 'persona',
        label: validatedBlueprint.targetPersona.description,
        content: { persona: validatedBlueprint.targetPersona },
        position: { x: 0, y: 0 },
        isExpanded: false,
        width: 250,
        height: 140,
    };

    setNodes([dnaNode, initialPersonaNode]);
  };
  
  const handleTogglePersona = (nodeId: string) => {
    const personaNode = nodes.find(n => n.id === nodeId);
    if (!personaNode || !campaignBlueprint) return;

    const childrenExist = nodes.some(n => n.parentId === nodeId);

    if (childrenExist) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
    } else {
        setIsLoading(true);
        setLoadingMessage('Membuat angle strategis untuk persona ini...');
        
        const generateAndSetAngles = async () => {
            try {
                const personaContent = personaNode.content as { persona: TargetPersona };
                const angles = await generateHighLevelAngles(campaignBlueprint, personaContent.persona, 'all'); 
                
                const newAngleNodes: MindMapNode[] = angles.map(angle => ({
                    id: simpleUUID(),
                    parentId: nodeId,
                    type: 'angle',
                    label: angle,
                    content: { angle },
                    position: { x: 0, y: 0 },
                    isExpanded: false,
                    width: 220,
                    height: 80,
                }));
                setNodes(prev => [
                    ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
                    ...newAngleNodes
                ]);
            } catch (e: any) {
                console.error(e);
                setError(e.message || 'Gagal membuat angle strategis.');
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
            }
        };
        generateAndSetAngles();
    }
  };

  const handleToggleAngle = async (nodeId: string) => {
    const angleNode = nodes.find(n => n.id === nodeId);
    if (!angleNode) return;

    const childrenExist = nodes.some(n => n.parentId === nodeId);

    if (childrenExist) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
    } else {
        const newAwarenessNodes: MindMapNode[] = ALL_AWARENESS_STAGES.map(awareness => ({
            id: simpleUUID(),
            parentId: nodeId,
            type: 'awareness',
            label: awareness,
            content: { awareness },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 220,
            height: 60,
        }));

        setNodes(prev => [
            ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
            ...newAwarenessNodes
        ]);
    }
  };

  const handleToggleAwareness = async (nodeId: string) => {
    const awarenessNode = nodes.find(n => n.id === nodeId);
    if (!awarenessNode || !campaignBlueprint) return;

    const childrenExist = nodes.some(n => n.parentId === nodeId);

    if (childrenExist) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
    } else {
        const angleNode = nodes.find(n => n.id === awarenessNode.parentId);
        const personaNode = angleNode ? nodes.find(n => n.id === angleNode.parentId) : undefined;
        if (!personaNode || !angleNode) {
            setError('Konteks tidak ditemukan untuk membuat trigger.');
            return;
        }

        setIsLoading(true);
        setLoadingMessage(`Menganalisis pemicu (trigger) untuk angle "${angleNode.label}"...`);
        try {
            const persona = (personaNode.content as { persona: TargetPersona }).persona;
            const triggers: BuyingTriggerObject[] = await generateBuyingTriggers(
                campaignBlueprint, 
                persona, 
                angleNode.label,
                awarenessNode.label as AwarenessStage
            );

            const newTriggerNodes: MindMapNode[] = triggers.map(trigger => ({
                id: simpleUUID(),
                parentId: nodeId,
                type: 'trigger',
                label: trigger.name,
                content: { trigger },
                position: { x: 0, y: 0 },
                isExpanded: false,
                width: 220,
                height: 60,
            }));

            setNodes(prev => [
                ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
                ...newTriggerNodes
            ]);

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Gagal menganalisis buying triggers.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }
  };
  
  const handleToggleTrigger = (nodeId: string) => {
    const triggerNode = nodes.find(n => n.id === nodeId);
    if (!triggerNode) return;

    const childrenExist = nodes.some(n => n.parentId === nodeId);

    if (childrenExist) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
    } else {
        const newFormatNodes: MindMapNode[] = ALL_CREATIVE_FORMATS.map(format => ({
            id: simpleUUID(),
            parentId: nodeId,
            type: 'format',
            label: format,
            content: { format },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 220,
            height: 60,
        }));

        setNodes(prev => [
            ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
            ...newFormatNodes
        ]);
    }
  };

  const handleToggleFormat = (nodeId: string) => {
    const formatNode = nodes.find(n => n.id === nodeId);
    if (!formatNode) return;

    const childrenExist = nodes.some(n => n.parentId === nodeId);

    if (childrenExist) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
    } else {
        const format = formatNode.label as CreativeFormat;
        const relevantPlacements = FORMAT_PLACEMENT_MAP[format] || ALL_PLACEMENT_FORMATS;

        const newPlacementNodes: MindMapNode[] = relevantPlacements.map(placement => ({
            id: simpleUUID(),
            parentId: nodeId,
            type: 'placement',
            label: placement,
            content: { placement },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 220,
            height: 60,
        }));
        setNodes(prev => [
            ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
            ...newPlacementNodes
        ]);
    }
  };
  
  const handleTogglePlacement = async (nodeId: string) => {
      const placementNode = nodes.find(n => n.id === nodeId);
      if (!placementNode || !campaignBlueprint) return;

      const childrenExist = nodes.some(n => n.parentId === nodeId);
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
          return;
      }
      
      const formatNode = nodes.find(n => n.id === placementNode.parentId);
      const triggerNode = formatNode ? nodes.find(n => n.id === formatNode.parentId) : undefined;
      const awarenessNode = triggerNode ? nodes.find(n => n.id === triggerNode.parentId) : undefined;
      const angleNode = awarenessNode ? nodes.find(n => n.id === awarenessNode.parentId) : undefined;
      const personaNode = angleNode ? nodes.find(n => n.id === angleNode.parentId) : undefined;

      if (!formatNode || !awarenessNode || !triggerNode || !angleNode || !personaNode) {
          setError("Konteks untuk brief ini tidak dapat ditemukan.");
          return;
      }

      const persona = (personaNode.content as { persona: TargetPersona }).persona;
      const trigger = (triggerNode.content as { trigger: BuyingTriggerObject }).trigger.name;
      const placement = placementNode.label as PlacementFormat;
      const format = formatNode.label as CreativeFormat;
      const angle = angleNode.label;
      const awareness = awarenessNode.label as AwarenessStage;
      
      setIsLoading(true);
      setLoadingMessage(`Membuat ide ${placement} untuk format "${format}"...`);

      try {
          const ideas = await generateCreativeIdeas(
              campaignBlueprint, angle, trigger, awareness, format, placement, persona, placementNode.id, allowVisualExploration
          );
          
          const newCreativeNodes: MindMapNode[] = ideas.map(concept => ({
              id: concept.id,
              parentId: nodeId,
              type: 'creative',
              label: concept.headline,
              content: { concept },
              position: { x: 0, y: 0 },
              width: 320,
              height: 480,
          }));

          setNodes(prev => [
              ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
              ...newCreativeNodes,
          ]);
      } catch(e: any) {
          console.error(e);
          setError(`Gagal membuat ide untuk "${placement}".`);
      } finally {
          setIsLoading(false); 
          setLoadingMessage('');
      }
  };

  const handleDeleteNode = (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (!nodeToDelete) return;
      
      const messageMap = {
          'persona': 'Anda yakin ingin menghapus persona ini beserta semua turunannya?',
          'angle': 'Anda yakin ingin menghapus angle ini beserta semua turunannya?',
          'trigger': 'Anda yakin ingin menghapus trigger ini dan semua turunannya?',
          'creative': 'Anda yakin ingin menghapus konsep kreatif ini?',
      };
      // @ts-ignore
      const message = messageMap[nodeToDelete.type] || 'Anda yakin ingin menghapus node ini dan semua turunannya?';

      if (!window.confirm(message)) return;

      setNodes(currentNodes => {
          const nodesToDeleteSet = new Set<string>([nodeId]);
          const queue = [nodeId];

          while (queue.length > 0) {
              const currentId = queue.shift()!;
              const children = currentNodes.filter(n => n.parentId === currentId);
              for (const child of children) {
                  nodesToDeleteSet.add(child.id);
                  queue.push(child.id);
              }
          }
          return currentNodes.filter(n => !nodesToDeleteSet.has(n.id));
      });
  };
  
  const handleGenerateMorePersonas = async () => {
    if (!campaignBlueprint) return;
    setIsLoading(true);
    setLoadingMessage('Mencari variasi persona baru...');
    try {
        const existingPersonas = nodes
            .filter(n => n.type === 'persona')
            .map(n => (n.content as { persona: TargetPersona }).persona);
            
        const newPersonas = await generatePersonaVariations(campaignBlueprint, existingPersonas);

        if (newPersonas.length === 0) {
            setLoadingMessage('Tidak ada persona baru yang ditemukan.');
            setTimeout(() => setLoadingMessage(''), 2000);
            return;
        }
        const newPersonaNodes: MindMapNode[] = newPersonas.map((persona) => ({
            id: simpleUUID(),
            parentId: 'dna-root',
            type: 'persona',
            label: persona.description,
            content: { persona },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 250, height: 140,
        }));
        setNodes(prev => [...prev, ...newPersonaNodes]);
    } catch (e: any) {
        console.error(e);
        setError('Gagal membuat persona baru.');
    } finally {
        setIsLoading(false); setLoadingMessage('');
    }
  };
  
   const handleAddCustomPersona = () => {
    const description = window.prompt("Masukkan deskripsi singkat untuk persona baru Anda:");
    if (!description || description.trim() === "") return;
    
    const newPersona: TargetPersona = {
        description: description,
        painPoints: ["Pain point 1", "Pain point 2"],
        desiredOutcomes: ["Desired outcome 1", "Desired outcome 2"],
        age: "25-35",
        creatorType: "Regular User",
    };

    const newPersonaNode: MindMapNode = {
        id: simpleUUID(),
        parentId: 'dna-root',
        type: 'persona',
        label: newPersona.description,
        content: { persona: newPersona },
        position: { x: 0, y: 0 },
        isExpanded: false,
        width: 250, height: 140,
    };
    setNodes(prev => [...prev, newPersonaNode]);
  };

  const handleInitiateEvolution = (conceptId: string) => {
    const conceptNode = nodes.find(n => n.id === conceptId);
    if (!conceptNode || conceptNode.type !== 'creative') return;
    const concept = (conceptNode.content as { concept: AdConcept }).concept;
    setEvolutionTarget(concept);
  };

  const handleExecuteEvolution = async (
      baseConcept: AdConcept,
      evolutionType: 'angle' | 'trigger' | 'format' | 'placement',
      newValue: string
  ) => {
      if (!campaignBlueprint) return;
      setEvolutionTarget(null);
      setIsLoading(true);
      setLoadingMessage(`Mengevolusikan konsep ke ${evolutionType} "${newValue}"...`);
      setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isEvolving: true } } } : n));

      try {
          const [newConcept] = await evolveConcept(baseConcept, campaignBlueprint, evolutionType, newValue);
          if (newConcept) {
              const newCreativeNode: MindMapNode = {
                  id: newConcept.id,
                  parentId: baseConcept.strategicPathId, // Attach to the same placement for simplicity
                  type: 'creative',
                  label: newConcept.headline,
                  content: { concept: newConcept },
                  position: { x: 0, y: 0 }, // Let layout handle it
                  width: 320,
                  height: 480,
              };
              setNodes(prev => [...prev, newCreativeNode]);
          } else {
              throw new Error("Evolusi tidak menghasilkan konsep baru.");
          }
      } catch (e: any) {
          console.error(e);
          setError(`Gagal mengevolusikan konsep.`);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
          setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isEvolving: false } } } : n));
      }
  };

  const handleGenerateImage = async (conceptId: string) => {
    const conceptNode = nodes.find(n => n.id === conceptId);
    if (!conceptNode || conceptNode.type !== 'creative') return;
    const concept = (conceptNode.content as { concept: AdConcept }).concept;
    
    setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: {...concept, isGenerating: true, error: undefined, imageUrls: [] } } } : n));

    try {
        let urls: string[] = [];
        const generate = (prompt: string) => generateAdImage(prompt, referenceImage || undefined, allowVisualExploration);

        if (concept.placement === 'Carousel' && concept.carouselSlides && concept.carouselSlides.length > 0) {
            const imagePromises = concept.carouselSlides.map(slide => generate(slide.visualPrompt));
            urls = await Promise.all(imagePromises);
        } else {
            const singleUrl = await generate(concept.visualPrompt);
            urls = [singleUrl];
        }
        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: {...concept, imageUrls: urls, isGenerating: false} } } : n));
    } catch(e: any) {
        console.error(`Failed to generate image(s) for concept ${conceptId}`, e);
        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: {...concept, error: e.message || 'Gagal membuat gambar', isGenerating: false} } } : n));
    }
  };


  const handleReset = () => {
    setCurrentStep('input');
    setCampaignBlueprint(null);
    setNodes([]);
    setReferenceImage(null);
    setError(null);
    (window as any).appState = {};
  };

  const handleEditConcept = (conceptId: string) => {
    setEditingConceptId(conceptId);
  };
  
  const handleSaveConcept = (conceptId: string, updatedContent: AdConcept) => {
    setNodes(prev => prev.map(n => 
      n.id === conceptId ? { ...n, content: { concept: updatedContent }, label: updatedContent.headline } : n
    ));
    setEditingConceptId(null);
  };

  const handleOpenLightbox = (concept: AdConcept, startIndex: number) => {
    setLightboxData({ concept, startIndex });
  };

  const handleCloseLightbox = () => {
    setLightboxData(null);
  };
  
  const allConcepts = useMemo(() => nodes
    .filter(n => n.type === 'creative')
    .map(n => (n.content as { concept: AdConcept }).concept), [nodes]);

  const editingConcept = allConcepts.find(c => c.id === editingConceptId) || null;

  const renderContent = () => {
    switch(currentStep) {
        case 'input':
            return (
                <div className="p-4 md:p-8">
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-brand-primary/20 via-brand-background to-brand-background -z-10"></div>
                    <header className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Ad Concept Generator</h1>
                        <p className="text-brand-text-secondary mt-2 text-lg">Ubah satu iklan menjadi puluhan variasi berperforma tinggi.</p>
                    </header>
                    {error && <div className="max-w-4xl mx-auto bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-8" role="alert">{error}</div>}
                    <InputForm onGenerate={handleGenerate} />
                </div>
            );
        case 'validateBlueprint':
            return campaignBlueprint && referenceImage && (
                <DnaValidationStep 
                    initialBlueprint={campaignBlueprint} 
                    referenceImage={referenceImage}
                    onContinue={handleBlueprintValidated}
                    onBack={handleReset}
                    allowVisualExploration={allowVisualExploration}
                    onAllowVisualExplorationChange={setAllowVisualExploration}
                />
            );
        case 'mindmap':
             const commonGalleryProps = {
                concepts: allConcepts,
                campaignBlueprint: campaignBlueprint,
                editingConcept: editingConcept,
                onGenerateImage: handleGenerateImage,
                onEditConcept: handleEditConcept,
                onInitiateEvolution: handleInitiateEvolution,
                onSaveConcept: handleSaveConcept,
                onCloseModal: () => setEditingConceptId(null),
                onOpenLightbox: handleOpenLightbox,
                onReset: handleReset,
                onSwitchView: () => setViewMode(viewMode === 'mindmap' ? 'gallery' : 'mindmap'),
            };

            return viewMode === 'mindmap' ? (
                <MindMapView
                    nodes={nodes}
                    onTogglePersona={handleTogglePersona}
                    onToggleAngle={handleToggleAngle}
                    onToggleTrigger={handleToggleTrigger}
                    onToggleAwareness={handleToggleAwareness}
                    onToggleFormat={handleToggleFormat}
                    onTogglePlacement={handleTogglePlacement}
                    onGenerateImage={handleGenerateImage}
                    onEditConcept={handleEditConcept}
                    onInitiateEvolution={handleInitiateEvolution}
                    onOpenLightbox={handleOpenLightbox}
                    onDeleteNode={handleDeleteNode}
                    onReset={handleReset}
                    onGenerateMorePersonas={handleGenerateMorePersonas}
                    onAddCustomPersona={handleAddCustomPersona}
                />
            ) : (
                <ConceptGallery
                    {...commonGalleryProps}
                    nodes={nodes}
                />
            );
        default: return null;
    }
  }

  return (
    <main className="min-h-screen h-screen bg-brand-background text-brand-text-primary font-sans overflow-hidden">
      {renderContent()}
      {isLoading && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <LoadingIndicator message={loadingMessage} />
        </div>
      )}
      {currentStep === 'mindmap' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-brand-surface p-1 rounded-lg shadow-2xl flex items-center border border-gray-700">
           <button
             onClick={() => setViewMode('mindmap')}
             title="Tampilan Mind Map"
             className={`p-2 rounded-md transition-colors ${viewMode === 'mindmap' ? 'bg-brand-primary' : 'hover:bg-gray-700'}`}
           >
             <NetworkIcon className="w-5 h-5" />
           </button>
           <button
             onClick={() => setViewMode('gallery')}
             title="Tampilan Galeri"
             className={`p-2 rounded-md transition-colors ${viewMode === 'gallery' ? 'bg-brand-primary' : 'hover:bg-gray-700'}`}
           >
             <LayoutGridIcon className="w-5 h-5" />
           </button>
        </div>
      )}
       {lightboxData && (
        <Lightbox
          concept={lightboxData.concept}
          startIndex={lightboxData.startIndex}
          onClose={handleCloseLightbox}
        />
      )}
      {editingConcept && campaignBlueprint && (
          <EditModal
              concept={editingConcept}
              campaignBlueprint={campaignBlueprint}
              onSave={handleSaveConcept}
              onClose={() => setEditingConceptId(null)}
              onGenerateImage={handleGenerateImage}
          />
      )}
      {evolutionTarget && (
        <EvolveModal
          concept={evolutionTarget}
          nodes={nodes}
          onClose={() => setEvolutionTarget(null)}
          onEvolve={handleExecuteEvolution}
        />
      )}
    </main>
  );
}

export default App;
