
import React, { useState, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { DnaValidationStep } from './components/DnaValidationStep';
import { MindMapView } from './components/MindMapView';
import { ConceptGallery } from './components/ConceptGallery';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Lightbox } from './components/Lightbox';
import { AdConcept, CampaignBlueprint, MindMapNode, ViewMode, AppStep, CreativeFormat, ALL_CREATIVE_FORMATS, PlacementFormat, ALL_PLACEMENT_FORMATS, AwarenessStage, ALL_AWARENESS_STAGES, TargetPersona, BuyingTriggerObject, ObjectionObject, PainDesireObject, OfferTypeObject, AdDna, NodeType, AdDnaComponent, RemixSuggestion } from './types';
import { analyzeCampaignBlueprint, generatePersonaVariations, generatePainDesires, generateObjections, generateOfferTypes, generateHighLevelAngles, generateBuyingTriggers, generateCreativeIdeas, generateAdImage, generateConceptFromRemix, generateConceptsFromPersona, generateUgcPack, generateMatrixConcepts, generateRemixSuggestions, generateHpAuthorityPack } from './services/geminiService';
import { LayoutGridIcon, NetworkIcon } from './components/icons';
import { EditModal } from './components/EditModal';
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

  const handleWorkflowSelected = (validatedBlueprint: CampaignBlueprint, workflow: 'deep-dive' | 'quick-scale' | 'ugc-diversity-pack' | 'one-click-campaign' | 'hp-authority-pack') => {
      if (workflow === 'deep-dive') {
          handleStartManualExploration(validatedBlueprint);
      } else if (workflow === 'quick-scale') {
          handleStartSmartRemix(validatedBlueprint);
      } else if (workflow === 'ugc-diversity-pack') {
          handleStartUgcDiversityPack(validatedBlueprint);
      } else if (workflow === 'one-click-campaign') {
          handleStartOneClickCampaign(validatedBlueprint);
      } else if (workflow === 'hp-authority-pack') {
          handleStartHpAuthorityPack(validatedBlueprint);
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
        height: 180,
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
            width: 250, height: 180,
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
            width: 250, height: 180,
        }));
        
        setNodes([dnaNode, ...personaNodes]);

        setLoadingMessage(`Menghasilkan konsep UGC untuk ${allPersonas.length} persona...`);
        const conceptPromises = allPersonas.map((persona, index) => 
            generateUgcPack(validatedBlueprint, persona, personaNodes[index].id)
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
            width: 250, height: 180,
        }));
        
        setNodes([dnaNode, ...personaNodes]);
        
        const formats: CreativeFormat[] = ['UGC', 'Sebelum & Sesudah', 'Penawaran Langsung'];

        setLoadingMessage(`Menghasilkan 9 konsep untuk ${allPersonas.length} persona...`);
        const conceptPromises = allPersonas.map((persona, index) => 
            generateMatrixConcepts(validatedBlueprint, persona, formats, personaNodes[index].id)
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
  
const handleStartHpAuthorityPack = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    setViewMode('gallery');
    (window as any).appState = { referenceImage };
    setIsLoading(true);
    setError(null);

    try {
        const campaignTag = `Paket Otoritas HP ${new Date().toLocaleTimeString()}`;
        setLoadingMessage('Membuat Blueprint Kampanye...');
        const dnaNode: MindMapNode = {
            id: 'dna-root', type: 'dna', label: 'Blueprint Kampanye', content: validatedBlueprint,
            position: { x: 0, y: 0 }, width: 300, height: 420
        };
        
        const initialPersona = validatedBlueprint.targetPersona;
        const personaNode: MindMapNode = {
            id: simpleUUID(),
            parentId: dnaNode.id,
            type: 'persona',
            label: initialPersona.description,
            content: { persona: initialPersona },
            position: { x: 0, y: 0 },
            isExpanded: true, 
            width: 250, height: 180,
        };
        
        setNodes([dnaNode, personaNode]);

        setLoadingMessage(`Menghasilkan Paket Otoritas HP untuk persona "${initialPersona.description}"...`);
        const concepts = await generateHpAuthorityPack(validatedBlueprint, initialPersona, personaNode.id);
        const taggedConcepts = concepts.map(c => ({ ...c, campaignTag }));

        const creativeNodes: MindMapNode[] = taggedConcepts.map(concept => ({
            id: concept.id,
            parentId: concept.strategicPathId,
            type: 'creative',
            label: concept.headline,
            content: { concept },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        }));
        
        setNodes(prev => [...prev, ...creativeNodes]);

    } catch (e: any) {
        console.error("Paket Otoritas HP gagal:", e);
        setError(e.message || "Gagal menjalankan Paket Otoritas HP.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
};

  const handleTogglePersona = async (nodeId: string) => {
      const personaNode = nodes.find(n => n.id === nodeId);
      if (!personaNode || !campaignBlueprint) return;
  
      const childrenExist = nodes.some(n => n.parentId === nodeId && n.type === 'pain_desire');
  
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
                  campaignBlueprint, persona, placementNode.id
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
            width: 250, height: 180,
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
        width: 250, height: 180,
    };
    setNodes(prev => [...prev, newPersonaNode]);
  };

  const handleGenerateConceptsForPersona = async (nodeId: string) => {
    if (!campaignBlueprint) return;
    const personaNode = nodes.find(n => n.id === nodeId);
    if (!personaNode || personaNode.type !== 'persona') {
        setError("Persona node not found.");
        return;
    }

    const existingCreatives = nodes.some(n => n.parentId === nodeId && n.type === 'creative');
    if (existingCreatives) {
        if (!window.confirm("Konsep sudah ada untuk persona ini. Tetap hasilkan lagi?")) {
            return;
        }
    }

    setIsLoading(true);
    setLoadingMessage(`Menghasilkan konsep untuk persona "${personaNode.label}"...`);
    
    try {
        const persona = (personaNode.content as { persona: TargetPersona }).persona;
        const newConcepts = await generateConceptsFromPersona(campaignBlueprint, persona, nodeId);

        const taggedConcepts = newConcepts.map(c => ({ 
            ...c, 
            campaignTag: `Quick-Gen ${persona.description.substring(0, 15)}...`
        }));

        const creativeNodes: MindMapNode[] = taggedConcepts.map(concept => ({
            id: concept.id,
            parentId: nodeId, // Link directly to persona
            type: 'creative',
            label: concept.headline,
            content: { concept },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        }));
        
        setNodes(prev => [
            ...prev.map(n => n.id === nodeId ? { ...n, isExpanded: true } : n),
             ...creativeNodes
        ]);
        setViewMode('gallery');

    } catch (e: any) {
        console.error("Quick-Gen for persona failed:", e);
        setError(e.message || "Gagal menjalankan Quick-Gen untuk persona.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
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
          setError("Gagal mengurai DNA iklan untuk memulai Remix.");
      }
  };
  
  const handleRequestRemixSuggestions = async (component: AdDnaComponent) => {
    if (!remixTarget || !remixDna || !campaignBlueprint) return;
    setRemixingComponent(component);
    setRemixSuggestions(null);
    try {
        const suggestions = await generateRemixSuggestions(component, remixTarget, remixDna, campaignBlueprint);
        setRemixSuggestions(suggestions);
    } catch(e: any) {
        setError(e.message || `Gagal menghasilkan saran untuk ${component}.`);
    } finally {
        setRemixingComponent(null);
    }
  };
  
  const handleExecuteRemix = async (suggestion: RemixSuggestion) => {
      if (!remixTarget || !campaignBlueprint || !remixingComponent) return;

      setIsLoading(true);
      setLoadingMessage(`Membuat konsep baru berdasarkan "${suggestion.title}"...`);
      setCurrentStep('mindmap'); 
      setViewMode('gallery'); 

      try {
          const newConcept = await generateConceptFromRemix(remixTarget, remixingComponent, suggestion.payload, campaignBlueprint);
          
          const newCreativeNode: MindMapNode = {
            id: newConcept.id,
            parentId: newConcept.strategicPathId,
            type: 'creative',
            label: newConcept.headline,
            content: { concept: { ...newConcept, campaignTag: `Remix dari ${remixTarget.adSetName}` } },
            position: { x: 0, y: 0 },
            width: 160,
            height: 240,
        };
        
        setNodes(prev => [...prev, newCreativeNode]);

      } catch (e: any) {
          console.error("Gagal menjalankan remix:", e);
          setError(e.message || "Gagal membuat konsep yang diremix.");
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
          // Reset remix state
          setRemixTarget(null);
          setRemixDna(null);
          setRemixSuggestions(null);
          setRemixingComponent(null);
      }
  };
  
  // --- Image Generation & Content Management ---

  const handleGenerateImage = async (conceptId: string) => {
    setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isGenerating: true, error: undefined } } } : n));
    try {
        const conceptNode = nodes.find(n => n.id === conceptId);
        if (!conceptNode || conceptNode.type !== 'creative') throw new Error("Concept not found");
        const concept = (conceptNode.content as { concept: AdConcept }).concept;
        
        const imageUrl = await generateAdImage(concept.visualPrompt, referenceImage ?? undefined, allowVisualExploration);
        
        let newImageUrls = [imageUrl];
        if (concept.placement === 'Carousel' && concept.carouselSlides) {
            const slidePromises = concept.carouselSlides.slice(1).map(slide => 
                generateAdImage(slide.visualPrompt, referenceImage ?? undefined, allowVisualExploration)
            );
            const slideImages = await Promise.all(slidePromises);
            newImageUrls = [imageUrl, ...slideImages];
        }

        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: { ...concept, isGenerating: false, imageUrls: newImageUrls } } } : n));
    } catch (e: any) {
        console.error("Image generation failed for", conceptId, e);
        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isGenerating: false, error: e.message || "Request was blocked or failed." } } } : n));
    }
  };

  const handleGenerateFilteredImages = async (conceptIds: string[]) => {
      setNodes(prev => prev.map(n => conceptIds.includes(n.id) ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isGenerating: true, error: undefined } } } : n));
      
      const generationPromises = conceptIds.map(id => handleGenerateImage(id));
      await Promise.allSettled(generationPromises);
  };
  
  const handleEditConcept = (conceptId: string) => setEditingConceptId(conceptId);
  const handleCloseModal = () => setEditingConceptId(null);
  
  const handleSaveConcept = (conceptId: string, updatedContent: AdConcept) => {
      setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, label: updatedContent.headline, content: { concept: updatedContent } } : n));
      setEditingConceptId(null);
  };

  const handleBatchTagConcepts = (conceptIds: string[], statusTag: AdConcept['statusTag']) => {
      setNodes(prev => prev.map(n => {
          if (conceptIds.includes(n.id)) {
              const concept = (n.content as { concept: AdConcept }).concept;
              return { ...n, content: { concept: { ...concept, statusTag } } };
          }
          return n;
      }));
  };
  
  const allConcepts = useMemo(() => {
    return nodes
        .filter(node => node.type === 'creative')
        .map(node => (node.content as { concept: AdConcept }).concept);
  }, [nodes]);

  const editingConcept = useMemo(() => {
    if (!editingConceptId) return null;
    const node = nodes.find(n => n.id === editingConceptId);
    return node ? (node.content as { concept: AdConcept }).concept : null;
  }, [editingConceptId, nodes]);

  const handleReset = () => {
    if (window.confirm("Anda yakin ingin memulai ulang? Semua progres akan hilang.")) {
        setCurrentStep('input');
        setCampaignBlueprint(null);
        setNodes([]);
        setError(null);
        setReferenceImage(null);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'input':
        return <div className="min-h-screen flex items-center justify-center"><InputForm onGenerate={handleGenerate} /></div>;
      
      case 'validateBlueprint':
        if (campaignBlueprint && referenceImage) {
          return <DnaValidationStep 
                    initialBlueprint={campaignBlueprint} 
                    referenceImage={referenceImage} 
                    onWorkflowSelected={handleWorkflowSelected}
                    onBack={handleReset}
                    allowVisualExploration={allowVisualExploration}
                    onAllowVisualExplorationChange={setAllowVisualExploration}
                 />;
        }
        return <LoadingIndicator message="Memuat blueprint..." />;

      case 'mindmap':
        return (
            <div className="relative w-full h-screen">
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-brand-surface p-1 rounded-lg shadow-lg">
                    <button
                        onClick={() => setViewMode('mindmap')}
                        disabled={viewMode === 'mindmap'}
                        className={`p-2 rounded-md ${viewMode === 'mindmap' ? 'bg-brand-primary' : 'hover:bg-gray-700'}`}
                    >
                        <NetworkIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('gallery')}
                        disabled={viewMode === 'gallery'}
                        className={`p-2 rounded-md ${viewMode === 'gallery' ? 'bg-brand-primary' : 'hover:bg-gray-700'}`}
                    >
                        <LayoutGridIcon className="w-5 h-5" />
                    </button>
                </div>
                {viewMode === 'mindmap' ? (
                    <MindMapView 
                        nodes={nodes}
                        onTogglePersona={handleTogglePersona}
                        onTogglePainDesire={handleTogglePainDesire}
                        onToggleObjection={handleToggleObjection}
                        onToggleOffer={handleToggleOffer}
                        onToggleAwareness={handleToggleAwareness}
                        onToggleAngle={handleToggleAngle}
                        onToggleTrigger={handleToggleTrigger}
                        onToggleFormat={handleToggleFormat}
                        onTogglePlacement={handleTogglePlacement}
                        onGenerateImage={handleGenerateImage}
                        onEditConcept={handleEditConcept}
                        onInitiateRemix={handleInitiateRemix}
                        onOpenLightbox={(concept, startIndex) => setLightboxData({ concept, startIndex })}
                        onDeleteNode={handleDeleteNode}
                        onReset={handleReset}
                        onGenerateMorePersonas={handleGenerateMorePersonas}
                        onAddCustomPersona={handleAddCustomPersona}
                        onGenerateConceptsForPersona={handleGenerateConceptsForPersona}
                    />
                ) : (
                    <ConceptGallery 
                        nodes={nodes}
                        concepts={allConcepts}
                        editingConcept={editingConcept}
                        campaignBlueprint={campaignBlueprint}
                        isLoading={isLoading}
                        onGenerateImage={handleGenerateImage}
                        onGenerateFilteredImages={handleGenerateFilteredImages}
                        onEditConcept={handleEditConcept}
                        onInitiateRemix={handleInitiateRemix}
                        onSaveConcept={handleSaveConcept}
                        onBatchTagConcepts={handleBatchTagConcepts}
                        onCloseModal={handleCloseModal}
                        onReset={handleReset}
                        onSwitchView={() => setViewMode('mindmap')}
                        onOpenLightbox={(concept, startIndex) => setLightboxData({ concept, startIndex })}
                    />
                )}
            </div>
        );
      
      case 'remix':
          if (remixTarget && remixDna) {
              return <RemixDashboard 
                  remixTarget={remixTarget}
                  remixDna={remixDna}
                  suggestions={remixSuggestions}
                  remixingComponent={remixingComponent}
                  onRequestSuggestions={handleRequestRemixSuggestions}
                  onExecuteRemix={handleExecuteRemix}
                  onBack={() => {
                      setCurrentStep('mindmap');
                      setViewMode('gallery');
                      setRemixTarget(null);
                      setRemixDna(null);
                      setRemixSuggestions(null);
                      setRemixingComponent(null);
                  }}
              />
          }
           return <LoadingIndicator message="Memuat dasbor remix..." />;


      default:
        return <div>Invalid step</div>;
    }
  };

  return (
    <div className="w-full h-full bg-brand-background text-brand-text-primary relative">
        {isLoading && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                <LoadingIndicator message={loadingMessage || 'Memproses...'} />
            </div>
        )}
         {error && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white p-4 rounded-lg shadow-lg max-w-md">
                <p className="font-bold">Error</p>
                <p className="text-sm">{error}</p>
                <button onClick={() => setError(null)} className="absolute top-1 right-2 text-xl">&times;</button>
            </div>
        )}
        {editingConcept && campaignBlueprint && (
            <EditModal 
                concept={editingConcept} 
                campaignBlueprint={campaignBlueprint}
                onSave={handleSaveConcept} 
                onClose={handleCloseModal}
                onGenerateImage={handleGenerateImage}
            />
        )}
         {lightboxData && (
            <Lightbox 
                concept={lightboxData.concept} 
                startIndex={lightboxData.startIndex} 
                onClose={() => setLightboxData(null)} 
            />
        )}
        {renderStep()}
    </div>
  );
}

export default App;
