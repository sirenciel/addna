
import React, { useState, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { DnaValidationStep } from './components/DnaValidationStep';
import { MindMapView } from './components/MindMapView';
import { ConceptGallery } from './components/ConceptGallery';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Lightbox } from './components/Lightbox';
import { AdConcept, CampaignBlueprint, MindMapNode, ViewMode, AppStep, CreativeFormat, ALL_CREATIVE_FORMATS, PlacementFormat, ALL_PLACEMENT_FORMATS, AwarenessStage, ALL_AWARENESS_STAGES, TargetPersona, BuyingTriggerObject, ObjectionObject, PainDesireObject, OfferTypeObject, PivotType, PivotConfig, AdDna, NodeType, AdDnaComponent, RemixSuggestion } from './types';
import { analyzeCampaignBlueprint, generatePersonaVariations, generatePainDesires, generateObjections, generateOfferTypes, generateHighLevelAngles, generateBuyingTriggers, generateCreativeIdeas, generateAdImage, evolveConcept, getBuyingTriggerDetails, generateQuickPivot, generateRemixSuggestions, generateConceptFromRemix, generateConceptsFromPersona } from './services/geminiService';
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
    'Before & After': ['Instagram Feed', 'Carousel'],
    'Comparison': ['Carousel', 'Instagram Feed'],
    'Demo': ['Instagram Story', 'Carousel', 'Instagram Feed'],
    'Testimonial': ['Instagram Feed', 'Carousel'],
    'Problem/Solution': ['Carousel', 'Instagram Feed'],
    'Educational/Tip': ['Carousel', 'Instagram Story'],
    'Storytelling': ['Carousel', 'Instagram Feed'],
    'Article Ad': ['Instagram Feed', 'Carousel'],
    'Split Screen': ['Instagram Feed', 'Carousel'],
    'Advertorial': ['Instagram Feed', 'Carousel'],
    'Listicle': ['Carousel', 'Instagram Feed'],
    'MultiProduct': ['Carousel', 'Instagram Feed'],
    'US vs Them': ['Instagram Feed', 'Carousel'],
    'Meme/Ugly Ad': ['Instagram Story', 'Instagram Feed'],
    'Direct Offer': ['Instagram Story', 'Instagram Feed', 'Carousel'],
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
  const [allowVisualExploration, setAllowVisualExploration] = useState<boolean>(false);


  const handleGenerate = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string) => {
    setIsLoading(true);
    setError(null);
    setCampaignBlueprint(null);
    setNodes([]);
    setLoadingMessage('Analyzing Campaign Blueprint...');

    try {
      const blueprint = await analyzeCampaignBlueprint(imageBase64, caption, productInfo, offerInfo);
      setCampaignBlueprint(blueprint);
      setReferenceImage(imageBase64);
      setCurrentStep('validateBlueprint');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to analyze campaign blueprint.');
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

  const handleStartSmartRemix = async (validatedBlueprint: CampaignBlueprint) => {
    setCampaignBlueprint(validatedBlueprint);
    setCurrentStep('mindmap');
    setViewMode('gallery');
    (window as any).appState = { referenceImage };
    setIsLoading(true);
    setError(null);

    try {
        const campaignTag = `Smart Remix ${new Date().toLocaleString()}`;
        setLoadingMessage('Creating Campaign Blueprint...');
        const dnaNode: MindMapNode = {
            id: 'dna-root', type: 'dna', label: 'Campaign Blueprint', content: validatedBlueprint,
            position: { x: 0, y: 0 }, width: 300, height: 420
        };
        
        setLoadingMessage('Generating persona variations...');
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

        setLoadingMessage(`Generating ad concepts for ${allPersonas.length} personas...`);
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
        console.error("Smart Remix failed:", e);
        setError(e.message || "Failed to run Smart Remix.");
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
          setLoadingMessage(`Analyzing Pain & Desire for persona "${personaNode.label}"...`);
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
              setError(e.message || 'Failed to analyze Pain & Desire.');
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
          setError('Persona context not found.');
          return;
      }
      
      setIsLoading(true);
      setLoadingMessage(`Analyzing potential objections for "${painDesireNode.label}"...`);
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
          setError(e.message || 'Failed to analyze objections.');
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
          setError('Persona context not found.');
          return;
      }
  
      setIsLoading(true);
      setLoadingMessage(`Finding offer types to address "${objectionNode.label}"...`);
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
          setError(e.message || 'Failed to create offer types.');
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
              setError('Persona, pain/desire, objection, or offer context not found for creating an angle.');
              return;
          }
  
          setIsLoading(true);
          setLoadingMessage(`Creating strategic angles for "${awarenessNode.label}" stage...`);
          
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
              setError(e.message || 'Failed to create strategic angles.');
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
              setError('Context not found for creating a trigger.');
              return;
          }
  
          setIsLoading(true);
          setLoadingMessage(`Analyzing triggers for angle "${angleNode.label}"...`);
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
              setError(e.message || 'Failed to analyze buying triggers.');
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
      const angleNode = triggerNode ? nodes.find(n => n.id === triggerNode.parentId) : undefined;
      const awarenessNode = angleNode ? nodes.find(n => n.id === angleNode.parentId) : undefined;
      const offerNode = awarenessNode ? nodes.find(n => n.id === awarenessNode.parentId) : undefined;
      const objectionNode = offerNode ? nodes.find(n => n.id === offerNode.parentId) : undefined;
      const painDesireNode = objectionNode ? nodes.find(n => n.id === objectionNode.parentId) : undefined;
      const personaNode = painDesireNode ? nodes.find(n => n.id === painDesireNode.parentId) : undefined;

      if (!formatNode || !awarenessNode || !triggerNode || !angleNode || !personaNode || !offerNode) {
          setError("Context for this brief could not be found.");
          return;
      }

      const persona = (personaNode.content as { persona: TargetPersona }).persona;
      const trigger = (triggerNode.content as { trigger: BuyingTriggerObject }).trigger;
      const placement = placementNode.label as PlacementFormat;
      const format = formatNode.label as CreativeFormat;
      const angle = angleNode.label;
      const awareness = awarenessNode.label as AwarenessStage;
      const offer = (offerNode.content as { offer: OfferTypeObject }).offer;
      
      setIsLoading(true);
      setLoadingMessage(`Generating ${placement} ideas for "${format}" format...`);

      try {
          const ideas = await generateCreativeIdeas(
              campaignBlueprint, angle, trigger, awareness, format, placement, persona, placementNode.id, allowVisualExploration, offer
          );
          
          const taggedIdeas = ideas.map(idea => ({ ...idea, campaignTag: 'Manual Exploration' }));

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
          setError(`Failed to generate ideas for "${placement}".`);
      } finally {
          setIsLoading(false); 
          setLoadingMessage('');
      }
  };

  const handleDeleteNode = (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (!nodeToDelete) return;
      
      const messageMap = {
          'persona': 'Are you sure you want to delete this persona and all its children?',
          'pain_desire': 'Are you sure you want to delete this Pain/Desire and all its children?',
          'objection': 'Are you sure you want to delete this objection and all its children?',
          'offer': 'Are you sure you want to delete this offer and all its children?',
          'angle': 'Are you sure you want to delete this angle and all its children?',
          'trigger': 'Are you sure you want to delete this trigger and all its children?',
          'creative': 'Are you sure you want to delete this creative concept?',
      };
      // @ts-ignore
      const message = messageMap[nodeToDelete.type] || 'Are you sure you want to delete this node and all its children?';

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
    setLoadingMessage('Generating new persona variations...');
    try {
        const existingPersonas = nodes
            .filter(n => n.type === 'persona')
            .map(n => (n.content as { persona: TargetPersona }).persona);
            
        const newPersonas = await generatePersonaVariations(campaignBlueprint, existingPersonas);

        if (newPersonas.length === 0) {
            setLoadingMessage('No new personas were found.');
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
        setError('Failed to generate new personas.');
    } finally {
        setIsLoading(false); setLoadingMessage('');
    }
  };
  
   const handleAddCustomPersona = () => {
    const description = window.prompt("Enter a brief description for your new persona:");
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
      setLoadingMessage(`Evolving concept to ${evolutionType} "${newValue}"...`);
      setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isEvolving: true } } } : n));

      try {
          let evolvedConcepts: Omit<AdConcept, 'imageUrls'>[] = [];

          if (evolutionType === 'trigger') {
              setLoadingMessage(`Getting details for trigger "${newValue}"...`);

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
                  throw new Error("Context (angle/persona) not found for trigger evolution.");
              }

              const persona = (personaNode.content as { persona: TargetPersona }).persona;
              const angle = angleNode.label;
              
              const triggerObject = await getBuyingTriggerDetails(newValue, campaignBlueprint, persona, angle);
              
              setLoadingMessage(`Evolving concept with trigger "${newValue}"...`);
              
              evolvedConcepts = await evolveConcept(baseConcept, campaignBlueprint, evolutionType, triggerObject);

          } else {
              evolvedConcepts = await evolveConcept(baseConcept, campaignBlueprint, evolutionType, newValue);
          }
          
          if (evolvedConcepts.length > 0) {
              const newConceptUntagged = evolvedConcepts[0];
              const newConcept = {
                  ...newConceptUntagged,
                  campaignTag: `Evolved from "${baseConcept.headline.substring(0, 15)}..."`
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
              throw new Error("Evolution did not yield a new concept.");
          }
      } catch (e: any) {
          console.error(e);
          setError(`Failed to evolve concept.`);
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
    setLoadingMessage(`Performing Quick Pivot: ${pivotType}...`);
    setNodes(prev => prev.map(n => n.id === baseConcept.id ? { ...n, content: { concept: { ...(n.content as { concept: AdConcept }).concept, isPivoting: true } } } : n));
    
    try {
      const pivotedConcepts = await generateQuickPivot(baseConcept, campaignBlueprint, pivotType, config);
      if (pivotedConcepts.length > 0) {
          const newConceptUntagged = pivotedConcepts[0];
          const newConcept = {
              ...newConceptUntagged,
              campaignTag: `Pivoted from "${baseConcept.headline.substring(0, 15)}..."`
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
          throw new Error("Quick Pivot did not yield a new concept.");
      }
    } catch(e: any) {
        console.error("Failed to perform Quick Pivot:", e);
        setError(e.message || "Failed to perform Quick Pivot.");
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

      const placementNode = findParent(concept.strategicPathId, 'placement');
      if (!placementNode) return null;

      const formatNode = findParent(placementNode.id, 'format');
      const triggerNode = findParent(formatNode?.id || '', 'trigger');
      const angleNode = findParent(triggerNode?.id || '', 'angle');
      const awarenessNode = findParent(angleNode?.id || '', 'awareness');
      const offerNode = findParent(awarenessNode?.id || '', 'offer');
      const objectionNode = findParent(offerNode?.id || '', 'objection');
      const painDesireNode = findParent(objectionNode?.id || '', 'pain_desire');
      const personaNode = findParent(painDesireNode?.id || '', 'persona');

      if (!personaNode || !painDesireNode || !triggerNode || !formatNode || !awarenessNode || !angleNode || !offerNode) {
          console.error("Could not assemble full DNA path", { personaNode, painDesireNode, triggerNode, formatNode, awarenessNode, angleNode, offerNode });
          return null;
      }

      return {
          persona: (personaNode.content as { persona: TargetPersona }).persona,
          painDesire: (painDesireNode.content as { painDesire: PainDesireObject }).painDesire,
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
      setError("Failed to load ad DNA. The strategic path is incomplete.");
    }
  };
  
  const handleRequestRemixSuggestions = async (component: AdDnaComponent) => {
    if (!remixDna || !remixTarget || !campaignBlueprint) return;
    setRemixingComponent(component);
    setRemixSuggestions(null);
    setIsLoading(true);
    setLoadingMessage(`Finding variations for ${component}...`);
    try {
      const suggestions = await generateRemixSuggestions(component, remixTarget, remixDna, campaignBlueprint);
      setRemixSuggestions(suggestions);
    } catch (e: any) {
        console.error(e);
        setError(e.message || `Failed to generate suggestions for ${component}.`);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleExecuteRemix = async (suggestion: RemixSuggestion) => {
      if (!remixTarget || !remixingComponent || !campaignBlueprint) return;
      const baseConcept = remixTarget;
      setIsLoading(true);
      setLoadingMessage(`Creating new concept from ${remixingComponent} remix...`);
      
      try {
          const newConceptUntagged = await generateConceptFromRemix(baseConcept, remixingComponent, suggestion.payload, campaignBlueprint);
          const newConcept = {
              ...newConceptUntagged,
              campaignTag: `Remixed from "${baseConcept.headline.substring(0, 15)}..."`
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
          setError(e.message || "Failed to create concept from remix.");
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
        console.error(`Failed to generate image(s) for concept ${conceptId}`, e);
        setNodes(prev => prev.map(n => n.id === conceptId ? { ...n, content: { concept: {...concept, error: e.message || 'Failed to generate image', isGenerating: false} } } : n));
    }
  };

  const handleGenerateFilteredImages = async (conceptIds: string[]) => {
    setIsLoading(true);
    const total = conceptIds.length;
    let i = 0;
    for (const conceptId of conceptIds) {
      i++;
      setLoadingMessage(`Generating image ${i} of ${total}...`);
      try {
        await handleGenerateImage(conceptId);
      } catch (e) {
        console.error(`Failed to generate image for concept ${conceptId} during bulk operation.`, e);
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
                        <p className="text-brand-text-secondary mt-2 text-lg">Turn one ad into dozens of high-performing variations.</p>
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
                    onStartSmartRemix={handleStartSmartRemix}
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
             title="Mind Map View"
             className={`p-2 rounded-md transition-colors ${viewMode === 'mindmap' ? 'bg-brand-primary' : 'hover:bg-gray-700'}`}
           >
             <NetworkIcon className="w-5 h-5" />
           </button>
           <button
             onClick={() => setViewMode('gallery')}
             title="Gallery View"
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
