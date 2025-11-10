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

export type AwarenessStage = "Tidak Sadar" | "Sadar Masalah" | "Sadar Solusi" | "Sadar Produk";
export const ALL_AWARENESS_STAGES: AwarenessStage[] = ["Tidak Sadar", "Sadar Masalah", "Sadar Solusi", "Sadar Produk"];

export type CreativeFormat = 'UGC' | 'Sebelum & Sesudah' | 'Perbandingan' | 'Demo' | 'Testimoni' | 'Masalah/Solusi' | 'Edukasi/Tips' | 'Bercerita' | 'Iklan Artikel' | 'Layar Terpisah' | 'Advertorial' | 'Listicle' | 'Multi-Produk' | 'Kita vs Mereka' | 'Meme/Iklan Jelek' | 'Penawaran Langsung';
export const ALL_CREATIVE_FORMATS: CreativeFormat[] = [
    'UGC', 'Sebelum & Sesudah', 'Perbandingan', 'Demo', 'Testimoni', 'Masalah/Solusi', 'Edukasi/Tips', 'Bercerita',
    'Iklan Artikel', 'Layar Terpisah', 'Advertorial', 'Listicle', 'Multi-Produk', 'Kita vs Mereka', 'Meme/Iklan Jelek', 'Penawaran Langsung'
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
  carouselArc?: string;
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
  campaignTag?: string;
  // For strategic guidance & management
  statusTag?: 'Pengujian' | 'Unggulan' | 'Penskalaan' | 'Jenuh' | 'Diarsipkan';
  performanceSignals?: {
    estimatedCTR?: 'high' | 'medium' | 'low';
    entityIDRisk?: 'duplicate' | 'similar' | 'unique';
    scalingPotential?: 'limited' | 'moderate' | 'high';
  };
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

export type AppStep = 'input' | 'validateBlueprint' | 'mindmap' | 'remix' | 'chooseWorkflow';
export type ViewMode = 'mindmap' | 'gallery';

export type PivotType =
  | 'age-shift'
  | 'gender-flip'
  | 'lifestyle-swap'
  | 'market-expand'
  | 'awareness-shift'
  | 'channel-adapt'
  | 'emotional-flip'
  | 'proof-type-shift'
  | 'urgency-vs-evergreen';

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
    // Contextual, for remixing
    objection?: ObjectionObject;
}

export interface RemixSuggestion {
  title: string;
  description: string;
  // Payload can be different types of DNA components depending on what's being remixed.
  payload: any;
}

export interface VisualStyleDNA {
    colorPalette: string;
    lightingStyle: string;
    compositionApproach: string;
    photographyStyle: string;
    modelStyling: string;
    settingType: string;
}