import React, { useState, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { DnaValidationStep } from './components/DnaValidationStep';
import { MindMapView } from './components/MindMapView';
import { ConceptGallery } from './components/ConceptGallery';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Lightbox } from './components/Lightbox';
import { AdConcept, CampaignBlueprint, MindMapNode, ViewMode, AppStep, CreativeFormat, ALL_CREATIVE_FORMATS, PlacementFormat, ALL_PLACEMENT_FORMATS, AwarenessStage, ALL_AWARENESS_STAGES, TargetPersona, BuyingTriggerObject, ObjectionObject, PainDesireObject, OfferTypeObject, PivotType, PivotConfig, AdDna, NodeType, AdDnaComponent, RemixSuggestion } from './types';
// FIX: Changed import from generateUgcConceptsForPersona to generateConceptsFromPersona as it does not exist.
import { analyzeCampaignBlueprint, generatePersonaVariations, generatePainDesires, generateObjections, generateOfferTypes, generateHighLevelAngles, generateBuyingTriggers, generateCreativeIdeas, generateAdImage, evolveConcept, getBuyingTriggerDetails, generateQuickPivot, generateRemixSuggestions, generateConceptFromRemix, generateConceptsFromPersona, generateUgcPack, generateMatrixConcepts } from './services/geminiService';
import { LayoutGridIcon, NetworkIcon } from './components/icons';
import { EditModal } from './components/EditModal';
import { EvolveModal } from './components/EvolveModal';
import { QuickPivotModal } from './components/QuickPivotModal';
import { RemixDashboard } from './components/RemixDashboard';


// Simple UUID generator
function simpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const FORMAT_PLACEMENT_MAP: Record<CreativeFormat, PlacementFormat[]> = {
    'UGC': ['Instagram Story', 'Instagram Feed', 'Carousel'],
    'Sebelum & Sesudah': ['Instagram Feed', 'Carousel'],
    'Perbandingan': ['Carousel', 'Instagram Feed'],
    'Demo': ['Instagram Story', 'Carousel', 'Instagram Feed'],
    'Testimoni': ['Instagram Feed', 'Carousel'],
    'Masalah/Solusi': ['Carousel', 'Instagram Feed'],
    'Edukasi/Tips': ['Carousel', 'Instagram Story'],
    'Bercerita': ['Carousel', 'Instagram Feed'],
    'Iklan Artikel': ['Instagram Feed', 'Carousel'],
    'Layar Terpisah': ['Instagram Feed', 'Carousel'],
    'Advertorial': ['Instagram Feed', 'Carousel'],
    'Listicle': ['Carousel', 'Instagram Feed'],
    'Multi-Produk': ['Carousel', 'Instagram Feed'],
    'Kita vs Mereka': ['Instagram Feed', 'Carousel'],
    'Meme/Iklan Jelek': ['Instagram Story', 'Instagram Feed'],
    'Penawaran Langsung': ['Instagram Story', 'Instagram Feed', 'Carousel'],
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
  const [pivotTarget, setPivotTarget] = useState<AdConcept | null>(null);
  const [remixTarget, setRemixTarget] = useState<AdConcept | null>(null);
  const [remixDna, setRemixDna] = useState<AdDna | null>(null);
  const [remixingComponent, setRemixingComponent] = useState<AdDnaComponent | null>(null);
  const [remixSuggestions, setRemixSuggestions] = useState<RemixSuggestion[] | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>('input');
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const [lightboxData, setLightboxData] = useState<{ concept: AdConcept, startIndex: number } | null>(null);
  const [allowVisualExploration, setAllowVisualExploration] = useState<boolean>(true);


  const handleGenerate = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string) => {
    setIsLoading(true);
    setError(null);
    setCampaignBlueprint(null);
    setNodes([]);
    setLoadingMessage('Menganalisis Blueprint Kampanye...');

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

  const handleWorkflowSelected = (validatedBlueprint: CampaignBlueprint, workflow: 'deep-dive' | 'quick-scale' | 'ugc-diversity-pack' | 'one-click-campaign') => {
      if (workflow === 'deep-dive') {
          handleStartManualExploration(validatedBlueprint);
      } else if (workflow === 'quick-scale') {
          handleStartSmartRemix(validatedBlueprint);
      } else if (workflow === 'ugc-diversity-pack') {
          handleStartUgcDiversityPack(validatedBlueprint);
      } else if (workflow === 'one-click-campaign') {
          handleStartOneClickCampaign(validatedBlueprint);
      }
  };

  const handleStartManualExploration = (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    (window as any).appState = { referenceImage };

    const dnaNode: MindMapNode = {
        id: 'dna-root', type: 'dna', label: 'Blueprint Kampanye', content: validatedBlueprint,
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

  const handleStartSmartRemix = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    setViewMode('gallery');
    (window as any).appState = { referenceImage };
    setIsLoading(true);
    setError(null);

    try {
        const campaignTag = `Skala Cepat ${new Date().toLocaleTimeString()}`;
        setLoadingMessage('Membuat Blueprint Kampanye...');
        const dnaNode: MindMapNode = {
            id: 'dna-root', type: 'dna', label: 'Blueprint Kampanye', content: validatedBlueprint,
            position: { x: 0, y: 0 }, width: 300, height: 420
        };
        
        setLoadingMessage('Menghasilkan variasi persona...');
        const newPersonas = await generatePersonaVariations(validatedBlueprint, [validatedBlueprint.targetPersona]);
        const allPersonas = [validatedBlueprint.targetPersona, ...newPersonas];

        const personaNodes: MindMapNode[] = allPersonas.map(persona => ({
            id: simpleUUID(),
            parentId: dnaNode.id,
            type: 'persona',
            label: persona.description,
            content: { persona },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 250, height: 140,
        }));
        
        setNodes([dnaNode, ...personaNodes]);

        setLoadingMessage(`Menghasilkan konsep iklan untuk ${allPersonas.length} persona...`);
        const conceptPromises = allPersonas.map((persona, index) => 
            generateConceptsFromPersona(validatedBlueprint, persona, personaNodes[index].id)
        );

        const conceptArrays = await Promise.all(conceptPromises);
        const allNewConcepts = conceptArrays.flat();
        const taggedConcepts = allNewConcepts.map(c => ({ ...c, campaignTag }));


        const creativeNodes: MindMapNode[] = taggedConcepts.map(concept => ({
            id: concept.id,
            parentId: concept.strategicPathId, // This is the persona node ID
            type: 'creative',
            label: concept.headline,
            content: { concept },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        }));
        
        setNodes(prev => [...prev, ...creativeNodes]);

    } catch (e: any) {
        console.error("Remix Cerdas gagal:", e);
        setError(e.message || "Gagal menjalankan Remix Cerdas.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
};

const handleStartUgcDiversityPack = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    setViewMode('gallery');
    (window as any).appState = { referenceImage };
    setIsLoading(true);
    setError(null);

    try {
        const campaignTag = `Paket Keragaman UGC ${new Date().toLocaleTimeString()}`;
        setLoadingMessage('Membuat Blueprint Kampanye...');
        const dnaNode: MindMapNode = {
            id: 'dna-root', type: 'dna', label: 'Blueprint Kampanye', content: validatedBlueprint,
            position: { x: 0, y: 0 }, width: 300, height: 420
        };
        
        setLoadingMessage('Menghasilkan 4 variasi persona beragam untuk paket UGC...');
        // FIX: Removed extra argument from generatePersonaVariations call.
        const newPersonas = await generatePersonaVariations(validatedBlueprint, [validatedBlueprint.targetPersona]);
        const allPersonas = [validatedBlueprint.targetPersona, ...newPersonas];

        const personaNodes: MindMapNode[] = allPersonas.map(persona => ({
            id: simpleUUID(),
            parentId: dnaNode.id,
            type: 'persona',
            label: persona.description,
            content: { persona },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 250, height: 140,
        }));
        
        setNodes([dnaNode, ...personaNodes]);

        setLoadingMessage(`Menghasilkan konsep UGC untuk ${allPersonas.length} persona...`);
        const conceptPromises = allPersonas.map((persona, index) => 
            // FIX: Changed generateUgcConceptsForPersona to generateConceptsFromPersona as it does not exist.
            generateConceptsFromPersona(validatedBlueprint, persona, personaNodes[index].id)
        );

        const conceptArrays = await Promise.all(conceptPromises);
        const allNewConcepts = conceptArrays.flat();
        const taggedConcepts = allNewConcepts.map(c => ({ ...c, campaignTag, format: 'UGC' as CreativeFormat }));


        const creativeNodes: MindMapNode[] = taggedConcepts.map(concept => ({
            id: concept.id,
            parentId: concept.strategicPathId, // This is the persona node ID
            type: 'creative',
            label: concept.headline,
            content: { concept },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        }));
        
        setNodes(prev => [...prev, ...creativeNodes]);

    } catch (e: any) {
        console.error("Paket Keragaman UGC gagal:", e);
        setError(e.message || "Gagal menjalankan Paket Keragaman UGC.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
};

const handleStartOneClickCampaign = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    setViewMode('gallery');
    (window as any).appState = { referenceImage };
    setIsLoading(true);
    setError(null);

    try {
        const campaignTag = `Kampanye Keragaman ${new Date().toLocaleTimeString()}`;
        setLoadingMessage('Membuat Blueprint Kampanye...');
        const dnaNode: MindMapNode = {
            id: 'dna-root', type: 'dna', label: 'Blueprint Kampanye', content: validatedBlueprint,
            position: { x: 0, y: 0 }, width: 300, height: 420
        };
        
        setLoadingMessage('Menghasilkan 2 variasi persona...');
        const newPersonas = await generatePersonaVariations(validatedBlueprint, [validatedBlueprint.targetPersona]);
        const allPersonas = [validatedBlueprint.targetPersona, ...newPersonas.slice(0, 2)]; // Total 3 personas

        const personaNodes: MindMapNode[] = allPersonas.map(persona => ({
            id: simpleUUID(),
            parentId: dnaNode.id,
            type: 'persona',
            label: persona.description,
            content: { persona },
            position: { x: 0, y: 0 },
            isExpanded: false,
            width: 250, height: 140,
        }));
        
        setNodes([dnaNode, ...personaNodes]);
        
        const formats: CreativeFormat[] = ['UGC', 'Sebelum & Sesudah', 'Penawaran Langsung'];
        const triggerNames = ['Bukti Sosial', 'Otoritas', 'Kelangkaan'];

        setLoadingMessage(`Menghasilkan 27 konsep untuk ${allPersonas.length} persona...`);
        const conceptPromises = allPersonas.map((persona, index) => 
            generateMatrixConcepts(validatedBlueprint, persona, formats, triggerNames, personaNodes[index].id)
        );

        const conceptArrays = await Promise.all(conceptPromises);
        const allNewConcepts = conceptArrays.flat();
        const taggedConcepts = allNewConcepts.map(c => ({ ...c, campaignTag }));


        const creativeNodes: MindMapNode[] = taggedConcepts.map(concept => ({
            id: concept.id,
            parentId: concept.strategicPathId, // This is the persona node ID
            type: 'creative',
            label: concept.headline,
            content: { concept },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        }));
        
        setNodes(prev => [...prev, ...creativeNodes]);

    } catch (e: any) {
        console.error("Kampanye Keragaman gagal:", e);
        setError(e.message || "Gagal menjalankan Kampanye Keragaman.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
};
  
  const handleTogglePersona = async (nodeId: string) => {
      const personaNode = nodes.find(n => n.id === nodeId);
      if (!personaNode || !campaignBlueprint) return;
  
      const childrenExist = nodes.some(n => n.parentId === nodeId);
  
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
      } else {
          setIsLoading(true);
          setLoadingMessage(`Menganalisis Poin Masalah & Keinginan untuk persona "${personaNode.label}"...`);
          try {
              const persona = (personaNode.content as { persona: TargetPersona }).persona;
              const painDesires = await generatePainDesires(campaignBlueprint, persona);
              
              const newPainDesireNodes: MindMapNode[] = painDesires.map(pd => ({
                  id: simpleUUID(),
                  parentId: nodeId,
                  type: 'pain_desire',
                  label: pd.name,
                  content: { painDesire: pd },
                  position: { x: 0, y: 0 },
                  isExpanded: false,
                  width: 250,
                  height: 120,
              }));
  
              setNodes(prev => [
                  ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
                  ...newPainDesireNodes
              ]);
          } catch (e: any) {
              console.error(e);
              setError(e.message || 'Gagal menganalisis Poin Masalah & Keinginan.');
          } finally {
              setIsLoading(false);
              setLoadingMessage('');
          }
      }
  };

  const handleTogglePainDesire = async (nodeId: string) => {
      const painDesireNode = nodes.find(n => n.id === nodeId);
      if (!painDesireNode || !campaignBlueprint) return;

      const childrenExist = nodes.some(n => n.parentId === nodeId);
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
          return;
      }

      const personaNode = nodes.find(n => n.id === painDesireNode.parentId);
      if (!personaNode) {
          setError('Konteks persona tidak ditemukan.');
          return;
      }
      
      setIsLoading(true);
      setLoadingMessage(`Menganalisis potensi keberatan untuk "${painDesireNode.label}"...`);
      try {
          const persona = (personaNode.content as { persona: TargetPersona }).persona;
          const painDesire = (painDesireNode.content as { painDesire: PainDesireObject }).painDesire;
          const objections = await generateObjections(campaignBlueprint, persona, painDesire);

          const newObjectionNodes: MindMapNode[] = objections.map(objection => ({
              id: simpleUUID(),
              parentId: nodeId,
              type: 'objection',
              label: objection.name,
              content: { objection },
              position: { x: 0, y: 0 },
              isExpanded: false,
              width: 250,
              height: 100,
          }));

          setNodes(prev => [
              ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
              ...newObjectionNodes
          ]);
      } catch (e: any) {
          console.error(e);
          setError(e.message || 'Gagal menganalisis keberatan.');
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };
  
  const handleToggleObjection = async (nodeId: string) => {
      const objectionNode = nodes.find(n => n.id === nodeId);
      if (!objectionNode || !campaignBlueprint) return;
  
      const childrenExist = nodes.some(n => n.parentId === nodeId);
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
          return;
      }
  
      const painDesireNode = nodes.find(n => n.id === objectionNode.parentId);
      const personaNode = painDesireNode ? nodes.find(n => n.id === painDesireNode.parentId) : undefined;
  
      if (!personaNode) {
          setError('Konteks persona tidak ditemukan.');
          return;
      }
  
      setIsLoading(true);
      setLoadingMessage(`Mencari jenis penawaran untuk mengatasi "${objectionNode.label}"...`);
      try {
          const persona = (personaNode.content as { persona: TargetPersona }).persona;
          const objection = (objectionNode.content as { objection: ObjectionObject }).objection;
          const offers = await generateOfferTypes(campaignBlueprint, persona, objection);
  
          const newOfferNodes: MindMapNode[] = offers.map(offer => ({
              id: simpleUUID(),
              parentId: nodeId,
              type: 'offer',
              label: offer.name,
              content: { offer },
              position: { x: 0, y: 0 },
              isExpanded: false,
              width: 250,
              height: 100,
          }));
  
          setNodes(prev => [
              ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
              ...newOfferNodes
          ]);
      } catch (e: any) {
          console.error(e);
          setError(e.message || 'Gagal membuat jenis penawaran.');
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };

  const handleToggleOffer = (nodeId: string) => {
      const offerNode = nodes.find(n => n.id === nodeId);
      if (!offerNode) return;
  
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
          const offerNode = nodes.find(n => n.id === awarenessNode.parentId);
          const objectionNode = offerNode ? nodes.find(n => n.id === offerNode.parentId) : undefined;
          const painDesireNode = objectionNode ? nodes.find(n => n.id === objectionNode.parentId) : undefined;
          const personaNode = painDesireNode ? nodes.find(n => n.id === painDesireNode.parentId) : undefined;
  
          if (!personaNode || !objectionNode || !painDesireNode || !offerNode) {
              setError('Konteks persona, poin masalah/keinginan, keberatan, atau penawaran tidak ditemukan untuk membuat sudut pandang.');
              return;
          }
  
          setIsLoading(true);
          setLoadingMessage(`Membuat sudut pandang strategis untuk tahap "${awarenessNode.label}"...`);
          
          try {
              const personaContent = personaNode.content as { persona: TargetPersona };
              const painDesireContent = painDesireNode.content as { painDesire: PainDesireObject };
              const objectionContent = objectionNode.content as { objection: ObjectionObject };
              const offerContent = offerNode.content as { offer: OfferTypeObject };

              const angles = await generateHighLevelAngles(
                campaignBlueprint, 
                personaContent.persona, 
                awarenessNode.label as AwarenessStage, 
                objectionContent.objection, 
                painDesireContent.painDesire,
                offerContent.offer
              ); 
              
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
              setError(e.message || 'Gagal membuat sudut pandang strategis.');
          } finally {
              setIsLoading(false);
              setLoadingMessage('');
          }
      }
  };

  const handleToggleAngle = async (nodeId: string) => {
      const angleNode = nodes.find(n => n.id === nodeId);
      if (!angleNode || !campaignBlueprint) return;
  
      const childrenExist = nodes.some(n => n.parentId === nodeId);
  
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
      } else {
          const awarenessNode = nodes.find(n => n.id === angleNode.parentId);
          const offerNode = awarenessNode ? nodes.find(n => n.id === awarenessNode.parentId) : undefined;
          const objectionNode = offerNode ? nodes.find(n => n.id === offerNode.parentId) : undefined;
          const painDesireNode = objectionNode ? nodes.find(n => n.id === objectionNode.parentId) : undefined;
          const personaNode = painDesireNode ? nodes.find(n => n.id === painDesireNode.parentId) : undefined;
          
          if (!personaNode || !awarenessNode) {
              setError('Konteks tidak ditemukan untuk membuat pemicu.');
              return;
          }
  
          setIsLoading(true);
          setLoadingMessage(`Menganalisis pemicu untuk sudut pandang "${angleNode.label}"...`);
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
              setError(e.message || 'Gagal menganalisis pemicu pembelian.');
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
  
  const handleTogglePlacement = async (nodeId: string, options?: { isUgcPack?: boolean, preferredCarouselArc?: string }) => {
      const placementNode = nodes.find(n => n.id === nodeId);
      if (!placementNode || !campaignBlueprint) return;

      const childrenExist = nodes.some(n => n.parentId === nodeId);
      if (childrenExist) {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n));
          return;
      }
      
      const formatNode = nodes.find(n => n.id === placementNode.parentId);
      const triggerNode = formatNode ? nodes.find(n => n.id === formatNode.parentId) : undefined;
      const angleNode = triggerNode ? nodes.find(n => n.id === triggerNode.parentId) : undefined;
      const awarenessNode = angleNode ? nodes.find(n => n.id === angleNode.parentId) : undefined;
      const offerNode = awarenessNode ? nodes.find(n => n.id === awarenessNode.parentId) : undefined;
      const objectionNode = offerNode ? nodes.find(n => n.id === offerNode.parentId) : undefined;
      const painDesireNode = objectionNode ? nodes.find(n => n.id === objectionNode.parentId) : undefined;
      const personaNode = painDesireNode ? nodes.find(n => n.id === painDesireNode.parentId) : undefined;

      if (!formatNode || !awarenessNode || !triggerNode || !angleNode || !personaNode || !offerNode) {
          setError("Konteks untuk brief ini tidak dapat ditemukan.");
          return;
      }

      const persona = (personaNode.content as { persona: TargetPersona }).persona;
      const trigger = (triggerNode.content as { trigger: BuyingTriggerObject }).trigger;
      const placement = placementNode.label as PlacementFormat;
      const format = formatNode.label as CreativeFormat;
      const angle = angleNode.label;
      const awareness = awarenessNode.label as AwarenessStage;
      const offer = (offerNode.content as { offer: OfferTypeObject }).offer;
      
      const isUgcPack = options?.isUgcPack || false;
      const preferredCarouselArc = options?.preferredCarouselArc;

      if (isUgcPack) {
          setIsLoading(true);
          setLoadingMessage(`Menghasilkan Paket Keragaman UGC...`);
          try {
              const ideas = await generateUgcPack(
                  campaignBlueprint, angle, trigger, awareness, placement, persona, placementNode.id, allowVisualExploration, offer
              );
              
              const taggedIdeas = ideas.map(idea => ({ ...idea, campaignTag: 'Paket Keragaman UGC' }));

              const newCreativeNodes: MindMapNode[] = taggedIdeas.map(concept => ({
                  id: concept.id,
                  parentId: nodeId,
                  type: 'creative',
                  label: concept.headline,
                  content: { concept },
                  position: { x: 0, y: 0 },
                  width: 160,
                  height: 240,
              }));

              setNodes(prev => [
                  ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
                  ...newCreativeNodes,
              ]);

          } catch(e: any) {
              console.error(e);
              setError(`Gagal menghasilkan Paket Keragaman UGC.`);
          } finally {
              setIsLoading(false); 
              setLoadingMessage('');
          }
          return;
      }
      
      setIsLoading(true);
      setLoadingMessage(`Menghasilkan ide ${placement} untuk format "${format}"...`);

      try {
          const ideas = await generateCreativeIdeas(
              campaignBlueprint, angle, trigger, awareness, format, placement, persona, placementNode.id, allowVisualExploration, offer, preferredCarouselArc
          );
          
          const taggedIdeas = ideas.map(idea => ({ ...idea, campaignTag: 'Eksplorasi Manual' }));

          const newCreativeNodes: MindMapNode[] = taggedIdeas.map(concept => ({
              id: concept.id,
              parentId: nodeId,
              type: 'creative',
              label: concept.headline,
              content: { concept },
              position: { x: 0, y: 0 },
              width: 160,
              height: 240,
          }));

          setNodes(prev => [
              ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
              ...newCreativeNodes,
          ]);
      } catch(e: any) {
          console.error(e);
          setError(`Gagal menghasilkan ide untuk "${placement}".`);
      } finally {
          setIsLoading(false); 
          setLoadingMessage('');
      }
  };

  const handleDeleteNode = (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (!nodeToDelete) return;
      
      const messageMap = {
          'persona': 'Anda yakin ingin menghapus persona ini dan semua turunannya?',
          'pain_desire': 'Anda yakin ingin menghapus Poin Masalah/Keinginan ini dan semua turunannya?',
          'objection': 'Anda yakin ingin menghapus keberatan ini dan semua turunannya?',
          'offer': 'Anda yakin ingin menghapus penawaran ini dan semua turunannya?',
          'angle': 'Anda yakin ingin menghapus sudut pandang ini dan semua turunannya?',
          'trigger': 'Anda yakin ingin menghapus pemicu ini dan semua turunannya?',
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
    setLoadingMessage('Menghasilkan variasi persona baru...');
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
        setError('Gagal menghasilkan persona baru.');
    } finally {
        setIsLoading(false); setLoadingMessage('');
    }
  };
  
   const handleAddCustomPersona = () => {
    const description = window.prompt("Masukkan deskripsi singkat untuk persona baru Anda:");
    if (!description || description.trim() === "") return;
    
    const newPersona: TargetPersona = {
        description: description,
        painPoints: ["Poin masalah 1", "Poin masalah 2"],
        desiredOutcomes: ["Hasil yang diinginkan 1", "Hasil yang diinginkan 2"],
        age: "25-35",
        creatorType: "Pengguna Biasa",
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
          let evolvedConcepts: Omit<AdConcept, 'imageUrls'>[] = [];

          if (evolutionType === 'trigger') {
              setLoadingMessage(`Mendapatkan detail untuk pemicu "${newValue}"...`);

              const findParent = (startNodeId: string, type: 'angle' | 'persona'): MindMapNode | undefined => {
                  let currentNode = nodes.find(n => n.id === startNodeId);
                  while (currentNode) {
                      if (currentNode.type === type) return currentNode;
                      currentNode = currentNode.parentId ? nodes.find(n => n.id === currentNode.parentId) : undefined;
                  }
                  return undefined;
              };

              const placementNode = nodes.find(n => n.id === baseConcept.strategicPathId);
              const angleNode = findParent(placementNode?.id || '', 'angle');
              const personaNode = findParent(angleNode?.id || '', 'persona');

              if (!angleNode || !personaNode) {
                  throw new Error("Konteks (sudut pandang/persona) tidak ditemukan untuk evolusi pemicu.");
              }

              const persona = (personaNode.content as { persona: TargetPersona }).persona;
              const angle = angleNode.label;
              
              const triggerObject = await getBuyingTriggerDetails(newValue, campaignBlueprint, persona, angle);
              
              setLoadingMessage(`Mengevolusikan konsep dengan pemicu "${newValue}"...`);
              
              evolvedConcepts = await evolveConcept(baseConcept, campaignBlueprint, evolutionType, triggerObject);

          } else {
              evolvedConcepts = await evolveConcept(baseConcept, campaignBlueprint, evolutionType, newValue);
          }
          
          if (evolvedConcepts.length > 0) {
              const newConceptUntagged = evolvedConcepts[0];
              const newConcept = {
                  ...newConceptUntagged,
                  campaignTag: `Evolusi dari "${baseConcept.headline.substring(0, 15)}..."`
              };
              const newCreativeNode: MindMapNode = {
                  id: newConcept.id,
                  parentId: baseConcept.strategicPathId,
                  type: 'creative',
                  label: newConcept.headline,
                  content: { concept: newConcept },
                  position: { x: 0, y: 0 },
                  width: 160,
                  height: 240,
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

  const handleInitiateQuickPivot = (conceptId: string) => {
    const conceptNode = nodes.find(n => n.id === conceptId);
    if (!conceptNode || conceptNode.type !== 'creative') return;
    const concept = (conceptNode.content as { concept: AdConcept }).concept;
    setPivotTarget(concept);
  };

  const handleExecuteQuickPivot = async (pivotType: PivotType, config: PivotConfig) => {
    if (!pivotTarget || !campaignBlueprint) return;
    const baseConcept = pivotTarget;
    setPivotTarget(null);
    setIsLoading(true);
    setLoadingMessage(`Melakukan Pivot Cepat: ${pivotType}...`);
    setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isPivoting: true } } } : n));
    
    try {
      const pivotedConcepts = await generateQuickPivot(baseConcept, campaignBlueprint, pivotType, config);
      if (pivotedConcepts.length > 0) {
          const newConceptUntagged = pivotedConcepts[0];
          const newConcept = {
              ...newConceptUntagged,
              campaignTag: `Pivot dari "${baseConcept.headline.substring(0, 15)}..."`
          };
          const newCreativeNode: MindMapNode = {
              id: newConcept.id,
              parentId: newConcept.strategicPathId, // Use the pathId from the new concept
              type: 'creative',
              label: newConcept.headline,
              content: { concept: newConcept },
              position: { x: 0, y: 0 },
              width: 160,
              height: 240,
          };
          setNodes(prev => [...prev, newCreativeNode]);
      } else {
          throw new Error("Pivot Cepat tidak menghasilkan konsep baru.");
      }
    } catch(e: any) {
        console.error("Gagal melakukan Pivot Cepat:", e);
        setError(e.message || "Gagal melakukan Pivot Cepat.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
        setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isPivoting: false } } } : n));
    }
  };

  // --- Smart Remix Handlers ---

  const assembleAdDna = (concept: AdConcept, allNodes: MindMapNode[]): AdDna | null => {
      const nodesMap = new Map(allNodes.map(n => [n.id, n]));
      
      const findParent = (startNodeId: string, type: NodeType): MindMapNode | undefined => {
          let currentNode = nodesMap.get(startNodeId);
          while(currentNode) {
              if (currentNode.type === type) return currentNode;
              currentNode = currentNode.parentId ? nodesMap.get(currentNode.parentId) : undefined;
          }
          return undefined;
      };

      const placementNode = nodesMap.get(concept.strategicPathId);
      if (!placementNode) return null;

      const formatNode = findParent(placementNode.id, 'format');
      const triggerNode = findParent(formatNode?.id || '', 'trigger');
      const angleNode = findParent(triggerNode?.id || '', 'angle');
      const awarenessNode = findParent(angleNode?.id || '', 'awareness');
      const offerNode = findParent(awarenessNode?.id || '', 'offer');
      const objectionNode = findParent(offerNode?.id || '', 'objection');
      const painDesireNode = findParent(objectionNode?.id || '', 'pain_desire');
      const personaNode = findParent(painDesireNode?.id || '', 'persona');

      if (!personaNode || !painDesireNode || !triggerNode || !formatNode || !awarenessNode || !angleNode || !offerNode || !objectionNode) {
          console.error("Tidak dapat menyusun jalur DNA lengkap", { personaNode, painDesireNode, triggerNode, formatNode, awarenessNode, angleNode, offerNode, objectionNode });
          return null;
      }

      return {
          persona: (personaNode.content as { persona: TargetPersona }).persona,
          painDesire: (painDesireNode.content as { painDesire: PainDesireObject }).painDesire,
          objection: (objectionNode.content as { objection: ObjectionObject }).objection,
          trigger: (triggerNode.content as { trigger: BuyingTriggerObject }).trigger,
          format: (formatNode.content as { format: CreativeFormat }).format,
          placement: (placementNode.content as { placement: PlacementFormat }).placement,
          awareness: (awarenessNode.content as { awareness: AwarenessStage }).awareness,
          angle: (angleNode.content as { angle: string }).angle,
          offer: (offerNode.content as { offer: OfferTypeObject }).offer,
      };
  };

  const handleInitiateRemix = (conceptId: string) => {
    const conceptNode = nodes.find(n => n.id === conceptId);
    if (!conceptNode || conceptNode.type !== 'creative') return;
    const concept = (conceptNode.content as { concept: AdConcept }).concept;
    
    const dna = assembleAdDna(concept, nodes);
    if (dna) {
      setRemixTarget(concept);
      setRemixDna(dna);
      setCurrentStep('remix');
    } else {
      setError("Gagal memuat DNA iklan. Jalur strategis tidak lengkap.");
    }
  };
  
  const handleRequestRemixSuggestions = async (component: AdDnaComponent) => {
    if (!remixDna || !remixTarget || !campaignBlueprint) return;
    setRemixingComponent(component);
    setRemixSuggestions(null);
    setIsLoading(true);
    setLoadingMessage(`Mencari variasi untuk ${component}...`);
    try {
      const suggestions = await generateRemixSuggestions(component, remixTarget, remixDna, campaignBlueprint);
      setRemixSuggestions(suggestions);
    } catch (e: any) {
        console.error(e);
        setError(e.message || `Gagal menghasilkan saran untuk ${component}.`);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleExecuteRemix = async (suggestion: RemixSuggestion) => {
      if (!remixTarget || !remixingComponent || !campaignBlueprint) return;
      const baseConcept = remixTarget;
      setIsLoading(true);
      setLoadingMessage(`Membuat konsep baru dari remix ${remixingComponent}...`);
      
      try {
          const newConceptUntagged = await generateConceptFromRemix(baseConcept, remixingComponent, suggestion.payload, campaignBlueprint);
          const newConcept = {
              ...newConceptUntagged,
              campaignTag: `Remix dari "${baseConcept.headline.substring(0, 15)}..."`
          };
          const newCreativeNode: MindMapNode = {
              id: newConcept.id,
              parentId: newConcept.strategicPathId,
              type: 'creative',
              label: newConcept.headline,
              content: { concept: newConcept },
              position: { x: 0, y: 0 },
              width: 160,
              height: 240,
          };
          setNodes(prev => [...prev, newCreativeNode]);
          setCurrentStep('mindmap');
          setViewMode('gallery'); // Switch to gallery to show the new result
      } catch (e: any) {
          console.error(e);
          setError(e.message || "Gagal membuat konsep dari remix.");
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
          setRemixTarget(null);
          setRemixDna(null);
          setRemixingComponent(null);
          setRemixSuggestions(null);
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
        console.error(`Gagal menghasilkan gambar untuk konsep ${conceptId}`, e);
        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: {...concept, error: e.message || 'Gagal menghasilkan gambar', isGenerating: false} } } : n));
    }
  };

  const handleGenerateFilteredImages = async (conceptIds: string[]) => {
    setIsLoading(true);
    const total = conceptIds.length;
    let i = 0;
    for (const conceptId of conceptIds) {
      i++;
      setLoadingMessage(`Menghasilkan gambar ${i} dari ${total}...`);
      try {
        await handleGenerateImage(conceptId);
      } catch (e) {
        console.error(`Gagal menghasilkan gambar untuk konsep ${conceptId} selama operasi massal.`, e);
      }
    }
    setLoadingMessage('');
    setIsLoading(false);
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

  const handleBatchTagConcepts = (conceptIds: string[], statusTag: AdConcept['statusTag']) => {
      setNodes(prev => prev.map(n => {
          if (conceptIds.includes(n.id) && n.type === 'creative') {
              const concept = (n.content as { concept: AdConcept }).concept;
              return { ...n, content: { concept: { ...concept, statusTag } } };
          }
          return n;
      }));
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
                        <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Generator Konsep Iklan</h1>
                        <p className="text-brand-text-secondary mt-2 text-lg">Ubah satu iklan menjadi puluhan variasi berkinerja tinggi.</p>
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
                    onWorkflowSelected={handleWorkflowSelected}
                    onBack={handleReset}
                    allowVisualExploration={allowVisualExploration}
                    onAllowVisualExplorationChange={setAllowVisualExploration}
                />
            );
        case 'remix':
            return remixTarget && remixDna && (
                <RemixDashboard
                    remixTarget={remixTarget}
                    remixDna={remixDna}
                    suggestions={remixSuggestions}
                    remixingComponent={remixingComponent}
                    onRequestSuggestions={handleRequestRemixSuggestions}
                    onExecuteRemix={handleExecuteRemix}
                    onBack={() => setCurrentStep('mindmap')}
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
                onInitiateQuickPivot: handleInitiateQuickPivot,
                onInitiateRemix: handleInitiateRemix,
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
                    onTogglePainDesire={handleTogglePainDesire}
                    onToggleObjection={handleToggleObjection}
                    onToggleOffer={handleToggleOffer}
                    onToggleAngle={handleToggleAngle}
                    onToggleTrigger={handleToggleTrigger}
                    onToggleAwareness={handleToggleAwareness}
                    onToggleFormat={handleToggleFormat}
                    onTogglePlacement={handleTogglePlacement}
                    onGenerateImage={handleGenerateImage}
                    onEditConcept={handleEditConcept}
                    onInitiateEvolution={handleInitiateEvolution}
                    onInitiateQuickPivot={handleInitiateQuickPivot}
                    onInitiateRemix={handleInitiateRemix}
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
                    isLoading={isLoading}
                    onGenerateFilteredImages={handleGenerateFilteredImages}
                    onBatchTagConcepts={handleBatchTagConcepts}
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
             title="Tampilan Peta Pikiran"
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
      {pivotTarget && campaignBlueprint && (
        <QuickPivotModal
          baseConcept={pivotTarget}
          blueprint={campaignBlueprint}
          onGenerate={handleExecuteQuickPivot}
          onClose={() => setPivotTarget(null)}
        />
      )}
    </main>
  );
}

export default App;