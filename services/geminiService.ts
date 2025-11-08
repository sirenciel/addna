
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CampaignBlueprint, AdConcept, CreativeFormat, PlacementFormat, AwarenessStage, TargetPersona, BuyingTriggerObject, CarouselSlide, ObjectionObject, PainDesireObject, OfferTypeObject, PivotType, PivotConfig, AdDnaComponent, AdDna, RemixSuggestion, VisualStyleDNA, ALL_CREATIVE_FORMATS, ALL_PLACEMENT_FORMATS, ALL_AWARENESS_STAGES } from '../types';

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
    'Instagram Story': 'Biarkan 25% bagian atas kosong untuk headline. Subjek utama di sepertiga tengah-bawah. Jangan pernah menutupi wajah subjek dengan teks.',
    'Instagram Feed': 'Ikuti Aturan Sepertiga atau alur baca pola-Z. Sediakan ruang kosong untuk teks overlay. Jangan pernah menutupi wajah subjek.',
    'Carousel': 'Slide 1: Subjek di tengah dengan latar belakang jelas. Slide 2-5: Komposisi bervariasi dengan zona teks yang konsisten. Jangan pernah menutupi wajah subjek utama.'
};

const CAROUSEL_ARCS: Record<string, string> = {
    'PAS': 'PAS (Problem-Agitate-Solution). Ideal untuk respons langsung. Slide 1 (Hook): Sebutkan MASALAH dengan cara yang mengejutkan atau relatable. Slide 2 (Agitate): Deskripsikan RASA SAKIT dan frustrasi dari masalah tersebut. Mengapa begitu buruk? Slide 3 (Solution): Perkenalkan produk Anda sebagai SOLUSI. Momen "aha!". Slide 4 (Proof): Tunjukkan bukti bahwa itu berhasil (testimoni, data, sebelum/sesudah). Slide 5 (CTA): Beri tahu mereka apa yang harus dilakukan selanjutnya.',
    'Transformation': 'Transformasi: Narasi Sebelum & Sesudah. Terbaik untuk format Sebelum & Sesudah, Testimoni. Slide 1 (Hook): Tunjukkan kondisi SETELAH yang luar biasa. Slide 2 (Sebelum): Ungkap kondisi SEBELUM yang menyakitkan. Slide 3 (Perjuangan): Rincikan perjalanan dan upaya yang gagal. Slide 4 (Penemuan): Bagaimana mereka menemukan solusi Anda. Slide 5 (CTA): Ajak orang lain untuk memulai transformasi mereka.',
    'Educational': 'Edukasi: Ajarkan sesuatu yang berharga. Terbaik untuk format "Edukasi/Tip" atau "Demo". Struktur: (Hook yang Menarik -> Patahkan Mitos 1 -> Patahkan Mitos 2 -> Ungkap Kebenaran/Metode -> Tautan CTA/Produk)',
    'Testimonial Story': 'Kisah Testimoni: Cerita yang berpusat pada pelanggan. Gunakan untuk format "Testimoni" atau "UGC". Struktur: (Hook dengan kutipan kuat -> Perkenalkan pelanggan & kisah mereka -> Hasil spesifik yang mereka dapatkan -> Bagaimana produk memungkinkannya -> CTA)'
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
        trigger: buyingTriggerObjectSchema,
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
        offer: offerTypeObjectSchema,
        carouselSlides: { type: Type.ARRAY, items: carouselSlideSchema },
        triggerImplementationProof: {
            type: Type.OBJECT,
            properties: {
                copyChecklistItemUsed: {
                    type: Type.STRING,
                    description: "Quote the specific copy element that implements the trigger checklist"
                },
                visualChecklistItemUsed: {
                    type: Type.STRING,
                    description: "Describe the specific visual element that implements the trigger checklist"
                }
            },
            required: ['copyChecklistItemUsed', 'visualChecklistItemUsed']
        }
    },
     required: [
        'id', 'angle', 'trigger', 'format', 'placement', 'awarenessStage', 'strategicPathId', 
        'personaDescription', 'personaAge', 'personaCreatorType', 'visualVehicle', 'hook', 
        'headline', 'visualPrompt', 'adSetName', 'offer', 'triggerImplementationProof'
    ]
};

const pivotAdConceptSchema = {
    type: Type.OBJECT,
    properties: {
        ...adConceptSchema.properties,
    },
    required: adConceptSchema.required,
};

const visualStyleDnaSchema = {
    type: Type.OBJECT,
    properties: {
        colorPalette: { type: Type.STRING, description: "Describe dominant colors and mood (e.g., 'Warm earth tones with vibrant orange accents')" },
        lightingStyle: { type: Type.STRING, description: "Natural/Studio/Dramatic/etc + time of day" },
        compositionApproach: { type: Type.STRING, description: "Rule of thirds/Center-focused/Z-pattern/etc" },
        photographyStyle: { type: Type.STRING, description: "UGC raw/Professional editorial/Lifestyle/etc" },
        modelStyling: { type: Type.STRING, description: "Describe hair, makeup, clothing aesthetic" },
        settingType: { type: Type.STRING, description: "Indoor studio/Outdoor urban/Home setting/etc" },
    },
    required: ["colorPalette", "lightingStyle", "compositionApproach", "photographyStyle", "modelStyling", "settingType"]
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

const HEADLINE_FORMULAS: Record<AwarenessStage, string[]> = {
    'Unaware': [
        'Pola Aneh/Kontrarian: "Stop [Saran Umum]. (Ini cara yang benar)."',
        'Pertanyaan Fokus-Masalah: "Apakah Anda juga [Masalah yang sangat spesifik dan relatable]?"',
    ],
    'Problem Aware': [
        'Masalah → Solusi: "[Masalah Menyakitkan]? → Ini solusinya."',
        'Hilangkan Rasa Sakit: "Ucapkan Selamat Tinggal pada [Rasa Sakit/Masalah]."',
    ],
    'Solution Aware': [
        'Hasil + Jangka Waktu: "Dapatkan [Hasil Spesifik] dalam [Jangka Waktu] (Tanpa [Pengorbanan])"',
        'Transformasi Sebelum/Sesudah: "Dari [Kondisi Buruk] menjadi [Kondisi Baik] dalam [Jangka Waktu]."',
        'Perintah Langsung + Manfaat: "[Kata Kerja Aksi] untuk [Manfaat Utama]."',
    ],
    'Product Aware': [
        'Kredibilitas Berbasis Angka: "[Jumlah] [Tipe Orang] telah beralih ke [Produk Anda]."',
        'Penawaran Langsung: "Dapatkan [Penawaran Spesifik Anda] - Hanya [Elemen Urgensi/Kelangkaan]."',
    ]
};

const TRIGGER_IMPLEMENTATION_CHECKLIST: Record<string, { copyMust: string[], visualMust: string[] }> = {
    'Social Proof': {
        copyMust: ["Sebutkan angka spesifik (misal, 'Bergabung dengan 10.000+ pelanggan bahagia')", "Kutip testimoni nyata ('Ini mengubah segalanya bagi saya.' - Jane D.)", "Gunakan kata-kata aksi kolektif seperti 'terbukti', 'semua orang menggunakan'"],
        visualMust: ["Tampilkan beberapa orang yang menggunakan produk dengan senang", "Tampilkan overlay kutipan/rating testimoni pada gambar", "Tampilkan kolase konten buatan pengguna (UGC) atau 'lautan wajah'"]
    },
    'Authority': {
        copyMust: ["Sebutkan ahli atau otoritas yang diakui (misal, 'Direkomendasikan oleh Dr. Anya Sharma')", "Sebutkan sertifikasi atau studi ('Terbukti secara klinis untuk...')", "Gunakan bahasa otoritas: 'Para ahli mengatakan', 'Studi menunjukkan'"],
        visualMust: ["Tampilkan seorang ahli di lingkungannya (jas lab, klinik, kantor)", "Tampilkan lencana sertifikasi resmi atau logo 'Seperti yang Dilihat Di'", "Tampilkan visualisasi data atau grafik dari sebuah studi"]
    },
    'Scarcity': {
        copyMust: ["Sebutkan kuantitas terbatas secara eksplisit ('Hanya 100 unit tersisa')", "Sebutkan eksklusivitas ('Desain edisi terbatas')", "Ciptakan ketakutan akan kehilangan ('Setelah habis, tidak akan ada lagi')"],
        visualMust: ["Tampilkan bar stok yang hampir kosong", "Tampilkan stempel 'Hampir Habis' atau 'Edisi Terbatas'", "Tampilkan seseorang bergegas untuk mengambil item terakhir"]
    },
    'Urgency': {
        copyMust: ["Sertakan tenggat waktu yang eksplisit ('Diskon 50% berakhir malam ini')", "Sebutkan konsekuensi dari penundaan ('Harga naik besok')", "Gunakan bahasa yang peka waktu: 'Sekarang', 'Segera'"],
        visualMust: ["Tampilkan timer hitung mundur atau grafik", "Tampilkan kalender dengan tanggal hari ini dilingkari merah", "Tampilkan seseorang yang tampak stres sambil melirik jam"]
    },
    'Reciprocity': {
        copyMust: ["Tawarkan sesuatu yang berharga secara gratis ('Dapatkan panduan gratis Anda')", "Bingkai sebagai memberi sebelum meminta ('Kami ingin Anda mencobanya terlebih dahulu')", "Gunakan bahasa kemurahan hati: 'Hadiah untuk Anda', 'Dari kami untuk Anda'"],
        visualMust: ["Tampilkan item gratis/bonus secara menonjol", "Tampilkan seseorang yang senang menerima hadiah gratis", "Tampilkan lencana 'GRATIS' atau visual kado"]
    },
    'Liking': {
        copyMust: ["Gunakan nada yang ramah dan percakapan", "Bagikan cerita pribadi atau relatable ('Saya dulu juga seperti itu')", "Gunakan bahasa inklusif: 'Kita semua tahu perasaan itu'"],
        visualMust: ["Tampilkan influencer atau orang yang relatable dengan persona target", "Tampilkan senyum tulus dan kontak mata yang hangat", "Gunakan latar yang kasual dan otentik, bukan studio yang kaku"]
    },
    'Fear of Missing Out (FOMO)': {
        copyMust: ["Tonjolkan pengalaman orang lain ('Lihat apa yang semua orang bicarakan')", "Tekankan tren atau gerakan ('Jangan menjadi satu-satunya yang ketinggalan')", "Gunakan bahasa FOMO: 'Jangan sampai ketinggalan', 'Semua orang melakukannya'"],
        visualMust: ["Tampilkan kerumunan orang yang menikmati produk", "Tampilkan skenario 'semua orang memilikinya kecuali Anda'", "Tampilkan seseorang yang 'tertinggal' vs. kelompok yang bahagia dengan produk"]
    },
    'Exclusivity': {
        copyMust: ["Tekankan akses terbatas ('Hanya untuk anggota', 'Khusus undangan')", "Sebutkan status VIP atau premium", "Gunakan bahasa eksklusif: 'Tidak tersedia untuk umum', 'Koleksi pribadi'"],
        visualMust: ["Tampilkan kartu VIP atau keanggotaan", "Tampilkan tanda 'hanya untuk anggota'", "Tampilkan kemasan mewah atau premium"]
    },
    'Instant Gratification': {
        copyMust: ["Janjikan hasil cepat ('Lihat hasilnya dalam 3 hari', 'Langsung terasa bedanya')", "Tekankan kecepatan dan kemudahan ('Cepat', 'Instan', 'Tanpa repot')", "Gunakan bahasa yang mendesak: 'Dapatkan sekarang juga', 'Langsung'"],
        visualMust: ["Tampilkan transformasi cepat (visual fast-forward)", "Tampilkan jam atau timer yang menunjukkan durasi singkat", "Tampilkan seseorang yang terkejut dengan cepatnya hasil"]
    }
};

export const generateCreativeIdeas = async (blueprint: CampaignBlueprint, angle: string, trigger: BuyingTriggerObject, awarenessStage: AwarenessStage, format: CreativeFormat, placement: PlacementFormat, persona: TargetPersona, strategicPathId: string, allowVisualExploration: boolean, offer: OfferTypeObject): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    const formatInstructions: Record<CreativeFormat, string> = {
        'UGC': "Simulasikan video atau foto asli buatan pengguna. Nada harus otentik, tidak terlalu dipoles. Prompt visual harus mendeskripsikan suasana yang realistis. KHUSUS UNTUK UGC: Tren terbaru menekankan 'creator diversity'. Pastikan visualPrompt mencerminkan persona ini secara otentik (gaya 'TikTok Shop-style' yang sederhana) dan bukan UGC yang terlalu dipoles.",
        'Before & After': "Tunjukkan dengan jelas keadaan 'sebelum' yang menunjukkan masalah dan keadaan 'sesudah' yang menunjukkan solusi yang diberikan oleh produk. Transformasi harus jelas.",
        'Comparison': "Bandingkan produk secara langsung atau tidak langsung dengan alternatif (misalnya, 'cara lama'). Tonjolkan fitur atau manfaat unggulan produk.",
        'Demo': "Tunjukkan produk sedang beraksi. Prompt visual harus fokus pada produk yang digunakan dan fungsionalitas utamanya.",
        'Testimonial': "Tampilkan pelanggan yang puas. Hook dan headline harus dibaca seperti kutipan. Prompt visual harus menggambarkan seseorang yang mewakili persona target, terlihat bahagia dan percaya diri.",
        'Problem/Solution': "Mulai dengan menyajikan masalah umum yang dihadapi persona target dengan jelas. Agitasi masalah dengan mendeskripsikan frustrasi yang ditimbulkannya. Terakhir, sajikan produk sebagai solusi sempurna. Visual harus menggambarkan keadaan 'masalah' atau 'solusi' dengan jelas.",
        'Educational/Tip': "Berikan nilai asli dengan mengajarkan audiens sesuatu yang berguna terkait dengan domain produk. Bingkai iklan sebagai tips bermanfaat atau 'cara cepat'. Produk harus diintegrasikan secara alami sebagai alat untuk mencapai hasil dari tips tersebut.",
        'Storytelling': "Ceritakan kisah pendek yang relatable di mana seorang karakter (mewakili persona) mengatasi tantangan menggunakan produk. Narasi harus memiliki awal, tengah, dan akhir yang jelas. Fokusnya harus pada perjalanan emosional dan transformasi.",
        'Article Ad': "Simulasikan cuplikan artikel berita atau posting blog otoritatif. Visual harus terlihat seperti tangkapan layar publikasi online berkualitas tinggi, dengan headline dan gambar yang menarik yang terasa seperti konten editorial.",
        'Split Screen': "Buat visual yang secara harfiah terbagi dua. Satu sisi menunjukkan 'masalah' atau 'cara lama', dan sisi lain menunjukkan 'solusi' dengan produk Anda. Kontrasnya harus tajam dan langsung dapat dipahami.",
        'Advertorial': "Rancang iklan yang meniru gaya konten editorial dari majalah atau blog tepercaya. Harus menarik secara visual, informatif, dan tidak terlalu 'menjual' pada pandangan pertama. Teks harus bersifat edukatif atau didorong oleh cerita.",
        'Listicle': "Bingkai iklan sebagai daftar, seperti '5 Alasan Mengapa...' atau '3 Kesalahan Teratas...'. Untuk carousel, setiap slide adalah satu poin dalam daftar. Untuk gambar statis, visual harus mewakili poin #1, dengan headline yang menggoda daftar tersebut.",
        'MultiProduct': "Tampilkan beberapa produk sekaligus, baik sebagai bundel, koleksi, atau berbagai pilihan. Prompt visual harus dengan jelas mengatur produk-produk dengan cara yang menarik, menyoroti nilai dari grup tersebut.",
        'US vs Them': "Ciptakan kontras yang kuat antara merek/produk Anda (Kami) dan persaingan atau cara lama yang inferior (Mereka). Visual dan teks harus dengan jelas menetapkan dua sisi yang berlawanan dan memposisikan produk Anda sebagai pemenang yang jelas.",
        'Meme/Ugly Ad': "Gunakan format meme yang sedang populer atau buat desain 'jelek' yang disengaja dan berkualitas rendah yang terlihat seperti postingan asli dan organik. Tujuannya adalah untuk menghentikan guliran melalui humor, keterkaitan, dan dengan menghindari tampilan iklan yang dipoles.",
        'Direct Offer': "Jadikan penawaran sebagai pahlawan mutlak dari iklan. Visual harus berani dan berpusat pada diskon, bonus, atau penawaran khusus (misalnya, 'DISKON 50%' dalam teks besar). Teks harus langsung dan jelas menjelaskan penawaran serta urgensi/kelangkaannya."
    };

    const placementInstructions: Record<PlacementFormat, string> = {
        'Carousel': `**MANDAT PEMBUATAN CAROUSEL**: 
1.  **CAROUSEL VISUAL CONSISTENCY RULES**:
    - **ALL** slides must share the same: Color palette, Lighting style (e.g., all golden hour OR all studio), Model/subject (same person across slides).
    - **VARY** only these elements per slide: Subject's action/pose, Props/objects in scene, Text overlay zone (but keep consistent placement).
    - **Visual Flow Example (PAS Arc)**:
        - Slide 1: Subject looking frustrated at [problem] - CLOSE-UP face
        - Slide 2: Wider shot showing the mess/chaos from [problem]
        - Slide 3: Subject discovers product - "aha!" expression
        - Slide 4: Split screen before/after OR testimonial
        - Slide 5: Subject celebrating with product - CALL TO ACTION text zone
2.  Pertama, Anda HARUS memilih alur cerita yang PALING SESUAI dari daftar di bawah ini berdasarkan format kreatif ("${format}") dan angle strategis.
    - **PAS (Problem-Agitate-Solution)**: ${CAROUSEL_ARCS['PAS']}
    - **Transformasi**: ${CAROUSEL_ARCS['Transformation']}
    - **Edukasi**: ${CAROUSEL_ARCS['Educational']}
    - **Kisah Testimoni**: ${CAROUSEL_ARCS['Testimonial Story']}
3.  Setelah memilih alur, hasilkan array 'carouselSlides' dengan tepat 5 slide yang mengikuti struktur narasinya.
4.  **KRITIS**: Anda harus mengikuti alur kerja COPY-FIRST. Pertama, tulis copy (headline, deskripsi) untuk semua 5 slide. KEMUDIAN, untuk setiap copy slide, buat 'visualPrompt' yang merupakan interpretasi visual langsung dari pesan slide spesifik tersebut dan mengikuti aturan komposisi untuk Carousel.
5.  Slide terakhir HARUS selalu berupa Ajakan Bertindak (CTA) yang menggabungkan penawaran: "${offer.name}".
6.  Semua teks HARUS dalam bahasa ${blueprint.adDna.targetCountry} dan sesuai dengan nada ${blueprint.adDna.toneOfVoice}.`,
        'Instagram Feed': "Desain untuk rasio aspek 1:1 atau 4:5. Visual harus berkualitas tinggi dan menghentikan guliran. Hook harus berupa pertanyaan yang menarik atau pernyataan berani untuk mendorong interaksi di caption.",
        'Instagram Story': "Desain untuk rasio aspek vertikal 9:16. Visual harus terasa asli dan otentik dengan platform. Hook harus cepat dan tajam. Prompt visual dapat menyarankan overlay teks atau elemen interaktif."
    };
    
     const visualStyleInstruction = allowVisualExploration
    ? `- **Style**: Anda BEBAS mengusulkan visualStyle dan visualPrompt yang sama sekali baru, TAPI **gunakan gaya visual asli ("${blueprint.adDna.visualStyle}") sebagai titik awal atau inspirasi**. Tujuannya adalah variasi kreatif, bukan sesuatu yang sama sekali tidak berhubungan. Buatlah sesuatu yang tak terduga namun tetap terasa 'on-brand'.`
    : `- **Style**: Gaya visual HARUS merupakan evolusi langsung dari 'DNA Gaya Visual' asli. Padukan DNA ("${blueprint.adDna.visualStyle}") dengan estetika persona ("${persona.creatorType}"). Hasilnya harus terlihat seperti iklan baru dari merek yang sama, untuk segmen audiens yang berbeda. **JANGAN membuat gaya visual yang sama sekali tidak berhubungan dengan DNA asli.**`;


    const prompt = `
        You are a world-class direct response copywriter and creative director. Your task is to generate an array of 3 **strategically distinct** ad concepts based on a single brief. You must follow all principles and workflows provided.

        ---
        **NON-NEGOTIALBE CORE PRINCIPLES (IN INDONESIAN CONTEXT):**
        1.  **Asumsikan Zero Brand Awareness:** Tulis untuk audiens dingin. Kejelasan > Kecerdasan.
        2.  **Fokus pada Masalah atau Hasil:** Fokus pada apa yang dipedulikan pengguna, bukan fitur.
        3.  **Spesifisitas = Kredibilitas:** Gunakan angka dan detail konkret.

        **MANDATORY WORKFLOW: COPY-FIRST**
        Your process for EACH concept must be: First, write the selling words (hook, headline). Second, create a visual that makes those words 10x more powerful.

        **🔥 YOUR CORE MISSION: A/B TEST VARIATIONS (Three Entry Points Framework)**
        It is CRITICAL that the three concepts are NOT just reworded versions of each other. You MUST generate three genuinely different creative hypotheses:
        - **Konsep 1 - "Pintu Masuk Emosional"**: Berawal dari perasaan, identitas, atau aspirasi. Menjawab "Bagaimana ini akan membuat saya merasa?"
        - **Konsep 2 - "Pintu Masuk Logis"**: Berawal dari logika, bukti, data, atau mekanisme unik. Menjawab "Bagaimana cara kerjanya?"
        - **Konsep 3 - "Pintu Masuk Sosial"**: Berawal dari komunitas, suku, atau bukti sosial. Menjawab "Siapa lagi yang menggunakan ini?"
        ---
        **THE BRIEF (Your Foundation):**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - **Strategic Offer**: ${offer.name} - ${offer.description} (CTA: ${blueprint.adDna.cta})
        - **Sales DNA**:
            - Persuasion Formula: "${blueprint.adDna.persuasionFormula}"
            - Tone of Voice: "${blueprint.adDna.toneOfVoice}"
        - **Original Visual Style DNA: "${blueprint.adDna.visualStyle}"**
        - **Target Country for Localization: "${blueprint.adDna.targetCountry}"**
        - **Target Persona**: "${persona.description}" (Age: "${persona.age}", Type: "${persona.creatorType}", Pains: ${persona.painPoints.join(', ')})
        - **Creative Mandate**:
            - Angle: "${angle}"
            - 🔥 Psychological Trigger: "${trigger.name}" (Description: ${trigger.description}). In your JSON response, you must return a full trigger object for "${trigger.name}".
            - Awareness Stage: "${awarenessStage}"
            - Format: "${format}" (Guidelines: ${formatInstructions[format]})
            - Placement: "${placement}" (Guidelines: ${placementInstructions[placement]})

        **🔥 TRIGGER IMPLEMENTATION CHECKLIST for "${trigger.name}":**
        Your COPY must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.copyMust.join(', ')}.
        Your VISUAL PROMPT must include at least ONE of these: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust.join(', ')}.
        ⚠️ If your concept doesn't pass this checklist, it FAILS.
        
        ---
        **CREATION PROCESS FOR EACH OF THE 3 CONCEPTS (Emotional, Logical, Social):**

        **STEP 1: Write the Words (Copywriter Mode)**
        1.  **HOOK:** Generate a world-class, scroll-stopping hook that scores high on at least TWO of:
            - **Curiosity Gap:** Creates a powerful need to know the answer.
            - **Specificity:** Uses concrete numbers, details, timelines.
            - **Contrarianism:** Challenges a common belief.
        2.  **HEADLINE:** You MUST use one of these formulas for the "${awarenessStage}" stage, adapting it to your chosen entry point (Emotional/Logical/Social). You will fill in the bracketed placeholders with specific, compelling text. When creating the 'Logical Entry' concept, prioritize the "Number-Based Credibility" or "Problem -> Solution" headline formulas.
            ${HEADLINE_FORMULAS[awarenessStage].map((f, i) => `${i + 1}. ${f}`).join('\n')}
        3.  The copy must align with the trigger "${trigger.name}", the offer "${offer.name}", and be localized for ${blueprint.adDna.targetCountry}.

        **STEP 2: Visualize the Message (Art Director Mode)**
        - Create a detailed **visualPrompt** using this EXACT **VISUAL PROMPT TEMPLATE**:

        **VISUAL PROMPT TEMPLATE (Fill in each section explicitly):**
        [SCROLL-STOPPER ELEMENT] One unexpected object/action: ...
        [EMOTION & EXPRESSION] Subject's core feeling: ... | Facial expression detail: ...
        [PERSONA AUTHENTICITY] Setting for ${persona.description} in ${blueprint.adDna.targetCountry}: ... | Subject styling authentic to ${persona.creatorType}: ...
        [TRIGGER VISUALIZATION for "${trigger.name}"] How scene shows ${trigger.name} (Must use one of: ${TRIGGER_IMPLEMENTATION_CHECKLIST[trigger.name]?.visualMust.join('; ')}): ...
        [PRODUCT PLACEMENT] Where/how product appears: ...
        [STYLE DNA FUSION] Original DNA: "${blueprint.adDna.visualStyle}" | Resulting color palette: ... | Resulting mood: ...
        [TECHNICAL SPECS] Composition for '${placement}': "${COMPOSITION_FOR_ADS[placement]}" | Aspect ratio: ${placement === 'Instagram Story' ? '9:16 vertical' : placement === 'Instagram Feed' ? '1:1 or 4:5' : 'digital ad optimized'}. | Camera angle: ... | Lighting: ...

        **STEP 3: Fill Trigger Implementation Proof**
        - For each concept, fill the 'triggerImplementationProof' object in the JSON.
        - **copyChecklistItemUsed**: Quote the specific copy element that implements the trigger.
        - **visualChecklistItemUsed**: Describe the specific visual element that implements the trigger.

        ---
        
        **INTERNAL QUALITY CHECK BEFORE RESPONDING:**
        For each concept you created, ask yourself:
        1.  Does the visual prompt AMPLIFY the emotional core of the hook/headline?
        2.  If I showed this image WITHOUT text, would it still evoke the right feeling?
        3.  Does the subject's facial expression match the copy's emotion?
        4.  Example of BAD alignment: Headline "Stop wasting money" + Visual "Happy person smiling"
        5.  Example of GOOD alignment: Headline "Stop wasting money" + Visual "Frustrated person looking at bills with stressed expression"
        6.  **META ENTITY ID RULE**: Are the visual prompts for the Emotional, Logical, and Social concepts fundamentally different? They MUST use different settings, compositions, camera angles, and emotional expressions to avoid creative fatigue and platform penalties.
        
        Ensure your 3 concepts are truly DIFFERENT (Emotional vs Logical vs Social) and that each one follows the COPY-FIRST workflow and passes the trigger checklist. If any concept fails this check, REGENERATE it before responding.
        
        ---

        Now, generate an array of 3 JSON objects using the process above. Adhere strictly to the provided JSON schema. For 'adSetName', follow this format: [PersonaShort]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3]. For the 'offer' field, you MUST return a full offer object matching the Strategic Offer.
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
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];

    return ideas.map((idea, index) => ({
        ...idea,
        entryPoint: entryPoints[index % 3] as 'Emotional' | 'Logical' | 'Social'
    }));
};

export const analyzeReferenceImageStyle = async (imageBase64: string): Promise<VisualStyleDNA> => {
    const imagePart = imageB64ToGenerativePart(imageBase64);
    const prompt = `
    Analyze this ad image and extract its VISUAL STYLE DNA.
    Return a JSON object with:
        {
            "colorPalette": "Describe dominant colors and mood (e.g., 'Warm earth tones with vibrant orange accents')",
            "lightingStyle": "Natural/Studio/Dramatic/etc + time of day",
            "compositionApproach": "Rule of thirds/Center-focused/Z-pattern/etc",
            "photographyStyle": "UGC raw/Professional editorial/Lifestyle/etc",
            "modelStyling": "Describe hair, makeup, clothing aesthetic",
            "settingType": "Indoor studio/Outdoor urban/Home setting/etc"
        }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [imagePart, { text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: visualStyleDnaSchema,
        }
    });

    return JSON.parse(response.text);
};


export const generateAdImage = async (prompt: string, referenceImageBase64?: string, allowVisualExploration: boolean = false): Promise<string> => {
    
    const NEGATIVE_PROMPT = "NO generic stock photo look, NO obvious AI artifacts (weird hands, distorted faces), NO text in image (we'll add overlay), NO watermarks or logos unless product branding, NO cluttered composition, NO excessive filters that look unnatural.";
    const salesIntent = `A highly persuasive, high-converting, and scroll-stopping advertisement image designed to sell a product. The image must be ultra-photorealistic, high-contrast, and emotionally resonant. The central focus must be on the user's benefit or transformation. Negative prompt: ${NEGATIVE_PROMPT}`;
    
    let textPrompt: string;
    const parts: any[] = [];

    if (referenceImageBase64) {
        // STEP 1: Analyze the reference image style first for more precise control.
        const styleDNA = await analyzeReferenceImageStyle(referenceImageBase64);
        
        // Always include the reference image for the model to see.
        parts.push(imageB64ToGenerativePart(referenceImageBase64));

        if (allowVisualExploration) {
            // Use the extracted DNA as INSPIRATION, but prioritize the new scene.
            textPrompt = `${salesIntent} 
Using the provided reference image as INSPIRATION:
1.  Extract these style elements: color palette from "${styleDNA.colorPalette}", lighting mood from "${styleDNA.lightingStyle}", and composition principles from "${styleDNA.compositionApproach}".
2.  You MAY evolve/remix the visual concept while keeping the brand feel.
3.  The scene described below is your PRIMARY guide: ${prompt}
4.  Balance the final image: 60% new scene description + 40% reference style DNA.`;
        } else {
            // Use the extracted DNA as a STRICT GUIDE or TEMPLATE.
            textPrompt = `${salesIntent} 
Using the provided reference image as a STRICT GUIDE with the following style DNA:
- Color Palette: ${styleDNA.colorPalette}
- Lighting: ${styleDNA.lightingStyle}
- Composition: ${styleDNA.compositionApproach}
- Photography Style: ${styleDNA.photographyStyle}

1.  Maintain this exact style, lighting, and composition approach.
2.  Adapt ONLY the subject/setting to match this new scene: ${prompt}
3.  The reference image and its DNA are your TEMPLATE - stay very close to it.`;
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
    throw new Error('Gagal membuat gambar: Tidak ada data gambar yang diterima dari API atau permintaan diblokir.');
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
    evolutionType: 'angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire',
    newValue: any
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const evolutionInstructions: Record<string, string> = {
        angle: `Adapt the concept to a new strategic angle: "${newValue}". The trigger ("${baseConcept.trigger.name}") and format ("${baseConcept.format}") should remain consistent, but the core message (headline, hook) and visual must be re-imagined to reflect this new angle.`,
        trigger: `Adapt the concept to use a new psychological trigger: "${(newValue as BuyingTriggerObject).name}" (Description: ${(newValue as BuyingTriggerObject).description}). The angle ("${baseConcept.angle}") and format ("${baseConcept.format}") should remain consistent, but the headline, hook, and visual must be rewritten to powerfully evoke the feeling of "${(newValue as BuyingTriggerObject).name}".`,
        format: `Adapt the concept to a new creative format: "${newValue}". The angle ("${baseConcept.angle}") and trigger ("${baseConcept.trigger.name}") are the same, but the entire execution (headline, hook, visual) must be re-imagined for the new format. If the new format is "Carousel", you MUST generate a "carouselSlides" array.`,
        placement: `Adapt the concept for a new placement: "${newValue}". The core creative (angle, trigger, format) is the same, but the execution must be optimized. For "Instagram Story", this means a 9:16 aspect ratio and a punchier hook. For "Carousel", it means telling a story across multiple slides.`,
        awareness: `Adapt the concept for a new awareness stage: "${newValue}". The core message is the same but the entry point must change. Re-write the hook and headline to match the new stage.`,
        offer: `Adapt the concept to a new offer: "${(newValue as OfferTypeObject).name}". The core message (angle, trigger) is the same, but the CTA and final part of the copy must be rewritten to reflect this new offer.`,
        painDesire: `Adapt the concept to a new Pain/Desire: "${(newValue as PainDesireObject).name}". This is a significant shift. The core angle must be re-evaluated to connect with this new emotional driver. The headline, hook, and visual must be completely re-imagined.`
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
        - **Strategic Offer to use**: "${baseConcept.offer.name} - ${baseConcept.offer.description}"

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
        For the 'offer' field, if the evolution type is 'offer', use the new offer provided in the mandate. Otherwise, you MUST return the full offer object from the 'Strategic Offer to use' section above.

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
    const result = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    return result.map((concept): Omit<AdConcept, 'imageUrls'> => ({
        ...concept,
        entryPoint: 'Evolved',
    }));
};

export const generateQuickPivot = async (
  baseConcept: AdConcept,
  blueprint: CampaignBlueprint,
  pivotType: PivotType,
  config: PivotConfig
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {

  const pivotInstructions: Record<PivotType, string> = {
    'age-shift': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk kelompok umur yang berbeda.
      - **Usia Asli:** ${baseConcept.personaAge}
      - **Target Usia:** ${config.targetAge}
      
      **TUGAS ANDA:**
      1. **Profil Ulang Persona:** Tulis ulang deskripsi persona untuk secara otentik mewakili demografi ${config.targetAge}. Perbarui pain points dan keinginan agar sesuai dengan tahap kehidupan mereka.
      2. **Adaptasi Bahasa:** Sesuaikan nada dan kosakata:
         - 13-17: Gunakan bahasa gaul Gen Z, referensi meme, ironi. Sangat santai.
         - 18-24: Profesional tapi relatable. Fokus karir & gaya hidup.
         - 25-34: Bahasa berorientasi keluarga. Tekankan penghematan waktu dan kualitas.
         - 35-44: Jelas, lugas, membangun kepercayaan. Hindari bahasa gaul.
      3. **Adaptasi Visual:** Ubah usia model/subjek di prompt visual menjadi ${config.targetAge}. Sesuaikan latar agar cocok dengan gaya hidup mereka (misalnya, 18-24 = kamar kos/kafe, 35-44 = kantor rumah/dapur).
      4. **Pergeseran Pain Point:** Pain point INTI mungkin berubah. Contoh:
         - 18-24: "Aku ingin terlihat bagus di Insta" → "Aku ingin merasa percaya diri di kampus"
         - 35-44: "Aku ingin hasil cepat" → "Aku butuh sesuatu yang cocok dengan jadwalku yang padat"
      
      **TETAP KONSTAN:** 
      - Angle Strategis: "${baseConcept.angle}"
      - Pemicu Psikologis: "${baseConcept.trigger.name}"
      - Format Kreatif: "${baseConcept.format}"
      - Penempatan: "${baseConcept.placement}"
      
      STRATEGI tetap sama, tetapi EKSEKUSI harus secara otentik berbicara kepada ${config.targetAge}.
    `,

    'gender-flip': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk gender yang berlawanan.
      - **Persona Asli:** ${baseConcept.personaDescription}
      - **Target Gender:** ${config.targetGender}
      
      **TUGAS ANDA:**
      1. **Re-gender Persona:** Tulis ulang deskripsi untuk orang ${config.targetGender}. Jadilah otentik - jangan hanya menukar kata ganti. Pertimbangkan:
         - Pain points yang berbeda (misalnya, Pria: "kecemasan akan rambut rontok", Wanita: "kekhawatiran perawatan kulit penuaan")
         - Hasil yang diinginkan yang berbeda (misalnya, Pria: "percaya diri dalam berkencan", Wanita: "citra profesional")
      2. **Adaptasi Teks:** 
         - Audiens pria: Langsung, berorientasi pada pencapaian, campuran logika + emosi
         - Audiens wanita: Empati-dahulu, komunitas/bukti sosial, campuran emosi + logika
      3. **Adaptasi Visual:** Ubah subjek dalam prompt visual menjadi orang ${config.targetGender}. Sesuaikan gaya dan latar agar terasa otentik (bukan stereotip).
      4. **Pergeseran Bukti Sosial:** Jika menggunakan testimoni, ganti gender pemberi testimoni agar sesuai dengan target.
      
      **TETAP KONSTAN:** Angle strategis, pemicu, format, penempatan yang sama.
      
      ⚠️ HINDARI STEREOTIP. Pivot harus terasa otentik, bukan menggurui.
    `,

    'lifestyle-swap': `
      MANDAT KRITIS: Adaptasi konsep UNGGULAN ini untuk gaya hidup/tipe kreator yang berbeda.
      - **Tipe Asli:** ${baseConcept.personaCreatorType}
      - **Target Tipe:** ${config.targetLifestyle}
      
      **TUGAS ANDA:**
      1. **Profil Ulang Gaya Hidup:** Bayangkan kembali persona sebagai seorang "${config.targetLifestyle}". Ubah:
         - Rutinitas & tantangan harian
         - Nilai & aspirasi (misalnya, Influencer menghargai estetika, Pengguna Biasa menghargai kepraktisan)
         - Sumber bukti sosial yang mereka percayai
      2. **Pivot Gaya Visual:** 
         - Influencer: Terkurasi, aspiratif, produksi tinggi
         - Pengguna Biasa: Otentik, relatable, kualitas "foto iPhone"
         - Ahli: Latar profesional, sinyal kredibilitas (misalnya, jas lab, grafik)
      3. **Pergeseran Nada Teks:**
         - Influencer: "Ini mengubah permainan kontenku!" (aspiratif)
         - Pengguna Biasa: "Sebagai ibu yang sibuk, ini sangat menghemat waktuku!" (relatable)
         - Ahli: "Berdasarkan 10 tahun pengalaman saya di bidang ini..." (otoritatif)
      4. **Pembingkaian Ulang Pain Point:** Produk yang sama, "pekerjaan yang harus diselesaikan" yang berbeda:
         - Influencer: "Aku butuh ini untuk membuat konten yang lebih baik"
         - Pengguna Biasa: "Aku butuh ini untuk menyederhanakan hidupku"
      
      **TETAP KONSTAN:** Angle strategis, pemicu, format, penempatan yang sama.
    `,

    'market-expand': `
      MANDAT KRITIS: Lokalkan konsep UNGGULAN ini untuk pasar baru.
      - **Pasar Asli:** ${blueprint.adDna.targetCountry}
      - **Target Pasar:** ${config.targetCountry}
      
      **TUGAS ANDA - LOKALISASI BUDAYA MENDALAM:**
      1. **Lokalisasi Bahasa:**
         - Jika menargetkan Indonesia: Gunakan "Bahasa Gaul" (slang Jaksel), misal, "literally", "which is"
         - Jika menargetkan Malaysia: Campurkan Melayu/Inggris secara alami
         - Jika menargetkan Singapura: Pola Singlish, misal, "lah", "lor"
         - Jika menargetkan Filipina: Taglish, misal, "Grabe, super effective!"
      
      2. **Pergeseran Nilai Budaya:**
         - Indonesia: Berpusat pada keluarga, kesadaran halal, "gotong royong" (komunitas)
         - Malaysia: Mentalitas "Kiasu" (takut ketinggalan), nilai-nilai Islam
         - Singapura: Efisiensi, meritokrasi, budaya "chope" (memesan tempat)
         - Filipina: Semangat "Bayanihan", kebanggaan keluarga, "utang na loob" (utang budi)
      
      3. **Penanda Budaya Visual:**
         - Latar harus DAPAT DIKENALI oleh pasar target (misalnya, flat HDB untuk Singapura, "warung" untuk Indonesia)
         - Model harus memiliki fitur & gaya otentik untuk wilayah tersebut
         - Sertakan properti budaya yang halus (misalnya, sajadah untuk demo Muslim Malaysia/Indonesia)
      
      4. **Lokalisasi Pembayaran & Harga:**
         - Indonesia: Selalu sebutkan "cicilan 0%"
         - Singapura: Tekankan kualitas premium, sepadan dengan investasi
         - Filipina: Tunjukkan keterjangkauan, dapat diakses oleh "masa"
      
      5. **Sumber Bukti Sosial:**
         - Gunakan influencer LOKAL, testimoni dari negara target
         - Referensi tren lokal, bukan global
      
      **TETAP KONSTAN:** Angle strategis, pemicu, format, penempatan yang sama.
      
      ⚠️ KRITIS: Ini BUKAN hanya terjemahan. Ini adalah TRANSFORMASI budaya.
    `,

    'awareness-shift': `
      MANDAT KRITIS: Targetkan ulang konsep UNGGULAN ini untuk tahap kesadaran yang berbeda.
      - **Tahap Asli:** ${baseConcept.awarenessStage}
      - **Target Tahap:** ${config.targetAwareness}
      
      **TUGAS ANDA - ADAPTASI TAHAP KESADARAN:**
      1. **Penulisan Ulang Hook (PALING KRITIS):**
         - **Tidak Sadar:** Fokus masalah, pemecah pola. "Pernah perhatikan bagaimana...?"
         - **Sadar Masalah:** Agitasi, empati. "Lelah berjuang dengan...?"
         - **Sadar Solusi:** Pengungkapan mekanisme, diferensiasi. "Tidak seperti solusi lain..."
         - **Sadar Produk:** Penawaran langsung, bukti sosial. "Bergabunglah dengan 10.000+ pelanggan..."
      
      2. **Pergeseran Formula Headline:**
         - Gunakan formula yang sesuai untuk tahap ${config.targetAwareness} dari formula hook.
      
      3. **Pergeseran Visual:**
         - Tidak Sadar: Tunjukkan "momen masalah" yang relatable yang tidak mereka sadari adalah masalah
         - Sadar Masalah: Dramatisir rasa sakit/frustrasi
         - Sadar Solusi: Tunjukkan mekanisme atau perbandingan
         - Sadar Produk: Tunjukkan produk sedang digunakan + hasilnya
      
      4. **Kedalaman Teks:**
         - Tidak Sadar: Singkat, didorong oleh rasa ingin tahu. Jangan "menjual" dulu.
         - Sadar Masalah: Sedang, agitasi lalu goda dengan solusi.
         - Sadar Solusi: Lebih panjang, jelaskan "cara kerjanya" dan mengapa lebih baik.
         - Sadar Produk: Singkat, langsung. Mereka tahu produknya, cukup dorong mereka.
      
      **TETAP KONSTAN:** Angle, pemicu, format, penempatan yang sama.
      
      PESAN tetap sama, tetapi TITIK MASUK berubah berdasarkan tingkat pengetahuan mereka.
    `,

    'channel-adapt': `
      MANDAT KRITIS: Optimalkan konsep UNGGULAN ini untuk platform yang berbeda.
      - **Platform Asli:** Instagram
      - **Target Platform:** ${config.targetPlatform}
      
      **TUGAS ANDA - OPTIMASI SPESIFIK PLATFORM:**
      
      ${config.targetPlatform === 'TikTok' ? `
        **Optimasi TikTok:**
        1. **Hook:** HARUS menarik perhatian dalam 0,5 detik. Gunakan pemecah pola atau referensi suara yang sedang tren.
        2. **Alur Video:** "Hook → Agitasi → Solusi → CTA" dalam maks 15-30 detik.
        3. **Gaya Visual:** Mentah, otentik, nuansa "di balik layar". TIDAK ADA tampilan iklan yang dipoles.
        4. **Nada Teks:** Sangat santai, bahasa gaul Gen Z, banyak emoji. Gunakan bahasa TikTok (misalnya, "no cap", "slay", "paham tugasnya").
        5. **CTA:** "Link di bio" atau "Duet ini jika kamu relate!"
        6. **Overlay Teks:** Gunakan gaya teks asli TikTok (putih dengan garis hitam, diposisikan atas/bawah).
      ` : ''}
      
      ${config.targetPlatform === 'Facebook' ? `
        **Optimasi Facebook:**
        1. **Hook:** 3 baris pertama caption KRITIS (sebelum "Lihat Lainnya"). Buat menjadi pemikiran yang utuh.
        2. **Gaya Visual:** Lebih dipoles daripada TikTok, tetapi tidak sekurator Instagram. Pikirkan "profesional tapi relatable".
        3. **Panjang Teks:** Facebook memungkinkan teks lebih panjang - manfaatkan itu. Ceritakan sebuah kisah, sertakan FAQ.
        4. **Audiens:** Cenderung lebih tua (35+). Gunakan bahasa yang jelas dan membangun kepercayaan. Kurangi bahasa gaul.
        5. **Bukti Sosial:** Berat pada testimoni, ulasan, sebelum-sesudah. Pengguna Facebook lebih skeptis.
        6. **CTA:** Tombol "Pelajari Selengkapnya" bekerja paling baik. Arahkan ke halaman arahan, bukan halaman produk langsung.
      ` : ''}
      
      ${config.targetPlatform === 'YouTube' ? `
        **Optimasi YouTube (Iklan Pre-Roll/In-Stream):**
        1. **Hook:** 5 detik pertama harus menetapkan WIIFM ("What's In It For Me"). Penonton bisa melewati setelah 5 detik.
        2. **Struktur:** "Masalah → Agitasi → Demo Solusi → CTA" dalam 15-30 detik.
        3. **Visual:** Tunjukkan produk sedang BERAKSI. Format demo bekerja paling baik.
        4. **Audio:** Harus bekerja DENGAN suara (tidak seperti Instagram Feed yang sering dibisukan). Gunakan sulih suara atau talenta di layar yang berbicara.
        5. **CTA:** Overlay kartu akhir yang dapat diklik dengan URL situs web.
      ` : ''}
      
      **TETAP KONSTAN:** Angle strategis, pemicu, pesan inti yang sama.
      
      KONTEN tetap serupa, tetapi PRESENTASI harus asli untuk ${config.targetPlatform}.
    `
  };

  const prompt = `
    You are a world-class creative strategist performing a "Quick Pivot" on a PROVEN WINNING ad concept.
    
    **CONTEXT:**
    This ad concept has already been tested and is performing well. Your job is NOT to reinvent it, but to ADAPT it intelligently for a different audience/context while keeping the core winning elements intact.
    
    **Base Winning Concept:**
    - Headline: "${baseConcept.headline}"
    - Hook: "${baseConcept.hook}"
    - Persona: ${baseConcept.personaDescription} (Age: ${baseConcept.personaAge}, Type: ${baseConcept.personaCreatorType})
    - Angle: "${baseConcept.angle}"
    - Trigger: "${baseConcept.trigger.name}"
    - Format: "${baseConcept.format}"
    - Visual: ${baseConcept.visualVehicle}
    
    **Campaign Blueprint (for context):**
    - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
    - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
    - Visual Style DNA: "${blueprint.adDna.visualStyle}"
    - Offer: "${baseConcept.offer.name} - ${baseConcept.offer.description}"
    
    ---
    **PIVOT TYPE: ${pivotType.toUpperCase().replace('-', ' ')}**
    
    ${pivotInstructions[pivotType]}
    
    ---
    **QUALITY STANDARDS:**
    - The pivoted concept must feel like a NATURAL SIBLING of the original, not a forced rewrite.
    - Maintain the same "energy" and persuasive power.
    - Don't make it generic - keep it specific and emotionally resonant for the new target.
    
    Now, generate an array of ONE pivoted ad concept as a JSON object following the schema.
    For 'adSetName', use this format: [NewPersonaShort]_[Angle]_[Trigger]_[Awareness]_[Format]_[Placement]_pivot
    For 'id', generate a new unique ID.
    For 'strategicPathId', keep the same as the base concept: "${baseConcept.strategicPathId}"
    For the 'offer' field, you MUST return the full offer object from the 'Base Winning Concept' context above.

    Respond ONLY with a JSON array containing the single new concept object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: pivotAdConceptSchema
            }
        }
    });

    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    return ideas.map(idea => ({ ...idea, entryPoint: 'Pivoted' }));
};

export const generateRemixSuggestions = async (
    component: AdDnaComponent,
    baseConcept: AdConcept,
    dna: AdDna,
    blueprint: CampaignBlueprint
): Promise<RemixSuggestion[]> => {

    let prompt: string;
    let payloadSchema: any;
    let responseProcessor: (payload: any) => any = (p) => p;

    switch (component) {
        case 'persona':
            payloadSchema = targetPersonaSchema;
            prompt = `
                You are an expert creative strategist. Your task is to generate 3 smart, distinct alternatives for a 'Persona'.
                **Winning Ad DNA:**
                - Product: ${blueprint.productAnalysis.name}
                - Original Persona: ${dna.persona.description}
                - Country: ${blueprint.adDna.targetCountry}
                **Your Mission:**
                Generate 3 entirely new, plausible Target Persona variations. For each, create a "title" summarizing the persona, a "description" of the necessary strategic shifts, and a full "payload" object which is a valid JSON object for the new Target Persona.
                The variations must be genuinely different.
            `;
            break;

        case 'format':
            payloadSchema = { type: Type.STRING };
            prompt = `
                You are an expert creative strategist. Your task is to generate 3 smart, distinct alternatives for a 'Creative Format'.
                **Winning Ad DNA:**
                - Persona: ${dna.persona.description}
                - Original Format: ${dna.format}
                - Angle: ${dna.angle}
                **Your Mission:**
                Generate 3 new 'Creative Format' variations that would work well for this angle and persona.
                For each variation, create a "title", a "description" explaining why this format is a good fit, and a "payload" which is the format name string.
                Do not suggest the original format: "${dna.format}".
                Available formats: ${ALL_CREATIVE_FORMATS.join(', ')}.
            `;
            break;

        case 'trigger':
            payloadSchema = buyingTriggerObjectSchema;
            prompt = `
                You are an expert creative strategist. Your task is to generate 3 smart, distinct alternatives for a 'Buying Trigger'.
                **Winning Ad DNA:**
                - Persona: ${dna.persona.description}
                - Angle: ${dna.angle}
                - Original Trigger: ${dna.trigger.name}
                **Your Mission:**
                Generate 3 new 'Buying Triggers'. For each, create a "title", a "description" explaining why it's a good fit, and a "payload" which is a full BuyingTriggerObject with name, description, example, and analysis.
            `;
            break;
        
        case 'placement':
            payloadSchema = { type: Type.STRING };
            prompt = `
                You are an expert creative strategist. Your task is to generate alternative 'Placement' options.
                **Winning Ad DNA:**
                - Format: ${dna.format}
                - Original Placement: ${dna.placement}
                **Your Mission:**
                Suggest alternative placements for the format "${dna.format}". For each, provide a "title", "description", and "payload" (the placement name string).
                Do not suggest the original: "${dna.placement}".
                Available placements: ${ALL_PLACEMENT_FORMATS.join(', ')}.
            `;
            break;
            
        case 'awareness':
            payloadSchema = { type: Type.STRING };
            prompt = `
                You are an expert creative strategist. Your task is to generate alternative 'Awareness Stage' options.
                **Winning Ad DNA:**
                - Persona: ${dna.persona.description}
                - Original Stage: ${dna.awareness}
                **Your Mission:**
                Suggest alternative awareness stages to target. For each, provide a "title", "description" explaining the strategic shift, and "payload" (the stage name string).
                Do not suggest the original: "${dna.awareness}".
                Available stages: ${ALL_AWARENESS_STAGES.join(', ')}.
            `;
            break;
            
        case 'angle':
            payloadSchema = { type: Type.STRING };
            responseProcessor = (payload) => payload[0]; // The helper function returns an array of strings. We need one. Let's ask for 3 arrays and flatten.
            prompt = `
                You are an expert creative strategist. Your task is to generate 3 new strategic 'Angles'.
                **Winning Ad DNA:**
                - Persona: ${dna.persona.description}
                - Pain/Desire: ${dna.painDesire.name}
                - Objection to Overcome: ${dna.objection?.name || 'General skepticism'}
                - Offer: ${dna.offer.name}
                - Original Angle: ${dna.angle}
                **Your Mission:**
                Generate 3 new strategic angles. For each, create a "title", "description" of the angle's focus, and a "payload" which is the angle string itself.
                The angles must be distinct from the original.
            `;
             // This case is more complex as it depends on other functions. We can simplify by just generating angle strings.
            const angles = await generateHighLevelAngles(blueprint, dna.persona, dna.awareness, dna.objection!, dna.painDesire, dna.offer, [dna.angle]);
            return angles.slice(0, 3).map(angle => ({
                title: angle.substring(0, 50) + "...",
                description: `A new strategic angle focusing on: ${angle}`,
                payload: angle
            }));


        case 'offer':
            payloadSchema = offerTypeObjectSchema;
            if(!dna.objection) throw new Error("Objection context is required to remix offers.");
            const offers = await generateOfferTypes(blueprint, dna.persona, dna.objection);
            return offers.map(offer => ({
                title: offer.name,
                description: offer.description,
                payload: offer,
            }));

        case 'painDesire':
             payloadSchema = painDesireObjectSchema;
             const painDesires = await generatePainDesires(blueprint, dna.persona);
             return painDesires.filter(pd => pd.name !== dna.painDesire.name).slice(0, 3).map(pd => ({
                title: `${pd.type}: ${pd.name}`,
                description: pd.description,
                payload: pd,
             }));

        default:
            throw new Error(`Remixing for component type "${component}" is not yet implemented.`);
    }

    const remixSuggestionSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            payload: payloadSchema,
        },
        required: ['title', 'description', 'payload']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: `${prompt} Respond ONLY with a valid JSON array of 3 suggestion objects.` }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: remixSuggestionSchema,
            }
        }
    });
    
    const rawJson = response.text;
    const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);
};


export const generateConceptFromRemix = async (
    baseConcept: AdConcept,
    remixComponent: AdDnaComponent,
    newPayload: any,
    blueprint: CampaignBlueprint
): Promise<Omit<AdConcept, 'imageUrls'>> => {

    let newConcept: Omit<AdConcept, 'imageUrls'>;

    if (remixComponent === 'persona') {
        const newPersona = newPayload as TargetPersona;
        const prompt = `
            You are a world-class creative director. Your task is to adapt a proven winning ad concept for a COMPLETELY NEW target persona. You must retain the core strategic successful elements but completely re-imagine the execution to be authentic and resonant for the new audience.

            **Core Winning Strategy (DO NOT CHANGE):**
            - Angle: "${baseConcept.angle}"
            - Trigger: "${baseConcept.trigger.name}"
            - Format: "${baseConcept.format}"
            - Placement: "${baseConcept.placement}"
            - Awareness Stage: "${baseConcept.awarenessStage}"
            - Offer: "${baseConcept.offer.name} - ${baseConcept.offer.description}"
            - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
            - Original Visual Style DNA: "${blueprint.adDna.visualStyle}"

            **Base Concept (for context only):**
            - Original Persona: "${baseConcept.personaDescription}"
            - Original Headline: "${baseConcept.headline}"

            **🔥 NEW TARGET PERSONA (YOUR ADAPTATION MANDATE):**
            - **Description:** ${newPersona.description}
            - **Age:** ${newPersona.age}
            - **Creator Type/Style:** ${newPersona.creatorType}
            - **Pain Points:** ${newPersona.painPoints.join(', ')}
            - **Desired Outcomes:** ${newPersona.desiredOutcomes.join(', ')}
            - **Target Country:** ${blueprint.adDna.targetCountry}

            **Your Task:**
            Generate ONE new ad concept JSON object.
            1.  **Rewrite Copy:** Create a new 'hook' and 'headline' that speaks directly to the new persona's pains and desires, in their language and tone.
            2.  **Re-imagine Visuals:** Create a new 'visualPrompt' and 'visualVehicle' that are authentic to the new persona's world (setting, style, model).
            3.  **Update Persona Fields:** The 'personaDescription', 'personaAge', and 'personaCreatorType' fields in the JSON must reflect the NEW persona.
            4.  **Create New Ad Set Name:** Generate a new 'adSetName' that reflects the new persona.
            5.  Keep the 'strategicPathId' the same as the base concept.
            6.  For the 'offer' field, you MUST return the full offer object from the 'Core Winning Strategy' context above.

            Respond ONLY with a single valid JSON object that conforms to the ad concept schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ text: prompt }],
            config: {
                responseMimeType: "application/json",
                responseSchema: adConceptSchema,
            }
        });

        const rawJson = response.text;
        const cleanedJson = rawJson.replace(/^```json\s*|```$/g, '');
        // FIX: Property 'entryPoint' is missing in the parsed object but required by `newConcept`.
        // The property is added here and will be correctly set to 'Remixed' in the return statement.
        const parsedConcept = JSON.parse(cleanedJson) as Omit<AdConcept, 'imageUrls' | 'entryPoint'>;
        newConcept = { ...parsedConcept, entryPoint: 'Remixed' };

    } else {
        // For all other components, the logic is identical to 'evolveConcept'.
        const evolutionType = remixComponent as 'angle' | 'trigger' | 'format' | 'placement' | 'awareness' | 'offer' | 'painDesire';
        const evolvedConcepts = await evolveConcept(baseConcept, blueprint, evolutionType, newPayload);
        if (evolvedConcepts.length === 0) {
            throw new Error(`Remix for ${remixComponent} did not yield a new concept.`);
        }
        newConcept = evolvedConcepts[0];
    }
    
    return {
        ...newConcept,
        entryPoint: 'Remixed',
    };
};


export const generateConceptsFromPersona = async (
    blueprint: CampaignBlueprint,
    persona: TargetPersona,
    strategicPathId: string
): Promise<Omit<AdConcept, 'imageUrls'>[]> => {
    
    const prompt = `
        You are a world-class direct response copywriter and full-stack creative strategist. Your task is to generate an array of 3 strategically distinct ad concepts based on a Campaign Blueprint and a specific Target Persona.

        **CORE MISSION: A/B TEST VARIATIONS (Three Entry Points Framework)**
        It is CRITICAL that you generate three genuinely different creative hypotheses:
        - **Concept 1 - "Emotional Entry"**: Leads with feeling, identity, or aspiration.
        - **Concept 2 - "Logical Entry"**: Leads with logic, proof, or a unique mechanism.
        - **Concept 3 - "Social Entry"**: Leads with community or social proof.

        **THE BRIEF:**
        - Product: ${blueprint.productAnalysis.name} (Benefit: ${blueprint.productAnalysis.keyBenefit})
        - Strategic Offer: ${blueprint.adDna.offerSummary} (CTA: ${blueprint.adDna.cta})
        - Sales DNA Tone: "${blueprint.adDna.toneOfVoice}"
        - Original Visual Style DNA: "${blueprint.adDna.visualStyle}"
        - Target Country for Localization: "${blueprint.adDna.targetCountry}"
        - **🔥 Target Persona**: "${persona.description}" (Age: "${persona.age}", Type: "${persona.creatorType}", Pains: ${persona.painPoints.join(', ')})

        **YOUR FULL-STACK TASK FOR EACH OF THE 3 CONCEPTS (Emotional, Logical, Social):**

        **STEP 1: Invent a Plausible Strategic Path (Strategist Mode)**
        1.  **Invent an Angle:** Create a high-level strategic angle that resonates with the persona.
        2.  **Choose a Psychological Trigger:** Select the MOST effective trigger from the list: [Social Proof, Authority, Scarcity, Urgency, Reciprocity, Liking, FOMO, Exclusivity, Instant Gratification]. For the chosen trigger, you must generate a full object containing the 'name', a detailed 'description', a concrete 'example', and an 'analysis' of why it works for this persona.
        3.  **Choose a Creative Format & Placement:** Select the best format and placement for your idea.
        4.  **Choose an Awareness Stage:** Select the most appropriate stage for your angle.

        **STEP 2: Write the Words & Visualize the Message (Copywriter & Art Director Mode)**
        1.  Based on the path you invented, write a world-class, scroll-stopping **hook** and **headline**.
        2.  Create a detailed **visualPrompt** that brings the concept to life, is authentic to the persona, and visually embodies the chosen trigger.

        **Final Output Generation:**
        - For each concept, generate a complete JSON object.
        - The 'adSetName' should follow this format: [PersonaShort]_[AngleKeyword]_[Trigger]_[Awareness]_[Format]_[Placement]_v[1, 2, or 3].
        - The 'offer' object's 'name' must be "${blueprint.adDna.offerSummary}". You must invent a plausible 'description' and 'psychologicalPrinciple' for it.
        - **CRITICAL**: The 'strategicPathId' field for ALL concepts MUST be exactly this value: "${strategicPathId}".

        Respond ONLY with a JSON array of 3 concept objects. Adhere strictly to the provided JSON schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ text: prompt }],
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
    const ideas = JSON.parse(cleanedJson) as (Omit<AdConcept, 'imageUrls' | 'entryPoint'>)[];
    
    const entryPoints: ('Emotional' | 'Logical' | 'Social')[] = ['Emotional', 'Logical', 'Social'];

    return ideas.map((idea, index) => ({
        ...idea,
        entryPoint: entryPoints[index % 3] as 'Emotional' | 'Logical' | 'Social'
    }));
};


// Helper function to extract MIME type from base64 string
export const getMimeType = (base64: string): string => {
    return base64.substring(base64.indexOf(":") + 1, base64.indexOf(";"));
}
