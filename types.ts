
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
  targetPersona: TargetPersona;
  adDna: {
    salesMechanism: string;
    copyPattern: string;
    persuasionFormula: string;
    specificLanguagePatterns: string[];
    toneOfVoice: string;
    socialProofElements: string;
    objectionHandling: string;
    visualStyle: string;
    targetCountry: string;
    offerSummary: string;
    cta: string;
  };
}

export interface PainDesireObject {
  type: 'Pain' | 'Desire';
  name: string;
  description: string;
  emotionalImpact: string;
}

export interface ObjectionObject {
  name: string;
  description: string;
  counterAngle: string;
}

export interface OfferTypeObject {
  name: string; // e.g., "Buy 1 Get 1 Free", "30-Day Money-Back Guarantee"
  description: string; // Explanation of the offer
  psychologicalPrinciple: string; // e.g., "Reciprocity", "Risk Reversal"
}

export interface BuyingTriggerObject {
  name: string;
  description: string;
  example: string;
  analysis: string; // Why this example is effective.
}

export type BuyingTrigger = string;

export type AwarenessStage = "Unaware" | "Problem Aware" | "Solution Aware" | "Product Aware";
export const ALL_AWARENESS_STAGES: AwarenessStage[] = ["Unaware", "Problem Aware", "Solution Aware", "Product Aware"];

export type CreativeFormat = 'UGC' | 'Before & After' | 'Comparison' | 'Demo' | 'Testimonial' | 'Problem/Solution' | 'Educational/Tip' | 'Storytelling' | 'Article Ad' | 'Split Screen' | 'Advertorial' | 'Listicle' | 'MultiProduct' | 'US vs Them' | 'Meme/Ugly Ad' | 'Direct Offer';
export const ALL_CREATIVE_FORMATS: CreativeFormat[] = [
    'UGC', 'Before & After', 'Comparison', 'Demo', 'Testimonial', 'Problem/Solution', 'Educational/Tip', 'Storytelling',
    'Article Ad', 'Split Screen', 'Advertorial', 'Listicle', 'MultiProduct', 'US vs Them', 'Meme/Ugly Ad', 'Direct Offer'
];

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
  trigger: BuyingTriggerObject;
  format: CreativeFormat;
  placement: PlacementFormat;
  awarenessStage: AwarenessStage;
  entryPoint: 'Emotional' | 'Logical' | 'Social' | 'Evolved' | 'Pivoted' | 'Remixed';
  visualVehicle: string;
  visualPrompt: string;
  hook: string;
  headline:string;
  adSetName: string;
  offer: OfferTypeObject;
  carouselSlides?: CarouselSlide[];
  triggerImplementationProof: {
    copyChecklistItemUsed: string;
    visualChecklistItemUsed: string;
  };
  // Persona metadata denormalized for easier access and export
  personaDescription: string;
  personaAge: string;
  personaCreatorType: string;
  // State properties for the concept itself, not the node
  imageUrls?: string[];
  isGenerating?: boolean;
  isEvolving?: boolean;
  isPivoting?: boolean;
  error?: string;
  // For linking back to strategy
  strategicPathId: string;
}

export type NodeType = 'dna' | 'persona' | 'pain_desire' | 'objection' | 'offer' | 'angle' | 'trigger' | 'awareness' | 'format' | 'placement' | 'creative';

export interface MindMapNode {
  id: string;
  parentId?: string;
  type: NodeType;
  label: string;
  content: CampaignBlueprint | { persona: TargetPersona } | { painDesire: PainDesireObject } | { objection: ObjectionObject } | { offer: OfferTypeObject } | { awareness: AwarenessStage } | { angle: string } | { trigger: BuyingTriggerObject } | { format: CreativeFormat } | { placement: PlacementFormat } | { concept: AdConcept };
  position: { x: number; y: number };
  
  // State properties
  isExpanded?: boolean; // For nodes to fetch/show children
  width?: number; // for layout
  height?: number; // for layout
}

export type AppStep = 'input' | 'validateBlueprint' | 'mindmap' | 'remix';
export type ViewMode = 'mindmap' | 'gallery';

export type PivotType =
  | 'age-shift'
  | 'gender-flip'
  | 'lifestyle-swap'
  | 'market-expand'
  | 'awareness-shift'
  | 'channel-adapt';

export type PivotConfig = {
    targetAge?: string;
    targetGender?: 'Male' | 'Female';
    targetLifestyle?: string;
    targetCountry?: string;
    targetAwareness?: AwarenessStage;
    targetPlatform?: 'TikTok' | 'Facebook' | 'YouTube';
};

export type AdDnaComponent = 'persona' | 'painDesire' | 'trigger' | 'format' | 'placement' | 'awareness' | 'angle' | 'offer';

export interface AdDna {
    persona: TargetPersona;
    painDesire: PainDesireObject;
    trigger: BuyingTriggerObject;
    format: CreativeFormat;
    placement: PlacementFormat;
    awareness: AwarenessStage;
    angle: string;
    offer: OfferTypeObject;
}

export interface RemixSuggestion {
  title: string;
  description: string;
  payload: TargetPersona; // Currently supports persona, can be expanded later
}

export interface VisualStyleDNA {
    colorPalette: string;
    lightingStyle: string;
    compositionApproach: string;
    photographyStyle: string;
    modelStyling: string;
    settingType: string;
}
