
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CampaignBlueprint, AdConcept, CreativeFormat, PlacementFormat, AwarenessStage, TargetPersona, BuyingTriggerObject, CarouselSlide, ObjectionObject, PainDesireObject, OfferTypeObject } from '../types';

// Utility to convert file to base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const imageB64ToGenerativePart = (base64Data: string, mimeType: string = 'image/jpeg') => {
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Strategic Constants ---

const COMPOSITION_FOR_ADS: Record<PlacementFormat, string> = {
    'Instagram Story': 'Leave top 25% clear for headline. Main subject in middle-lower third.',
    'Instagram Feed': 'Rule of thirds. Leave space in either top-left or bottom-right for text overlay.',
    'Carousel': 'Slide 1: Center subject with clear bg. Slides 2-5: Varied composition with consistent text zones.'
};

const CAROUSEL_ARCS: Record<string, string> = {
    'PAS': 'Problem-Agitate-Solution. Ideal for direct response and problem-focused formats. (Hook -> Agitate -> Solution -> Proof -> CTA)',
    'Transformation': 'Before & After narrative. Perfect for formats like "Before & After" or "Testimonial". (Before state -> The struggle -> The discovery/solution -> The glorious After state -> CTA)',
    'Educational': 'Teach something valuable. Best for "Educational/Tip" or "Demo" formats. (Intriguing Hook -> Bust Myth 1 -> Bust Myth 2 -> Reveal The Truth/Method -> CTA/Product Link)',
    'Testimonial Story': 'Customer-centric story. Use for "Testimonial" or "UGC" formats. (Hook with a powerful quote -> Introduce the customer & their story -> The specific result they got -> How the product made it possible -> CTA)'
};


// --- JSON Schemas for robust generation ---

const campaignBlueprintSchema = {
    type: Type.OBJECT,
    properties: {
        productAnalysis: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                keyBenefit: { type: Type.STRING }
            },
            required: ['name', 'keyBenefit']
        },
        targetPersona: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                age: { type: Type.STRING },
                creatorType: { type: Type.STRING },
                painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                desiredOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['description', 'age', 'creatorType', 'painPoints', 'desiredOutcomes']
        },
        adDna: {
            type: Type.OBJECT,
            properties: {
                salesMechanism: { type: Type.STRING },
                copyPattern: { type: Type.STRING },
                persuasionFormula: { type: Type.STRING },
                specificLanguagePatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                toneOfVoice: { type: Type.STRING },
                socialProofElements: { type: Type.STRING },
                objectionHandling: { type: Type.STRING },
                visualStyle: { type: Type.STRING },
                offerSummary: { type: Type.STRING },
                cta: { type: Type.STRING },
                targetCountry: { type: Type.STRING }
            },
            required: [
                'salesMechanism', 'copyPattern', 'persuasionFormula', 'specificLanguagePatterns', 
                'toneOfVoice', 'socialProofElements', 'objectionHandling', 'visualStyle', 
                'offerSummary', 'cta', 'targetCountry'
            ]
        }
    },
    required: ['productAnalysis', 'targetPersona', 'adDna']
};

const targetPersonaSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING },
        age: { type: Type.STRING },
        creatorType: { type: Type.STRING },
        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        desiredOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['description', 'age', 'creatorType', 'painPoints', 'desiredOutcomes']
};

const painDesireObjectSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['Pain', 'Desire'] },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        emotionalImpact: { type: Type.STRING }
    },
    required: ['type', 'name', 'description', 'emotionalImpact']
};

const objectionObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        counterAngle: { type: Type.STRING }
    },
    required: ['name', 'description', 'counterAngle']
};

const offerTypeObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        psychologicalPrinciple: { type: Type.STRING }
    },
    required: ['name', 'description', 'psychologicalPrinciple']
};

const buyingTriggerObjectSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        example: { type: Type.STRING },
        analysis: { type: Type.STRING }
    },
    required: ['name', 'description', 'example', 'analysis']
};

const carouselSlideSchema = {
    type: Type.OBJECT,
    properties: {
        slideNumber: { type: Type.INTEGER },
        visualPrompt: { type: Type.STRING },
        headline: { type: Type.STRING },
        description: { type: Type.STRING }
    },
    required: ['slideNumber', 'visualPrompt', 'headline', 'description']
};

const adConceptSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        angle: { type: Type.STRING },
        trigger: { type: Type.STRING }, // AI returns a string, we map it to object later
        format: { type: Type.STRING },
        placement: { type: Type.STRING },
        awarenessStage: { type: Type.STRING },
        strategicPathId: { type: Type.STRING },
        personaDescription: { type: Type.STRING },
        personaAge: { type: Type.STRING },
        personaCreatorType: { type: Type.STRING },
        visualVehicle: { type: Type.STRING },
        hook: { type: Type.STRING },
        headline: { type: Type.STRING },
        visualPrompt: { type: Type.STRING },
        adSetName: { type: Type.STRING },
        offerName: { type: Type.STRING },
        carouselSlides: { type: Type.ARRAY, items: carouselSlideSchema }
    },
     required: [
        'id', 'angle', 'trigger', 'format', 'placement', 'awarenessStage', 'strategicPathId', 
        'personaDescription', 'personaAge', 'personaCreatorType', 'visualVehicle', 'hook', 
        'headline', 'visualPrompt', 'adSetName', 'offerName'
    ]
};

export const analyzeCampaignBlueprint = async (imageBase64: string, caption: string, productInfo: string, offerInfo: string): Promise<CampaignBlueprint> => {
  const imagePart = imageB64ToGenerativePart(imageBase64, 'image/jpeg');
  const prompt = `
    As a world-class DIRECT RESPONSE COPYWRITING EXPERT, your task is to analyze the provided ad creative and context to reverse-engineer its "SALES DNA" and create a comprehensive "Campaign Blueprint". Your goal is not just to describe what you see, but to deeply understand the persuasion strategy at play.

    CONTEXT:
    - Ad Caption: "${caption}"
    - Product/Service Description: "${productInfo || 'Not provided. Infer from ad.'}"
    - Offer/CTA: "${offerInfo || 'Not provided. Infer from ad.'}"

    Based on all the provided information (image and text), generate a structured JSON object for the Campaign Blueprint.

    Respond ONLY with the single, valid JSON object that conforms to the provided schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
        responseMimeType: "application/json",
        responseSchema: campaignBlueprintSchema,
    }
  });

  const rawJson = response.text;
  return JSON.parse(rawJson) as CampaignBlueprint;
};

export const generatePersonaVariations = async (blueprint: CampaignBlueprint, existingPersonas: TargetPersona[]): Promise<TargetPersona[]> => {
    const prompt = `
        You are a market research expert. Based on the provided 'Campaign Blueprint', generate 3 new, distinct target persona variations.
        These personas should be plausible alternative audiences for the product, exploring different demographics, psychographics, or use cases.

        Campaign Blueprint:
        - Product: ${blueprint.productAnalysis.name}
        - Key Benefit: ${blueprint.productAnalysis.keyBenefit}
        - Original Persona: ${blueprint.targetPersona.description}
        - Target Country: ${blueprint.adDna.targetCountry}

        Existing Persona Descriptions to avoid:
        ${existingPersonas.map(p => `- ${p.description}`).join('\n')}

        For each new persona, create a JSON object with the structure defined in the schema.
        
        Respond ONLY with a JSON array of these persona objects.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: targetPersonaSchema,
            },
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generatePainDesires = async (blueprint: CampaignBlueprint, persona: TargetPersona): Promise<PainDesireObject[]> => {
    const prompt = `
        You are a master consumer psychologist. Your task is to identify the deepest emotional drivers for a specific target persona.
        Based on the provided campaign context, generate a mix of 4 distinct, core emotional drivers: 2 Pains (fears, frustrations) and 2 Desires (aspirations, goals).

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} - It solves problems by delivering "${blueprint.productAnalysis.keyBenefit}".
        - **Target Persona:** ${persona.description}
        - **Known Pains:** ${persona.painPoints.join(', ')}
        - **Known Desires:** ${persona.desiredOutcomes.join(', ')}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Go beyond the surface-level pains and desires provided. Dig deeper into the *underlying emotional state*.
        2.  For each driver, define its "type" as either "Pain" or "Desire".
        3.  Provide a short, impactful "name" (e.g., "Fear of Being Left Behind", "Desire for Effortless Confidence").
        4.  Provide a "description" explaining the driver from the persona's point of view.
        5.  Provide the "emotionalImpact" which describes the raw feeling this driver causes (e.g., "Anxiety and social pressure", "Freedom and self-assurance").

        **Output:**
        Respond ONLY with a valid JSON array of 4 objects (2 Pains, 2 Desires) that conform to the schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: painDesireObjectSchema }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateObjections = async (blueprint: CampaignBlueprint, persona: TargetPersona, painDesire: PainDesireObject): Promise<ObjectionObject[]> => {
    const prompt = `
        You are a seasoned market researcher and sales psychologist. Your task is to predict the 3 MOST LIKELY objections a specific persona will have, stemming directly from a core emotional driver (a pain or desire).

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} (Key Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Offer:** ${blueprint.adDna.offerSummary}
        - **Target Persona:** ${persona.description}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **🔥 Core Emotional Driver:**
        - **Type:** ${painDesire.type}
        - **Name:** "${painDesire.name}"
        - **Description:** "${painDesire.description}"
        - **Emotional Impact:** "${painDesire.emotionalImpact}"

        **Instructions:**
        1.  Connect the dots: How does the product's promise interact with this specific emotional driver to create skepticism or doubt?
        2.  For each objection, provide a short, clear "name" (e.g., "This won't work for MY specific situation", "The results look too good to be true", "It's probably too expensive for the value").
        3.  Provide a "description" explaining the psychology behind the objection, linking it back to the core emotional driver.
        4.  Provide a strategic "counterAngle" that suggests the best way to address this objection in an ad.

        **Output:**
        Respond ONLY with a valid JSON array of 3 objection objects that conform to the schema.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: objectionObjectSchema
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateOfferTypes = async (blueprint: CampaignBlueprint, persona: TargetPersona, objection: ObjectionObject): Promise<OfferTypeObject[]> => {
    const prompt = `
        You are a master marketer and behavioral economist. Your task is to craft 3 distinct, compelling "Offer Types" designed specifically to neutralize a customer's objection.

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Original Offer:** ${blueprint.adDna.offerSummary}
        - **Target Persona:** ${persona.description}
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **🔥 Customer Objection to Overcome:**
        - **Objection Name:** "${objection.name}"
        - **Psychology:** "${objection.description}"

        **Instructions:**
        1.  Analyze the objection. What is the root fear or concern? (e.g., Fear of loss, skepticism, price sensitivity).
        2.  Generate 3 distinct offer structures that directly address this root concern.
        3.  For each offer, provide:
            - A clear "name" (e.g., "Risk-Free 30-Day Trial", "Value Bundle Discount", "Pay-in-3 Installments").
            - A "description" explaining how the offer works for the customer.
            - The core "psychologicalPrinciple" at play (e.g., "Risk Reversal", "Value Anchoring", "Pain of Payment Reduction").

        **Output:**
        Respond ONLY with a valid JSON array of 3 offer objects that conform to the schema.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: offerTypeObjectSchema }
        }
    });
    const rawJson = response.text;
    return JSON.parse(rawJson.replace(/^```json\s*|```$/g, ''));
};


export const generateHighLevelAngles = async (blueprint: CampaignBlueprint, persona: TargetPersona, awarenessStage: AwarenessStage, objection: ObjectionObject, painDesire: PainDesireObject, offer: OfferTypeObject, existingAngles: string[] = []): Promise<string[]> => {
    const prompt = `
        You are a creative strategist. Your task is to generate 4 distinct, high-level strategic angles for an ad campaign.
        **CRITICAL CONSTRAINTS:**
        1. Each angle MUST directly counter a specific customer objection.
        2. Each angle MUST resonate with a core emotional driver (Pain/Desire).
        3. Each angle MUST be framed within the context of the provided Offer Type.

        **Campaign Blueprint:**
        - Product Benefit: ${blueprint.productAnalysis.keyBenefit}
        - Core Persuasion Strategy: Use a "${blueprint.adDna.toneOfVoice}" tone to apply the "${blueprint.adDna.persuasionFormula}" formula.
        - Target Country: ${blueprint.adDna.targetCountry}

        **Target Persona:**
        - Description: ${persona.description}

        **🔥 Core Emotional Driver:**
        - **Type:** ${painDesire.type}
        - **Name:** "${painDesire.name}"

        **🔥 Customer Objection to Overcome:**
        - **Objection Name:** "${objection.name}"
        - **Suggested Counter-Strategy:** "${objection.counterAngle}"

        **🔥 Strategic Offer Type:**
        - **Offer Name:** "${offer.name}"
        - **Psychology:** "${offer.psychologicalPrinciple}"

        **🔥 Target Awareness Stage:** ${awarenessStage}

        **Your Task:**
        Based on all the context above, generate 4 strategic angles.
        1. The angles must be tailored to someone in the "${awarenessStage}" stage.
        2. **Crucially, each angle must be a creative execution of the counter-strategy, while also connecting to the core emotional driver and leveraging the provided offer.**
        3. Use the "Suggested Counter-Strategy" and "Strategic Offer Type" as your primary inspiration.

        ${existingAngles.length > 0 ? `IMPORTANT: Do not generate any of the following angles, as they already exist: ${existingAngles.join(', ')}.` : ''}

        Respond ONLY with a JSON array of 4 unique angle strings. For example: ["Highlight the risk-free trial to build trust and counter skepticism", "Showcase the long-term value and ROI from the bundle to justify the price", "Demonstrate the product's simplicity and then present the easy installment plan"]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const generateBuyingTriggers = async (blueprint: CampaignBlueprint, persona: TargetPersona, angle: string, awarenessStage: AwarenessStage): Promise<BuyingTriggerObject[]> => {
    const prompt = `
        You are a Direct Response Copywriting Coach. Your goal is to educate an advertiser on the best psychological triggers to use for their campaign by creating a mini "Swipe File".
        Based on the campaign context, select the 4 MOST RELEVANT and POWERFUL psychological triggers from the predefined list below. The triggers must be appropriate for the audience's awareness stage.
        Then, for each selected trigger, explain it clearly, provide a concrete example, and analyze why that example works for this specific audience.

        **Predefined List of Psychological Triggers:**
        - **Social Proof:** People trust what others are doing. (e.g., "Join 10,000+ happy customers").
        - **Authority:** People trust experts and credible sources. (e.g., "Recommended by top dermatologists").
        - **Scarcity:** People want what is rare or limited. (e.g., "Only 50 left in stock!").
        - **Urgency:** People act when there's a time limit. (e.g., "Sale ends tonight!").
        - **Reciprocity:** People feel obligated to give back after receiving something. (e.g., "Get a free guide & see how it works").
        - **Liking:** People buy from those they know, like, and trust. (e.g., using a relatable influencer).
        - **Fear of Missing Out (FOMO):** People don't want to be left out of a positive experience. (e.g., "See what everyone is talking about").
        - **Exclusivity:** People want to be part of a select group. (e.g., "Get access to our private community").
        - **Instant Gratification:** People want results now. (e.g., "See visible results in just 3 days").

        **Context:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Key Benefit:** ${blueprint.productAnalysis.keyBenefit}
        - **Target Persona:** ${persona.description} (Pain Points: ${persona.painPoints.join(', ')})
        - **Strategic Angle:** "${angle}"
        - **Awareness Stage:** "${awarenessStage}"
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Analyze the context and choose the 4 best triggers from the list. For "Unaware" or "Problem Aware" stages, triggers like Reciprocity or Liking are better. For "Solution Aware" or "Product Aware", triggers like Scarcity or Social Proof are more effective.
        2.  For each chosen trigger, create a JSON object with four fields as defined in the schema: "name", "description", "example", and "analysis".
        3.  The "example" should be a specific, actionable ad copy snippet or visual idea that resonates in "${blueprint.adDna.targetCountry}".
        4.  **Crucially, the "analysis" field must explain in 1-2 sentences WHY this example is effective for this specific persona and context, as if you were annotating a successful ad in a swipe file.**

        **Output:**
        Respond ONLY with a valid JSON array of these 4 objects. Do not include any other text or markdown.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: buyingTriggerObjectSchema
            }
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

export const getBuyingTriggerDetails = async (triggerName: string, blueprint: CampaignBlueprint, persona: TargetPersona, angle: string): Promise<BuyingTriggerObject> => {
    const prompt = `
        You are a Direct Response Copywriting Coach.
        Your task is to provide the details for a specific psychological trigger within a given campaign context, including a "swipe file" analysis.

        **Psychological Trigger to Detail:** "${triggerName}"

        **Campaign Context:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Key Benefit:** ${blueprint.productAnalysis.keyBenefit}
        - **Target Persona:** ${persona.description} (Pain Points: ${persona.painPoints.join(', ')})
        - **Strategic Angle:** "${angle}"
        - **Target Country for Localization:** "${blueprint.adDna.targetCountry}"

        **Instructions:**
        1.  Provide a clear, concise "description" for "${triggerName}".
        2.  Create a concrete "example" of how this trigger applies directly to the provided campaign context.
        3.  Provide an "analysis" explaining in 1-2 sentences WHY this example would be effective for this specific persona and context.
        4.  Return a single JSON object with four fields: "name" (which should be "${triggerName}"), "description", "example", and "analysis".

        **Output:**
        Respond ONLY with the single, valid JSON object that conforms to the schema. Do not include any other text or markdown.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: buyingTriggerObjectSchema
        }
    });
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};

const HOOK_FORMULAS: Record<AwarenessStage, string[]> = {
  'Unaware': [
    'Pattern Interrupt: "Stop [common behavior]. Ini alasan tak terduga kenapa..."',
    'Provocative Question: "Kenapa [relatable pain] makin parah padahal sudah [common effort]?"',
    'Bold Statement: "[Shocking fact] yang [demographic] tidak tahu tentang [topic]."',
  ],
  'Problem Aware': [
    'Agitation: "Masih berjuang dengan [problem]? Ternyata ini [hidden cause] yang sering diabaikan."',
    'Empathy & Callout: "Kalau kamu sering merasa [frustration], ini bukan salahmu. Ini solusinya..."',
    'Social Proof Hook: "Ribuan orang dengan [problem] sudah beralih ke [new method]. Ini alasannya."',
  ],
  'Solution Aware': [
    'Comparison: "Lupakan [old solution]. [New solution type] terbukti [X]% lebih [benefit]."',
    'Authority Angle: "Para ahli setuju: ini cara paling efektif untuk [achieve desired outcome]."',
    'Mechanism Reveal: "Ini cara kerja [unique mechanism] yang membuat [product category] biasa jadi ketinggalan zaman."',
  ],
  'Product Aware': [
    'Direct Offer & Urgency: "Spesial hari ini: [Product] [offer]. Jangan sampai kehabisan!"',
    'Testimonial Hook: "\'[Specific, impressive result]\' - [Name], salah satu dari 10.000+ customer puas."',
    'Exclusive Benefit: "Hanya dengan [Product]: dapatkan [unique benefit] yang tidak ada di tempat lain."',
  ]
};

const HEADLINE_FORMULAS: Record<AwarenessStage, string[]> = {
    'Unaware': [
        'Curiosity: "[Intriguing fact] yang bikin [desired outcome] tanpa [common effort]"',
        'Promise: "Cara [do desirable thing] yang [surprising attribute]"',
        'Identity: "Untuk [persona] yang [pain/desire]: [This is for you]"'
    ],
    'Problem Aware': [
        'Solution Reveal: "[Problem] beres dengan [simple method]. Ini caranya."',
        'Authority: "[Expert/data] bilang ini solusi paling [superlative] untuk [problem]"',
        'New Mechanism: "Ternyata [problem] bukan karena [common belief]. Tapi karena [real cause]..."'
    ],
    'Solution Aware': [
        'Differentiation: "Beda [Product] sama [competitor/old way]: [Key differentiator]"',
        'Proof: "[Specific result] dalam [timeframe] - [social proof number] udah buktiin"',
        'Mechanism: "Kenapa [our approach] work [X]x lebih [benefit metric]"'
    ],
    'Product Aware': [
        'Direct Offer: "[Offer] - [Urgency/scarcity element]"',
        'Overcome Objection: "[Product] + [Bonus] = [Total value]. Tapi harga cuma [price]. [Reason to believe]"',
        'Exclusive: "Akses eksklusif [Product Name]: [Unique benefit] yang ga ada di [competitor]"'
    ]
};

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
  'Social Proof': {
    copyMust: ["Include specific numbers (e.g., '10,000+ users', 'Ribuan orang udah...')", "Quote real people or testimonials", "Use words implying collective action: 'terbukti', 'semua orang'"],
    visualMust: ["Show multiple people using the product", "Show testimonial quotes/ratings in the image", "Show before-afters from real customers"]
  },
  'Scarcity': {
    copyMust: ["State limited quantity explicitly ('Hanya X tersisa', 'Stok terbatas')", "Mention exclusivity ('Limited edition')", "Create fear of missing out"],
    visualMust: ["Show a stock level bar", "Show an 'almost sold out' warning", "Show exclusive packaging"]
  },
  'Urgency': {
    copyMust: ["Include explicit deadline ('Hari ini aja', 'Berakhir dalam X jam')", "State consequence of delay ('Setelah ini, harga naik')", "Use time-sensitive language: 'Sekarang', 'Buruan'"],
    visualMust: ["Show a countdown timer", "Show a calendar with a date circled", "Show a person acting quickly"]
  },
  'Reciprocity': {
    copyMust: ["Offer something valuable for free first ('Gratis panduan', 'Bonus ini dulu')", "Frame as giving before asking ('Coba dulu', 'Lihat hasilnya gratis')", "Use language of generosity: 'Kami kasih', 'Hadiah'"],
    visualMust: ["Show the free item/bonus prominently", "Show a person delighted to receive the freebie", "Show a 'FREE' badge or gift wrap visual"]
  },
  'Authority': {
    copyMust: ["Cite an expert or recognized authority ('Dokter X merekomendasikan')", "Mention certifications or studies ('Terbukti secara klinis')", "Use authority language: 'Ahli bilang', 'Studi menunjukkan'"],
    visualMust: ["Show an expert in their environment (lab coat, clinic)", "Show certification badges or official logos", "Show research data or graphs"]
  },
  'Liking': {
    copyMust: ["Use a relatable, friendly, conversational tone", "Share a personal story or vulnerability ('Aku dulu juga gitu')", "Use inclusive language: 'Kita', 'Sama-sama'"],
    visualMust: ["Show a relatable influencer or person similar to the persona", "Show a genuine smile and warm eye contact", "Show a casual, authentic setting (home, not a studio)"]
  },
  'Fear of Missing Out (FOMO)': {
    copyMust: ["Highlight what others are experiencing ('10,000 orang udah ngerasain ini')", "Emphasize a trend or movement ('Viral di TikTok')", "Use FOMO language: 'Jangan sampai ketinggalan', 'Kamu belum?'"],
    visualMust: ["Show a crowd of people enjoying the product", "Show 'everyone else has it' scenario (e.g., an empty shelf)", "Show a person looking left out vs. a person happy with the product"]
  },
  'Exclusivity': {
    copyMust: ["Emphasize limited access ('Khusus member', 'Invite-only')", "Mention VIP or premium status", "Use exclusive language: 'Tidak dijual bebas'"],
    visualMust: ["Show a VIP pass or membership card", "Show a velvet rope or 'members only' sign", "Show luxury packaging"]
  },
  'Instant Gratification': {
    copyMust: ["Promise quick results ('Hasil dalam 3 hari', 'Langsung terasa')", "Emphasize speed and ease ('Cepat', 'Instan', 'Tanpa ribet')", "Use immediate language: 'Sekarang juga', 'Langsung'"],
    visualMust: ["Show a rapid transformation (fast-forward visual)", "Show a clock/timer showing a short duration", "Show a person expressing surprise at how fast it worked"]
  }
};

const injectDynamicValues = (formula: string, blueprint: CampaignBlueprint, persona: TargetPersona): string => {
    return formula
        .replace(/\[Product Name\]/g, blueprint.productAnalysis.name)
        .replace(/\[Product\]/g, blueprint.productAnalysis.name)
        .replace(/\[offer\]/g, blueprint.adDna.offerSummary)
        .replace(/\[persona\]/g, persona.description)
        .replace(/\[problem\]/g, persona.painPoints[0] || 'masalah utama')
        .replace(/\[benefit\]/g, blueprint.productAnalysis.keyBenefit)
        .replace(/\[desired outcome\]/g, persona.desiredOutcomes[0] || 'hasil yang diinginkan');
};


export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const formatInstructions: Record<CreativeFormat, string> = {
        'UGC': "Simulate a genuine user-generated video or photo. The tone should be authentic, not overly polished. Visual prompt should describe a realistic setting.",
        'Before & After': "Clearly show a 'before' state demonstrating a problem and an 'after' state showing the solution provided by the product. The transformation should be obvious.",
        'Comparison': "Compare the product directly or indirectly with an alternative (e.g., 'the old way'). Highlight the product's superior features or benefits.",
        'Demo': "Show the product in action. The visual prompt should focus on the product being used and its key functionality.",
        'Testimonial': "Feature a satisfied customer. The hook and headline should read like a quote. The visual prompt should depict a person representing the target persona, looking happy and confident.",
        'Problem/Solution': "Start by clearly presenting a common problem the target persona faces. Agitate the problem by describing the frustrations it causes. Finally, present the product as the perfect solution. The visual should depict the 'problem' or the 'solution' state vividly.",
        'Educational/Tip': "Provide genuine value by teaching the audience something useful related to the product's domain. Frame the ad as a helpful tip or a quick 'how-to'. The product should be naturally integrated as a tool to achieve the tip's outcome.",
        'Storytelling': "Tell a short, relatable story where a character (representing the persona) overcomes a challenge using the product. The narrative should have a clear beginning, middle, and end. The focus should be on the emotional journey and transformation.",
    };

    const placementInstructions: Record<PlacementFormat, string> = {
        'Carousel': `**CAROUSEL CREATION MANDATE**: 
1.  First, you MUST choose the MOST SUITABLE story arc from the list below based on the creative format ("${format}") and strategic angle.
    - **PAS (Problem-Agitate-Solution)**: ${CAROUSEL_ARCS['PAS']}
    - **Transformation**: ${CAROUSEL_ARCS['Transformation']}
    - **Educational**: ${CAROUSEL_ARCS['Educational']}
    - **Testimonial Story**: ${CAROUSEL_ARCS['Testimonial Story']}
2.  After choosing an arc, generate a 'carouselSlides' array with exactly 5 slides that follow its narrative structure.
3.  **CRITICAL**: You must follow a COPY-FIRST workflow. First, write the copy (headline, description) for all 5 slides. THEN, for each slide's copy, create a 'visualPrompt' that is a direct visual interpretation of that specific slide's message and follows the composition rule for Carousels.
4.  The final slide MUST always be the Call to Action (CTA) which incorporates the offer: "${offer.name}".
5.  All text MUST be in ${blueprint.adDna.targetCountry} language and match the ${blueprint.adDna.toneOfVoice} tone.`,
        'Instagram Feed': "Design for a 1:1 or 4:5 aspect ratio. The visual should be high-quality and scroll-stopping. The hook should be an engaging question or a bold statement to encourage interaction in the caption.",
        'Instagram Story': "Design for a 9:16 vertical aspect ratio. The visual should feel native and authentic to the platform. The hook should be quick and punchy. The visual prompt can suggest text overlays or interactive elements."
    };
    
     const visualStyleInstruction = allowVisualExploration
    ? `- **Style**: Anda BEBAS mengusulkan visualStyle dan visualPrompt yang sama sekali baru, TAPI **gunakan gaya visual asli ("${blueprint.adDna.visualStyle}") sebagai titik awal atau inspirasi**. Tujuannya adalah variasi kreatif, bukan sesuatu yang sama sekali tidak berhubungan. Buatlah sesuatu yang tak terduga namun tetap terasa 'on-brand'.`
    : `- **Style**: The visual style MUST be a direct evolution of the original 'Visual Style DNA'. Blend the DNA ("${blueprint.adDna.visualStyle}") with the persona's aesthetic ("${persona.creatorType}"). The result should look like a new ad from the same brand, for a different audience segment. **DO NOT create a visual style that is completely unrelated to the original DNA.**`;


    const prompt = `
        You are a world-class direct response creative director. Your task is to generate an array of 3 **strategically distinct** ad concepts based on a single brief. Your process must mimic a real agency workflow: **COPY FIRST, then VISUALS**.

        **🔥 YOUR CORE MISSION: A/B TEST VARIATIONS**
        It is CRITICAL that the three concepts are NOT just reworded versions of each other. You MUST generate three genuinely different creative hypotheses by following this exact variation strategy:
        - **Concept 1 - "Emotional Entry"**: The entire concept (copy and visual) must lead with emotion, feeling, or identity.
        - **Concept 2 - "Logical Entry"**: The entire concept must lead with logic, mechanism, proof, or data.
        - **Concept 3 - "Social Entry"**: The entire concept must lead with community, tribe, or social proof.

        ---
        **Campaign Blueprint (The Foundation):**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Strategic Offer**: ${offer.name} - ${offer.description} (CTA: ${blueprint.adDna.cta})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - **Original Visual Style DNA: "${blueprint.adDna.visualStyle}"**
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**

        **Target Persona Details (The Audience Lens):**
        - Description: "${persona.description}" (Age: "${persona.age}", Creator Type: "${persona.creatorType}")
        - Pains: ${persona.painPoints.join(', ')}

        **Creative Mandate (The Specific Task):**
        - Strategic Angle: "${angle}"
        - 🔥 Psychological Buying Trigger: "${trigger.name}" (Description: ${trigger.description})
        - Awareness Stage: "${awarenessStage}"
        - Creative Format: "${format}" (Guidelines: ${formatInstructions[format]})
        - Ad Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

        **🔥 TRIGGER IMPLEMENTATION CHECKLIST for "${trigger.name}":**
        Your COPY must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.copyMust.join(', ')}.
        Your VISUAL PROMPT must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust.join(', ')}.
        ⚠️ If your concept doesn't pass this checklist, it FAILS the trigger requirement.
        
        ---
        **CREATION PROCESS FOR EACH CONCEPT (APPLYING THE "COPY-FIRST" WORKFLOW):**
        
        For each of the 3 concepts (Emotional, Logical, Social), follow these steps:

        **STEP 1: Generate the Selling Copy.**
        - As a Copywriter, your only focus is on the words.
        - **HOOK CREATION MANDATE**: You MUST use one of these proven formulas for the "${awarenessStage}" stage:
        ${HOOK_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f}`).join('\n')}
        - **HEADLINE FORMULAS MANDATE**: You MUST use one of these formulas for the "${awarenessStage}" stage:
        ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${injectDynamicValues(f, blueprint, persona).replace(/\[offer\]/g, offer.name)}`).join('\n')}
        - The copy must align with the trigger "${trigger.name}", the offer "${offer.name}", and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 2: Generate the Visual Interpretation.**
        - Now, as an Art Director, your job is to create a visual that RESPONDS to the copy you just wrote.
        - Create a detailed **visualPrompt** using this EXACT structure:

        **[PATTERN INTERRUPT - THE SCROLL STOPPER]**
        - **Core Idea**: Introduce ONE surprising, unexpected, or slightly surreal element that is thematically related but breaks the visual pattern of typical ads in this niche. This is the "WTF?" moment that makes someone stop scrolling.
        - **Examples**: A skincare ad set in a surreal, beautiful library instead of a bathroom. A person using a cleaning product, but they are dressed in a formal evening gown. An image of a cat intensely studying a complex mathematical formula on a chalkboard.
        - **Your Pattern Interrupt**: Describe the specific, unexpected element for THIS ad concept. It must be creative and attention-grabbing.

        **[EMOTIONAL ANCHOR - THE HUMAN ELEMENT]**
        - **Core Feeling**: The image MUST evoke a specific, powerful emotion relevant to the copy (e.g., relief, excitement, confidence, validation).
        - **Facial Expression**: As the PRIMARY focus, the subject's expression MUST clearly convey this feeling. Describe it in detail (e.g., "A genuine, unforced smile of relief, eyes slightly closed, tension released from the shoulders"). This is more important than the background.

        **[COMMERCIAL GOAL & PSYCHOLOGY]**
        - **Primary Goal**: The image MUST visually communicate the core message of the copy and the main benefit ("${blueprint.productAnalysis.keyBenefit}").
        - **Psychological Impact**: The scene must make the persona feel the emotion from the copy and believe their desired outcome ("${persona.desiredOutcomes[0] || 'their goal'}") is attainable.
        - **Sales Focus**: It must be a "scroll-stopper" that looks like a high-converting ad, not a generic stock photo.

        **[SCENE FOUNDATION]**
        - **Setting**: Ultra-specific, relatable for an audience in **${blueprint.adDna.targetCountry}**.
        - **Time/Lighting**: Specific time of day and lighting (e.g., "Golden hour sunlight").
        - **Camera Angle**: Exact camera position (e.g., "Eye-level straight-on POV").

        **[SUBJECT]**
        - **Who**: ${persona.description}, age ${persona.age}, with ${persona.creatorType} aesthetic.
        - **Doing What**: Active verbs that reflect the copy's message.
        - **Styling**: Authentic to **${blueprint.adDna.targetCountry}** culture.

        **[TRIGGER VISUALIZATION - CRITICAL]**
        How does the scene physically SHOW the "${trigger.name}" trigger? Be extremely specific. Example: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust[0] || 'Visualize the trigger somehow.'}

        **[PRODUCT INTEGRATION]**
        - **Positioning**: Where is the product? Is it the hero? How does it relate to the subject?
        - **In Action**: Show the product as the clear 'solution' mentioned in the copy.

        **[STYLE DNA FUSION]**
        ${visualStyleInstruction}
        Describe the resulting COLOR PALETTE, COMPOSITION, and MOOD.

        **[TECHNICAL SPECS & COMPOSITION]**
        - **Quality**: Photorealistic, commercial quality, high-end camera look, sharp focus.
        - **Composition for Ads (NON-NEGOTIABLE)**: The composition MUST leave appropriate negative space for text overlays. For a '${placement}' placement, you must adhere to this rule: **"${COMPOSITION_FOR_ADS[placement]}"**.
        - **Aspect Ratio**: ${placement === 'Instagram Story' ? '9:16 vertical' : placement === 'Instagram Feed' ? '1:1 or 4:5' : 'digital ad optimized'}.
        ---
        
        **INTERNAL QUALITY CHECK:**
        Before responding, ensure your 3 concepts are truly DIFFERENT (Emotional vs Logical vs Social) and that each one follows the COPY-FIRST workflow and passes the trigger checklist. If not, REGENERATE.
        
        ---

        Now, generate an array of 3 JSON objects using the process above. Adhere strictly to the provided JSON schema. For 'adSetName', follow this format: [PersonaShort]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3]. For the 'offerName' field, use this exact value: "${offer.name}".
        Respond ONLY with the JSON array.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema
            }
        }
    });

    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'trigger'> & { trigger: string })[];
    
    return ideas.map(idea => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { trigger: _, ...restOfIdea } = idea;
        return { ...restOfIdea, trigger };
    });
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const NEGATIVE_PROMPT = "NO generic stock photo look, NO obvious AI artifacts (weird hands, distorted faces), NO text in image (we'll add overlay), NO watermarks or logos unless product branding, NO cluttered composition, NO excessive filters that look unnatural.";
    const salesIntent = `A highly persuasive, high-converting, and scroll-stopping advertisement image designed to sell a product. The image must be ultra-photorealistic, high-contrast, and emotionally resonant. The central focus must be on the user's benefit or transformation. Negative prompt: ${NEGATIVE_PROMPT}`;
    
    let textPrompt: string;
    const parts: any[] = [];

    if (referenceImageBase64) {
        parts.push(imageB64ToGenerativePart(referenceImageBase64));
        if (allowVisualExploration) {
            // When exploration is allowed, the reference image is "inspiration" for STYLE ONLY.
            textPrompt = `${salesIntent} The provided image is a **STYLE REFERENCE ONLY**. Your task is to extract its artistic style (e.g., color palette, lighting, composition, texture) and apply it to a **COMPLETELY NEW SCENE** described in the following prompt. **IMPORTANT: DO NOT replicate the subject matter, objects, or people from the reference image.** The content for the new image must come *exclusively* from the text that follows. The new scene is: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo or AI illustration.`;
        } else {
            // When exploration is NOT allowed, the reference image is a strict guide.
            textPrompt = `${salesIntent} Using the provided reference image for style, lighting, and mood, create this new scene: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo.`;
        }
    } else {
        // No reference image at all.
        textPrompt = `${salesIntent} The scene is: ${prompt}. The final image must look like a professional, high-converting ad, not a generic stock photo or AI illustration.`;
    }
    
    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: parts }],
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    const responseParts = response.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          return `data:${mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    console.error("Image generation failed. Response:", JSON.stringify(response, null, 2));
    throw new Error('Image generation failed: No image data received from API or the request was blocked.');
};

export const refineVisualPrompt = async (concept: AdConcept, blueprint: CampaignBlueprint): Promise<string> => {
    const prompt = `
        You are an expert prompt engineer for AI image generators.
        Your task is to generate a new, detailed, specific visual prompt that is perfectly aligned with the provided ad copy (hook) and visual direction (visual vehicle).

        **Ad Concept Details:**
        - **Product:** ${blueprint.productAnalysis.name}
        - **Persona:** ${concept.personaDescription} (Age: ${concept.personaAge}, Style: ${concept.personaCreatorType})
        - **Headline:** ${concept.headline}
        - **🔥 Text Hook (The primary text the user sees):** "${concept.hook}"
        - **Psychological Trigger:** "${concept.trigger.name}"
        - **Creative Format:** ${concept.format}
        - **Target Country:** ${blueprint.adDna.targetCountry}
        - **Visual Vehicle (The high-level visual direction):** "${concept.visualVehicle}"

        **Task:**
        Generate a new \`visualPrompt\` string that:
        1.  **Creates a strong 'Visual Hook'**: The scene described must be the visual counterpart to the 'Text Hook'. What visual would make that text hook 10x more powerful and scroll-stopping?
        2.  Faithfully executes the direction given in the \`visualVehicle\`.
        3.  Visually embodies the psychological trigger: "${concept.trigger.name}".
        4.  Is authentic to the persona's age and style, and culturally appropriate for **${blueprint.adDna.targetCountry}**. The scene must feel genuine to them.
        5.  Creates a unique visual style by thoughtfully blending the original ad's DNA ("${blueprint.adDna.visualStyle}") with the persona's authentic aesthetic.
        6.  Includes rich details about composition, lighting, subject's expression, action, and environment.
        7.  Is highly descriptive and specific, ready to be used with an AI image generator.

        Respond ONLY with the text for the new visual prompt, without any labels or quotation marks.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text;
};


export const evolveConcept = async (
    baseConcept: AdConcept,
    blueprint: CampaignBlueprint,
    evolutionType: 'angle' | 'trigger' | 'format' | 'placement',
    newValue: string | BuyingTriggerObject
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const evolutionInstructions = {
        angle: `Adapt the concept to a new strategic angle: "${newValue}". The trigger ("${baseConcept.trigger.name}") and format ("${baseConcept.format}") should remain consistent, but the core message (headline, hook) and visual must be re-imagined to reflect this new angle.`,
        trigger: `Adapt the concept to use a new psychological trigger: "${(newValue as BuyingTriggerObject).name}" (Description: ${(newValue as BuyingTriggerObject).description}). The angle ("${baseConcept.angle}") and format ("${baseConcept.format}") should remain consistent, but the headline, hook, and visual must be rewritten to powerfully evoke the feeling of "${(newValue as BuyingTriggerObject).name}".`,
        format: `Adapt the concept to a new creative format: "${newValue}". The angle ("${baseConcept.angle}") and trigger ("${baseConcept.trigger.name}") are the same, but the entire execution (headline, hook, visual) must be re-imagined for the new format. If the new format is "Carousel", you MUST generate a "carouselSlides" array.`,
        placement: `Adapt the concept for a new placement: "${newValue}". The core creative (angle, trigger, format) is the same, but the execution must be optimized. For "Instagram Story", this means a 9:16 aspect ratio and a punchier hook. For "Carousel", it means telling a story across multiple slides.`
    };

    const prompt = `
        You are a world-class creative director tasked with strategically evolving an existing ad concept.
        Given a base creative concept and a specific evolution mandate, generate ONE new, distinct ad concept that expertly adapts the original idea.

        **Campaign Blueprint:**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Persona: ${baseConcept.personaDescription} (Age: ${baseConcept.personaAge}, Creator Type: ${baseConcept.personaCreatorType})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - Visual Style DNA: "${blueprint.adDna.visualStyle}"
        - Target Country for Localization: "${blueprint.adDna.targetCountry}"
        - **Strategic Offer to use**: "${baseConcept.offerName}"

        **Base Creative Concept:**
        - Angle: "${baseConcept.angle}"
        - Trigger: "${baseConcept.trigger.name}"
        - Format: "${baseConcept.format}"
        - Placement: "${baseConcept.placement}"
        - Headline: "${baseConcept.headline}"
        - Hook: "${baseConcept.hook}"
        
        **🔥 Evolution Mandate: ${evolutionInstructions[evolutionType]}**

        Now, generate an array containing ONE new JSON object for the evolved concept.
        Adhere strictly to the provided JSON schema.
        For 'adSetName', create a new name reflecting the new evolved parameters, like: [Persona]_[NewAngle/Trigger/etc]_[...]_v1.
        For the 'offerName' field, you MUST use the value from the 'Strategic Offer to use' section above.

        Respond ONLY with a JSON array containing the single new concept object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: adConceptSchema,
            }
        }
    });
    
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(cleanedJson) as (Omit<AdConcept, 'trigger' | 'imageUrls'> & { trigger: string })[];
    
    return result.map((concept): Omit<AdConcept, 'imageUrls'> => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { trigger: _, ...restOfConcept } = concept;

        const triggerObject = evolutionType === 'trigger'
            ? (newValue as BuyingTriggerObject)
            : baseConcept.trigger;

        return {
            ...restOfConcept,
            trigger: triggerObject,
        };
    });
};


// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}