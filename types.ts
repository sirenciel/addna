export interface TargetPersona {
  description: string;
  painPoints: string[];
  desiredOutcomes: string[];
  age: string;
  creatorType: string; // e.g., 'Influencer', 'Regular User', 'Expert'
}

export interface CampaignBlueprint {
  productAnalysis: {
    name: string;
    keyBenefit: string;
  };
  offerAnalysis: {
    summary: string;
    cta: string;
  };
  targetPersona: TargetPersona;
  adDna: {
    visualFocus: string;
    emotionValue: string;
    textHook: string;
    visualStyle: string;
    targetCountry: string;
  };
}

export interface BuyingTriggerObject {
  name: string;
  description: string;
  example: string;
}

export type BuyingTrigger = string;

export type AwarenessStage = "Unaware" | "Problem Aware" | "Solution Aware" | "Product Aware";
export const ALL_AWARENESS_STAGES: AwarenessStage[] = ["Unaware", "Problem Aware", "Solution Aware", "Product Aware"];

export type CreativeFormat = 'UGC' | 'Before & After' | 'Comparison' | 'Demo' | 'Testimonial' | 'Problem/Solution' | 'Educational/Tip' | 'Storytelling';
export const ALL_CREATIVE_FORMATS: CreativeFormat[] = ['UGC', 'Before & After', 'Comparison', 'Demo', 'Testimonial', 'Problem/Solution', 'Educational/Tip', 'Storytelling'];

export type PlacementFormat = 'Carousel' | 'Instagram Story' | 'Instagram Feed';
export const ALL_PLACEMENT_FORMATS: PlacementFormat[] = ['Carousel', 'Instagram Story', 'Instagram Feed'];


export interface CarouselSlide {
  slideNumber: number;
  visualPrompt: string;
  headline: string;
  description: string;
}

export interface AdConcept {
  id: string;
  angle: string;
  trigger: BuyingTrigger;
  format: CreativeFormat;
  placement: PlacementFormat;
  awarenessStage: AwarenessStage;
  visualVehicle: string;
  visualPrompt: string;
  hook: string;
  headline:string;
  adSetName: string;
  carouselSlides?: CarouselSlide[];
  // Persona metadata denormalized for easier access and export
  personaDescription: string;
  personaAge: string;
  personaCreatorType: string;
  // State properties for the concept itself, not the node
  imageUrls?: string[];
  isGenerating?: boolean;
  isEvolving?: boolean;
  error?: string;
  // For linking back to strategy
  strategicPathId: string;
}

export type NodeType = 'dna' | 'persona' | 'angle' | 'trigger' | 'awareness' | 'format' | 'placement' | 'creative';

export interface MindMapNode {
  id: string;
  parentId?: string;
  type: NodeType;
  label: string;
  content: CampaignBlueprint | { persona: TargetPersona } | { angle: string } | { trigger: BuyingTriggerObject } | { awareness: AwarenessStage } | { format: CreativeFormat } | { placement: PlacementFormat } | { concept: AdConcept };
  position: { x: number; y: number };
  
  // State properties
  isExpanded?: boolean; // For nodes to fetch/show children
  width?: number; // for layout
  height?: number; // for layout
}

export type AppStep = 'input' | 'validateBlueprint' | 'mindmap';
export type ViewMode = 'mindmap' | 'gallery';